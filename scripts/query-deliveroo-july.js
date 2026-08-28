const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: 'Deliveroo', store: 'Herbies Pizza', is2025: false },
    orderBy: { weekStart: 'asc' }
  });
  
  const julySales = sales.filter(s => s.weekStart.toISOString().includes('-06-') || s.weekStart.toISOString().includes('-07-') || s.weekStart.toISOString().includes('-08-'));
  
  console.log('Herbies Deliveroo Sales in Jun/Jul/Aug:');
  julySales.forEach(s => console.log(`${s.store} | ${s.weekStart.toISOString().split('T')[0]} | ${s.weekEnd.toISOString().split('T')[0]} | Gross: ${s.grossSales} | Net: ${s.netPaid} | Orders: ${s.totalOrders}`));
}

run().finally(() => prisma.$disconnect());
