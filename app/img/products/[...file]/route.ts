import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ file: string[] }> }
) {
  try {
    const params = await props.params;
    const fileArray = params?.file || [];
    const filename = Array.isArray(fileArray) ? fileArray.join('/') : fileArray;

    if (!filename) {
      return new NextResponse('Missing file parameter', { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.normalize(filename).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(process.cwd(), 'public', 'img', 'products', safeFilename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Image not found', { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.avif': 'image/avif'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new NextResponse('Error reading image: ' + err.message, { status: 500 });
  }
}
