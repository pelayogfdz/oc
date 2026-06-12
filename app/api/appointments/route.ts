import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '../integrations/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let tenantId = 'db5d3949-f8dd-41f6-9627-90374d55d044'; // Default to PETQRO tenant ID
    const authResult = await authenticateToken(request);
    
    if (authResult && authResult.tenantId) {
      tenantId = authResult.tenantId;
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        branch: {
          tenantId: tenantId
        }
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    const formatted = appointments.map(appt => {
      let branchKey = 'la-pradera';
      if (appt.branchId === 'PETQROCERRITO_ID' || appt.branchId === 'CerritoCol_ID' || appt.branchId === 'CERRITOCOL_ID') {
        branchKey = 'cerrito-colorado';
      }
      
      const dateObj = new Date(appt.scheduledAt);
      const datePart = dateObj.toISOString().split('T')[0];
      const timePart = dateObj.toTimeString().substring(0, 5);

      let serviceKey = 'estetica';
      const titleLower = (appt.title || '').toLowerCase();
      if (titleLower.includes('corte') && titleLower.includes('uñas')) {
        serviceKey = 'unashigiene';
      } else if (titleLower.includes('medicado')) {
        serviceKey = 'banomedicado';
      } else if (titleLower.includes('cepillado') || titleLower.includes('corto')) {
        serviceKey = 'banocortecorto';
      }

      return {
        id: appt.id,
        service: serviceKey,
        serviceName: appt.title,
        branch: branchKey,
        date: datePart,
        time: timePart,
        phone: appt.clientPhone || '',
        name: appt.clientName || '',
        status: appt.status
      };
    });

    return NextResponse.json(formatted, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    let tenantId = 'db5d3949-f8dd-41f6-9627-90374d55d044'; // Default to PETQRO tenant ID
    const authResult = await authenticateToken(request);
    
    if (authResult && authResult.tenantId) {
      tenantId = authResult.tenantId;
    }

    const body = await request.json();
    const { service, branch, date, time, phone, name } = body;

    if (!service || !branch || !date || !time) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    let branchId = '2e215b8c-b9e3-444f-adc3-c4387a684e05'; // Default to Matriz / La Pradera
    if (branch === 'cerrito-colorado') {
      branchId = 'PETQROCERRITO_ID';
    }

    const scheduledAt = new Date(`${date}T${time}:00`);

    const serviceTitles: Record<string, string> = {
      estetica: 'Estética Canina Completa',
      banocortecorto: 'Baño, Cepillado y Corte Corto',
      banomedicado: 'Baño Medicado Hipoalergénico',
      unashigiene: 'Corte de Uñas e Higiene Completa'
    };

    const title = serviceTitles[service] || 'Servicio de Estética';

    const newAppt = await prisma.appointment.create({
      data: {
        branchId: branchId,
        title: title,
        scheduledAt: scheduledAt,
        duration: 60,
        clientName: name || 'Cliente Web',
        clientPhone: phone || '',
        notes: 'Registrado desde el Showroom Web PETQRO',
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, appointmentId: newAppt.id }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
