const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  const testScript = `
const { PrismaClient } = require('@prisma/client');
const Facturapi = require('facturapi').default || require('facturapi');

const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_officecity' } } });

async function run() {
  const branchSettings = await prisma.branchSettings.findFirst({
    where: { configJson: { not: null } }
  });

  const config = JSON.parse(branchSettings.configJson);
  const facturacion = config.facturacion || {};
  const apiKey = facturacion.apiTokenLive || facturacion.apiTokenTest || facturacion.apiKey;
  console.log('Using ApiKey prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');

  const facturapi = new Facturapi(apiKey);

  console.log('--- Testing Variant A: { relationship: "01", documents: ["..."] } ---');
  try {
    const payloadA = {
      customer: {
        legal_name: 'PUBLICO EN GENERAL',
        tax_id: 'XAXX010101000',
        tax_system: '616',
        address: { zip: '01000' }
      },
      items: [
        {
          product: {
            description: 'Devolución de mercancía',
            product_key: '84111506',
            price: 100,
            tax_included: true,
            unit_key: 'H87'
          },
          quantity: 1
        }
      ],
      type: 'E',
      payment_form: '15',
      use: 'G02',
      related_documents: [
        {
          relationship: '01',
          documents: ['550e8400-e29b-41d4-a716-446655440000']
        }
      ]
    };
    // We only test validation or draft
    await facturapi.invoices.create(payloadA);
    console.log('Variant A accepted!');
  } catch(e) {
    console.log('Variant A error:', e.message);
  }

  console.log('\\n--- Testing Variant B: { relationship: "01", uuid: "..." } ---');
  try {
    const payloadB = {
      customer: {
        legal_name: 'PUBLICO EN GENERAL',
        tax_id: 'XAXX010101000',
        tax_system: '616',
        address: { zip: '01000' }
      },
      items: [
        {
          product: {
            description: 'Devolución de mercancía',
            product_key: '84111506',
            price: 100,
            tax_included: true,
            unit_key: 'H87'
          },
          quantity: 1
        }
      ],
      type: 'E',
      payment_form: '15',
      use: 'G02',
      related_documents: [
        {
          relationship: '01',
          uuid: '550e8400-e29b-41d4-a716-446655440000'
        }
      ]
    };
    await facturapi.invoices.create(payloadB);
    console.log('Variant B accepted!');
  } catch(e) {
    console.log('Variant B error:', e.message);
  }

  await prisma.$disconnect();
}

run();
`;

  conn.exec('docker exec -i caanma-app node', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
    stream.write(testScript);
    stream.end();
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
