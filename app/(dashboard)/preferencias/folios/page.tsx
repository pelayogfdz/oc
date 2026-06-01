import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import FoliosSettingsClient from "./FoliosSettingsClient";

export default async function FoliosPage() {
  const branch = await getActiveBranch();

  if (!branch || branch.id === 'GLOBAL') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '12px', color: '#991b1b', border: '1px solid #f87171', margin: '2rem auto', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>VISTA GLOBAL NO PERMITIDA</h2>
        <p>Los folios consecutivos se configuran de manera independiente para cada sucursal.<br/>Por favor, selecciona una sucursal específica en el menú superior.</p>
      </div>
    );
  }

  const settings = await prisma.branchSettings.findUnique({
    where: { branchId: branch.id }
  });

  let config: any = {};
  if (settings?.configJson) {
    try {
      config = JSON.parse(settings.configJson);
    } catch (e) {}
  }

  const branchPrefix = branch.name.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'B');

  const initialFolios = config.folios || {
    sale: { prefix: branchPrefix, nextNumber: 1001 },
    quote: { prefix: branchPrefix, nextNumber: 1001 },
    purchase: { prefix: branchPrefix, nextNumber: 1001 },
    transfer: { prefix: branchPrefix, nextNumber: 1001 },
    consignment: { prefix: branchPrefix, nextNumber: 1001 }
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      <FoliosSettingsClient 
        branchName={branch.name}
        branchPrefix={branchPrefix}
        initialFolios={initialFolios}
      />
    </div>
  );
}
