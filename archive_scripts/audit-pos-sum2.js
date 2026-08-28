const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: { platform: { contains: 'Herbies Pizza' }, weekStart: new Date('2026-07-06T00:00:00.000Z') }
  });
  console.table(sales.map(s => ({ platform: s.platform, gross: s.grossSales, net: s.netPaid, orders: s.totalOrders })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
