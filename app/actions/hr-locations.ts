'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from './auth'

export async function getHrLocations() {
  try {
    const session = await getSession()
    if (!session?.tenantId) return []

    return await prisma.hrLocation.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Error fetching HR locations:', error)
    return []
  }
}

export async function createHrLocation(data: { name: string; lat: number; lng: number; radius: number }) {
  try {
    const session = await getSession()
    if (!session?.tenantId) return { success: false, error: 'No tenant found' }

    const loc = await prisma.hrLocation.create({
      data: {
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        radius: data.radius,
        tenantId: session.tenantId,
      },
    })
    revalidatePath('/rh/ubicaciones')
    revalidatePath('/preferencias/usuarios')
    return { success: true, id: loc.id }
  } catch (error: any) {
    console.error('Error creating HR location:', error)
    return { success: false, error: error.message }
  }
}

export async function updateHrLocation(id: string, data: { name: string; lat: number; lng: number; radius: number }) {
  try {
    const session = await getSession()
    if (!session?.tenantId) return { success: false, error: 'No tenant found' }

    await prisma.hrLocation.update({
      where: { id, tenantId: session.tenantId },
      data: {
        name: data.name,
        lat: data.lat,
        lng: data.lng,
        radius: data.radius,
      },
    })
    revalidatePath('/rh/ubicaciones')
    revalidatePath('/preferencias/usuarios')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating HR location:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteHrLocation(id: string) {
  try {
    const session = await getSession()
    if (!session?.tenantId) return { success: false, error: 'No tenant found' }

    await prisma.hrLocation.delete({
      where: { id, tenantId: session.tenantId },
    })
    revalidatePath('/rh/ubicaciones')
    revalidatePath('/preferencias/usuarios')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting HR location:', error)
    return { success: false, error: error.message }
  }
}
