const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invoices = await prisma.invoice.findMany();
  const target = invoices.find(i => i.fileName === 'Herbies Pizza Deliveroo July 05.pdf');
  
  if (!target) {
    console.log('Invoice not found');
    return;
  }
  
  console.log('Found Invoice:', target.id);
  
  const sales = await prisma.sale.findMany({
    where: { invoiceId: target.id }
  });
  
  console.log('Sales for this invoice:', sales);
}

run().finally(() => prisma.$disconnect());
