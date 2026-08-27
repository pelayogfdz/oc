const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(docker exec -i caanma-app sh -c "echo 'Y29uc3QgeyBQcmlzbWFDbGllbnQgfSA9IHJlcXVpcmUoJy9hcHAvbm9kZV9tb2R1bGVzL0BwcmlzbWEvY2xpZW50Jyk7CmNvbnN0IHByaXNtYSA9IG5ldyBQcmlzbWFDbGllbnQoeyBkYXRhc291cmNlczogeyBkYjogeyB1cmw6ICdwb3N0Z3Jlc3FsOi8vcG9zdGdyZXM6Y2Fhbm1hX3Bvc3RncmVzX3NlY3VyZV8yMDI2QGRiOjU0MzIvbmVvbmRiP3NzbG1vZGU9ZGlzYWJsZScgfSB9IH0pOwphc3luYyBmdW5jdGlvbiBydW4oKSB7CiAgY29uc3QgdGVuYW50cyA9IGF3YWl0IHByaXNtYS50ZW5hbnQuZmluZE1hbnkoKTsKICBjb25zb2xlLmxvZygnVGVuYW50czonLCB0ZW5hbnRzLm1hcCh0ID0+IHQuaWQgKyAnIC0+ICcgKyB0Lm5hbWUpKTsKfQpydW4oKS5jYXRjaChjb25zb2xlLmVycm9yKS5maW5hbGx5KCgpID0+IHByaXNtYS4kZGlzY29ubmVjdCgpKTs=' | base64 -d > /tmp/check_tenant.js && node /tmp/check_tenant.js", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
