const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: {
      weekStart: new Date("2026-03-30T00:00:00.000Z")
    },
    select: {
      id: true,
      store: true,
      platform: true,
      grossSales: true,
      netPaid: true,
      invoiceId: true,
      notes: true
    }
  });
  console.log("Sales on 2026-03-30:", sales);
}

main().catch(console.error).finally(() => prisma.$disconnect());
