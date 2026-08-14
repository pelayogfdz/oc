'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getActiveBranch } from './auth';

export async function registerAttendance(data: {
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  deviceInfo?: string;
  timestamp?: string;
}) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);
    
    if (!session?.userId) {
      return { success: false, error: "No autorizado" };
    }

    const activeUser = await prisma.user.findUnique({ where: { id: session.userId } });
    const isAuthorized = session.userId === data.userId || activeUser?.role === 'ADMIN' || activeUser?.role === 'MANAGER';
    if (!isAuthorized) {
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

    const now = data.timestamp ? new Date(data.timestamp) : new Date();

    const tenant = user.tenantId ? await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { timezone: true } }) : null;
    const tenantTimezone = tenant?.timezone || 'America/Mexico_City';

    if (lastLog) {
      const diffMinutes = (now.getTime() - lastLog.timestamp.getTime()) / (1000 * 60);
      if (diffMinutes < 10) {
        return { success: false, error: "Debes esperar al menos 10 minutos entre registros." };
      }

      const mxFormatter = new Intl.DateTimeFormat('es-MX', { 
        timeZone: tenantTimezone, 
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
        
        const distance = calcDist(data.latitude!, data.longitude!, targetLat, targetLng);
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
            const distance = calcDist(data.latitude!, data.longitude!, loc.lat, loc.lng);
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
        const distance = calcDist(data.latitude!, data.longitude!, targetLat, targetLng);
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

      const mxDateStr = now.toLocaleString("en-US", { timeZone: tenantTimezone });
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
        timestamp: now,
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
        id: log.id,
        userId: log.userId,
        type: log.type,
        status: log.status,
        timestamp: log.timestamp.toISOString(),
        lat: log.lat,
        lng: log.lng,
        photoUrl: log.photoUrl,
        deviceInfo: log.deviceInfo
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
    
    if (!session?.userId) {
      return { success: false, error: "No autorizado" };
    }

    const activeUser = await prisma.user.findUnique({ where: { id: session.userId } });
    const isAuthorized = session.userId === data.userId || activeUser?.role === 'ADMIN' || activeUser?.role === 'MANAGER';
    
    if (!isAuthorized) {
      return { success: false, error: "No autorizado" };
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        faceDescriptor: data.descriptor
      }
    });

    revalidateTag(`user-${data.userId}`, 'max');
    revalidatePath('/mi-portal');
    return { success: true };
  } catch (e: any) {
    console.error("Error in registerFaceDescriptor:", e);
    return { success: false, error: e.message || "Error al actualizar registro facial." };
  }
}

export async function registerFingerprintCredential(data: {
  userId: string;
  credentialId: string;
  publicKey: string;
}) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);
    
    if (!session?.userId) {
      return { success: false, error: "No autorizado" };
    }

    const activeUser = await prisma.user.findUnique({ where: { id: session.userId } });
    const isAuthorized = session.userId === data.userId || activeUser?.role === 'ADMIN' || activeUser?.role === 'MANAGER';
    
    if (!isAuthorized) {
      return { success: false, error: "No autorizado" };
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        webauthnCredentialId: data.credentialId,
        webauthnPublicKey: data.publicKey
      }
    });

    revalidateTag(`user-${data.userId}`, 'max');
    revalidatePath('/mi-portal');
    return { success: true };
  } catch (e: any) {
    console.error("Error in registerFingerprintCredential:", e);
    return { success: false, error: e.message || "Error al actualizar registro de huella dactilar." };
  }
}

async function checkModifyAttendancePermission() {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) {
    throw new Error("No autorizado. Inicie sesión.");
  }
  
  if (session.role === 'ADMIN' || session.userId === 'pelayogfdz@gmail.com') {
    return true;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { customRole: true }
  });
  
  if (!user) {
    throw new Error("Usuario no encontrado.");
  }
  
  const rolePermissions = user.customRole?.permissions;
  const userPermissionsRaw = user.permissions;
  const mergedList: string[] = [];

  if (rolePermissions) {
    try {
      const parsed = JSON.parse(rolePermissions);
      if (Array.isArray(parsed)) mergedList.push(...parsed);
      else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
    } catch (e) {}
  }

  if (userPermissionsRaw) {
    try {
      const parsed = JSON.parse(userPermissionsRaw);
      if (Array.isArray(parsed)) mergedList.push(...parsed);
      else Object.keys(parsed).forEach((k) => { if (parsed[k]) mergedList.push(k); });
    } catch (e) {}
  }

  if (mergedList.includes('rh_modify_attendance')) {
    return true;
  }
  
  throw new Error("No autorizado. Se requiere el permiso: 'rh_modify_attendance'.");
}

export async function registerAttendanceAdmin(data: {
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
  status?: string;
  notes?: string;
}) {
  await checkModifyAttendancePermission();

  const logTimestamp = new Date(data.timestamp);

  const log = await prisma.attendanceLog.create({
    data: {
      userId: data.userId,
      type: data.type,
      status: data.status || 'OK',
      timestamp: logTimestamp,
      deviceInfo: data.notes ? `Registro Manual (Admin): ${data.notes}` : 'Registro Manual (Admin)'
    }
  });

  revalidatePath('/rh/monitoreo');
  revalidatePath('/rh/reportes');
  return { 
    success: true, 
    log: {
      id: log.id,
      userId: log.userId,
      type: log.type,
      status: log.status,
      timestamp: log.timestamp.toISOString(),
      lat: log.lat,
      lng: log.lng,
      photoUrl: log.photoUrl,
      deviceInfo: log.deviceInfo
    } 
  };
}

export async function updateAttendanceLog(data: {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
  status: string;
  notes?: string;
}) {
  await checkModifyAttendancePermission();

  const logTimestamp = new Date(data.timestamp);

  const log = await prisma.attendanceLog.update({
    where: { id: data.id },
    data: {
      type: data.type,
      timestamp: logTimestamp,
      status: data.status,
      deviceInfo: data.notes ? `Registro Manual (Admin): ${data.notes}` : undefined
    }
  });

  revalidatePath('/rh/monitoreo');
  revalidatePath('/rh/reportes');
  return { success: true, log };
}

export async function deleteAttendanceLog(id: string) {
  await checkModifyAttendancePermission();

  await prisma.attendanceLog.delete({
    where: { id }
  });

  revalidatePath('/rh/monitoreo');
  revalidatePath('/rh/reportes');
  return { success: true };
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

    const start = typeof data.startDate === 'string' ? new Date(data.startDate + 'T12:00:00Z') : new Date(data.startDate);
    const end = typeof data.endDate === 'string' ? new Date(data.endDate + 'T12:00:00Z') : new Date(data.endDate);

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
    return { 
      success: true, 
      request: {
        id: request.id,
        userId: request.userId,
        type: request.type,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        status: request.status,
        notes: request.notes,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString()
      } 
    };
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

  const start = typeof data.startDate === 'string' ? new Date(data.startDate + 'T12:00:00Z') : new Date(data.startDate);
  const end = typeof data.endDate === 'string' ? new Date(data.endDate + 'T12:00:00Z') : new Date(data.endDate);

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
  return { 
    success: true, 
    request: {
      id: request.id,
      userId: request.userId,
      type: request.type,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      status: request.status,
      notes: request.notes,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString()
    } 
  };
}

export async function updateIncidentAdmin(id: string, data: {
  userId: string;
  type: string;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string;
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado. Se requieren permisos de administrador o recursos humanos.");
  }

  const start = typeof data.startDate === 'string' ? new Date(data.startDate + 'T12:00:00Z') : new Date(data.startDate);
  const end = typeof data.endDate === 'string' ? new Date(data.endDate + 'T12:00:00Z') : new Date(data.endDate);

  if (start > end) {
    throw new Error("La fecha de inicio no puede ser posterior a la fecha de fin.");
  }

  const request = await prisma.leaveRequest.update({
    where: { id },
    data: {
      userId: data.userId,
      type: data.type,
      startDate: start,
      endDate: end,
      notes: data.reason
    }
  });

  revalidatePath('/rh/calendario');
  revalidatePath('/rh/tramites');
  return { success: true, request };
}

export async function deleteIncidentAdmin(id: string) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado. Se requieren permisos de administrador o recursos humanos.");
  }

  await prisma.leaveRequest.delete({
    where: { id }
  });

  revalidatePath('/rh/calendario');
  revalidatePath('/rh/tramites');
  return { success: true };
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
  return { 
    success: true, 
    request: {
      id: request.id,
      userId: request.userId,
      type: request.type,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      status: request.status,
      notes: request.notes,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString()
    } 
  };
}

export async function calculatePayroll(startDateStr: string, endDateStr: string, discountLates: boolean = false) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    throw new Error("No autorizado");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (!endDateStr.includes('T') && !endDateStr.includes(':')) {
    endDate.setHours(23, 59, 59, 999);
  }

  // Get active branch users
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const activeBranch = await getActiveBranch();
  const tenantId = session.tenantId || user?.tenantId;

  const whereClause: any = {
    tenantId,
    email: {
      not: {
        startsWith: 'inactivo_'
      }
    }
  };

  if (activeBranch.id !== 'GLOBAL') {
    whereClause.branchId = activeBranch.id;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
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

  const tenant = await prisma.tenant.findUnique({
    where: { id: session?.tenantId || undefined },
    select: { timezone: true, overtimeLimitHours: true }
  });
  const tenantTimezone = tenant?.timezone || 'America/Mexico_City';
  const overtimeLimitHours = tenant?.overtimeLimitHours !== undefined && tenant?.overtimeLimitHours !== null ? tenant.overtimeLimitHours : 8;

  const payrollData = users.map(u => {
    // 1. Calculate days worked and hours worked (matching CHECK_IN and CHECK_OUT on the same day)
    const logsByDay: Record<string, { checkIn?: Date, checkOut?: Date, isLate?: boolean }> = {};
    const mxFormatter = new Intl.DateTimeFormat('es-MX', { timeZone: tenantTimezone, year: 'numeric', month: '2-digit', day: '2-digit' });

    u.attendanceLogs.forEach(log => {
      const dateStr = mxFormatter.format(log.timestamp);
      if (!logsByDay[dateStr]) {
        logsByDay[dateStr] = {};
      }
      if (log.type === 'CHECK_IN') {
        if (!logsByDay[dateStr].checkIn || log.timestamp < logsByDay[dateStr].checkIn) {
          logsByDay[dateStr].checkIn = log.timestamp;
          logsByDay[dateStr].isLate = log.status === 'LATE';
        }
      } else if (log.type === 'CHECK_OUT') {
        if (!logsByDay[dateStr].checkOut || log.timestamp > logsByDay[dateStr].checkOut) {
          logsByDay[dateStr].checkOut = log.timestamp;
        }
      }
    });

    let workedDays = 0;
    let lates = 0;
    let workedHours = 0;
    let regularHours = 0;
    let doubleHours = 0;

    Object.keys(logsByDay).forEach(day => {
      const dayLogs = logsByDay[day];
      if (dayLogs.checkIn && dayLogs.checkOut) {
        workedDays++;
        if (dayLogs.isLate) lates++;

        const diffMs = dayLogs.checkOut.getTime() - dayLogs.checkIn.getTime();
        const hours = diffMs / (1000 * 60 * 60);
        if (hours > 0) {
          workedHours += hours;

          let netDayHours = hours;
          if (u.deductLunchHour) {
            netDayHours = Math.max(0, hours - 1);
          }

          if (netDayHours > overtimeLimitHours) {
            regularHours += overtimeLimitHours;
            doubleHours += (netDayHours - overtimeLimitHours);
          } else {
            regularHours += netDayHours;
          }
        }
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

    // Calculate scheduled working days in the period for this user
    let scheduledWorkingDays = 0;
    let hasParsedSchedule = false;
    let sched: any = null;
    if (u.workScheduleMatrix) {
      try {
        sched = JSON.parse(u.workScheduleMatrix);
        hasParsedSchedule = true;
      } catch (e) {}
    }

    const dayMap = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const msInDay = 24 * 60 * 60 * 1000;

    for (let currentMs = startMs; currentMs <= endMs; currentMs += msInDay) {
      const d = new Date(currentMs);
      const mxDateStr = d.toLocaleString("en-US", { timeZone: tenantTimezone });
      const mxDate = new Date(mxDateStr);
      const dayName = dayMap[mxDate.getDay()];

      if (hasParsedSchedule && sched) {
        if (sched[dayName] && sched[dayName].length >= 1) {
          scheduledWorkingDays++;
        }
      } else {
        // Default to Mon-Fri if no schedule matrix is configured
        if (dayName !== 'Sabado' && dayName !== 'Domingo') {
          scheduledWorkingDays++;
        }
      }
    }

    let absences = scheduledWorkingDays - (workedDays + paidLeaveDays);
    if (absences < 0) absences = 0;
    
    // Unpaid leave days are also considered absences in terms of pay
    absences += unpaidLeaveDays;
    
    // Late absences rule (3 lates = 1 absence)
    const lateAbsences = discountLates ? Math.floor(lates / 3) : 0;
    absences += lateAbsences;

    let baseAmount = 0;
    let lunchDeduction = 0;

    if (u.payrollType === 'POR_HORAS') {
      const hourlyRate = u.dailySalary;
      const doubleRate = u.overtimeBonus > 0 ? u.overtimeBonus : hourlyRate * 2;
      baseAmount = (regularHours * hourlyRate) + (doubleHours * doubleRate);
    } else {
      const totalDaysToPay = Math.max(0, workedDays + paidLeaveDays - lateAbsences);
      const hourlyRate = u.dailySalary / overtimeLimitHours;
      const doubleRate = u.overtimeBonus > 0 ? u.overtimeBonus : hourlyRate * 2;
      
      baseAmount = (totalDaysToPay * u.dailySalary) + (doubleHours * doubleRate);
      
      if (u.deductLunchHour) {
        lunchDeduction = hourlyRate * workedDays;
        baseAmount -= lunchDeduction;
      }
    }

    let baseAmountForSavings = 0;
    if (u.payrollType === 'POR_HORAS') {
      baseAmountForSavings = workedHours * u.dailySalary;
    } else {
      baseAmountForSavings = workedDays * u.dailySalary;
    }
    const savingsFundAmount = baseAmountForSavings * (u.savingsFundPercent / 100);
    const finalTotalToPay = baseAmount - savingsFundAmount;

    return {
      id: u.id,
      name: u.name,
      rfc: u.rfc,
      dailySalary: u.dailySalary,
      imssSalary: u.imssSalary,
      payrollType: u.payrollType,
      workedDays,
      lates,
      paidLeaveDays,
      unpaidLeaveDays,
      absences,
      lunchDeduction,
      workedHours,
      doubleHours,
      savingsFundPercent: u.savingsFundPercent,
      savingsFundAmount,
      totalToPay: finalTotalToPay
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

  const tenant = await prisma.tenant.findUnique({
    where: { id: session?.tenantId || undefined },
    select: { timezone: true }
  });
  const tenantTimezone = tenant?.timezone || 'America/Mexico_City';

  const data = logs.map(l => ({
    Empleado: l.user?.name || 'Desconocido',
    Sucursal: l.user?.branch?.name || 'Sin Sucursal',
    Tipo: l.type === 'CHECK_IN' ? 'Entrada' : 'Salida',
    Fecha: new Date(l.timestamp).toLocaleDateString('es-MX', { timeZone: tenantTimezone }),
    Hora: new Date(l.timestamp).toLocaleTimeString('es-MX', { timeZone: tenantTimezone }),
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
  return { 
    success: true, 
    req: {
      id: req.id,
      userId: req.userId,
      type: req.type,
      startDate: req.startDate.toISOString(),
      endDate: req.endDate.toISOString(),
      status: req.status,
      notes: req.notes,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString()
    } 
  };
}

export async function updateEmployeeVacationSettings(
  userId: string,
  initialVacationDays: number,
  vacationStartDate: string | null
) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session?.userId || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      throw new Error("No autorizado");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        initialVacationDays,
        vacationStartDate: vacationStartDate ? new Date(vacationStartDate) : null
      }
    });

    revalidatePath('/rh/tramites');
    return { success: true };
  } catch (e: any) {
    console.error("Error in updateEmployeeVacationSettings:", e);
    return { success: false, error: e.message };
  }
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

    const serializedLogs = logs.map(l => {
      const user = l.user;
      const branch = user?.branch;
      return {
        id: l.id,
        userId: l.userId,
        type: l.type,
        timestamp: l.timestamp.toISOString(),
        lat: l.lat,
        lng: l.lng,
        photoUrl: l.photoUrl,
        deviceInfo: l.deviceInfo,
        status: l.status,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          hireDate: user.hireDate ? user.hireDate.toISOString() : null,
          birthDate: user.birthDate ? user.birthDate.toISOString() : null,
          branch: branch ? {
            id: branch.id,
            name: branch.name,
            createdAt: branch.createdAt.toISOString(),
            updatedAt: branch.updatedAt.toISOString()
          } : null
        } : null
      };
    });

    return { success: true, logs: serializedLogs };
  } catch (e: any) {
    console.error("Error in getFilteredAttendanceLogs:", e);
    return { success: false, error: e.message || "Error al consultar historial." };
  }
}

export async function verifyUserPassword(userId: string, password: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Usuario no encontrado" };
    
    const bcrypt = await import('bcryptjs');
    if (user.password !== password) {
      const isMatch = await bcrypt.default.compare(password, user.password || '');
      if (!isMatch) return { success: false, error: "Contraseña incorrecta" };
    }
    return { success: true };
  } catch (e: any) {
    console.error("Error verifying password:", e);
    return { success: false, error: e.message || "Error al verificar contraseña" };
  }
}

export async function registerAttendanceByFingerprint(data: {
  credentialId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  latitude?: number;
  longitude?: number;
  deviceInfo?: string;
  timestamp?: string;
}) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        webauthnCredentialId: data.credentialId
      }
    });

    if (!user) {
      return { success: false, error: "Huella dactilar no reconocida o no asociada a ningún colaborador." };
    }

    // Invoke existing registerAttendance helper
    return await registerAttendance({
      userId: user.id,
      type: data.type,
      latitude: data.latitude,
      longitude: data.longitude,
      deviceInfo: data.deviceInfo,
      timestamp: data.timestamp
    });
  } catch (e: any) {
    console.error("Error in registerAttendanceByFingerprint Server Action:", e);
    return { success: false, error: e.message || "Error al registrar asistencia por huella dactilar." };
  }
}

export async function getEmployeePayrollSummary(startDateStr?: string, endDateStr?: string) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  if (!session?.userId) throw new Error("No autorizado");

  const now = new Date();
  const startDate = startDateStr 
    ? new Date(`${startDateStr}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = endDateStr 
    ? new Date(`${endDateStr}T23:59:59`)
    : new Date();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
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
      },
      sales: {
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED'
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          paymentMethod: true,
          invoiceId: true,
          customer: {
            select: { name: true }
          }
        }
      }
    }
  });

  if (!user) throw new Error("Usuario no encontrado");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId || user.tenantId || undefined },
    select: { timezone: true }
  });
  const timezone = tenant?.timezone || 'America/Mexico_City';

  // 1. Compute attendance logs
  const logsByDay: Record<string, { checkIn?: Date, checkOut?: Date, isLate?: boolean }> = {};
  const mxFormatter = new Intl.DateTimeFormat('es-MX', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });

  user.attendanceLogs.forEach(log => {
    const dateStr = mxFormatter.format(log.timestamp);
    if (!logsByDay[dateStr]) logsByDay[dateStr] = {};
    if (log.type === 'CHECK_IN') {
      if (!logsByDay[dateStr].checkIn || log.timestamp < logsByDay[dateStr].checkIn) {
        logsByDay[dateStr].checkIn = log.timestamp;
        logsByDay[dateStr].isLate = log.status === 'LATE';
      }
    } else if (log.type === 'CHECK_OUT') {
      if (!logsByDay[dateStr].checkOut || log.timestamp > logsByDay[dateStr].checkOut) {
        logsByDay[dateStr].checkOut = log.timestamp;
      }
    }
  });

  let workedDays = 0;
  let lates = 0;
  let workedHours = 0;
  let regularHours = 0;
  let doubleHours = 0;

  Object.keys(logsByDay).forEach(day => {
    const dayLogs = logsByDay[day];
    if (dayLogs.checkIn && dayLogs.checkOut) {
      workedDays++;
      if (dayLogs.isLate) lates++;

      const diffMs = dayLogs.checkOut.getTime() - dayLogs.checkIn.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      if (hours > 0) {
        workedHours += hours;

        let netDayHours = hours;
        if (user.deductLunchHour) {
          netDayHours = Math.max(0, hours - 1);
        }

        if (netDayHours > 8) {
          regularHours += 8;
          doubleHours += (netDayHours - 8);
        } else {
          regularHours += netDayHours;
        }
      }
    } else if (dayLogs.checkIn && !dayLogs.checkOut) {
      workedDays++;
      if (dayLogs.isLate) lates++;
      const diffMs = new Date().getTime() - dayLogs.checkIn.getTime();
      const hours = Math.max(0, diffMs / (1000 * 60 * 60));
      workedHours += hours;
      regularHours += Math.min(8, hours);
      if (hours > 8) doubleHours += (hours - 8);
    }
  });

  // Leave days calculation
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  user.leaveRequests.forEach(req => {
    const start = req.startDate < startDate ? startDate : req.startDate;
    const end = req.endDate > endDate ? endDate : req.endDate;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (['VACATION', 'PAID_LEAVE', 'SICK_LEAVE', 'PATERNITY_LEAVE'].includes(req.type)) {
      paidLeaveDays += diffDays;
    } else if (req.type === 'UNPAID_LEAVE') {
      unpaidLeaveDays += diffDays;
    }
  });

  const periodDiffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const periodDays = Math.max(1, Math.ceil(periodDiffTime / (1000 * 60 * 60 * 24)));
  let absences = Math.max(0, periodDays - (workedDays + paidLeaveDays));
  absences += unpaidLeaveDays;

  // Hourly Rate and Base Pay Calculation
  const isPorHoras = user.payrollType === 'POR_HORAS';
  const hourlyRate = isPorHoras ? (user.dailySalary || 0) : ((user.dailySalary || 0) / 8);
  const doubleRate = user.overtimeBonus > 0 ? user.overtimeBonus : (hourlyRate * 2);

  let basePay = 0;
  if (isPorHoras) {
    basePay = (regularHours * hourlyRate) + (doubleHours * doubleRate);
  } else {
    const paidDays = Math.max(0, workedDays + paidLeaveDays);
    basePay = (paidDays * (user.dailySalary || 0)) + (doubleHours * doubleRate);
    if (user.deductLunchHour) {
      basePay -= (hourlyRate * workedDays);
    }
  }

  // 2. Compute Sales & Commissions
  const totalSalesAmount = user.sales.reduce((sum, s) => sum + s.total, 0);
  const commissionPct = user.commissionPct || 0;
  const commissionsEarned = totalSalesAmount * (commissionPct / 100);

  // 3. Compute Bonuses
  const punctualityBonusEligible = lates === 0 && absences === 0 && (workedDays > 0 || paidLeaveDays > 0);
  const bonusPunctualityEarned = punctualityBonusEligible ? (user.bonusPunctuality || 0) : 0;

  const monthlyGoal = user.monthlyGoal || 0;
  const individualBonusEligible = monthlyGoal > 0 && totalSalesAmount >= monthlyGoal;
  const bonusAmountEarned = individualBonusEligible ? (user.bonusAmount || 0) : 0;

  let teamBonusEarned = 0;
  let teamBonusEligible = false;
  if (user.teamBonusAmount && user.teamBonusAmount > 0) {
    if (user.managerId || user.commissionRole === 'LIDER' || user.commissionRole === 'COORDINADOR') {
      teamBonusEligible = monthlyGoal > 0 && totalSalesAmount >= monthlyGoal;
      if (teamBonusEligible) teamBonusEarned = user.teamBonusAmount;
    }
  }

  const groceryBonusEarned = user.groceryBonus || 0;
  const transportBonusEarned = user.transportBonus || 0;

  const totalBonusesEarned = bonusPunctualityEarned + bonusAmountEarned + teamBonusEarned + groceryBonusEarned + transportBonusEarned;
  const totalEstimatedEarnings = basePay + commissionsEarned + totalBonusesEarned;

  const salesList = user.sales.map(s => ({
    id: s.id,
    total: s.total,
    date: s.createdAt.toISOString(),
    method: s.paymentMethod,
    invoiceId: s.invoiceId,
    customer: s.customer?.name || 'Público en General',
    commissionPct,
    commissionEarned: s.total * (commissionPct / 100)
  }));

  return {
    startDateStr: startDate.toISOString().split('T')[0],
    endDateStr: endDate.toISOString().split('T')[0],
    payrollType: user.payrollType || 'SUELDO_DIARIO',
    dailySalary: user.dailySalary || 0,
    hourlyRate,
    workedDays,
    workedHours,
    regularHours,
    doubleHours,
    lates,
    absences,
    paidLeaveDays,
    basePay,

    // Commissions
    totalSalesAmount,
    commissionPct,
    commissionsEarned,
    salesList,

    // Bonuses
    bonuses: {
      punctuality: {
        amount: user.bonusPunctuality || 0,
        earned: bonusPunctualityEarned,
        unlocked: punctualityBonusEligible,
        label: "Bono de Puntualidad y Asistencia"
      },
      individual: {
        amount: user.bonusAmount || 0,
        earned: bonusAmountEarned,
        unlocked: individualBonusEligible,
        monthlyGoal,
        label: "Bono Individual por Meta de Ventas"
      },
      team: {
        amount: user.teamBonusAmount || 0,
        earned: teamBonusEarned,
        unlocked: teamBonusEligible,
        label: "Bono de Equipo / Sucursal"
      },
      grocery: {
        amount: user.groceryBonus || 0,
        earned: groceryBonusEarned,
        unlocked: groceryBonusEarned > 0,
        label: "Vales / Bono de Despensa"
      },
      transport: {
        amount: user.transportBonus || 0,
        earned: transportBonusEarned,
        unlocked: transportBonusEarned > 0,
        label: "Bono de Transporte"
      }
    },
    totalBonusesEarned,
    totalEstimatedEarnings
  };
}


