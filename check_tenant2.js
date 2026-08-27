const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const scriptStr = `
const { PrismaClient } = require('/app/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@db:5432/neondb?sslmode=disable' } } });
async function run() {
  const tenants = await prisma.tenant.findMany();
  console.log('Tenants:', tenants.map(t => t.id + ' -> ' + t.name));
}
run().catch(console.error).finally(() => prisma.$disconnect());
`;
const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  conn.exec(`docker exec -i caanma-app sh -c "echo '${scriptB64}' | base64 -d > /tmp/check_tenant.js && node /tmp/check_tenant.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
