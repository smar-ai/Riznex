const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const from = new Date('2026-08-01T00:00:00.000Z');
  const to = new Date('2026-08-31T23:59:59.999Z');

  const sales = await prisma.sale.findMany({
    where: {
      clientId: 'client-1',
      platform: { contains: 'Card' },
      weekEnd: { gte: from, lte: to }
    }
  });

  console.log('--- AUGUST WALKIN CARD SALES IN DB ---');
  let sum = 0;
  sales.forEach(s => {
    console.log(`- WeekEnd: ${s.weekEnd.toISOString().split('T')[0]} | Store: ${s.store} | Gross: £${s.grossSales}`);
    sum += s.grossSales;
  });
  console.log(`TOTAL GROSS SALES FOR AUG 2026: £${sum.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
