const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Testing page endpoints from inside container and externally...');

  const routes = [
    '/',
    '/login',
    '/rh/calendario',
    '/productos',
    '/ventas',
    '/ventas/nueva',
    '/preferencias/facturacion',
    '/facturas/ventas',
    '/clientes',
    '/reportes/general'
  ];

  const curlCommands = routes.map(r => `echo "=== Route ${r} ===" && curl -s -o /dev/null -w "HTTP %{http_code} TotalTime: %{time_total}s\\n" http://127.0.0.1:3000${r}`).join(' && ');

  conn.exec(curlCommands, (err, stream) => {
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
