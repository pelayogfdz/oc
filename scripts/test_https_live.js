const https = require('https');

https.get('https://caanma.com', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('HTML Body length:', data.length);
    console.log('HTML Preview:', data.substring(0, 300));
  });
}).on('error', (err) => {
  console.error('HTTPS Error:', err.message);
});
