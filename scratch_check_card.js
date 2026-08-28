const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: { clientId: 'client-1', platform: { contains: 'Card' } },
    orderBy: { weekStart: 'desc' }
  });

  console.log('--- EXISTING WALKIN CARD SALES IN DB ---');
  sales.forEach(s => {
    console.log(`ID: ${s.id} | Week: ${s.weekStart.toISOString().split('T')[0]} to ${s.weekEnd.toISOString().split('T')[0]} | Gross: £${s.grossSales} | Net: £${s.netPaid}`);
  });

  const invoices = await prisma.invoice.findMany({
    where: { clientId: 'client-1', platform: { contains: 'Card' } },
    orderBy: { invoiceDate: 'desc' }
  });

  console.log('--- EXISTING WALKIN CARD INVOICES IN DB ---');
  invoices.forEach(inv => {
    console.log(`ID: ${inv.id} | Platform: ${inv.platform} | InvoiceDate: ${inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : 'NULL'} | Amount: £${inv.amount}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
