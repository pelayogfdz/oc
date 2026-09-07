const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  const commands = [
    'ls -la /root/.ssh',
    'ssh -T git@github.com || true'
  ].join(' ; ');

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
