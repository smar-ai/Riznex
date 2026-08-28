const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({ take: 5 });
  console.log('Stores:', Array.from(new Set(sales.map(s => s.store))));
  console.log('Platforms:', Array.from(new Set(sales.map(s => s.platform))));
  console.log('Sample Sale:', sales[0]);
}

run().finally(() => prisma.$disconnect());
