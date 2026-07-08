const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== DB QUERY START ===");
    try {
        const sysSettings = await prisma.systemSettings.findMany();
        console.log("System Settings:", JSON.stringify(sysSettings, null, 2));
    } catch (e) {
        console.error("DB Query error:", e);
    }
    console.log("=== DB QUERY END ===");
}

main().finally(() => prisma.$disconnect());





