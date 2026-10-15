import { getBranchSettings } from "@/app/actions/settings";
import { getActiveBranch } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import CatalogoClient from "./CatalogoClient";

export default async function Page() {
  const [settings, branch] = await Promise.all([
    getBranchSettings(),
    getActiveBranch()
  ]);
  let config: any = {};
  if (settings.configJson) {
     try {
       config = JSON.parse(settings.configJson)['catalogo_b2c'] || {};
     } catch(e) {}
  }

  // Fallback to any sibling branch of the tenant that already has catalogo_b2c configured
  if ((!config || Object.keys(config).length === 0) && branch?.tenantId) {
    const siblingSettings = await prisma.branchSettings.findMany({
      where: { branch: { tenantId: branch.tenantId } },
      select: { configJson: true }
    });
    for (const s of siblingSettings) {
      if (!s.configJson) continue;
      try {
        const parsed = JSON.parse(s.configJson)['catalogo_b2c'];
        if (parsed && Object.keys(parsed).length > 0) {
          config = parsed;
          break;
        }
      } catch (e) {}
    }
  }

  let defaultStoreUrl = 'https://officecity.com.mx';
  if (branch?.tenantId === 'db5d3949-f8dd-41f6-9627-90374d55d044') {
    defaultStoreUrl = 'https://petqro.com';
  } else if (branch?.tenantId === '0d246cea-0220-4328-92b0-8a1387ce6a6d') {
    defaultStoreUrl = 'https://pizcadeazucar.mx';
  } else if (branch?.tenantId && branch.tenantId !== '8b52cbcd-c956-4717-a1bd-02e57386aaa2') {
    defaultStoreUrl = branch.id && branch.id !== 'GLOBAL' ? `https://caanma.com/tienda/${branch.id}` : '';
  }

  return <CatalogoClient initialConfig={{ ...config, defaultStoreUrl }} />;
}
