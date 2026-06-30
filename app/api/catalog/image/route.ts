import { NextRequest, NextResponse } from 'next/server';
import { getAllTenantClients } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Missing product ID', { status: 400 });
    }

    // Find the product in all tenant databases to get the Base64 image
    let imageUrl: string | null = null;
    const clients = getAllTenantClients();
    for (const client of clients) {
      try {
        const product = await client.product.findUnique({
          where: { id },
          select: { imageUrl: true }
        });
        if (product && product.imageUrl) {
          imageUrl = product.imageUrl;
          break;
        }
      } catch (e) {
        // Keep searching
      }
    }

    if (!imageUrl || !imageUrl.startsWith('data:')) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // Parse the Base64 string
    // Format is: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...
    const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse('Invalid image format', { status: 400 });
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Return the binary image with strong caching headers!
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
