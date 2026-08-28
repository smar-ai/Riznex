const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const s = await prisma.sale.findFirst({
    where: { platform: { contains: 'Uber Eats' }, store: 'Tasty Bun', weekStart: { gte: new Date('2026-06-22T00:00:00.000Z') } }
  });
  console.log(s);
}

run().finally(() => prisma.$disconnect());
