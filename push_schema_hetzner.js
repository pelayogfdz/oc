const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const localSchema = fs.readFileSync(path.join(__dirname, 'prisma/schema.prisma'), 'utf8');
const schemaB64 = Buffer.from(localSchema).toString('base64');

const scriptStr = `
const { execSync } = require('child_process');
const dbs = [
  'neondb_officecity',
  'neondb_petqro',
  'neondb_seit',
  'neondb_pizca'
];

for (const db of dbs) {
  const url = \`postgresql://postgres:caanma_postgres_secure_2026@db:5432/\${db}?sslmode=disable\`;
  console.log(\`Pushing schema to \${db}...\`);
  try {
    const output = execSync(\`npx prisma db push --schema=/tmp/schema.prisma --skip-generate\`, {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'inherit'
    });
  } catch (e) {
    console.error(\`Failed pushing schema to \${db}:\`, e.message);
  }
}
`;

const conn = new Client();
conn.on('ready', () => {
  const scriptB64 = Buffer.from(scriptStr).toString('base64');
  // First upload the new schema to /tmp/schema.prisma, then run the push script
  conn.exec(`docker exec -i caanma-app sh -c "echo '${schemaB64}' | base64 -d > /tmp/schema.prisma && echo '${scriptB64}' | base64 -d > /tmp/push_schema.js && node /tmp/push_schema.js"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
