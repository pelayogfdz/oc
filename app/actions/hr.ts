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
    include: { branch: true }
  });

  if (!user) throw new Error("Usuario no encontrado");

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
      latitude: data.latitude,
      longitude: data.longitude,
      photoUrl: data.photoUrl,
      deviceInfo: data.deviceInfo,
      branchId: user.branchId || undefined
    }
  });

  revalidatePath('/mi-portal');
  return { success: true, log };
}
