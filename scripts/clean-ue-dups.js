const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: { contains: 'Uber Eats' } }
  });

  for (const sale of sales) {
    if (sale.topRankFee > 0) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          topRankFee: 0 // Uber Eats uses Marketing which includes adSpends and offersOnItems. Mapping it to topRankFee causes double counting.
        }
      });
    }
  }

  // Also fix Deliveroo if necessary
}

run().finally(() => prisma.$disconnect());
