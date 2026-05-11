import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DeliveryDriverClient from "./DeliveryDriverClient";

export default async function DeliveryDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const order = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: {
      sale: {
        include: {
          customer: true,
          items: {
            include: { product: true }
          }
        }
      },
      driver: true
    }
  });

  if (!order) {
    notFound();
  }

  // We pass the order data to the client component to handle the signature, photo, and submission
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '1rem', color: '#0f172a' }}>
      <DeliveryDriverClient initialOrder={order} />
    </div>
  );
}
