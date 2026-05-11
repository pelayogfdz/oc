import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Call the external WhatsApp microservice running on the same server (port 3001)
    const response = await fetch("http://127.0.0.1:3001/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error || "Failed to send message via microservice" }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in Next.js WhatsApp proxy:", error);
    return NextResponse.json({ error: "Failed to communicate with WhatsApp service" }, { status: 500 });
  }
}
