import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '../auth';
import { getNextFolio } from '@/app/actions/folios';

export const dynamic = 'force-dynamic';

// GET: Download / retrieve recent sales for the authenticated branch
export async function GET(request: NextRequest) {
  const auth = await authenticateToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado. Token API inválido o inactivo.' }, { status: 401 });
  }

  const { branch } = auth;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse parameters
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
  const sinceStr = searchParams.get('since');
  let sinceDate: Date | null = null;
  if (sinceStr) {
    try {
      sinceDate = new Date(sinceStr);
    } catch (e) {
      return NextResponse.json({ error: 'Parámetro "since" inválido. Formato esperado: ISO Date String.' }, { status: 400 });
    }
  }

  try {
    const whereClause: any = {
      branchId: branch.id
    };

    if (sinceDate && !isNaN(sinceDate.getTime())) {
      whereClause.createdAt = {
        gte: sinceDate
      };
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                sku: true,
                barcode: true,
                name: true,
                unit: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      branch: {
        id: branch.id,
        name: branch.name
      },
      count: sales.length,
      sales
    });
  } catch (error: any) {
    console.error('Error fetching sales for integration API:', error);
    return NextResponse.json({ error: 'Error del servidor: ' + error.message }, { status: 500 });
  }
}

// POST: Create / import a sale from an external channel
export async function POST(request: NextRequest) {
  const auth = await authenticateToken(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado. Token API inválido o inactivo.' }, { status: 401 });
  }

  const { branch } = auth;

  try {
    const body = await request.json();
    const { items, customer: customerData, paymentMethod, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'La venta debe contener al menos un producto en "items".' }, { status: 400 });
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
      return NextResponse.json({ error: 'No se encontró ningún usuario configurado en esta sucursal para asociar la venta.' }, { status: 400 });
    }

    // Resolve branch settings for stock configuration
    const branchSettings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });
    const config = branchSettings?.configJson ? JSON.parse(branchSettings.configJson)['ventas'] || {} : {};
    const permitirVenderSinStock = config.venderSinStock === true;

    // We process the sale inside a prisma transaction to ensure stock consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve or create customer
      let customerId = null;
      if (customerData) {
        const email = (customerData.email || '').trim().toLowerCase();
        const phone = (customerData.phone || '').trim();
        const name = (customerData.name || '').trim();

        if (name) {
          // Try to find existing customer
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
            // Create a new customer
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

      // If no customer resolved, default to Publico General
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

      // 2. Validate products and prepare sale items
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

        if (!permitirVenderSinStock && (product.stock - quantity < 0)) {
          throw new Error(`Inventario insuficiente en sucursal para: ${product.name} (Stock: ${product.stock}, Solicitado: ${quantity})`);
        }

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
            reason: `Venta Online API - SKU: ${itemSku} | Obs: ${notes || ''}`.substring(0, 100),
            userId: firstUser.id
          }
        });

        saleItemsData.push({
          productId: product.id,
          quantity: quantity,
          price: price
        });

        calculatedTotal += (quantity * price);
      }

      // Get next folio
      const folio = await getNextFolio(branch.id, 'sale', tx);

      // Create the Sale
      const sale = await tx.sale.create({
        data: {
          folio,
          total: calculatedTotal,
          status: 'COMPLETED',
          paymentMethod: paymentMethod || 'CARD',
          customerId: customerId,
          branchId: branch.id,
          userId: firstUser.id,
          notes: notes || 'Venta importada automáticamente vía API externa.',
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

      return sale;
    });

    return NextResponse.json({
      success: true,
      message: 'Venta importada exitosamente.',
      sale: result
    });

  } catch (error: any) {
    console.error('Error importing sale via integration API:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar la venta.' }, { status: 400 });
  }
}
