const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const s = await prisma.sale.findFirst({
    where: { platform: { contains: 'Just Eat' }, store: 'Herbies Pizza', weekStart: { gte: new Date('2026-07-06T00:00:00.000Z') } }
  });
  console.log(s);
}

run().finally(() => prisma.$disconnect());
