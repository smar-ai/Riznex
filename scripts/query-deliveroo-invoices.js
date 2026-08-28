const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invoices = await prisma.invoice.findMany();
  
  const deliverooInvoices = invoices.filter(i => (i.fileName || '').toLowerCase().includes('deliveroo'));
  
  console.log('Deliveroo Invoices:');
  deliverooInvoices.forEach(i => console.log(`${i.fileName} | Period: ${i.periodStart ? i.periodStart.toISOString() : 'N/A'} to ${i.periodEnd ? i.periodEnd.toISOString() : 'N/A'} | Store: ${i.store}`));
}

run().finally(() => prisma.$disconnect());
