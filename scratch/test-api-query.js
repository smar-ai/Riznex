const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hb = await prisma.client.findFirst({ where: { name: { contains: 'Hungry' } } });

  const defaultFrom = new Date(Date.UTC(2026, 3, 1));
  console.log("defaultFrom:", defaultFrom);

  const where = {
    clientId: hb.id,
    is2025: false,
    store: 'Combined',
    weekEnd: { gte: defaultFrom }
  };

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { weekStart: 'desc' }
  });
  console.log("Sales found in API:", sales.length);
  if (sales.length > 0) {
    console.log("First sale weekEnd:", sales[0].weekEnd);
    console.log("Last sale weekEnd:", sales[sales.length - 1].weekEnd);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
