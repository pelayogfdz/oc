import { NextResponse } from 'next/server';
import { getAllTenantClients } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function performWarmup(request: Request) {
  // Validate authorization to prevent abuse
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret') || request.headers.get('Authorization')?.replace('Bearer ', '');
  const expectedSecret = process.env.CRON_SECRET || 'caanma-warmup-token-2026';

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = getAllTenantClients();
  const results: any[] = [];

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const label = i === 0 ? 'Master' : `Tenant-${i}`;
    try {
      const start = Date.now();
      // Run a simple lightweight raw query to wake up Neon compute and keep pool active
      await client.$queryRawUnsafe('SELECT 1');
      const duration = Date.now() - start;
      results.push({ label, success: true, durationMs: duration });
    } catch (e: any) {
      results.push({ label, success: false, error: e.message || String(e) });
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results
  });
}

export async function GET(request: Request) {
  return performWarmup(request);
}

export async function POST(request: Request) {
  return performWarmup(request);
}
