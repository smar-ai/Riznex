const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';

  const tastyBunPosSales = await prisma.sale.findMany({
    where: {
      clientId: henleyClientId,
      store: 'Tasty Bun',
      platform: 'POS',
      netPaid: 0
    }
  });

  console.log(`Fixing ${tastyBunPosSales.length} Tasty Bun POS sales records with netPaid = 0...`);
  for (const s of tastyBunPosSales) {
    await prisma.sale.update({
      where: { id: s.id },
      data: { netPaid: s.grossSales }
    });
    console.log(`Updated Sale ID ${s.id}: gross = £${s.grossSales}, set netPaid = £${s.grossSales}`);
  }

  console.log('\nAll Tasty Bun POS sales records updated successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
