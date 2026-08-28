const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const tastySales = await prisma.sale.findMany({
    where: { clientId, is2025, OR: [{ store: { contains: 'Tasty' } }, { platform: { contains: 'Tasty' } }] }
  });

  const tastyInvoices = await prisma.invoice.findMany({
    where: { clientId, is2025, fileName: { contains: 'Tasty' } }
  });

  console.log(`\n=== TASTY BUN RECORDS AUDIT ===\n`);
  console.log(`- Tasty Bun Sales Records:    ${tastySales.length}`);
  console.log(`- Tasty Bun Invoice Records:  ${tastyInvoices.length}`);

  if (tastySales.length > 0) {
    const byPlat = tastySales.reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] || 0) + 1;
      return acc;
    }, {});
    console.log(`\nExisting Tasty Bun Sales Breakdown by Platform:`, byPlat);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
