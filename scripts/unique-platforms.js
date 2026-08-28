const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    select: { platform: true }
  });
  const uniquePlatforms = [...new Set(sales.map(s => s.platform))];
  console.log('Unique platforms in DB:', uniquePlatforms);
}

run().finally(() => prisma.$disconnect());
