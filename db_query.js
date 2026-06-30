const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== DB QUERY START ===");
    try {
        const sessions = await prisma.whatsAppSession.findMany();
        console.log("WhatsApp Sessions:", JSON.stringify(sessions, null, 2));
        
        const branches = await prisma.branch.findMany({
            select: { id: true, name: true }
        });
        console.log("Branches:", JSON.stringify(branches, null, 2));
    } catch (e) {
        console.error("DB Query error:", e);
    }
    console.log("=== DB QUERY END ===");
}

main().finally(() => prisma.$disconnect());





