const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany();
  const platforms = [...new Set(sales.map(s => s.platform))];
  console.log("Distinct platforms in Sale table:", platforms);
}

run().finally(() => prisma.$disconnect());
