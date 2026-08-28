const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sales = await prisma.sale.findMany({ orderBy: { weekStart: 'asc' } });
  console.table(sales.map(s => ({ id: s.id, date: s.weekStart, amount: s.grossSales, store: s.store, platform: s.platform })));
}
main().then(() => prisma.$disconnect());
