const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const herbiesSales = await prisma.sale.groupBy({
    by: ['platform', 'weekStart'],
    where: { platform: { contains: 'Herbies Pizza' } },
    _sum: { grossSales: true, netPaid: true, totalOrders: true },
    orderBy: { weekStart: 'desc' },
    take: 10
  });
  console.log("Herbies Sales:");
  console.table(herbiesSales);

  const tastyBunSales = await prisma.sale.groupBy({
    by: ['platform', 'weekStart'],
    where: { platform: { contains: 'Tasty Bun' } },
    _sum: { grossSales: true, netPaid: true, totalOrders: true },
    orderBy: { weekStart: 'desc' },
    take: 10
  });
  console.log("Tasty Bun Sales:");
  console.table(tastyBunSales);
}

main().catch(console.error).finally(() => prisma.$disconnect());
