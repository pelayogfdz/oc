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
    
    function getFolioVariants(term) {
      if (!term || !term.trim()) return [];
      const raw = term.trim();
      const clean = raw.replace(/^#/, '').trim();
      const noSpace = clean.replace(/\\s+/g, '');
      
      const match = clean.match(/^([a-zA-Z]+)\\s*-?\\s*(\\d+)$/);
      const variants = new Set([raw, clean, noSpace]);
      
      if (match) {
        const prefix = match[1];
        const num = match[2];
        variants.add(prefix + '-' + num);
        variants.add(prefix + ' -' + num);
        variants.add(prefix + ' - ' + num);
        variants.add(prefix + ' ' + num);
        variants.add(prefix + num);
      }
      return Array.from(variants).filter(Boolean);
    }

    async function run() {
      const searchTerm = 'EL-2156';
      const variants = getFolioVariants(searchTerm);
      const orList = [];
      for (const v of variants) {
        orList.push({ folio: { contains: v, mode: 'insensitive' } });
        orList.push({ invoiceFolio: { contains: v, mode: 'insensitive' } });
        orList.push({ invoiceId: { contains: v, mode: 'insensitive' } });
        orList.push({ id: { startsWith: v, mode: 'insensitive' } });
      }

      const branch = await prisma.branch.findFirst({ where: { name: { contains: 'Marques', mode: 'insensitive' } } });

      const sales = await prisma.sale.findMany({
        where: {
          branchId: branch?.id,
          OR: orList
        }
      });
      console.log('Query with EL-2156 found ' + sales.length + ' sales:');
      for (const s of sales) {
        console.log('- Found:', s.id, '| Folio: [' + s.folio + '] | Date:', s.createdAt, '| Total: $' + s.total);
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
