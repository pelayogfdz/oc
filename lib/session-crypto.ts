import { jwtVerify, SignJWT } from 'jose';

const secretKey = process.env.SESSION_SECRET || 'caanma-elite-saas-super-secret-key-12345';
export const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  tenantId: string | null;
  role: string;
  expiresAt: Date;
  sessionId?: string;
};

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

const sessionCache = new Map<string, SessionPayload | null>();

export async function decrypt(session: string | undefined = '') {
  if (!session) return null;
  
  const cached = sessionCache.get(session);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    const result = payload as SessionPayload;
    sessionCache.set(session, result);
    
    // Evitar memory leak controlando el tamaño máximo del caché
    if (sessionCache.size > 2000) {
      const firstKey = sessionCache.keys().next().value;
      if (firstKey !== undefined) {
        sessionCache.delete(firstKey);
      }
    }
    
    return result;
  } catch (error) {
    sessionCache.set(session, null);
    return null; // Invalid token
  }
}
