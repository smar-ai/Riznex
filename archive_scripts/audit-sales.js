const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.groupBy({
    by: ['store', 'platform'],
    _sum: { grossSales: true }
  });
  console.log("Sales group by Store and Platform:");
  console.log(sales);
}

main().catch(console.error).finally(() => prisma.$disconnect());
