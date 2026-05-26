import { prisma } from "@/lib/prisma";
import { getActiveUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import ChoferPortalClient from "./ChoferPortalClient";

export const dynamic = "force-dynamic";

export default async function ChoferPage() {
  const user = await getActiveUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch delivery orders assigned to this driver that are active/pending or in progress
  const orders = await prisma.deliveryOrder.findMany({
    where: {
      driverId: user.id,
      status: { in: ['PENDING', 'IN_PROGRESS', 'POSTPONED'] }
    },
    include: {
      sale: {
        include: {
          customer: true,
          items: {
            include: {
              product: true
            }
          }
        }
      }
    },
    orderBy: [
      { routeOrder: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  return (
    <ChoferPortalClient initialOrders={orders} currentUser={user} />
  );
}
