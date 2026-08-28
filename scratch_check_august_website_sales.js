const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  // Query all sales records for Henley in August 2026
  const sales = await prisma.sale.findMany({
    where: {
      clientId: henleyClientId,
      weekEnd: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z')
      }
    }
  });

  console.log(`Found ${sales.length} sales records for Henley in August 2026:`);
  sales.forEach(s => {
    console.log(`- ID: ${s.id} | Store: ${s.storeName} | Platform: "${s.platform}" | Gross: £${s.grossSales} | Net: £${s.netSales} | Orders: ${s.ordersCount} | WeekEnd: ${s.weekEnd.toISOString().split('T')[0]}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
