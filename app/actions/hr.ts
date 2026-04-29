'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function registerAttendance(data: {
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  latitude?: number;
  longitude?: number;
  photoUrl?: string;
  deviceInfo?: string;
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || session.userId !== data.userId) {
    throw new Error("No autorizado");
  }

  // Find user and branch to get rules (if applicable)
  const user = await prisma.user.findUnique({
    where: { id: data.userId },
    include: { branch: { include: { hrLocation: true } } }
  });

  if (!user) throw new Error("Usuario no encontrado");

  // Face Validation
  if (user.reqPhoto && !data.photoUrl) {
    throw new Error("Se requiere captura de rostro para registrar asistencia.");
  }

  // GPS Validation
  if (user.reqGps) {
    if (data.latitude === undefined || data.longitude === undefined) {
      throw new Error("Se requiere ubicación GPS para registrar asistencia.");
    }
    
    // Check Home Office coordinates first, otherwise use Branch HR Location
    let targetLat: number | null = null;
    let targetLng: number | null = null;
    let targetRadius: number = 50;

    if (user.homeLat !== null && user.homeLng !== null) {
      targetLat = user.homeLat;
      targetLng = user.homeLng;
      targetRadius = user.homeRadius || 50;
    } else if (user.branch?.hrLocation) {
      targetLat = user.branch.hrLocation.lat;
      targetLng = user.branch.hrLocation.lng;
      targetRadius = user.branch.hrLocation.radius;
    }

    if (targetLat !== null && targetLng !== null) {
      // Calculate distance using Haversine
      const R = 6371e3; // metres
      const lat1 = data.latitude * Math.PI/180;
      const lat2 = targetLat * Math.PI/180;
      const dLat = (targetLat - data.latitude) * Math.PI/180;
      const dLon = (targetLng - data.longitude) * Math.PI/180;

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      if (distance > targetRadius) {
        throw new Error(`Estás fuera del radio permitido de asistencia (distancia: ${Math.round(distance)}m, permitido: ${targetRadius}m).`);
      }
    }
  }

  // Determine if late (basic mock logic, usually requires schedule matrix matching)
  let status = 'ON_TIME';
  if (data.type === 'CHECK_IN') {
    const currentHour = new Date().getHours();
    // Example: If after 9:15 AM, mark as late. Ideally, read from user.workScheduleMatrix
    if (currentHour >= 9 && new Date().getMinutes() > 15) {
      status = 'LATE';
    }
  }

  const log = await prisma.attendanceLog.create({
    data: {
      userId: data.userId,
      type: data.type,
      status,
      timestamp: new Date(),
      lat: data.latitude,
      lng: data.longitude,
      photoUrl: data.photoUrl,
      deviceInfo: data.deviceInfo
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
}

export async function registerFaceDescriptor(data: {
  userId: string;
  descriptor: string;
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || session.userId !== data.userId) {
    throw new Error("No autorizado");
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      faceDescriptor: data.descriptor
    }
  });

  revalidatePath('/mi-portal');
  return { success: true };
}

export async function createLeaveRequest(data: {
  userId: string;
  type: string; // 'VACATION', 'SICK_LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'PATERNITY_LEAVE'
  startDate: Date | string;
  endDate: Date | string;
  reason?: string;
}) {
  const sessionCookie = (await cookies()).get('session')?.value;
  const session = await decrypt(sessionCookie);
  
  if (!session?.userId || session.userId !== data.userId) {
    throw new Error("No autorizado");
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
      status: 'PENDING'
    }
  });

  revalidatePath('/mi-portal');
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
    // 1. Calculate days worked (unique days with a CHECK_IN)
    const checkInDays = new Set<string>();
    let lates = 0;

    u.attendanceLogs.forEach(log => {
      if (log.type === 'CHECK_IN') {
        const dateStr = log.timestamp.toISOString().split('T')[0];
        checkInDays.add(dateStr);
        if (log.status === 'LATE') lates++;
      }
    });

    const workedDays = checkInDays.size;

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
    const baseAmount = totalDaysToPay * u.dailySalary;

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
      totalToPay: baseAmount
    };
  });

  return { success: true, data: payrollData };
}
