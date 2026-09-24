const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');
const rootDir = path.join(__dirname, '..');
const tarPath = path.join(rootDir, 'fast_update.tar.gz');

console.log('1. Packing core source files and public assets...');
if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

// Exclude heavy dev files and product images (already stored on Hetzner persistent volume)
execSync('tar --exclude="prisma/dev.db" --exclude="public/img/products" --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="*.log" --exclude="*.tar.gz" --exclude="*.bundle" -czf fast_update.tar.gz app lib prisma public whatsapp-service package.json package-lock.json next.config.ts tsconfig.json docker-compose.yml Dockerfile', { cwd: rootDir });

const archiveSizeMB = (fs.statSync(tarPath).size / 1024 / 1024).toFixed(2);
console.log(`Archive created. Size: ${archiveSizeMB} MB`);

const conn = new Client();
conn.on('ready', () => {
  console.log('2. Connected to Hetzner via SSH. Uploading archive...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      process.exit(1);
    }

    const readStream = fs.createReadStream(tarPath);
    const writeStream = sftp.createWriteStream('/root/fast_update.tar.gz');

    writeStream.on('close', () => {
      console.log('3. Archive uploaded! Extracting, rebuilding and restarting container...');
      if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

      const remoteCommands = [
        'mkdir -p /root/oc',
        'tar -xzf /root/fast_update.tar.gz -C /root/oc',
        'rm -f /root/fast_update.tar.gz',
        'cd /root/oc',
        'docker compose build web whatsapp',
        'docker compose up -d --no-deps web whatsapp',
        'sleep 4',
        'docker compose exec -T web node -e "const { execSync } = require(\'child_process\'); [\'neondb\', \'neondb_officecity\', \'neondb_petqro\', \'neondb_seit\', \'neondb_pizca\'].forEach(db => { try { console.log(\'Syncing schema for: \' + db); execSync(\'npx prisma db push --skip-generate --accept-data-loss\', { env: { ...process.env, DATABASE_URL: \'postgresql://postgres:caanma_postgres_secure_2026@db:5432/\' + db + \'?sslmode=disable\' }, stdio: \'inherit\' }); } catch(e){ console.error(\'Error pushing to \' + db, e.message); } });" || true',
        'docker compose ps',
        'curl -s -I http://127.0.0.1:3000/login | head -n 5 || true'
      ].join(' && ');

      conn.exec(remoteCommands, (execErr, stream) => {
        if (execErr) {
          console.error('SSH Exec Error:', execErr);
          conn.end();
          process.exit(1);
        }

        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', (code) => {
          console.log(`\nDeployment completed with exit code: ${code}`);
          conn.end();
          process.exit(code || 0);
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
