const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invoices = await prisma.invoice.findMany({
    where: { 
      fileName: { in: ['Herbies Pizza Deliveroo July 05.pdf', 'Herbies Pizza Deliveroo July 12.pdf'] }
    }
  });
  
  for (const inv of invoices) {
    console.log(`\nInvoice: ${inv.fileName} (ID: ${inv.id})`);
    const sales = await prisma.sale.findMany({ where: { invoiceId: inv.id } });
    sales.forEach(s => {
      console.log(`  Sale: Week ${s.weekStart.toISOString().split('T')[0]} to ${s.weekEnd.toISOString().split('T')[0]}`);
      console.log(`  Gross: ${s.grossSales}, Net: ${s.netPaid}, Orders: ${s.totalOrders}, Notes: ${s.notes}`);
    });
  }
}

run().finally(() => prisma.$disconnect());
