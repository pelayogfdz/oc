const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('docker exec -i caanma-app node -e "console.log(\'OK\')"', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });



