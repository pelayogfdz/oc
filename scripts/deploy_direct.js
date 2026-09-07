const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');
const rootDir = path.join(__dirname, '..');
const tarPath = path.join(rootDir, 'update_deploy.tar.gz');

console.log('1. Packing modified files locally into update_deploy.tar.gz...');
if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

// Create tar excluding heavy node_modules, .next, .git, public/img/products
execSync('tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="public/img/products" --exclude="*.log" --exclude="*.tar.gz" -czf update_deploy.tar.gz app lib public prisma package.json package-lock.json next.config.ts tsconfig.json docker-compose.yml Dockerfile', { cwd: rootDir });

const archiveSizeMB = (fs.statSync(tarPath).size / 1024 / 1024).toFixed(2);
console.log(`Archive created. Size: ${archiveSizeMB} MB`);

const conn = new Client();
conn.on('ready', () => {
  console.log('2. Connected to Hetzner via SSH. Uploading archive via SFTP...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      return;
    }

    const readStream = fs.createReadStream(tarPath);
    const writeStream = sftp.createWriteStream('/root/update_deploy.tar.gz');

    writeStream.on('close', () => {
      console.log('3. Archive uploaded! Extracting, building and restarting web container on Hetzner...');
      if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

      const remoteCommands = [
        'mkdir -p /root/oc',
        'tar -xzf /root/update_deploy.tar.gz -C /root/oc',
        'rm -f /root/update_deploy.tar.gz',
        'cd /root/oc',
        'docker compose build web',
        'docker compose up -d --no-deps web',
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
