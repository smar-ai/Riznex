const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: { contains: 'Just Eat' }, weekStart: { gte: new Date('2026-06-25T00:00:00.000Z') } }
  });

  for (const sale of sales) {
    if (sale.topRankFee > 0 && sale.adSpends > 0 && sale.topRankFee === sale.adSpends) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          topRankFee: 0, // Zero this out since it's already in adSpends
          adminFee: sale.otherFees, // Keep adminFee but zero otherFees if they are identical? 
          // wait, otherFees is used in HenleyDashboard!
          otherFees: sale.otherFees
        }
      });
    }
  }

  // Also fix the API route aggregation bug by running audit.js to see if the math mismatch goes away
}

run().finally(() => prisma.$disconnect());
