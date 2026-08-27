const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(docker exec -i caanma-app sh -c "echo 'Y29uc3QgeyBQcmlzbWFDbGllbnQgfSA9IHJlcXVpcmUoJy9hcHAvbm9kZV9tb2R1bGVzL0BwcmlzbWEvY2xpZW50Jyk7CmNvbnN0IHByaXNtYSA9IG5ldyBQcmlzbWFDbGllbnQoeyBkYXRhc291cmNlczogeyBkYjogeyB1cmw6ICdwb3N0Z3Jlc3FsOi8vcG9zdGdyZXM6Y2Fhbm1hX3Bvc3RncmVzX3NlY3VyZV8yMDI2QGRiOjU0MzIvbmVvbmRiP3NzbG1vZGU9ZGlzYWJsZScgfSB9IH0pOwoKYXN5bmMgZnVuY3Rpb24gcnVuKCkgewogIGNvbnN0IGZvbGlvcyA9IFsnTUFULTE3MzAnLCAnTUFULTE3MzInXTsKICBjb25zdCBzYWxlcyA9IGF3YWl0IHByaXNtYS5zYWxlLmZpbmRNYW55KHsKICAgIHdoZXJlOiB7IAogICAgICBicmFuY2g6IHsgdGVuYW50SWQ6ICdkYjVkMzk0OS1mOGRkLTQxZjYtOTYyNy05MDM3NGQ1NWQwNDQnIH0sCiAgICAgIGZvbGlvOiB7IGluOiBmb2xpb3MgfQogICAgfSwKICAgIGluY2x1ZGU6IHsgaXRlbXM6IHsgaW5jbHVkZTogeyBwcm9kdWN0OiB0cnVlIH0gfSB9CiAgfSk7CgogIGZvciAoY29uc3QgcyBvZiBzYWxlcykgewogICAgY29uc3QgaXRlbXNTdW0gPSBzLml0ZW1zLnJlZHVjZSgoc3VtLCBpKSA9PiBzdW0gKyAoaS5wcmljZSAqIGkucXVhbnRpdHkpLCAwKTsKICAgIGNvbnNvbGUubG9nKFxuPT09IFNBTEUgID09PSk7CiAgICBjb25zb2xlLmxvZyhEYXRlOiApOwogICAgY29uc29sZS5sb2coREIgVG90YWw6ICk7CiAgICBjb25zb2xlLmxvZyhJdGVtc1N1bTogKTsKICAgIGNvbnNvbGUubG9nKEJyZWFrZG93bjogKTsKICAgIGNvbnNvbGUubG9nKE5vdGVzOiApOwogICAgY29uc29sZS5sb2coJ0l0ZW1zOicpOwogICAgZm9yIChjb25zdCBpdGVtIG9mIHMuaXRlbXMpIHsKICAgICAgY29uc29sZS5sb2coICAtIHggIChQcmljZTogKSA9ICk7CiAgICB9CiAgfQp9CnJ1bigpLmNhdGNoKGNvbnNvbGUuZXJyb3IpLmZpbmFsbHkoKCkgPT4gcHJpc21hLiRkaXNjb25uZWN0KCkpOw==' | base64 -d > /tmp/inspect.js && node /tmp/inspect.js", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
