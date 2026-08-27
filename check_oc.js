const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(docker exec -i caanma-app sh -c "echo 'Y29uc3QgeyBQcmlzbWFDbGllbnQgfSA9IHJlcXVpcmUoJy9hcHAvbm9kZV9tb2R1bGVzL0BwcmlzbWEvY2xpZW50Jyk7CmNvbnN0IHByaXNtYSA9IG5ldyBQcmlzbWFDbGllbnQoeyBkYXRhc291cmNlczogeyBkYjogeyB1cmw6ICdwb3N0Z3Jlc3FsOi8vcG9zdGdyZXM6Y2Fhbm1hX3Bvc3RncmVzX3NlY3VyZV8yMDI2QGRiOjU0MzIvbmVvbmRiX29mZmljZWNpdHk/c3NsbW9kZT1kaXNhYmxlJyB9IH0gfSk7CmFzeW5jIGZ1bmN0aW9uIHJ1bigpIHsKICBjb25zdCBjID0gYXdhaXQgcHJpc21hLnByb2R1Y3QuY291bnQoeyB3aGVyZTogeyBicmFuY2hJZDogJ0dMT0JBTCcgfSB9KTsKICBjb25zb2xlLmxvZygnR2xvYmFsIHByb2R1Y3RzOicsIGMpOwogIAogIGNvbnN0IGMyID0gYXdhaXQgcHJpc21hLnByb2R1Y3QuY291bnQoeyB3aGVyZTogeyBicmFuY2hJZDogeyBub3Q6ICdHTE9CQUwnIH0gfSB9KTsKICBjb25zb2xlLmxvZygnQnJhbmNoIHByb2R1Y3RzOicsIGMyKTsKfQpydW4oKS5jYXRjaChjb25zb2xlLmVycm9yKS5maW5hbGx5KCgpID0+IHByaXNtYS4kZGlzY29ubmVjdCgpKTs=' | base64 -d > /tmp/check_oc.js && node /tmp/check_oc.js", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
