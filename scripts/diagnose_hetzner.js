const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Diagnosing Hetzner status...');

  const commands = [
    'docker compose -f /root/oc/docker-compose.yml ps',
    'docker logs --tail 40 caanma-app',
    'tail -n 30 /var/log/nginx/error.log || true',
    'curl -I -s http://127.0.0.1:3000 || true',
    'curl -I -k -s https://caanma.com || true'
  ].join(' && echo "=== NEXT ===" && ');

  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
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
