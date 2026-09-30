const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const cmd = process.argv.slice(2).join(' ');
if (!cmd) {
    console.error('Usage: node scripts/ssh_runner.js "<cmd>"');
    process.exit(1);
}

const conn = new Client();
conn.on('ready', () => {
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', (code) => {
            conn.end();
            process.exit(code || 0);
        });
    });
}).on('error', (err) => {
    console.error('SSH error:', err);
    process.exit(1);
}).connect({
    host,
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync(privateKeyPath),
    readyTimeout: 15000
});
