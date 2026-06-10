const { PrismaClient } = require('@prisma/client');
const { URL } = require('url');

const masterUrl = "postgresql://neondb_owner:npg_qyaYGzkut09D@ep-withered-glade-anfun696-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const tenants = [
  { id: '8b52cbcd-c956-4717-a1bd-02e57386aaa2', name: 'Office City', db: 'neondb_officecity', isTargetForServicesExclusion: true },
  { id: 'db5d3949-f8dd-41f6-9627-90374d55d044', name: 'Petqro', db: 'neondb_petqro', isTargetForServicesExclusion: true },
  { id: 'cd1e1142-ae76-46aa-b2d2-e5de02904788', name: 'Seit', db: 'neondb_seit', isTargetForServicesExclusion: false },
  { id: '0d246cea-0220-4328-92b0-8a1387ce6a6d', name: 'Pizca', db: 'neondb_pizca', isTargetForServicesExclusion: false },
  { id: 'master', name: 'Master DB', db: 'neondb', isTargetForServicesExclusion: false }
];

async function migrate() {
  console.log("Starting showInWeb migration for all databases...");
  
  for (const tenant of tenants) {
    console.log(`\n--- Migrating database: ${tenant.db} (${tenant.name}) ---`);
    const urlObj = new URL(masterUrl);
    urlObj.pathname = `/${tenant.db}`;
    const dbUrl = urlObj.toString();
    
    const prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } }
    });
    
    try {
      // Step 1: Set showInWeb = true for all products
      const updateAll = await prisma.product.updateMany({
        data: {
          showInWeb: true
        }
      });
      console.log(`Set showInWeb = true for ${updateAll.count} products in ${tenant.db}`);
      
      // Step 2: If this is Office City or Petqro, set showInWeb = false for services
      if (tenant.isTargetForServicesExclusion) {
        const updateServices = await prisma.product.updateMany({
          where: {
            isService: true
          },
          data: {
            showInWeb: false
          }
        });
        console.log(`Set showInWeb = false for ${updateServices.count} services in ${tenant.db}`);
      }
    } catch (error) {
      console.error(`Error migrating database ${tenant.db}:`, error);
    } finally {
      await prisma.$disconnect();
    }
  }
  
  console.log("\nMigration completed.");
}

migrate();
