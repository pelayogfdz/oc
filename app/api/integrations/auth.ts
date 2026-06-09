import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function authenticateToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return null;
  }

  // Find settings containing the token
  const settingsList = await prisma.branchSettings.findMany({
    where: {
      configJson: {
        contains: token
      }
    },
    include: {
      branch: true
    }
  });

  for (const settings of settingsList) {
    if (!settings.configJson) continue;
    try {
      const config = JSON.parse(settings.configJson);
      const b2cConfig = config.catalogo_b2c || {};
      
      if (b2cConfig.apiActive === true && b2cConfig.apiToken === token) {
        return {
          branch: settings.branch,
          tenantId: settings.branch.tenantId
        };
      }
    } catch (e) {
      // Ignore JSON parse errors for safety
    }
  }

  return null;
}
