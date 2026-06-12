import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, mpAccessToken, successUrl, failureUrl, pendingUrl } = body;

    if (!mpAccessToken) {
      return NextResponse.json({ error: 'Mercado Pago Access Token is required' }, { status: 400 });
    }

    if (!items || !items.length) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 });
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: items.map((item: any) => ({
          title: item.title,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0.0,
          currency_id: 'MXN'
        })),
        back_urls: {
          success: successUrl || '',
          failure: failureUrl || '',
          pending: pendingUrl || ''
        },
        auto_return: 'approved'
      })
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      throw new Error(mpData.message || 'Error from Mercado Pago API');
    }

    return NextResponse.json({
      preferenceId: mpData.id,
      initPoint: mpData.init_point
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
