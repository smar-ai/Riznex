const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: {
      store: 'Herbies Pizza',
      platform: 'deliveroo',
      is2025: false
    },
    orderBy: { weekStart: 'asc' }
  });
  
  const julySales = sales.filter(s => {
    return s.weekStart.toISOString().includes('-07-') || s.weekEnd.toISOString().includes('-07-') || 
           s.weekStart.toISOString().includes('-08-'); // include early aug just in case
  });

  console.log(julySales.map(s => ({
    weekStart: s.weekStart.toISOString().split('T')[0],
    weekEnd: s.weekEnd.toISOString().split('T')[0],
    grossSales: s.grossSales,
    netPaid: s.netPaid,
    orders: s.totalOrders,
    commission: s.commission
  })));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
