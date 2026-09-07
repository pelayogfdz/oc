const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

// 1. Create a git bundle locally
console.log('Creating local git bundle...');
const bundlePath = path.join(__dirname, '..', 'repo.bundle');
if (fs.existsSync(bundlePath)) fs.unlinkSync(bundlePath);
execSync('git bundle create repo.bundle HEAD main', { cwd: path.join(__dirname, '..') });

const conn = new Client();
conn.on('ready', () => {
  console.log('Uploading repo.bundle to Hetzner /root/oc...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }

    const readStream = fs.createReadStream(bundlePath);
    const writeStream = sftp.createWriteStream('/root/oc/repo.bundle');

    writeStream.on('close', () => {
      console.log('Bundle uploaded. Unbundling, rebuilding and starting container on Hetzner...');
      if (fs.existsSync(bundlePath)) fs.unlinkSync(bundlePath);

      const commands = [
        'cd /root/oc',
        'git fetch repo.bundle main:main_bundle',
        'git reset --hard main_bundle',
        'docker compose build web',
        'docker compose up -d --no-deps web',
        'docker compose ps'
      ].join(' && ');

      conn.exec(commands, (err, stream) => {
        if (err) {
          console.error('SSH Exec error:', err);
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
