const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const host = '5.78.138.167';
const privateKeyPath = path.join(__dirname, '..', 'HetznerKey.pem');

const conn = new Client();
conn.on('ready', () => {
  console.log('Testing full database and SSR rendering in container...');

  const testScript = `
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

async function testFullFlow() {
  const genAI = new GoogleGenerativeAI(apiKey);

  async function reRankWithGemini(rawQuery, candidates) {
    if (candidates.length === 0) return null;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { maxOutputTokens: 600, temperature: 0.1 }
      });

      const prompt = \`Eres el asistente experto en cotizaciones comerciales de un sistema de punto de venta.
El cliente solicita: "\${rawQuery}"

Productos candidatos en el catálogo:
\${JSON.stringify(candidates.map(c => ({ id: c.id, name: c.name, sku: c.sku, stock: c.stock, comprado_antes_por_cliente: c.hasHistory })), null, 2)}

Reglas de decisión:
1. "selectedId": ID del producto que MEJOR satisface exactamente lo que pide el cliente (mismo tipo, sabor/variante, tamaño, color). Si ningún producto corresponde a lo pedido (ejemplo: pide pastel 3 leches y solo hay de chocolate o zanahoria; o pide hojas blancas y solo hay turquesa o acrílicos), responde "selectedId": null.
2. "rankedIds": Lista ordenada de los IDs más relevantes y sustitutos válidos (máximo 10), descartando los que no tengan relación.

Responde ÚNICAMENTE en JSON válido con el formato:
{
  "selectedId": "string o null",
  "reason": "breve explicación",
  "rankedIds": ["id1", "id2", ...]
}\`;

      const res = await model.generateContent(prompt);
      const text = res.response.text();
      const match = text.match(/\\{[\\s\\S]*\\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }

  // 1. Test Pizca: "QUIERO 4 PASTELES 3 LECHES GRANDE"
  const prismaPizca = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_pizca' } } });
  const pizcaCandidates = await prismaPizca.product.findMany({
    where: { isActive: true, OR: [{ name: { contains: 'pastel', mode: 'insensitive' } }, { name: { contains: 'tres', mode: 'insensitive' } }, { name: { contains: 'leche', mode: 'insensitive' } }] },
    select: { id: true, name: true, sku: true, stock: true, price: true },
    take: 30
  });

  const queryPizca = "QUIERO 4 PASTELES 3 LECHES GRANDE";
  const pizcaDecision = await reRankWithGemini(queryPizca, pizcaCandidates.map(p => ({ ...p, hasHistory: false })));
  console.log("=== PIZCA DECISION ===");
  console.log("Query:", queryPizca);
  console.log("Reason:", pizcaDecision?.reason);
  const pickedPizca = pizcaCandidates.find(p => p.id === pizcaDecision?.selectedId);
  console.log("Selected Product:", pickedPizca ? pickedPizca.name + " (" + pickedPizca.sku + ")" : "NINGUNO (Dejar sin coincidencia)");

  // 2. Test OfficeCity: "Una caja de hojas blancas tamaño carta"
  const prismaOC = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:caanma_postgres_secure_2026@caanma-db:5432/neondb_officecity' } } });
  const ocCandidates = await prismaOC.product.findMany({
    where: { isActive: true, OR: [{ name: { contains: 'papel', mode: 'insensitive' } }, { name: { contains: 'bond', mode: 'insensitive' } }, { name: { contains: 'hoja', mode: 'insensitive' } }, { name: { contains: 'carta', mode: 'insensitive' } }] },
    select: { id: true, name: true, sku: true, stock: true, price: true },
    take: 30
  });

  const queryOC = "Una caja de hojas blancas tamaño carta";
  const ocDecision = await reRankWithGemini(queryOC, ocCandidates.map(p => ({ ...p, hasHistory: false })));
  console.log("\\n=== OFFICE CITY DECISION ===");
  console.log("Query:", queryOC);
  console.log("Reason:", ocDecision?.reason);
  const pickedOC = ocCandidates.find(p => p.id === ocDecision?.selectedId);
  console.log("Selected Product:", pickedOC ? pickedOC.name + " (" + pickedOC.sku + ")" : "NINGUNO (Dejar sin coincidencia)");

  await prismaPizca.$disconnect();
  await prismaOC.$disconnect();
}

testFullFlow();
`;

  conn.exec('docker exec -i caanma-app node', (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
    stream.write(testScript);
    stream.end();
  });
}).connect({
  host,
  port: 22,
  username: 'root',
  privateKey: fs.readFileSync(privateKeyPath)
});
