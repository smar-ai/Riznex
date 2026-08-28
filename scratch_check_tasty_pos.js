const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';

  const posSales = await prisma.sale.findMany({
    where: {
      clientId: henleyClientId,
      platform: { contains: 'POS' }
    },
    include: { invoice: true }
  });

  console.log(`\n=== ALL POS SALE RECORDS FOR HENLEY (${posSales.length}) ===\n`);
  posSales.forEach(s => {
    console.log(`- ID: ${s.id} | Store in DB: "${s.store}" | Platform in DB: "${s.platform}" | Gross: £${s.grossSales} | Invoice File: ${s.invoice?.fileName || 'N/A'}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
