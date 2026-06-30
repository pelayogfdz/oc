const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== CHECK TENANTS ===");
    const branches = await prisma.branch.findMany({
        where: {
            id: {
                in: ['97fbcaee-b61c-4bdc-bb5f-ebacf98222bf', 'df4febf5-b5e0-4eb5-a39f-22fb23bbe121']
            }
        },
        select: { id: true, name: true, tenantId: true }
    });
    console.log(JSON.stringify(branches, null, 2));
}

main().finally(() => prisma.$disconnect());
