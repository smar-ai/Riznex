const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { store: 'Tasty Bun', platform: 'Website' }
  });
  
  console.log('Tasty Bun Website/App sales:');
  sales.forEach(s => {
    console.log(`ID: ${s.id} | Week: ${s.weekStart.toISOString().split('T')[0]} | Gross: ${s.grossSales} | Notes: ${s.notes || ''}`);
  });
}

run().finally(() => prisma.$disconnect());
