const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Fixing permissions and Nginx configuration...');

  const nginxConfig = `
server {
    server_name caanma.com www.caanma.com;

    location /img/products/ {
        root /root/oc/public;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri @proxy;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location @proxy {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/caanma.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/caanma.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.caanma.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = caanma.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name caanma.com www.caanma.com;
    return 404;
}
`.trim();

  // Write via temp file to avoid EOF bash escaping issues
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }

    const remoteFile = sftp.createWriteStream('/etc/nginx/sites-enabled/caanma.com');
    remoteFile.write(nginxConfig);
    remoteFile.end();

    remoteFile.on('close', () => {
      console.log('Nginx config written successfully.');
      const testCmd = 'chmod 755 /root && chmod -R 755 /root/oc/public && nginx -t && systemctl reload nginx && curl -I https://caanma.com/img/products/039800009166.jpg';
      conn.exec(testCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Exec error:', execErr);
          conn.end();
          return;
        }
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', (code) => {
          console.log(`\nCommands finished with exit code ${code}`);
          conn.end();
        });
      });
    });
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
