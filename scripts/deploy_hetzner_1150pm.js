const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const filesToUpload = [
  'prisma/schema.prisma',
  'app/components/ui/CorporateToast.tsx',
  'app/components/ui/CorporateConfirmModal.tsx',
  'app/components/ui/TableSkeleton.tsx',
  'app/layout.tsx',
  'app/(dashboard)/productos/[id]/DeleteProductButton.tsx',
  'app/(dashboard)/clientes/cobranza/CobranzaGlobalClient.tsx',
  'app/(dashboard)/productos/ajustes/AdjustmentClient.tsx',
  'app/actions/transfer.ts',
  'app/actions/report.ts',
  'app/actions/creditNote.ts',
  'app/actions/collaboratorTasks.ts',
  'app/(dashboard)/productos/traspasos/TraspasosClient.tsx',
  'app/(dashboard)/reportes/cuentas-por-pagar/CuentasPorPagarClient.tsx',
  'app/(dashboard)/reportes/cuentas-por-pagar/CuentasPorPagarReportClient.tsx',
  'app/(dashboard)/reportes/cuentas-por-pagar/page.tsx',
  'app/(dashboard)/procesos/tareas/TareasClient.tsx',
  'app/(dashboard)/preferencias/facturacion/page.tsx',
  'app/(dashboard)/facturas/layout.tsx',
  'app/(dashboard)/facturas/notas-credito/page.tsx',
  'app/(dashboard)/facturas/notas-credito/NotasCreditoClient.tsx',
  'app/(dashboard)/ventas/devoluciones/nuevo/DevolucionesNuevoClient.tsx',
  'app/api/facturacion/download/route.ts',
  'lib/mailer.ts'
];

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to Hetzner via SSH. Uploading updated files...');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }

    const ensureRemoteDir = (remotePath) => {
      return new Promise((resolve) => {
        conn.exec(`mkdir -p "${remotePath}"`, (err, stream) => {
          if (err) return resolve();
          stream.on('close', () => resolve());
        });
      });
    };

    const uploadFile = (relPath) => {
      return new Promise(async (resolve, reject) => {
        const localPath = path.join(__dirname, '..', relPath);
        if (!fs.existsSync(localPath)) {
          console.log(`Skipping non-existent file: ${relPath}`);
          return resolve();
        }
        const remotePath = `/root/oc/${relPath.replace(/\\/g, '/')}`;
        const remoteDir = path.dirname(remotePath);

        await ensureRemoteDir(remoteDir);

        console.log(`Uploading: ${relPath} -> ${remotePath}`);
        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) {
            console.error(`Error uploading ${relPath}:`, err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    };

    try {
      for (const file of filesToUpload) {
        await uploadFile(file);
      }
      console.log('All files uploaded successfully. Rebuilding and applying schema updates...');

      const commands = [
        'cd /root/oc',
        'docker compose exec -T web npx prisma db push --accept-data-loss || true',
        'docker compose build web',
        'docker compose up -d --no-deps web',
        'docker compose ps'
      ].join(' && ');

      conn.exec(commands, (err, stream) => {
        if (err) {
          console.error('SSH Exec error:', err);
          conn.end();
          return;
        }
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', (code) => {
          console.log(`\nDeployment finished with exit code ${code}`);
          conn.end();
        });
      });
    } catch (uploadErr) {
      console.error('Upload failed:', uploadErr);
      conn.end();
    }
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
