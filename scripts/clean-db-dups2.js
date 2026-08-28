const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: { contains: 'Just Eat' }, weekStart: { gte: new Date('2026-06-25T00:00:00.000Z') } }
  });

  for (const sale of sales) {
    if (sale.adminFee > 0 && sale.otherFees > 0 && sale.adminFee === sale.otherFees) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          adminFee: 0, // Zero this out since we're using otherFees
        }
      });
    }
  }
}

run().finally(() => prisma.$disconnect());
