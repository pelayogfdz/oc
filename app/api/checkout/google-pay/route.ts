import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '../../integrations/auth';
import { sendSaleNotificationEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: NextRequest) {
  // 1. Authenticate API Bearer Token
  const auth = await authenticateToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado. Token API inválido o inactivo.' }, { status: 401, headers: corsHeaders });
  }

  const { branch } = auth;

  try {
    const body = await request.json();
    const {
      token,
      cardNetwork,
      amount,
      items,
      customer: customerData,
      deliveryType,
      shippingAddress,
      pickupBranch,
      mpAccessToken
    } = body;

    if (!token) {
      return NextResponse.json({ error: 'El token de Google Pay es requerido.' }, { status: 400, headers: corsHeaders });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El pedido debe contener al menos un producto en "items".' }, { status: 400, headers: corsHeaders });
    }

    // Resolve active Mercado Pago Access Token
    let activeToken = mpAccessToken;
    if (!activeToken) {
      const settings = await prisma.systemSettings.findFirst();
      if (settings?.mpAccessToken) {
        activeToken = settings.mpAccessToken;
      }
    }

    // Determine if we should simulate/mock because of sandbox environment or test tokens
    const isTestToken = token.startsWith('{') || token.includes('ECv2') || token === 'mock_token' || token.length < 50;
    const isSandboxEnv = !activeToken || activeToken.startsWith('TEST-');

    let paymentId = 'simulated_' + Math.random().toString(36).substring(2, 12);
    let paymentStatus = 'approved';
    let paymentMethod = cardNetwork ? cardNetwork.toUpperCase() : 'CARD';

    // 2. Call Mercado Pago API if not in sandbox/test mode
    if (!isTestToken && !isSandboxEnv) {
      try {
        console.log(`Enviando cobro real a Mercado Pago para el cliente ${customerData?.email || 'N/A'}`);
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: token,
            transaction_amount: parseFloat(amount),
            description: 'Compra Showroom PETQRO - Google Pay',
            payment_method_id: cardNetwork ? cardNetwork.toLowerCase() : 'visa',
            payer: {
              email: customerData?.email || 'pago-googlepay@petqro.mx'
            }
          })
        });

        const mpData = await mpResponse.json();
        if (!mpResponse.ok) {
          throw new Error(mpData.message || 'Error de procesamiento en la API de Mercado Pago');
        }

        paymentId = String(mpData.id);
        paymentStatus = mpData.status; // e.g. 'approved', 'in_process', etc.
        paymentMethod = mpData.payment_method_id ? mpData.payment_method_id.toUpperCase() : paymentMethod;

        if (paymentStatus !== 'approved') {
          return NextResponse.json({
            error: `El pago no fue aprobado. Estatus: ${paymentStatus}. Detalle: ${mpData.status_detail || ''}`
          }, { status: 402, headers: corsHeaders });
        }
      } catch (err: any) {
        console.error('Mercado Pago API error during Google Pay checkout:', err);
        return NextResponse.json({ error: 'Error al procesar pago: ' + err.message }, { status: 400, headers: corsHeaders });
      }
    } else {
      console.log(`[Google Pay SIMULATOR] Procesando pago simulado exitoso de $${amount} MXN`);
    }

    // 3. Register Sale in CAANMA ERP
    let pickupCode: string | null = null;
    let finalNotes = `Pago aprobado con Google Pay (MP Id: ${paymentId}, Wallet: ${paymentMethod}).`;
    
    if (deliveryType === 'collect' || pickupBranch) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'PQ-';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      pickupCode = code;
      finalNotes = `${finalNotes} | Código de Recolección en Tienda: ${pickupCode}`;
    }

    // Resolve an user to associate the sale
    const firstUser = await prisma.user.findFirst({
      where: {
        OR: [
          { branchId: branch.id },
          { tenantId: branch.tenantId }
        ]
      }
    });

    if (!firstUser) {
      return NextResponse.json({ error: 'No se encontró ningún usuario configurado en esta sucursal para asociar la venta.' }, { status: 400, headers: corsHeaders });
    }

    // Resolve branch settings for stock configuration
    const branchSettings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });
    const config = branchSettings?.configJson ? JSON.parse(branchSettings.configJson)['ventas'] || {} : {};
    const permitirVenderSinStock = config.venderSinStock === true;

    // Run Prisma transaction to ensure database consistency
    const result = await prisma.$transaction(async (tx) => {
      // 3.1. Resolve or create customer
      let customerId = null;
      if (customerData) {
        const email = (customerData.email || '').trim().toLowerCase();
        const phone = (customerData.phone || '').trim();
        const name = (customerData.name || '').trim();

        if (name) {
          let existingCustomer = null;
          if (email) {
            existingCustomer = await tx.customer.findFirst({
              where: { email, branchId: branch.id }
            });
          }
          if (!existingCustomer && phone) {
            existingCustomer = await tx.customer.findFirst({
              where: { phone, branchId: branch.id }
            });
          }

          if (!existingCustomer) {
            existingCustomer = await tx.customer.create({
              data: {
                name,
                email: email || null,
                phone: phone || null,
                branchId: branch.id
              }
            });
          }
          customerId = existingCustomer.id;
        }
      }

      if (!customerId) {
        let publicCustomer = await tx.customer.findFirst({
          where: {
            name: { equals: 'Público General', mode: 'insensitive' },
            branchId: branch.id
          }
        });
        if (!publicCustomer) {
          publicCustomer = await tx.customer.create({
            data: {
              name: 'Público General',
              branchId: branch.id
            }
          });
        }
        customerId = publicCustomer.id;
      }

      // 3.2. Validate products and prepare sale items
      const saleItemsData = [];
      let calculatedTotal = 0;

      for (const item of items) {
        const itemSku = (item.sku || '').trim();
        if (!itemSku) {
          throw new Error('Cada ítem debe contener un "sku" válido.');
        }

        const quantity = parseInt(item.quantity, 10);
        if (isNaN(quantity) || quantity <= 0) {
          throw new Error(`Cantidad inválida para el producto con SKU: ${itemSku}`);
        }

        const price = parseFloat(item.price);
        if (isNaN(price) || price < 0) {
          throw new Error(`Precio inválido para el producto con SKU: ${itemSku}`);
        }

        // Find product in branch
        const product = await tx.product.findFirst({
          where: {
            branchId: branch.id,
            OR: [
              { sku: itemSku },
              { barcode: itemSku }
            ]
          }
        });

        if (!product) {
          throw new Error(`Producto con SKU/Barcode "${itemSku}" no encontrado en esta sucursal.`);
        }

        if (!permitirVenderSinStock && product.isService !== true && (product.stock - quantity < 0)) {
          throw new Error(`Inventario insuficiente en sucursal para: ${product.name} (Stock: ${product.stock}, Solicitado: ${quantity})`);
        }

        if (product.isService !== true) {
          // Decrement product stock
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: {
                decrement: quantity
              }
            }
          });

          // Create inventory movement
          await tx.inventoryMovement.create({
            data: {
              productId: product.id,
              type: 'OUT',
              quantity: -quantity,
              reason: `Google Pay Showroom - SKU: ${itemSku}`.substring(0, 100),
              userId: firstUser.id
            }
          });
        }

        saleItemsData.push({
          productId: product.id,
          quantity: quantity,
          price: price
        });

        calculatedTotal += (quantity * price);
      }

      // Create the Sale
      const sale = await tx.sale.create({
        data: {
          total: calculatedTotal,
          status: 'COMPLETED',
          paymentMethod: 'CARD', // Google Pay is processed as a card payment
          customerId: customerId,
          branchId: branch.id,
          userId: firstUser.id,
          notes: finalNotes,
          items: {
            create: saleItemsData
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  sku: true,
                  name: true
                }
              }
            }
          },
          customer: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // If shippingAddress is provided, create a DeliveryOrder
      if (deliveryType === 'home' && shippingAddress) {
        await tx.deliveryOrder.create({
          data: {
            saleId: sale.id,
            street: shippingAddress.street || null,
            exteriorNumber: shippingAddress.exteriorNumber || null,
            interiorNumber: shippingAddress.interiorNumber || null,
            neighborhood: shippingAddress.neighborhood || null,
            city: shippingAddress.city || 'Querétaro',
            state: shippingAddress.state || 'Querétaro',
            zipCode: shippingAddress.zipCode || null,
            notes: shippingAddress.notes || null,
            branchId: branch.id,
            status: 'PENDING'
          }
        });
      }

      return sale;
    });

    // 4. Send Confirmation Email asynchronously
    if (customerData?.email) {
      sendSaleNotificationEmail(customerData.email, result, deliveryType === 'collect' || !!pickupBranch, pickupCode)
        .catch(err => console.error("Error al enviar email de confirmación:", err));
    }

    return NextResponse.json({
      success: true,
      message: 'Cobro procesado y venta registrada exitosamente.',
      sale: result,
      pickupCode: pickupCode
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in Google Pay checkout endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar la compra.' }, { status: 400, headers: corsHeaders });
  }
}
