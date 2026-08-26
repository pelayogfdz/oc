const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to Hetzner. Executing pull, rebuild and deploy for web service in /root/oc...');

  const commands = [
    'cd /root/oc',
    'git pull origin main',
    'docker compose build web',
    'docker compose up -d --no-deps web',
    'docker compose ps'
  ].join(' && ');

  conn.exec(commands, (err, stream) => {
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
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
