import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sizeParam = searchParams.get('size');
    const size = sizeParam ? parseInt(sizeParam, 10) : 192;

    return new ImageResponse(
      (
        <div
          style={{
            fontSize: size * 0.6,
            background: '#8b5cf6',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 900,
            borderRadius: '22%',
          }}
        >
          C
        </div>
      ),
      {
        width: size,
        height: size,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
