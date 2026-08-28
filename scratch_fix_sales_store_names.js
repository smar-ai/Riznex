const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';

  const sales = await prisma.sale.findMany({
    where: { clientId: henleyClientId },
    include: { invoice: true }
  });

  console.log(`Auditing ${sales.length} Henley sales records for missing store...`);
  let fixedCount = 0;

  for (const s of sales) {
    if (!s.store || s.store === 'undefined' || s.store.trim() === '') {
      let storeName = 'Herbies Pizza'; // Default fallback
      const invPlatform = s.invoice?.platform || s.platform || '';
      const notes = s.notes || '';

      if (invPlatform.toLowerCase().includes('tasty') || notes.toLowerCase().includes('tasty')) {
        storeName = 'Tasty Bun';
      } else if (invPlatform.toLowerCase().includes('herbies') || notes.toLowerCase().includes('herbies')) {
        storeName = 'Herbies Pizza';
      }

      await prisma.sale.update({
        where: { id: s.id },
        data: { store: storeName }
      });
      console.log(`Fixed Sale ID ${s.id}: set store = "${storeName}" (from platform "${invPlatform}")`);
      fixedCount++;
    }
  }

  console.log(`\nSuccessfully fixed ${fixedCount} sales records!`);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
