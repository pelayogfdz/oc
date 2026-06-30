const https = require('https');

async function main() {
  const token = "nfp_nexUS5mQ2ZQjWaeKVrQ8S6fJUwh4ET246d7c";
  const siteId = "f03175ba-ee09-4433-8000-bee2357d3b63";
  
  const options = {
    hostname: 'api.netlify.com',
    path: `/api/v1/sites/${siteId}/env`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (c) => data += c);
    res.on('end', () => {
      try {
        const env = JSON.parse(data);
        console.log("Netlify Environment Variables:");
        console.log(JSON.stringify(env, null, 2));
      } catch (err) {
        console.error("Parse error:", err);
      }
    });
  });

  req.on('error', (e) => {
    console.error("Error:", e);
  });
  req.end();
}

main().catch(console.error);
