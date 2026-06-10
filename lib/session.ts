import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { prisma } from './prisma';
import { encrypt, decrypt, encodedKey, SessionPayload } from './session-crypto';

export { encrypt, decrypt };
export type { SessionPayload };


export async function createSession(userId: string, tenantId: string | null, role: string) {
  const sessionId = crypto.randomUUID();
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentSessionId: true }
  });

  let activeSessions: string[] = [];
  if (user?.currentSessionId) {
    activeSessions = user.currentSessionId.split(',').filter(Boolean);
  }
  
  activeSessions.push(sessionId);
  if (activeSessions.length > 50) {
    activeSessions = activeSessions.slice(-50);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { currentSessionId: activeSessions.join(',') }
  });
  revalidateTag(`user-${userId}`, 'max');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, tenantId, role, expiresAt, sessionId });
  
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
  return session;
}

export async function updateSession() {
  const session = (await cookies()).get('session')?.value;
  const payload = await decrypt(session);

  if (!session || !payload) {
    return null;
  }

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expires,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (session) {
    const payload = await decrypt(session);
    if (payload && payload.userId && payload.sessionId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { currentSessionId: true }
        });
        if (user?.currentSessionId) {
          const sessions = user.currentSessionId.split(',').filter(s => s !== payload.sessionId && s !== '');
          await prisma.user.update({
            where: { id: payload.userId },
            data: { currentSessionId: sessions.length > 0 ? sessions.join(',') : null }
          });
        }
      } catch (err) {
        console.error('Failed to remove sessionId on logout:', err);
      }
    }
  }
  cookieStore.delete('session');
}
