const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  const tastyBunPOS = await prisma.sale.findMany({
    where: { clientId, platform: 'Tasty Bun POS' }
  });

  console.log(`Found ${tastyBunPOS.length} Tasty Bun POS records to fix back to 4%.`);

  for (const s of tastyBunPOS) {
    const commission = parseFloat((s.grossSales * 0.04).toFixed(2));
    const netPaid = parseFloat((s.grossSales - commission).toFixed(2));
    await prisma.sale.update({
      where: { id: s.id },
      data: { commission, netPaid }
    });
    console.log(`  Fixed: week=${s.weekEnd?.toISOString().split('T')[0]} | gross=£${s.grossSales} | commission=£${commission} (4%) | netPaid=£${netPaid}`);
  }

  console.log(`\nAll Tasty Bun POS records restored to 4% commission.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
