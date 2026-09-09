const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');
const rootDir = path.join(__dirname, '..');
const tarPath = path.join(rootDir, 'fast_update.tar.gz');

console.log('1. Packing core source files...');
if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

// Exclude heavy files
execSync('tar --exclude="prisma/dev.db" --exclude="public/img" --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="*.log" --exclude="*.tar.gz" --exclude="*.bundle" -czf fast_update.tar.gz app lib prisma package.json package-lock.json next.config.ts tsconfig.json docker-compose.yml Dockerfile', { cwd: rootDir });

const archiveSizeMB = (fs.statSync(tarPath).size / 1024 / 1024).toFixed(2);
console.log(`Archive created. Size: ${archiveSizeMB} MB`);

const conn = new Client();
conn.on('ready', () => {
  console.log('2. Connected to Hetzner. Uploading archive...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    const readStream = fs.createReadStream(tarPath);
    const writeStream = sftp.createWriteStream('/root/fast_update.tar.gz');

    writeStream.on('close', () => {
      console.log('3. Archive uploaded! Extracting and building in Docker...');
      if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

      const remoteCommands = [
        'mkdir -p /root/oc',
        'tar -xzf /root/fast_update.tar.gz -C /root/oc',
        'rm -f /root/fast_update.tar.gz',
        'cd /root/oc',
        'docker compose build web',
        'docker compose up -d --no-deps web',
        'docker compose exec -T web npx prisma db push --accept-data-loss || true',
        'docker compose exec -T web node -e "const { PrismaClient } = require(\'@prisma/client\'); [\'neondb\', \'neondb_officecity\', \'neondb_petqro\', \'neondb_pizca\', \'neondb_seit\'].forEach(async db => { const p = new PrismaClient({ datasources: { db: { url: \\`postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/\\${db}\\` } } }); try { await p.\\$executeRawUnsafe(\`ALTER TABLE \\"DeliveryOrder\\" ADD COLUMN IF NOT EXISTS \\"shippingDate\\" TIMESTAMP(3);\`); await p.\\$executeRawUnsafe(\`CREATE INDEX IF NOT EXISTS \\"DeliveryOrder_shippingDate_idx\\" ON \\"DeliveryOrder\\"(\\"shippingDate\\");\`); } catch(e){} finally { await p.\\$disconnect(); } });" || true',
        'docker compose ps'
      ].join(' && ');

      conn.exec(remoteCommands, (err, stream) => {
        if (err) {
          console.error('SSH Exec Error:', err);
          conn.end();
          return;
        }

        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', (code) => {
          console.log(`\nDeployment finished with exit code ${code}`);
          conn.end();
        });
      });
    });

    readStream.pipe(writeStream);
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
