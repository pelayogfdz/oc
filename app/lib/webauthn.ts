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

  // Check if platform biometric authentication is available (e.g. Windows Hello / Touch ID)
  const platformAuthAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!platformAuthAvailable) {
    throw new Error("Este dispositivo no cuenta con un autenticador biométrico activo compatible con Windows Hello. Si estás utilizando el lector USB HID DigitalPersona (de la foto), asegúrate de: 1) Instalar el controlador WBF (Windows Biometric Framework) desde la página de controladores de HID, y 2) Registrar tu huella dactilar en la configuración de Windows (Configuración > Cuentas > Opciones de inicio de sesión > Reconocimiento de huellas dactilares (Windows Hello)).");
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

  try {
    const credential = await navigator.credentials.create({ publicKey: options }) as PublicKeyCredential;
    if (!credential) {
      throw new Error("No se pudo crear la credencial biométrica.");
    }

    return {
      credentialId: base64UrlFromBuffer(credential.rawId),
      publicKey: "webauthn-verified"
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error("El proceso de lectura fue cancelado o expiró en el lector de huellas.");
    }
    if (err.name === 'InvalidStateError') {
      throw new Error("Esta huella o dispositivo ya se encuentra registrado para este usuario.");
    }
    throw new Error("Error en el lector de huellas: " + err.message);
  }
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

  // Check if platform biometric authentication is available
  const platformAuthAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!platformAuthAvailable) {
    throw new Error("No hay un lector biométrico activo compatible con Windows Hello. Si usas el lector USB HID (de la foto), asegúrate de que esté conectado y tenga instalado el controlador WBF.");
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

  try {
    const assertion = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential;
    if (!assertion) {
      throw new Error("La verificación de huella dactilar falló.");
    }

    return true;
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error("El proceso de autenticación fue cancelado o no se colocó el dedo a tiempo en el lector.");
    }
    throw new Error("Error al verificar huella: " + err.message);
  }
}

/**
 * Authenticates any registered user by requesting their fingerprint via WebAuthn discoverable credentials.
 * Returns the credentialId (base64url) of the matched fingerprint.
 */
export async function authenticateFingerprintAuto(): Promise<string> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error("La autenticación biométrica no es soportada por este navegador o dispositivo.");
  }

  // Check if platform biometric authentication is available
  const platformAuthAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!platformAuthAvailable) {
    throw new Error("No hay un lector biométrico activo compatible con Windows Hello. Si usas el lector USB HID (de la foto), asegúrate de que esté conectado y tenga instalado el controlador WBF.");
  }

  // Create unique challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const options: PublicKeyCredentialRequestOptions = {
    challenge: challenge,
    // Omitting allowCredentials triggers the discoverable credentials flow
    userVerification: "required",
    timeout: 60000
  };

  try {
    const assertion = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential;
    if (!assertion) {
      throw new Error("La verificación de huella dactilar falló.");
    }

    return base64UrlFromBuffer(assertion.rawId);
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error("El proceso de autenticación fue cancelado o no se colocó el dedo a tiempo en el lector.");
    }
    throw new Error("Error al verificar huella: " + err.message);
  }
}

