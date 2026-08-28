const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: { clientId: 'client-1' }
  });

  const stores = new Set(sales.map(s => s.store));
  console.log('--- ALL STORES IN SALE TABLE FOR CLIENT-1 ---');
  console.log(Array.from(stores));

  const augSales = await prisma.sale.findMany({
    where: { clientId: 'client-1', weekEnd: { gte: new Date('2026-08-01') } }
  });
  console.log('\n--- AUGUST SALES IN DB ---');
  augSales.forEach(s => {
    console.log(`ID: ${s.id} | Platform: ${s.platform} | Store: ${s.store} | WeekEnd: ${s.weekEnd.toISOString().split('T')[0]} | Gross: £${s.grossSales}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
