const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: {
      netPaid: {
        gt: prisma.sale.fields.grossSales
      }
    },
    select: {
      id: true,
      store: true,
      platform: true,
      weekStart: true,
      grossSales: true,
      netPaid: true,
      notes: true
    }
  });
  console.log("Sales with Net > Gross:");
  console.table(sales);
}

main().catch(console.error).finally(() => prisma.$disconnect());
