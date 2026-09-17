import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getActiveUser } from '@/app/actions/auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret') || req.headers.get('x-revalidate-secret');
  const validSecret = process.env.REVALIDATE_SECRET;

  if (validSecret && secret === validSecret) {
    revalidatePath('/', 'layout');
    revalidatePath('/', 'page');
    return NextResponse.json({ revalidated: true, message: 'All paths cleared via secret.' });
  }

  const user = await getActiveUser();
  if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  return NextResponse.json({ revalidated: true, message: 'All paths cleared.' });
}

