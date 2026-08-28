const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sales = await prisma.sale.findMany({ where: { platform: 'POS' }, orderBy: { weekStart: 'asc' } });
  console.table(sales.map(s => ({ id: s.id, date: s.weekStart, amount: s.grossSales, store: s.store })));
}
main().then(() => prisma.$disconnect());
