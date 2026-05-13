import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
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
