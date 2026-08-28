const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const allDeliverooSales = await prisma.sale.findMany({
    where: { platform: { startsWith: 'Herbies' }, is2025: false }
  });
  
  console.log('Other sales with wrong platform names:');
  console.log(allDeliverooSales.map(s => `${s.store} | ${s.platform} | ${s.weekStart.toISOString().split('T')[0]}`));
  
  await prisma.sale.updateMany({
    where: { platform: 'Herbies Pizza Deliveroo' },
    data: { platform: 'Deliveroo' }
  });
  await prisma.sale.updateMany({
    where: { platform: 'Tasty Bun Deliveroo' },
    data: { platform: 'Deliveroo' }
  });
  
  console.log('Fixed all platform names');
}

run().finally(() => prisma.$disconnect());
