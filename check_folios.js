const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(docker exec -i caanma-app sh -c "echo 'Y29uc3QgeyBQcmlzbWFDbGllbnQgfSA9IHJlcXVpcmUoJy9hcHAvbm9kZV9tb2R1bGVzL0BwcmlzbWEvY2xpZW50Jyk7CmNvbnN0IHByaXNtYSA9IG5ldyBQcmlzbWFDbGllbnQoeyBkYXRhc291cmNlczogeyBkYjogeyB1cmw6ICdwb3N0Z3Jlc3FsOi8vcG9zdGdyZXM6Y2Fhbm1hX3Bvc3RncmVzX3NlY3VyZV8yMDI2QGRiOjU0MzIvbmVvbmRiX3BldHFybz9zc2xtb2RlPWRpc2FibGUnIH0gfSB9KTsKYXN5bmMgZnVuY3Rpb24gcnVuKCkgewogIGNvbnN0IHNhbGVzID0gYXdhaXQgcHJpc21hLnNhbGUuZmluZE1hbnkoewogICAgd2hlcmU6IHsgCiAgICAgIGJyYW5jaDogeyB0ZW5hbnRJZDogJ2RiNWQzOTQ5LWY4ZGQtNDFmNi05NjI3LTkwMzc0ZDU1ZDA0NCcgfSwKICAgICAgT1I6IFsKICAgICAgICB7IGZvbGlvOiB7IGNvbnRhaW5zOiAnMTczMCcgfSB9LAogICAgICAgIHsgZm9saW86IHsgY29udGFpbnM6ICcxNzMyJyB9IH0KICAgICAgXQogICAgfSwKICAgIHNlbGVjdDogeyBmb2xpbzogdHJ1ZSwgdG90YWw6IHRydWUgfQogIH0pOwogIGNvbnNvbGUubG9nKHNhbGVzKTsKfQpydW4oKS5jYXRjaChjb25zb2xlLmVycm9yKS5maW5hbGx5KCgpID0+IHByaXNtYS4kZGlzY29ubmVjdCgpKTs=' | base64 -d > /tmp/check_folios.js && node /tmp/check_folios.js", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
