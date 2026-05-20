import { NextResponse } from "next/server";
import { getActiveBranch } from "@/app/actions/auth";

export async function POST(request: Request) {
  try {
    const branch = await getActiveBranch();
    if (!branch) {
      return NextResponse.json({ error: "No branch found" }, { status: 404 });
    }

    if (process.env.WHATSAPP_BRANCH_ID && branch.id !== process.env.WHATSAPP_BRANCH_ID) {
      return NextResponse.json({ error: "WhatsApp not enabled for this branch" }, { status: 403 });
    }

    const microserviceUrl = process.env.WHATSAPP_MICROSERVICE_URL || 'http://localhost:3001';
    
    const res = await fetch(`${microserviceUrl}/api/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Microservice responded with ${res.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging out WhatsApp:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
