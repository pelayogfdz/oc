const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  const nodeScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_officecity?sslmode=disable' } } });
    
    function buildSearchOr(term) {
      if (!term || !term.trim()) return [];
      const raw = term.trim();
      const clean = raw.replace(/^#/, '').trim();
      const noSpace = clean.replace(/\\s+/g, '');
      const withSpaceDash = clean.replace(/([a-zA-Z]+)-(\\d+)/, '$1 -$2');
      const withSpaceDash2 = clean.replace(/([a-zA-Z]+)\\s*-\\s*(\\d+)/, '$1 - $2');
      const withNoDash = clean.replace(/([a-zA-Z]+)\\s*-\\s*(\\d+)/, '$1$2');
      const digitsOnly = clean.replace(/\\D/g, '');

      const variants = Array.from(new Set([raw, clean, noSpace, withSpaceDash, withSpaceDash2, withNoDash])).filter(Boolean);

      const orList = [];
      for (const v of variants) {
        orList.push({ folio: { contains: v, mode: 'insensitive' } });
        orList.push({ invoiceFolio: { contains: v, mode: 'insensitive' } });
        orList.push({ invoiceId: { contains: v, mode: 'insensitive' } });
        orList.push({ id: { startsWith: v, mode: 'insensitive' } });
      }

      if (digitsOnly && digitsOnly.length >= 2) {
        orList.push({ folio: { contains: digitsOnly, mode: 'insensitive' } });
      }

      return orList;
    }

    async function run() {
      const testInputs = ['EL-2156', '#EL-2156', 'EL -2156', '2156'];
      for (const input of testInputs) {
        const orConditions = buildSearchOr(input);
        const results = await prisma.sale.findMany({
          where: {
            OR: orConditions
          },
          take: 3
        });
        console.log('Search input: "' + input + '" -> Found ' + results.length + ' results: ' + results.map(r => r.folio).join(', '));
      }
    }
    run().catch(console.error);
  `;

  conn.exec(`docker exec -i caanma-app node -e "${nodeScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
