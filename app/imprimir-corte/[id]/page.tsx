import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getActiveBranch } from "@/app/actions/auth";
import PrintCorteClient from "./PrintCorteClient";

export const dynamic = "force-dynamic";

export default async function ImprimirCortePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activeBranch = await getActiveBranch();
  if (!activeBranch) return notFound();

  const session = await prisma.cashSession.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true, email: true }
      },
      branch: true,
      movements: {
        orderBy: { createdAt: 'asc' }
      },
      sales: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          customer: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!session || session.status !== 'CLOSED') return notFound();

  // Validate tenant context
  if (session.branch?.tenantId !== activeBranch.tenantId) {
    return notFound();
  }

  return (
    <PrintCorteClient session={session} branchName={session.branch?.name || activeBranch.name} />
  );
}
