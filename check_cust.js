const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(docker exec -i caanma-app sh -c "echo 'Y29uc3QgeyBQcmlzbWFDbGllbnQgfSA9IHJlcXVpcmUoJy9hcHAvbm9kZV9tb2R1bGVzL0BwcmlzbWEvY2xpZW50Jyk7CmNvbnN0IHByaXNtYSA9IG5ldyBQcmlzbWFDbGllbnQoeyBkYXRhc291cmNlczogeyBkYjogeyB1cmw6ICdwb3N0Z3Jlc3FsOi8vcG9zdGdyZXM6Y2Fhbm1hX3Bvc3RncmVzX3NlY3VyZV8yMDI2QGRiOjU0MzIvbmVvbmRiX3BldHFybz9zc2xtb2RlPWRpc2FibGUnIH0gfSB9KTsKYXN5bmMgZnVuY3Rpb24gcnVuKCkgewogIGNvbnN0IGN1c3RvbWVyID0gYXdhaXQgcHJpc21hLmN1c3RvbWVyLmZpbmRGaXJzdCgpOwogIGNvbnNvbGUubG9nKE9iamVjdC5rZXlzKGN1c3RvbWVyKSk7Cn0KcnVuKCkuY2F0Y2goY29uc29sZS5lcnJvcikuZmluYWxseSgoKSA9PiBwcmlzbWEuJGRpc2Nvbm5lY3QoKSk7' | base64 -d > /tmp/check_cust.js && node /tmp/check_cust.js", (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '5.78.138.167', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(__dirname, 'HetznerKey.pem')) });
