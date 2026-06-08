// Helper to convert base64url to ArrayBuffer
function bufferFromBase64Url(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = window.atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
}

// Helper to convert ArrayBuffer to base64url
function base64UrlFromBuffer(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Registers a new fingerprint credential on the local device using WebAuthn.
 * Returns the credentialId to be stored on the server.
 */
export async function registerFingerprint(userId: string, username: string) {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error("La autenticación biométrica no es soportada por este navegador o dispositivo.");
  }

  // Create unique challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdBuffer = new TextEncoder().encode(userId);

  const options: PublicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: "CAANMA ERP",
      id: window.location.hostname
    },
    user: {
      id: userIdBuffer,
      name: username,
      displayName: username
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },  // ES256
      { type: "public-key", alg: -257 } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // TouchID / FaceID / Windows Hello
      userVerification: "required"
    },
    timeout: 60000
  };

  const credential = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential;
  if (!credential) {
    throw new Error("No se pudo crear la credencial biométrica.");
  }

  return {
    credentialId: base64UrlFromBuffer(credential.rawId),
    publicKey: "webauthn-verified"
  };
}

/**
 * Authenticates the user by matching their fingerprint against a previously registered credential ID.
 * Returns true if successful, throws an error if authentication fails.
 */
export async function authenticateFingerprint(credentialId: string) {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error("La autenticación biométrica no es soportada por este navegador o dispositivo.");
  }

  if (!credentialId) {
    throw new Error("No se ha registrado ninguna huella dactilar para este usuario.");
  }

  // Create unique challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const options: PublicKeyCredentialRequestOptions = {
    challenge: challenge,
    allowCredentials: [
      {
        type: "public-key",
        id: bufferFromBase64Url(credentialId)
      }
    ],
    userVerification: "required",
    timeout: 60000
  };

  const assertion = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential;
  if (!assertion) {
    throw new Error("La verificación de huella dactilar falló.");
  }

  return true;
}
