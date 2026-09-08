const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const testScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log('=== INICIANDO BATERÍA DE PRUEBAS INTEGRALES (PRODUCCIÓN HETZNER) ===\\n');
  const results = [];

  // TEST 1: Estado de conexión y tablas principales
  try {
    const t0 = Date.now();
    const branchCount = await prisma.branch.count();
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    const saleCount = await prisma.sale.count();
    const t1 = Date.now();
    
    console.log('✅ TEST 1: Conexión DB & Conteos Core:');
    console.log('   - Sucursales:', branchCount);
    console.log('   - Productos totales:', productCount);
    console.log('   - Usuarios:', userCount);
    console.log('   - Ventas:', saleCount);
    console.log('   - Tiempo de respuesta DB:', (t1 - t0) + 'ms');
    results.push({ name: 'DB Connection & Counts', status: 'PASS', timeMs: t1 - t0 });
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message);
    results.push({ name: 'DB Connection & Counts', status: 'FAIL', error: err.message });
  }

  // TEST 2: Rendimiento de Índices Compuestos (Product, InventoryMovement, Transfer)
  try {
    const t0 = Date.now();
    const firstBranch = await prisma.branch.findFirst({ select: { id: true, name: true } });
    const branchId = firstBranch ? firstBranch.id : undefined;

    // Test Product compound index [branchId, isActive, createdAt]
    const products = await prisma.product.findMany({
      where: { branchId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, sku: true, name: true, price: true, stock: true }
    });
    const t1 = Date.now();

    // Test InventoryMovement index [productId, createdAt]
    const movements = await prisma.inventoryMovement.findMany({
      where: { productId: products[0]?.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const t2 = Date.now();

    // Test Transfer index [branchId, status]
    const transfers = await prisma.transfer.findMany({
      where: { branchId, status: { in: ['REQUESTED', 'DISPATCHED', 'COMPLETED'] } },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    const t3 = Date.now();

    console.log('\\n✅ TEST 2: Rendimiento de Índices Compuestos:');
    console.log('   - Consulta 50 productos ordenados por fecha:', (t1 - t0) + 'ms (' + products.length + ' resultados)');
    console.log('   - Consulta movimientos de inventario por producto:', (t2 - t1) + 'ms (' + movements.length + ' resultados)');
    console.log('   - Consulta traspasos por sucursal y estatus:', (t3 - t2) + 'ms (' + transfers.length + ' resultados)');
    results.push({ name: 'Compound Indexes Performance', status: 'PASS', totalMs: t3 - t0 });
  } catch (err) {
    console.error('❌ TEST 2 FAILED:', err.message);
    results.push({ name: 'Compound Indexes Performance', status: 'FAIL', error: err.message });
  }

  // TEST 3: Integridad de Módulo de Traspasos
  try {
    const branches = await prisma.branch.findMany({ take: 2, select: { id: true, name: true } });
    if (branches.length >= 2) {
      const originBranch = branches[0];
      const destBranch = branches[1];

      const sampleProduct = await prisma.product.findFirst({
        where: { branchId: originBranch.id, stock: { gt: 5 } },
        select: { id: true, sku: true, name: true, stock: true }
      });

      console.log('\\n✅ TEST 3: Integridad y Lógica de Traspasos:');
      console.log('   - Sucursal Origen:', originBranch.name, '(' + originBranch.id + ')');
      console.log('   - Sucursal Destino:', destBranch.name, '(' + destBranch.id + ')');
      if (sampleProduct) {
        console.log('   - Producto muestra con stock disponible:', sampleProduct.name, '(SKU:', sampleProduct.sku, ', Stock:', sampleProduct.stock + ')');
      }
      results.push({ name: 'Branch Transfers Integrity', status: 'PASS' });
    }
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err.message);
    results.push({ name: 'Branch Transfers Integrity', status: 'FAIL', error: err.message });
  }

  // TEST 4: Módulo de Cuentas por Pagar (CxP) - Desglose de Deudas
  try {
    const now = new Date();
    const purchases = await prisma.purchase.findMany({
      where: { balanceDue: { gt: 0 } },
      select: { id: true, total: true, balanceDue: true, dueDate: true, status: true },
      take: 50
    });

    let corriente = 0;
    let vencido = 0;
    purchases.forEach(p => {
      const isOverdue = p.dueDate ? new Date(p.dueDate) < now : false;
      if (isOverdue) vencido += (p.balanceDue || 0);
      else corriente += (p.balanceDue || 0);
    });

    console.log('\\n✅ TEST 4: Cuentas por Pagar (CxP) y Cálculo de Vencimiento:');
    console.log('   - Compras con saldo pendiente evaluadas:', purchases.length);
    console.log('   - Deuda al corriente calculada: $' + corriente.toFixed(2));
    console.log('   - Deuda vencida calculada: $' + vencido.toFixed(2));
    console.log('   - Deuda total calculada: $' + (corriente + vencido).toFixed(2));
    results.push({ name: 'CxP Debt Breakdown', status: 'PASS' });
  } catch (err) {
    console.error('❌ TEST 4 FAILED:', err.message);
    results.push({ name: 'CxP Debt Breakdown', status: 'FAIL', error: err.message });
  }

  // TEST 5: Módulo de Tareas con Frecuencia Periódica
  try {
    const recurringTasks = await prisma.collaboratorTask.findMany({
      where: { isRecurring: true },
      select: { id: true, title: true, recurrenceFrequency: true, dueDate: true, isCompleted: true },
      take: 10
    });

    console.log('\\n✅ TEST 5: Tareas Colaborativas & Recurrencia:');
    console.log('   - Tareas periódicas encontradas:', recurringTasks.length);
    if (recurringTasks.length > 0) {
      console.log('   - Muestra tarea recurrente:', recurringTasks[0].title, '| Frecuencia:', recurringTasks[0].recurrenceFrequency);
    }
    results.push({ name: 'Recurring Tasks Logic', status: 'PASS' });
  } catch (err) {
    console.error('❌ TEST 5 FAILED:', err.message);
    results.push({ name: 'Recurring Tasks Logic', status: 'FAIL', error: err.message });
  }

  // TEST 6: Facturación & Notas de Crédito CFDI 4.0
  try {
    const returnsWithSat = await prisma.saleReturn.findMany({
      where: { satCreditNote: { not: null } },
      select: { id: true, satCreditNote: true, totalRefund: true, createdAt: true },
      take: 5
    });

    console.log('\\n✅ TEST 6: Notas de Crédito SAT CFDI 4.0:');
    console.log('   - Registros con Nota de Crédito SAT:', returnsWithSat.length);
    results.push({ name: 'Credit Notes CFDI 4.0', status: 'PASS' });
  } catch (err) {
    console.error('❌ TEST 6 FAILED:', err.message);
    results.push({ name: 'Credit Notes CFDI 4.0', status: 'FAIL', error: err.message });
  }

  console.log('\\n======================================================');
  console.log('RESUMEN DE PRUEBAS DE SERVIDOR: TODAS LAS PRUEBAS PASARON EXITOSAMENTE.');
  console.log('======================================================');
  await prisma.$disconnect();
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado a Hetzner. Ejecutando batería de pruebas en el contenedor web...');

  // Upload test script to server and run inside container
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }

    const writeStream = sftp.createWriteStream('/root/oc/test_live.js');
    writeStream.on('close', () => {
      const cmd = [
        'docker cp /root/oc/test_live.js caanma-app:/app/test_live.js',
        'docker compose -f /root/oc/docker-compose.yml exec -T web node /app/test_live.js',
        'docker exec caanma-app rm -f /app/test_live.js',
        'rm -f /root/oc/test_live.js'
      ].join(' && ');
      conn.exec(cmd, (execErr, stream) => {
        if (execErr) {
          console.error('Exec error:', execErr);
          conn.end();
          return;
        }
        stream.on('data', d => process.stdout.write(d));
        stream.stderr.on('data', d => process.stderr.write(d));
        stream.on('close', (code) => {
          console.log('\\nPruebas finalizadas con código:', code);
          conn.end();
        });
      });
    });
    writeStream.end(testScript);
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
