const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';

  const invoices = await prisma.invoice.findMany({
    where: {
      clientId: henleyClientId,
      type: 'supplier'
    },
    include: { supplier: true },
    orderBy: { invoiceDate: 'desc' }
  });

  console.log(`Total supplier invoices for Henley: ${invoices.length}`);
  
  const augustInvoices = invoices.filter(i => {
    if (!i.invoiceDate) return false;
    const d = new Date(i.invoiceDate);
    return d.getUTCFullYear() === 2026 && d.getUTCMonth() === 7; // Month 7 is August (0-indexed)
  });

  console.log(`August 2026 supplier invoices: ${augustInvoices.length}`);
  augustInvoices.forEach(i => {
    console.log(`- ID: ${i.id} | Amount: £${i.amount} | Date: ${i.invoiceDate?.toISOString()} | Supplier: ${i.supplier?.name}`);
  });

  if (augustInvoices.length === 0) {
    console.log('\n--- SAMPLE DATES OF OTHER SUPPLIER INVOICES ---');
    invoices.slice(0, 10).forEach(i => {
      console.log(`- Supplier: ${i.supplier?.name} | Amount: £${i.amount} | Date: ${i.invoiceDate?.toISOString()} | CreatedAt: ${i.createdAt.toISOString()}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
