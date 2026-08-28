const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';

  const recent = await prisma.invoice.findMany({
    where: { clientId: henleyClientId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { supplier: true }
  });

  console.log(`\n=== LAST 20 INVOICES CREATED FOR HENLEY ===\n`);
  recent.forEach(i => {
    console.log(`- File: ${i.fileName.padEnd(35)} | Type: ${i.type.padEnd(10)} | Amount: £${(i.amount||0).toFixed(2).padStart(8)} | Date: ${i.invoiceDate ? i.invoiceDate.toISOString().split('T')[0] : 'N/A'} | Supplier: ${i.supplier?.name || 'N/A'}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
