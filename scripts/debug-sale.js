const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const s = await prisma.sale.findFirst({
    where: { platform: 'Uber Eats', store: 'Tasty Bun', weekStart: new Date('2026-07-06T00:00:00Z') }
  });
  console.log(s);
}
run().catch(console.error).finally(() => prisma.$disconnect());
