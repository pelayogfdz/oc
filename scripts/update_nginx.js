const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Configuring client_max_body_size in Nginx on Hetzner...');

  const nginxConfig = `server {
    server_name caanma.com www.caanma.com;

    client_max_body_size 50M;

    location /img/products/ {
        alias /root/oc/public/img/products/;
        autoindex off;
        expires 30d;
        add_header Cache-Control "public, no-transform";
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
`;

  const script = `
cat << 'EOF' > /etc/nginx/sites-available/caanma.com
${nginxConfig}
EOF
nginx -t && systemctl reload nginx
echo "Nginx updated and reloaded successfully!"
`;

  conn.exec(script, (err, stream) => {
    if (err) {
      console.error('SSH Exec Error:', err);
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
