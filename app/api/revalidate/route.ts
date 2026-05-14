import { revalidateTag, revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  revalidatePath('/', 'layout');
  revalidatePath('/', 'page');
  return NextResponse.json({ revalidated: true, message: 'All paths and tags cleared.' });
}
