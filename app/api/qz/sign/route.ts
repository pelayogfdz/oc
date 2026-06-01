import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    // 1. Get active branch context safely
    const branch = await getActiveBranch();
    if (!branch || !branch.id || branch.id === 'GLOBAL') {
      return new Response("No active branch selected or unauthorized access", { status: 401 });
    }

    // 2. Read raw plain-text payload to be signed from request body
    const toSign = await request.text();
    if (!toSign) {
      return new Response("Missing body to sign", { status: 400 });
    }

    // 3. Find settings for the branch
    const settings = await prisma.branchSettings.findUnique({
      where: { branchId: branch.id }
    });

    if (!settings || !settings.configJson) {
      return new Response("QZ Tray configurations not found for this branch", { status: 400 });
    }

    let config: any = {};
    try {
      config = JSON.parse(settings.configJson);
    } catch (e) {
      return new Response("Invalid configurations JSON syntax", { status: 500 });
    }

    const qzConfig = config.qz || {};
    const privateKey = qzConfig.privateKey;

    if (!privateKey) {
      return new Response("Private key not configured for this branch", { status: 400 });
    }

    // 4. Perform RSA-SHA512 signature
    const signer = crypto.createSign("RSA-SHA512");
    signer.update(toSign);
    
    // Normalization of PEM private key string format
    const formattedKey = privateKey.includes("-----BEGIN") 
      ? privateKey 
      : `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

    const signature = signer.sign(formattedKey, "base64");

    // 5. Return signature as plain text
    return new Response(signature, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  } catch (err: any) {
    console.error("Error signing QZ message:", err);
    return new Response("Internal Server Error: " + err.message, { status: 500 });
  }
}
