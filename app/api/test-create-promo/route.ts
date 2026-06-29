import { NextResponse } from 'next/server';
import { createPromotion } from '@/app/actions/promotion';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await createPromotion(body.name, body.type, body.value, body.metadata);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
