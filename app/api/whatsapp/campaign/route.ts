import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getActiveBranch } from "@/app/actions/auth";

// GET: Retrieve unique pending/scheduled campaigns
export async function GET(request: Request) {
  try {
    const user = await getActiveUser();
    const branch = await getActiveBranch();
    
    if (!user || !branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const branchFilter = branch.id === "GLOBAL"
      ? { prospect: { branch: { tenantId: user.tenantId } } }
      : { prospect: { branchId: branch.id } };

    // Fetch all pending/scheduled outbound messages
    const pendingMessages = await prisma.whatsAppMessage.findMany({
      where: {
        messageId: null,
        isFromMe: true,
        ...branchFilter
      },
      include: {
        prospect: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        timestamp: "asc"
      }
    });

    // Group messages to represent "Campaigns"
    // We group by unique combination of (body + timestamp string)
    const campaignsMap: { [key: string]: any } = {};

    pendingMessages.forEach(msg => {
      const key = `${msg.body}_${msg.timestamp.toISOString()}`;
      if (!campaignsMap[key]) {
        campaignsMap[key] = {
          body: msg.body,
          scheduledAt: msg.timestamp.toISOString(),
          totalTargets: 0,
          targets: []
        };
      }
      campaignsMap[key].totalTargets += 1;
      campaignsMap[key].targets.push({
        prospectId: msg.prospectId,
        name: msg.prospect.name,
        phone: msg.prospect.phone
      });
    });

    const campaigns = Object.values(campaignsMap);

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new mass messaging campaign
export async function POST(request: Request) {
  try {
    const user = await getActiveUser();
    const branch = await getActiveBranch();
    
    if (!user || !branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, scheduledAt } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Determine target prospects
    const branchFilter = branch.id === "GLOBAL"
      ? { branch: { tenantId: user.tenantId } }
      : { branchId: branch.id };

    // "conversacion abierta" -> prospects under current branch/tenant that have at least one message
    const targetProspects = await prisma.prospect.findMany({
      where: {
        ...branchFilter,
        messages: {
          some: {} // has open conversation
        }
      },
      select: {
        id: true,
        name: true,
        phone: true
      }
    });

    if (targetProspects.length === 0) {
      return NextResponse.json({ error: "No hay clientes con conversaciones abiertas en esta sucursal." }, { status: 400 });
    }

    // Parse scheduled date
    const targetTime = scheduledAt ? new Date(scheduledAt) : new Date();

    // Create a message in DB for each prospect
    const creations = targetProspects.map(prospect => {
      return prisma.whatsAppMessage.create({
        data: {
          prospectId: prospect.id,
          body: message,
          isFromMe: true,
          messageId: null, // pending to be sent by microservice
          timestamp: targetTime
        }
      });
    });

    await prisma.$transaction(creations);

    return NextResponse.json({
      success: true,
      totalQueued: targetProspects.length,
      scheduledAt: targetTime.toISOString()
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Cancel/Delete a scheduled campaign
export async function DELETE(request: Request) {
  try {
    const user = await getActiveUser();
    const branch = await getActiveBranch();
    
    if (!user || !branch) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message, scheduledAt } = body;

    if (!message || !scheduledAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const branchFilter = branch.id === "GLOBAL"
      ? { prospect: { branch: { tenantId: user.tenantId } } }
      : { prospect: { branchId: branch.id } };

    // Delete all pending messages matching body, scheduled time and sucursal
    const deleted = await prisma.whatsAppMessage.deleteMany({
      where: {
        messageId: null,
        isFromMe: true,
        body: message,
        timestamp: new Date(scheduledAt),
        ...branchFilter
      }
    });

    return NextResponse.json({ success: true, deletedCount: deleted.count });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
