const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: 'deliveroo' }
  });
  
  console.log('All Deliveroo sales:');
  console.log(sales.map(s => `${s.store} | ${s.weekStart.toISOString().split('T')[0]} | ${s.weekEnd.toISOString().split('T')[0]} | Gross: ${s.grossSales}`));
}

run().finally(() => prisma.$disconnect());
