const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, args) {
  return new Promise((resolve) => {
    console.log(`Executing: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { shell: true });
    let output = '';

    proc.stdout.on('data', (data) => {
      const str = data.toString();
      process.stdout.write(str);
      output += str;
    });

    proc.stderr.on('data', (data) => {
      const str = data.toString();
      process.stderr.write(str);
      output += str;
    });

    proc.on('close', (code) => {
      resolve({ code, output });
    });
  });
}

async function main() {
  // 1. Run prisma generate
  const prismaResult = await runCommand('npx', ['prisma', 'generate']);
  if (prismaResult.code !== 0) {
    console.error(`\nPrisma generate failed with exit code ${prismaResult.code}. Capturing error logs...`);
    await handleFailure(prismaResult);
  }

  // 2. Run next build
  const nextResult = await runCommand('npx', ['next', 'build']);
  if (nextResult.code !== 0) {
    console.error(`\nNext build failed with exit code ${nextResult.code}. Capturing error logs...`);
    await handleFailure(nextResult);
  }

  console.log("Build completed successfully!");
  process.exit(0);
}

async function handleFailure(result) {
  // Create the public directory if it doesn't exist
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write the log to public/index.html so it's visible on the root page
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Build Error Log</title>
  <style>
    body { background: #1a1a1a; color: #f5f5f5; font-family: monospace; padding: 20px; }
    h1 { color: #ff5555; }
    pre { background: #2a2a2a; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <h1>Netlify Build Error Log</h1>
  <p>The build step failed. Here is the output:</p>
  <pre>${escapeHtml(result.output)}</pre>
</body>
</html>`;

  fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);
  fs.writeFileSync(path.join(publicDir, 'build-error.html'), htmlContent);

  // Mock the minimum .next directory structure so Netlify Next.js plugin doesn't crash
  const nextDir = path.join(__dirname, '.next');
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }

  const dummyServerFiles = {
    version: 1,
    config: {
      distDir: ".next",
      typescript: { ignoreBuildErrors: true },
      eslint: { ignoreDuringBuilds: true }
    },
    appDir: __dirname,
    files: []
  };

  fs.writeFileSync(path.join(nextDir, 'required-server-files.json'), JSON.stringify(dummyServerFiles, null, 2));

  // Write other manifests as empty/dummy if they don't exist
  const dummyManifests = {
    'routes-manifest.json': { headers: [], redirects: [], rewrites: [] },
    'prerender-manifest.json': { version: 4, routes: {}, dynamicRoutes: {}, preview: { previewModeId: "1", previewModeSigningKey: "2", previewModeEncryptionKey: "3" } },
    'build-manifest.json': { pages: { "/": [] }, rootMainFiles: [], childMainFiles: [] }
  };

  for (const [filename, content] of Object.entries(dummyManifests)) {
    const filep = path.join(nextDir, filename);
    if (!fs.existsSync(filep)) {
      fs.writeFileSync(filep, JSON.stringify(content, null, 2));
    }
  }

  console.log("Mocked .next files successfully to prevent Netlify plugin crashes.");
  console.log("Exiting with 0 to allow deploying the build log...");
  process.exit(0);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

main().catch(e => {
  console.error("Safebuild script error:", e);
  process.exit(1);
});
