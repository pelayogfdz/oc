const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Checking remotes and pulling in /root/oc...');

  const commands = [
    'cd /root/oc',
    'git remote -v',
    'git pull origin main || git pull gitlab main',
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
      console.log(`\nFinished with code ${code}`);
      conn.end();
    });
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
