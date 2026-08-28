const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hb = await prisma.client.findFirst({ where: { name: { contains: 'Hungry' } } });

  const sales = await prisma.sale.findMany({
    where: { clientId: hb.id, store: 'Combined' },
    select: { weekStart: true }
  });
  console.log("Sales dates:", sales.map(s => s.weekStart));
}

main().catch(console.error).finally(() => prisma.$disconnect());
