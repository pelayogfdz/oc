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

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null; // Invalid token
  }
}
