'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { getActiveBranch } from "./auth";

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const permissions = formData.get('permissions') as string;
  const commissionRole = formData.get('commissionRole') as string || 'VENDEDOR';
  const commissionPct = parseFloat(formData.get('commissionPct') as string || '0');
  const monthlyGoal = parseFloat(formData.get('monthlyGoal') as string || '0');
  const bonusAmount = parseFloat(formData.get('bonusAmount') as string || '0');
  const teamBonusAmount = parseFloat(formData.get('teamBonusAmount') as string || '0');
  const rawManagerId = formData.get('managerId') as string;
  const managerId = rawManagerId && rawManagerId !== 'NONE' ? rawManagerId : null;
  
  // HR & Payroll fields
  const rfc = formData.get('rfc') as string;
  const curp = formData.get('curp') as string;
  const nss = formData.get('nss') as string;
  const taxRegime = formData.get('taxRegime') as string;
  const address = formData.get('address') as string;
  const phone = formData.get('phone') as string;
  const hireDateRaw = formData.get('hireDate') as string;
  const birthDateRaw = formData.get('birthDate') as string;
  const hireDate = hireDateRaw ? new Date(hireDateRaw) : null;
  const birthDate = birthDateRaw ? new Date(birthDateRaw) : null;
  
  const payrollType = formData.get('payrollType') as string;
  const dailySalary = parseFloat(formData.get('dailySalary') as string || '0');
  const bankName = formData.get('bankName') as string;
  const bankAccount = formData.get('bankAccount') as string;
  
  const bonusPunctuality = parseFloat(formData.get('bonusPunctuality') as string || '0');
  const bonusRule = formData.get('bonusRule') as string;
  const bonusMethod = formData.get('bonusMethod') as string;
  const overtimeBonus = parseFloat(formData.get('overtimeBonus') as string || '0');
  const groceryBonus = parseFloat(formData.get('groceryBonus') as string || '0');
  const transportBonus = parseFloat(formData.get('transportBonus') as string || '0');
  const deductLunchHour = formData.get('deductLunchHour') === 'on';
  const strictCheckinTime = formData.get('strictCheckinTime') === 'on';
  
  const reqGps = formData.get('reqGps') === 'on';
  const flexibleGps = formData.get('flexibleGps') === 'on';
  const reqPhoto = formData.get('reqPhoto') === 'on';
  const workScheduleMatrix = formData.get('workScheduleMatrix') as string;
  const faceDescriptor = formData.get('faceDescriptor') as string;
  const baselinePhoto = formData.get('baselinePhoto') as string;
  
  const homeLatRaw = formData.get('homeLat') as string;
  const homeLngRaw = formData.get('homeLng') as string;
  const homeRadiusRaw = formData.get('homeRadius') as string;
  const homeLat = homeLatRaw ? parseFloat(homeLatRaw) : null;
  const homeLng = homeLngRaw ? parseFloat(homeLngRaw) : null;
  const homeRadius = homeRadiusRaw ? parseFloat(homeRadiusRaw) : null;
  
  const hrLocationsRaw = formData.get('hrLocations') as string;
  const hrLocations = hrLocationsRaw ? JSON.parse(hrLocationsRaw) : [];
  
  const branchId = formData.get('branchId') as string;
  const branch = await getActiveBranch();
  if (!branch) throw new Error("No branch active");
  
  await prisma.user.create({
    data: {
      name, email, password, role, commissionRole, commissionPct, monthlyGoal, bonusAmount, teamBonusAmount, managerId,
      branchId: branchId || branch.id, tenantId: branch.tenantId, permissions,
      rfc, curp, nss, taxRegime, address, phone, hireDate, birthDate,
      payrollType, dailySalary, bankName, bankAccount,
      bonusPunctuality, bonusRule, bonusMethod, overtimeBonus, groceryBonus, transportBonus, deductLunchHour,
      reqGps, flexibleGps, reqPhoto, workScheduleMatrix, faceDescriptor, baselinePhoto, strictCheckinTime,
      homeLat, homeLng, homeRadius,
      hrLocations: {
        connect: hrLocations.map((id: string) => ({ id }))
      }
    } as any
  });
  
  revalidatePath('/preferencias/usuarios');
  return { success: true };
}

export async function updateUser(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const commissionRole = formData.get('commissionRole') as string;
  const commissionPct = parseFloat(formData.get('commissionPct') as string || '0');
  const monthlyGoal = parseFloat(formData.get('monthlyGoal') as string || '0');
  const bonusAmount = parseFloat(formData.get('bonusAmount') as string || '0');
  const teamBonusAmount = parseFloat(formData.get('teamBonusAmount') as string || '0');
  const rawManagerId = formData.get('managerId') as string;
  const managerId = rawManagerId && rawManagerId !== 'NONE' ? rawManagerId : null;
  const permissions = formData.get('permissions') as string;
  const password = formData.get('password') as string;
  
  // HR & Payroll fields
  const rfc = formData.get('rfc') as string;
  const curp = formData.get('curp') as string;
  const nss = formData.get('nss') as string;
  const taxRegime = formData.get('taxRegime') as string;
  const address = formData.get('address') as string;
  const phone = formData.get('phone') as string;
  const hireDateRaw = formData.get('hireDate') as string;
  const birthDateRaw = formData.get('birthDate') as string;
  const hireDate = hireDateRaw ? new Date(hireDateRaw) : null;
  const birthDate = birthDateRaw ? new Date(birthDateRaw) : null;
  
  const payrollType = formData.get('payrollType') as string;
  const dailySalary = parseFloat(formData.get('dailySalary') as string || '0');
  const bankName = formData.get('bankName') as string;
  const bankAccount = formData.get('bankAccount') as string;
  
  const bonusPunctuality = parseFloat(formData.get('bonusPunctuality') as string || '0');
  const bonusRule = formData.get('bonusRule') as string;
  const bonusMethod = formData.get('bonusMethod') as string;
  const overtimeBonus = parseFloat(formData.get('overtimeBonus') as string || '0');
  const groceryBonus = parseFloat(formData.get('groceryBonus') as string || '0');
  const transportBonus = parseFloat(formData.get('transportBonus') as string || '0');
  const deductLunchHour = formData.get('deductLunchHour') === 'on';
  const strictCheckinTime = formData.get('strictCheckinTime') === 'on';
  
  const reqGps = formData.get('reqGps') === 'on';
  const flexibleGps = formData.get('flexibleGps') === 'on';
  const reqPhoto = formData.get('reqPhoto') === 'on';
  const workScheduleMatrix = formData.get('workScheduleMatrix') as string;
  const faceDescriptor = formData.get('faceDescriptor') as string;
  const baselinePhoto = formData.get('baselinePhoto') as string;

  const homeLatRaw = formData.get('homeLat') as string;
  const homeLngRaw = formData.get('homeLng') as string;
  const homeRadiusRaw = formData.get('homeRadius') as string;
  const homeLat = homeLatRaw ? parseFloat(homeLatRaw) : null;
  const homeLng = homeLngRaw ? parseFloat(homeLngRaw) : null;
  const homeRadius = homeRadiusRaw ? parseFloat(homeRadiusRaw) : null;
  
  const hrLocationsRaw = formData.get('hrLocations') as string;
  const hrLocations = hrLocationsRaw ? JSON.parse(hrLocationsRaw) : [];
  
  const branchId = formData.get('branchId') as string;
  
  const updateData: any = { 
    name, email, role, branchId: branchId || undefined, commissionRole, commissionPct, monthlyGoal, bonusAmount, teamBonusAmount, managerId, permissions,
    rfc, curp, nss, taxRegime, address, phone, hireDate, birthDate,
    payrollType, dailySalary, bankName, bankAccount,
    bonusPunctuality, bonusRule, bonusMethod, overtimeBonus, groceryBonus, transportBonus, deductLunchHour,
    reqGps, flexibleGps, reqPhoto, workScheduleMatrix, faceDescriptor, baselinePhoto, strictCheckinTime,
    homeLat, homeLng, homeRadius
  };
  
  if (password) {
    updateData.password = password;
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...updateData,
      hrLocations: {
        set: hrLocations.map((locId: string) => ({ id: locId }))
      }
    }
  });
  
  revalidatePath('/preferencias/usuarios');
  return { success: true };
}

export async function deleteUser(id: string) {
  try {
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return { success: false, error: "Usuario no encontrado en el sistema." };
    }

    if (userToDelete.isSuperAdmin) {
      return { success: false, error: "No se puede eliminar a un Super Administrador del sistema." };
    }

    if (userToDelete.tenantId) {
      const oldestUser = await prisma.user.findFirst({
        where: { tenantId: userToDelete.tenantId },
        orderBy: { createdAt: 'asc' }
      });

      if (oldestUser && oldestUser.id === id) {
        return { success: false, error: "No se puede eliminar al creador original (propietario) de la cuenta." };
      }
    }

    await prisma.user.delete({ where: { id } });
    revalidatePath('/preferencias/usuarios');
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteUser:", error);
    
    // Check if it's a Prisma foreign key constraint violation (Code P2003)
    if (error.code === 'P2003') {
      return {
        success: false,
        error: "No se puede eliminar al usuario porque tiene historial activo en el sistema (por ejemplo: ventas realizadas, comisiones ganadas, traspasos de mercancía registrados o checadas de asistencia). Para conservar la integridad histórica de tu negocio, te sugerimos simplemente cambiar su contraseña para restringir su acceso, o desactivar su cuenta."
      };
    }
    
    return { 
      success: false, 
      error: "No se puede eliminar al usuario debido a registros históricos vinculados en la base de datos (ventas, compras, traspasos o asistencias). Te recomendamos cambiar su contraseña o desactivar su perfil en lugar de eliminarlo." 
    };
  }
}
