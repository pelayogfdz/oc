const fs = require('fs');

// A 1x1 transparent PNG, scaled by Chrome. Wait, Chrome requires actual 192x192.
// Let's use a very small valid PNG data URI for a 192x192 solid purple square.
// Actually, an SVG is valid! Let's generate SVG icons first, Chrome fully supports SVG icons in manifest.
// But some old checks require PNG. 

const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#8b5cf6"/>
  <text x="96" y="112" font-family="sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">CP</text>
</svg>`;

const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#8b5cf6"/>
  <text x="256" y="296" font-family="sans-serif" font-size="192" font-weight="bold" fill="white" text-anchor="middle">CP</text>
</svg>`;

fs.writeFileSync('public/icon-192x192.svg', svg192);
fs.writeFileSync('public/icon-512x512.svg', svg512);

console.log('SVG icons generated.');
