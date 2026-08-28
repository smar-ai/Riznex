const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  // Find top 10 recent invoices for Henley
  const invoices = await prisma.invoice.findMany({
    where: { clientId: henleyClientId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('--- RECENT HENLEY INVOICES ---');
  invoices.forEach(inv => {
    console.log(`ID: ${inv.id} | File: ${inv.fileName} | Type: ${inv.type} | Platform: ${inv.platform} | Amount: £${inv.amount} | Date: ${inv.invoiceDate?.toISOString().split('T')[0]} | OCR Status: ${inv.ocrStatus} | Created: ${inv.createdAt}`);
  });

  // Find top 10 recent sales for Henley
  const sales = await prisma.sale.findMany({
    where: { clientId: henleyClientId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\n--- RECENT HENLEY SALES ---');
  sales.forEach(s => {
    console.log(`ID: ${s.id} | Store: ${s.store} | Platform: ${s.platform} | Gross: £${s.grossSales} | NetPaid: £${s.netPaid} | Orders: ${s.totalOrders} | WeekEnd: ${s.weekEnd.toISOString().split('T')[0]} | Notes: ${s.notes} | Created: ${s.createdAt}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
