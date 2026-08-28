const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: { platform: { in: ['Herbies Pizza POS', 'Herbies Pizza Website', 'Herbies Pizza Website & Mobile', 'Tasty Bun POS', 'Tasty Bun Website', 'Tasty Bun App'] } },
    orderBy: { weekStart: 'desc' },
    take: 20
  });
  
  console.log("Recent Sales Records:");
  sales.forEach(s => {
    console.log(`${s.weekStart.toISOString().split('T')[0]} | ${s.platform} | Gross: ${s.grossSales} | Net: ${s.netPaid} | Orders: ${s.totalOrders}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
