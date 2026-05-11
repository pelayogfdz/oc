import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { origin, destinations } = await req.json();

    // TODO: In Phase 2, integrate with Google Maps Distance Matrix API:
    // const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    // const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destinations.join('|')}&key=${googleMapsApiKey}`;
    // ...

    // For now, return a mock response that preserves the destination order
    const mockRoute = destinations.map((dest: string, index: number) => ({
      destination: dest,
      distanceText: `${(Math.random() * 10 + 1).toFixed(1)} km`,
      durationText: `${Math.floor(Math.random() * 30 + 10)} mins`,
      order: index + 1
    }));

    return NextResponse.json({ 
      success: true, 
      route: mockRoute 
    });

  } catch (error) {
    console.error('Routing error:', error);
    return NextResponse.json({ error: 'Failed to calculate route' }, { status: 500 });
  }
}
