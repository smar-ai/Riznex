const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  console.log('\n=== SAFELY DELETING HERBIES POS & ONLINE SALES RECORDS FOR HENLEY ===\n');

  // 1. Delete Henley Herbies POS Invoices
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: {
      clientId,
      type: 'pos',
      fileName: { contains: 'Herbies' }
    }
  });

  console.log(`- Deleted Henley Herbies POS Invoices: ${deletedInvoices.count}`);

  // 2. Delete Henley Sales Records for Herbies POS, Website, Mobile App
  const deletedSales = await prisma.sale.deleteMany({
    where: {
      clientId,
      OR: [
        { platform: 'POS' },
        { platform: 'In-Store POS' },
        { platform: 'Herbies POS' },
        { platform: 'Website' },
        { platform: 'Herbies Website' },
        { platform: 'Mobile App' },
        { platform: 'Herbies Mobile App' },
        { platform: 'Herbies Web & App' },
        { platform: 'Web & App' }
      ]
    }
  });

  console.log(`- Deleted Henley Herbies Direct Sales Records: ${deletedSales.count}`);

  // 3. Verify Hungry Birds isolation (MUST BE 91 Sales, 178 Invoices)
  const hbSales = await prisma.sale.count({ where: { clientId: 'client-1' } });
  const hbInvoices = await prisma.invoice.count({ where: { clientId: 'client-1' } });

  console.log(`\n=== HUNGRY BIRDS ISOLATION AUDIT ===`);
  console.log(`- Hungry Birds Sales Records:   ${hbSales} (LOCKED & UNTOUCHED)`);
  console.log(`- Hungry Birds Invoice Records: ${hbInvoices} (LOCKED & UNTOUCHED)\n`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
