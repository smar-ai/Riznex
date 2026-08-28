const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: { clientId: 'client-1', type: 'platform' },
    orderBy: { invoiceDate: 'desc' }
  });

  console.log('--- PLATFORM INVOICES IN DB ---');
  invoices.forEach(inv => {
    console.log(`ID: ${inv.id} | Platform: ${inv.platform} | InvoiceDate: ${inv.invoiceDate ? inv.invoiceDate.toISOString() : 'NULL'} | Amount: £${inv.amount}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
