import { NextResponse } from 'next/server';
import { CURRENT_BUILD_VERSION } from '@/app/components/SWCleaner';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ version: CURRENT_BUILD_VERSION });
}
