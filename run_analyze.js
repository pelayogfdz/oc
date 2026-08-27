const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(docker exec -i caanma-app sh -c "echo 'Y29uc3QgeyBQcmlzbWFDbGllbnQgfSA9IHJlcXVpcmUoJy9hcHAvbm9kZV9tb2R1bGVzL0BwcmlzbWEvY2xpZW50Jyk7CmNvbnN0IHByaXNtYSA9IG5ldyBQcmlzbWFDbGllbnQoeyBkYXRhc291cmNlczogeyBkYjogeyB1cmw6ICdwb3N0Z3Jlc3FsOi8vcG9zdGdyZXM6Y2Fhbm1hX3Bvc3RncmVzX3NlY3VyZV8yMDI2QGRiOjU0MzIvbmVvbmRiP3NzbG1vZGU9ZGlzYWJsZScgfSB9IH0pOwoKYXN5bmMgZnVuY3Rpb24gcnVuKCkgewogIGNvbnN0IHNhbGVzID0gYXdhaXQgcHJpc21hLnNhbGUuZmluZE1hbnkoewogICAgd2hlcmU6IHsgCiAgICAgIGJyYW5jaDogeyB0ZW5hbnRJZDogJ2RiNWQzOTQ5LWY4ZGQtNDFmNi05NjI3LTkwMzc0ZDU1ZDA0NCcgfSwKICAgICAgYnJlYWtkb3duRGlzY291bnRzOiBmYWxzZQogICAgfSwKICAgIGluY2x1ZGU6IHsgaXRlbXM6IHRydWUsIGJyYW5jaDogdHJ1ZSB9CiAgfSk7CgogIGxldCBjb3VudCA9IDA7CiAgbGV0IGJ5QnJhbmNoID0ge307CgogIGZvciAoY29uc3QgcyBvZiBzYWxlcykgewogICAgY29uc3QgaXRlbXNTdW0gPSBzLml0ZW1zLnJlZHVjZSgoc3VtLCBpKSA9PiBzdW0gKyAoaS5wcmljZSAqIGkucXVhbnRpdHkpLCAwKTsKICAgIGlmIChpdGVtc1N1bSAtIHMudG90YWwgPiAwLjA1KSB7CiAgICAgIGNvdW50Kys7CiAgICAgIGNvbnN0IGJOYW1lID0gcy5icmFuY2g/Lm5hbWUgfHwgJ1Vua25vd24nOwogICAgICBieUJyYW5jaFtiTmFtZV0gPSAoYnlCcmFuY2hbYk5hbWVdIHx8IDApICsgMTsKICAgIH0KICB9CgogIGNvbnNvbGUubG9nKCdUb3RhbCBzYWxlcyB3aXRoIGRpc2NyZXBhbmN5OicsIGNvdW50KTsKICBjb25zb2xlLmxvZygnQnkgYnJhbmNoOicsIGJ5QnJhbmNoKTsKfQpydW4oKS5jYXRjaChjb25zb2xlLmVycm9yKS5maW5hbGx5KCgpID0+IHByaXNtYS4kZGlzY29ubmVjdCgpKTs=' | base64 -d > /tmp/analyze.js && node /tmp/analyze.js", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
