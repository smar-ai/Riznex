const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({
    where: { grossSales: 748.57 }
  });
  console.log(sales.map(s => ({
    id: s.id,
    platform: s.platform,
    weekEnd: s.weekEnd.toISOString(),
    netPaid: s.netPaid,
    commission: s.commission,
    offersOnItems: s.offersOnItems,
    adSpends: s.adSpends
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
