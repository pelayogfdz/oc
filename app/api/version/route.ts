import { NextResponse } from 'next/server';

const SERVER_BOOT_TIME = process.env.BUILD_ID || process.env.NEXT_DEPLOYMENT_ID || Date.now().toString();

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { version: SERVER_BOOT_TIME, timestamp: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
