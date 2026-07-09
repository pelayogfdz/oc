const https = require('https');

async function testHetzner() {
  console.log("1. Logging into Hetzner live site...");
  const loginRes = await fetch('https://caanma.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'testagent123@example.com', password: 'testpass' })
  });
  
  const loginText = await loginRes.text();
  console.log("Login response status:", loginRes.status);
  console.log("Login response:", loginText);

  const cookies = loginRes.headers.get('set-cookie');
  console.log("Cookies:", cookies);
  
  if (cookies) {
    console.log("\n2. Fetching /ventas with session...");
    const ventasRes = await fetch('https://caanma.com/ventas', {
      headers: {
        'Cookie': cookies
      }
    });
    console.log("Ventas response status:", ventasRes.status);
    if (ventasRes.status !== 200) {
      console.log("Ventas error body:", await ventasRes.text().then(t => t.substring(0, 500)));
    } else {
      console.log("Ventas works!");
    }
  }
}

testHetzner();
