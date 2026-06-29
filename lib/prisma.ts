import { PrismaClient } from '@prisma/client';
import { decrypt } from './session';
import { execSync } from 'child_process';
import { URL } from 'url';
import { cache } from 'react';

const tenantDbNames: Record<string, string> = {
  '8b52cbcd-c956-4717-a1bd-02e57386aaa2': 'neondb_officecity',
  'db5d3949-f8dd-41f6-9627-90374d55d044': 'neondb_petqro',
  'cd1e1142-ae76-46aa-b2d2-e5de02904788': 'neondb_seit',
  '0d246cea-0220-4328-92b0-8a1387ce6a6d': 'neondb_pizca'
};

const masterUrl = process.env.DATABASE_URL!;
export const masterClient = new PrismaClient({
  datasources: { db: { url: masterUrl } }
});

// Cache for tenant Prisma clients
const clientCache: Record<string, PrismaClient> = {};

export function getClientForTenant(tenantId: string): PrismaClient {
  if (clientCache[tenantId]) {
    return clientCache[tenantId];
  }
  const dbName = tenantDbNames[tenantId];
  if (!dbName) {
    console.warn(`No database mapped for tenantId ${tenantId}, using master database.`);
    return masterClient;
  }
  const urlObj = new URL(masterUrl);
  urlObj.pathname = `/${dbName}`;
  const tenantUrl = urlObj.toString();
  
  const client = new PrismaClient({
    datasources: { db: { url: tenantUrl } }
  });
  clientCache[tenantId] = client;
  return client;
}

export const getTenantIdFromToken = cache(async (token: string): Promise<string | null> => {
  const tenants = await masterClient.tenant.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  for (const tenant of tenants) {
    const tenantClient = getClientForTenant(tenant.id);
    const settingsList = await tenantClient.branchSettings.findMany({
      where: {
        configJson: {
          contains: token
        }
      }
    });

    for (const settings of settingsList) {
      if (!settings.configJson) continue;
      try {
        const config = JSON.parse(settings.configJson);
        const b2cConfig = config.catalogo_b2c || {};
        if (b2cConfig.apiActive === true && b2cConfig.apiToken === token) {
          return tenant.id;
        }
      } catch (e) {}
    }
  }
  return null;
});

const getClientForRequest = cache(async (): Promise<PrismaClient> => {
  if (process.env.TEST_TENANT_ID) {
    return getClientForTenant(process.env.TEST_TENANT_ID);
  }
  try {
    const { cookies, headers } = await import('next/headers');
    
    // 1. Try to get tenantId from session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const payload = await decrypt(sessionCookie);
      if (payload && payload.tenantId) {
        return getClientForTenant(payload.tenantId);
      }
    }

    // 2. Try to get tenantId from Authorization header
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const tenantId = await getTenantIdFromToken(token);
        if (tenantId) {
          return getClientForTenant(tenantId);
        }
      }
    }
  } catch (e: any) {
    // Rethrow Next.js dynamic server usage errors so Next.js knows to make the page dynamic
    if (e && (e.name === 'DynamicServerError' || e.message?.includes('dynamic') || e.digest === 'DYNAMIC_SERVER_USAGE')) {
      throw e;
    }
    // cookies() or headers() throws error during static generation / pre-rendering,
    // or we are not in a request context. Fallback to master client.
  }
  return masterClient;
});

// Dynamically create a database for a new tenant and push Prisma schema
export async function createDatabaseForTenant(tenantId: string, slug: string, name: string) {
  const dbName = `neondb_${slug.replace(/[^a-zA-Z0-9]/g, '')}`;
  tenantDbNames[tenantId] = dbName;
  
  console.log(`[Multi-Tenant] Creating database ${dbName} for tenant ${name}...`);
  try {
    await masterClient.$executeRawUnsafe(`CREATE DATABASE ${dbName};`);
    console.log(`[Multi-Tenant] Database ${dbName} created successfully.`);
  } catch (err: any) {
    if (err.message && (err.message.includes('already exists') || err.message.includes('42P04'))) {
      console.log(`[Multi-Tenant] Database ${dbName} already exists.`);
    } else {
      console.error(`[Multi-Tenant] Failed to create database ${dbName}:`, err.message || err);
    }
  }

  // Push schema to the new database
  const urlObj = new URL(masterUrl);
  urlObj.pathname = `/${dbName}`;
  const tenantUrl = urlObj.toString();
  
  try {
    const originalDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = tenantUrl;
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    process.env.DATABASE_URL = originalDbUrl;
    console.log(`[Multi-Tenant] Prisma schema pushed successfully to ${dbName}.`);
  } catch (err) {
    console.error(`[Multi-Tenant] Failed to push Prisma schema to ${dbName}:`, err);
  }
}

// Copy essential registration/seed records from master database to new tenant database
export async function syncTenantDataToTenantDb(tenantId: string) {
  const dbName = tenantDbNames[tenantId];
  if (!dbName) return;
  const urlObj = new URL(masterUrl);
  urlObj.pathname = `/${dbName}`;
  const tenantUrl = urlObj.toString();
  const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });
  
  console.log(`[Multi-Tenant] Syncing initial tenant data to ${dbName}...`);
  try {
    try { await tenantPrisma.$executeRawUnsafe("SET session_replication_role = 'replica';"); } catch (e) {}

    // Copy Tenant
    const tenant = await masterClient.tenant.findUnique({ where: { id: tenantId } });
    if (tenant) {
      await tenantPrisma.tenant.upsert({
        where: { id: tenantId },
        create: tenant,
        update: tenant
      });
    }

    // Copy Branches
    const branches = await masterClient.branch.findMany({ where: { tenantId } });
    for (const b of branches) {
      await tenantPrisma.branch.upsert({
        where: { id: b.id },
        create: b,
        update: b
      });
      // Copy BranchSettings
      const settings = await masterClient.branchSettings.findUnique({ where: { branchId: b.id } });
      if (settings) {
        await tenantPrisma.branchSettings.upsert({
          where: { branchId: b.id },
          create: settings,
          update: settings
        });
      }
    }

    // Copy Users
    const users = await masterClient.user.findMany({ where: { tenantId } });
    for (const u of users) {
      await tenantPrisma.user.upsert({
        where: { id: u.id },
        create: u,
        update: u
      });
    }

    try { await tenantPrisma.$executeRawUnsafe("SET session_replication_role = 'origin';"); } catch (e) {}
    console.log(`[Multi-Tenant] Sync completed successfully for ${dbName}.`);
  } catch (err) {
    console.error(`[Multi-Tenant] Failed to sync tenant data to ${dbName}:`, err);
  } finally {
    await tenantPrisma.$disconnect();
  }
}

// Helper to determine if a method is a write operation
const writeMethods = new Set(['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany']);

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    // Intercept client-level database methods
    if (typeof prop === 'string' && prop.startsWith('$')) {
      if (prop === '$transaction') {
        return async function (arg1: any, arg2: any) {
          const client = await getClientForRequest();
          let result: any;
          if (typeof arg1 === 'function') {
            result = await client.$transaction(async (tx) => {
              return arg1(tx);
            }, arg2);
          } else {
            result = await client.$transaction(arg1, arg2);
          }

          // Check if a Tenant was created inside the transaction (e.g. registration flow)
          if (result && result.tenant && result.tenant.id) {
            try {
              const { id, slug, name } = result.tenant;
              await createDatabaseForTenant(id, slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'), name);
              await syncTenantDataToTenantDb(id);
            } catch (err) {
              console.error("[Multi-Tenant] Dynamic DB creation failure after transaction:", err);
            }
          }
          return result;
        };
      }
      return async function (...args: any[]) {
        const client = await getClientForRequest();
        return (client as any)[prop](...args);
      };
    }

    // Intercept model-level delegates (e.g. prisma.user, prisma.product)
    return new Proxy({} as any, {
      get(modelTarget, method) {
        if (typeof method !== 'string') return undefined;

        if (method.startsWith('_') || method === 'fields') {
          return async function (...args: any[]) {
            const client = await getClientForRequest();
            return (client as any)[prop][method](...args);
          };
        }

        return async function (...args: any[]) {
          const client = await getClientForRequest();
          const isWrite = writeMethods.has(method);
          const isUserOrTenant = prop === 'user' || prop === 'tenant' || prop === 'customRole';

          if (isWrite && isUserOrTenant) {
            // Write to master database first
            let masterResult: any;
            try {
              masterResult = await (masterClient as any)[prop][method](...args);
            } catch (err) {
              console.error(`[Multi-Tenant] Master database write failed for ${String(prop)}.${method}:`, err);
              throw err;
            }

            // Sync database provision if a Tenant was created directly
            if (prop === 'tenant' && method === 'create' && masterResult && masterResult.id) {
              try {
                const { id, slug, name } = masterResult;
                await createDatabaseForTenant(id, slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'), name);
                await syncTenantDataToTenantDb(id);
              } catch (err) {
                console.error("[Multi-Tenant] Dynamic DB creation failure after direct tenant create:", err);
              }
            }

            // Write to tenant database (only if it is different from master database)
            let tenantClient = client;
            if (isUserOrTenant) {
              let targetTenantId = null;
              if (args && args[0]) {
                const data = args[0].data || args[0];
                if (data) {
                  if (prop === 'tenant') {
                    targetTenantId = data.id || (args[0].where && args[0].where.id);
                  } else if (prop === 'user') {
                    targetTenantId = data.tenantId || (args[0].where && args[0].where.tenantId);
                  } else if (prop === 'customRole') {
                    targetTenantId = data.tenantId || (args[0].where && args[0].where.tenantId);
                  }
                }
              }

              if (!targetTenantId && args && args[0] && args[0].where && args[0].where.id) {
                try {
                  if (prop === 'tenant') {
                    targetTenantId = args[0].where.id;
                  } else if (prop === 'user') {
                    const dbUser = await masterClient.user.findUnique({
                      where: { id: args[0].where.id },
                      select: { tenantId: true }
                    });
                    if (dbUser) {
                      targetTenantId = dbUser.tenantId;
                    }
                  } else if (prop === 'customRole') {
                    const dbRole = await masterClient.customRole.findUnique({
                      where: { id: args[0].where.id },
                      select: { tenantId: true }
                    });
                    if (dbRole) {
                      targetTenantId = dbRole.tenantId;
                    }
                  }
                } catch (e) {
                  console.error("[Multi-Tenant] Failed to look up tenantId for write routing:", e);
                }
              }

              if (targetTenantId) {
                tenantClient = getClientForTenant(targetTenantId);
              }
            }

            if (tenantClient !== masterClient) {
              try {
                if (method === 'create' && masterResult && masterResult.id) {
                  if (args && args[0]) {
                    if (!args[0].data) {
                      args[0].data = {};
                    }
                    args[0].data.id = masterResult.id;
                  }
                }
                await (tenantClient as any)[prop][method](...args);
              } catch (err) {
                console.error(`[Multi-Tenant] Tenant database write failed for ${String(prop)}.${method}:`, err);
                throw err;
              }
            }
            return masterResult;
          }

          // For all other operations, route exclusively to the request-scoped client
          return (client as any)[prop][method](...args);
        };
      }
    });
  }
});

const TENANT_IDS = [
  '8b52cbcd-c956-4717-a1bd-02e57386aaa2', // OFFICE CITY
  'db5d3949-f8dd-41f6-9627-90374d55d044', // PETQRO
  'cd1e1142-ae76-46aa-b2d2-e5de02904788', // SEIT
  '0d246cea-0220-4328-92b0-8a1387ce6a6d'  // PIZCA
];

export function getAllTenantClients(): PrismaClient[] {
  const clients = [masterClient];
  for (const id of TENANT_IDS) {
    const client = getClientForTenant(id);
    if (client !== masterClient && !clients.includes(client)) {
      clients.push(client);
    }
  }
  return clients;
}

export async function resolveClientForSale(saleIdOrFolio: string): Promise<{ client: PrismaClient; sale: any } | null> {
  const cleanId = saleIdOrFolio.trim();
  const clients = getAllTenantClients();

  for (const client of clients) {
    try {
      const sale = await client.sale.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { id: { endsWith: cleanId.toLowerCase() } },
            { id: { endsWith: cleanId } },
            { folio: cleanId },
            { folio: { equals: cleanId, mode: 'insensitive' } },
            { folio: { endsWith: `-${cleanId}` } },
            { folio: { endsWith: `#${cleanId}` } }
          ]
        },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      });
      if (sale) {
        return { client, sale };
      }
    } catch (e) {
      // Ignore query errors for individual databases
    }
  }
  return null;
}

