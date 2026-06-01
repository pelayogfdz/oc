'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function registerAttendance(data: {
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  deviceInfo?: string;
}) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);
    
    if (!session?.userId || session.userId !== data.userId) {
      return { success: false, error: "No autorizado" };
    }

    // Find user and branch to get rules (if applicable)
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { 
        branch: { include: { hrLocation: true } },
        hrLocations: true 
      }
    });

    if (!user) return { success: false, error: "Usuario no encontrado" };

    // Validador de 10 min, secuencia Check-in / Check-out y restricción del mismo día
    const lastLog = await prisma.attendanceLog.findFirst({
      where: { userId: data.userId },
      orderBy: { timestamp: 'desc' }
    });

    const now = new Date();

    if (lastLog) {
      const diffMinutes = (now.getTime() - lastLog.timestamp.getTime()) / (1000 * 60);
      if (diffMinutes < 10) {
        return { success: false, error: "Debes esperar al menos 10 minutos entre registros." };
      }

      const mxFormatter = new Intl.DateTimeFormat('es-MX', { 
        timeZone: 'America/Mexico_City', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const isSameDay = mxFormatter.format(now) === mxFormatter.format(lastLog.timestamp);

      if (data.type === 'CHECK_OUT') {
        if (!isSameDay) {
          return { success: false, error: "Solo puedes registrar tu salida el mismo día que registraste tu entrada." };
        }
        if (lastLog.type === 'CHECK_OUT') {
          return { success: false, error: "Tu último registro ya fue una Salida. Debes registrar una Entrada primero." };
        }
      } else if (data.type === 'CHECK_IN') {
        if (isSameDay && lastLog.type === 'CHECK_IN') {
          return { success: false, error: "Ya tienes un registro de Entrada activo. Ahora debes registrar una Salida." };
        }
      }
    } else {
      if (data.type === 'CHECK_OUT') {
        return { success: false, error: "No tienes registros previos. Debes registrar una Entrada primero." };
      }
    }

    // Face Validation
    if (user.reqPhoto && !data.photoUrl) {
      return { success: false, error: "Se requiere captura de rostro para registrar asistencia." };
    }

    // GPS Validation
    let gpsWarningPrefix = "";
    if (user.reqGps) {
      if (data.latitude === undefined || data.longitude === undefined) {
        return { success: false, error: "Se requiere ubicación GPS para registrar asistencia." };
      }
      
      // Check Home Office coordinates first, otherwise use Branch and hrLocations list
      let isWithinRange = false;
      let targetLat: number | null = null;
      let targetLng: number | null = null;
      let targetRadius: number = 50;

      const toleranceMargin = 20; // 20m GPS tolerance margin to absorb drift/fluctuations

      // Haversine helper
      const calcDist = (lt1: number, ln1: number, lt2: number, ln2: number) => {
        const R = 6371e3; // metres
        const p1 = lt1 * Math.PI/180;
        const p2 = lt2 * Math.PI/180;
        const dLat = (lt2 - lt1) * Math.PI/180;
        const dLon = (ln2 - ln1) * Math.PI/180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(p1) * Math.cos(p2) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      if (user.homeLat !== null && user.homeLng !== null) {
        targetLat = user.homeLat;
        targetLng = user.homeLng;
        targetRadius = user.homeRadius || 50;
        
        const distance = calcDist(data.latitude, data.longitude, targetLat, targetLng);
        if (distance <= (targetRadius + toleranceMargin)) {
          isWithinRange = true;
        }
      } else {
        // Collect all allowed GPS checkpoints:
        // 1. User's primary branch location
        // 2. User's extra checked locations list
        const allowedLocations: { lat: number; lng: number; radius: number; name: string }[] = [];
        
        if (user.branch?.hrLocation) {
          allowedLocations.push({
            lat: user.branch.hrLocation.lat,
            lng: user.branch.hrLocation.lng,
            radius: user.branch.hrLocation.radius,
            name: user.branch.hrLocation.name
          });
        }
        
        if (user.hrLocations && user.hrLocations.length > 0) {
          user.hrLocations.forEach((loc: any) => {
            allowedLocations.push({
              lat: loc.lat,
              lng: loc.lng,
              radius: loc.radius,
              name: loc.name
            });
          });
        }

        if (allowedLocations.length > 0) {
          const locationDistances = allowedLocations.map(loc => {
            const distance = calcDist(data.latitude, data.longitude, loc.lat, loc.lng);
            return { loc, distance };
          });

          // Check if within range of ANY allowed location
          const matching = locationDistances.find(ld => ld.distance <= (ld.loc.radius + toleranceMargin));
          if (matching) {
            isWithinRange = true;
          } else {
            // Find closest location to report in the error message
            const closest = locationDistances.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr);
            targetLat = closest.loc.lat;
            targetLng = closest.loc.lng;
            targetRadius = closest.loc.radius;
          }
        } else {
          // No allowed locations defined at all, bypass check
          isWithinRange = true;
        }
      }

      if (!isWithinRange && targetLat !== null && targetLng !== null) {
        const distance = calcDist(data.latitude, data.longitude, targetLat, targetLng);
        if (user.flexibleGps) {
          gpsWarningPrefix = `[⚠️ Fuera de Rango: ${Math.round(distance)}m] `;
        } else {
          return { 
            success: false, 
            error: `Estás fuera del radio permitido de asistencia (distancia más cercana: ${Math.round(distance)}m, permitido: ${targetRadius}m). Si estás en tu lugar de trabajo, solicita a tu administrador verificar tus coordenadas en Preferencias o activar 'GPS Flexible' en tu perfil.` 
          };
        }
      }
    }

    // Determine if late and enforce strict checkin
    let status = 'ON_TIME';
    if (data.type === 'CHECK_IN') {
      let expectedHour = 9;
      let expectedMinute = 0;
      let hasSchedule = false;

      const mxDateStr = now.toLocaleString("en-US", { timeZone: "America/Mexico_City" });
      const mxDate = new Date(mxDateStr);

      if (user.workScheduleMatrix) {
        try {
          const sched = JSON.parse(user.workScheduleMatrix);
          const dayMap = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
          const currentDayStr = dayMap[mxDate.getDay()];
          
          if (sched[currentDayStr] && sched[currentDayStr].length >= 1) {
            hasSchedule = true;
            const [hh, mm] = sched[currentDayStr][0].split(':');
            expectedHour = parseInt(hh, 10);
            expectedMinute = parseInt(mm, 10);
          } else if (user.strictCheckinTime) {
             return { success: false, error: "No tienes un horario asignado para el día de hoy según tu matriz de trabajo." };
          }
        } catch(e: any) {
           if (e.message?.includes("No tienes un horario")) return { success: false, error: e.message };
        }
      } else if (user.strictCheckinTime) {
         return { success: false, error: "No tienes un horario asignado para el día de hoy según tu matriz de trabajo." };
      }

      if (hasSchedule) {
        const nowMins = mxDate.getHours() * 60 + mxDate.getMinutes();
        const expectedMins = expectedHour * 60 + expectedMinute;
        const diffMins = nowMins - expectedMins;

        if (user.strictCheckinTime) {
          if (diffMins < -30 || diffMins > 30) {
            return { success: false, error: `Ventana estricta: Tu horario es ${expectedHour.toString().padStart(2, '0')}:${expectedMinute.toString().padStart(2, '0')}. Solo puedes hacer check-in +/- 30 minutos.` };
          }
        }

        if (diffMins > 15) {
          status = 'LATE';
        }
      } else {
        // Fallback
        if (mxDate.getHours() >= 9 && mxDate.getMinutes() > 15) {
          status = 'LATE';
        }
      }
    }

    const log = await prisma.attendanceLog.create({
      data: {
        userId: data.userId,
        type: data.type,
        status: gpsWarningPrefix ? 'OUTSIDE_RADIUS' : status,
        timestamp: new Date(),
        lat: data.latitude,
        lng: data.longitude,
        photoUrl: data.photoUrl,
        deviceInfo: gpsWarningPrefix + (data.deviceInfo || '')
      }
    });

    revalidatePath('/mi-portal');
    return { 
      success: true, 
      log: {
        ...log,
        timestamp: log.timestamp.toISOString() // Serialize Date to string
      } 
    };
  } catch (e: any) {
    console.error("Error in registerAttendance Server Action:", e);
    return { success: false, error: e.message || "Error de red o base de datos." };
  }
}

export async function registerFaceDescriptor(data: {
  userId: string;
  descriptor: string;
}) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);
    
    if (!session?.userId || session.userId !== data.userId) {
      return { success: false, error: "No autorizado" };
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        faceDescriptor: data.descriptor
      }
    });

    revalidateTag(`user-${data.userId}`);
    revalidatePath('/mi-portal');
    return { success: true };
  } catch (e: any) {
    console.error("Error in registerFaceDescriptor:", e);
    return { success: false, error: e.message || "Error al actualizar registro facial." };
  }
}

export async function registerAttendanceAdmin(data: {
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
  notes?: string;
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado. Se requieren permisos de administrador o recursos humanos.");
  }

  const logTimestamp = new Date(data.timestamp);

  const log = await prisma.attendanceLog.create({
    data: {
      userId: data.userId,
      type: data.type,
      status: 'OK',
      timestamp: logTimestamp,
      deviceInfo: data.notes ? `Registro Manual (Admin): ${data.notes}` : 'Registro Manual (Admin)'
    }
  });

  revalidatePath('/rh/monitoreo');
  revalidatePath('/rh/reportes');
  return { success: true, log };
}

export async function createLeaveRequest(data: {
  userId: string;
  type: string; // 'VACATION', 'SICK_LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'PATERNITY_LEAVE'
  startDate: Date | string;
  endDate: Date | string;
  reason?: string;
}) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);
    
    if (!session?.userId || session.userId !== data.userId) {
      return { success: false, error: "No autorizado" };
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (start > end) {
      return { success: false, error: "La fecha de inicio no puede ser posterior a la fecha de fin." };
    }

    const request = await prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        type: data.type,
        startDate: start,
        endDate: end,
        status: 'PENDING',
        notes: data.reason
      }
    });

    revalidatePath('/mi-portal');
    return { success: true, request };
  } catch (e: any) {
    console.error("Error in createLeaveRequest:", e);
    return { success: false, error: e.message || "Error al crear la solicitud." };
  }
}

export async function createIncidentAdmin(data: {
  userId: string;
  type: string; // 'VACATION', 'SICK_LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'PATERNITY_LEAVE', 'FALTA', 'RETARDO'
  startDate: Date | string;
  endDate: Date | string;
  reason?: string;
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado. Se requieren permisos de administrador o recursos humanos.");
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (start > end) {
    throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin.");
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: data.userId,
      type: data.type,
      startDate: start,
      endDate: end,
      status: 'APPROVED', // Aprobado automáticamente porque lo crea RH
      notes: data.reason
    }
  });

  revalidatePath('/rh/calendario');
  revalidatePath('/rh/tramites');
  return { success: true, request };
}

export async function updateLeaveRequestStatus(id: string, status: 'APPROVED' | 'REJECTED') {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado");
  }

  const request = await prisma.leaveRequest.update({
    where: { id },
    data: { status }
  });

  revalidatePath('/rh/tramites');
  revalidatePath('/mi-portal');
  return { success: true, request };
}

export async function calculatePayroll(startDateStr: string, endDateStr: string, discountLates: boolean = false) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  // Get active branch users
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const users = await prisma.user.findMany({
    where: { branchId: user?.branchId },
    include: {
      attendanceLogs: {
        where: {
          timestamp: { gte: startDate, lte: endDate }
        }
      },
      leaveRequests: {
        where: {
          status: 'APPROVED',
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        }
      }
    }
  });

  const payrollData = users.map(u => {
    // 1. Calculate days worked (requiring BOTH CHECK_IN and CHECK_OUT on the same day)
    const checkInDays = new Set<string>();
    const checkOutDays = new Set<string>();
    let lates = 0;

    const mxFormatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });

    u.attendanceLogs.forEach(log => {
      const dateStr = mxFormatter.format(log.timestamp);
      if (log.type === 'CHECK_IN') {
        checkInDays.add(dateStr);
        if (log.status === 'LATE') lates++;
      } else if (log.type === 'CHECK_OUT') {
        checkOutDays.add(dateStr);
      }
    });

    let workedDays = 0;
    checkInDays.forEach(day => {
      if (checkOutDays.has(day)) {
        workedDays++;
      }
    });

    // 2. Calculate leave days overlapping with period
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    u.leaveRequests.forEach(req => {
      // Find overlap
      const start = req.startDate < startDate ? startDate : req.startDate;
      const end = req.endDate > endDate ? endDate : req.endDate;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive

      if (['VACATION', 'PAID_LEAVE', 'SICK_LEAVE', 'PATERNITY_LEAVE'].includes(req.type)) {
        paidLeaveDays += diffDays;
      } else if (req.type === 'UNPAID_LEAVE') {
        unpaidLeaveDays += diffDays;
      }
    });

    // Total days in period
    const periodDiffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const periodDays = Math.ceil(periodDiffTime / (1000 * 60 * 60 * 24));

    // Assuming simple logic: absences = periodDays - workedDays - paidLeaveDays - unpaidLeaveDays (ignoring weekends for simplicity here)
    // To be precise we need a working schedule, but we'll provide the data to the client.
    let absences = periodDays - (workedDays + paidLeaveDays + unpaidLeaveDays);
    if (absences < 0) absences = 0;
    
    // Unpaid leave days are also considered absences in terms of pay
    absences += unpaidLeaveDays;
    
    // Late absences rule (3 lates = 1 absence)
    const lateAbsences = discountLates ? Math.floor(lates / 3) : 0;
    absences += lateAbsences;

    const totalDaysToPay = Math.max(0, workedDays + paidLeaveDays - lateAbsences);
    let baseAmount = totalDaysToPay * u.dailySalary;

    let lunchDeduction = 0;
    if (u.deductLunchHour) {
      // Deduct 1 hour per worked day (assuming 8 hour standard shift for hourly rate calculation)
      lunchDeduction = (u.dailySalary / 8) * workedDays;
      baseAmount -= lunchDeduction;
    }

    return {
      id: u.id,
      name: u.name,
      rfc: u.rfc,
      dailySalary: u.dailySalary,
      workedDays,
      lates,
      paidLeaveDays,
      unpaidLeaveDays,
      absences,
      lunchDeduction,
      totalToPay: baseAmount
    };
  });

  return { success: true, data: payrollData };
}

export async function getGlobalAttendanceLogs(startDateStr: string, endDateStr: string) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  const logs = await prisma.attendanceLog.findMany({
    where: { 
      timestamp: { gte: startDate, lte: endDate },
      user: {
        tenantId: session.tenantId
      }
    },
    include: { user: { select: { name: true, branch: { select: { name: true } } } } },
    orderBy: { timestamp: 'asc' }
  });

  const data = logs.map(l => ({
    Empleado: l.user?.name || 'Desconocido',
    Sucursal: l.user?.branch?.name || 'Sin Sucursal',
    Tipo: l.type === 'CHECK_IN' ? 'Entrada' : 'Salida',
    Fecha: new Date(l.timestamp).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }),
    Hora: new Date(l.timestamp).toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' }),
    Estado: l.status,
    Notas: l.deviceInfo || ''
  }));

  return { success: true, data };
}

export async function editLeaveRequest(id: string, data: { type: string, startDate: string, endDate: string }) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado");
  }

  const req = await prisma.leaveRequest.update({
    where: { id },
    data: { 
      type: data.type, 
      startDate: new Date(data.startDate), 
      endDate: new Date(data.endDate), 
      status: 'PENDING' 
    }
  });

  revalidatePath('/rh/tramites');
  revalidatePath('/mi-portal');
  return { success: true, req };
}

export async function getFilteredAttendanceLogs(filters: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  branchId?: string;
  status?: string;
  type?: string;
}) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);
    
    if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return { success: false, error: "No autorizado" };
    }

    const where: any = {
      user: {
        tenantId: session.tenantId
      }
    };

    if (filters.userId && filters.userId !== 'ALL') {
      where.userId = filters.userId;
    }

    if (filters.branchId && filters.branchId !== 'ALL') {
      where.user.branchId = filters.branchId;
    }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters.type && filters.type !== 'ALL') {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        where.timestamp.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      include: {
        user: {
          include: {
            branch: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 200 // Limit results to prevent memory pressure
    });

    const serializedLogs = logs.map(l => ({
      ...l,
      timestamp: l.timestamp.toISOString(),
      user: {
        ...l.user,
        createdAt: l.user.createdAt.toISOString(),
        updatedAt: l.user.updatedAt.toISOString(),
        hireDate: l.user.hireDate ? l.user.hireDate.toISOString() : null,
        birthDate: l.user.birthDate ? l.user.birthDate.toISOString() : null,
        branch: l.user.branch ? {
          ...l.user.branch,
          createdAt: l.user.branch.createdAt.toISOString(),
          updatedAt: l.user.branch.updatedAt.toISOString()
        } : null
      }
    }));

    return { success: true, logs: serializedLogs };
  } catch (e: any) {
    console.error("Error in getFilteredAttendanceLogs:", e);
    return { success: false, error: e.message || "Error al consultar historial." };
  }
}
