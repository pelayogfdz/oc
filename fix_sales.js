const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const sales = await prisma.sale.findMany({ 
    where: { paymentMethod: 'CREDIT', balanceDue: 0 } 
  }); 

  for (let s of sales) { 
    if (s.customerId) {
        const c = await prisma.customer.findUnique({ where: { id: s.customerId } }); 
        if (c) { 
        const dd = new Date(s.createdAt); 
        dd.setDate(dd.getDate() + c.creditDays); 
        await prisma.sale.update({ 
            where: { id: s.id }, 
            data: { balanceDue: s.total, dueDate: dd } 
        }); 
        } 
    }
  } 
  console.log("Done fixing " + sales.length + " sales."); 
} 
main();
