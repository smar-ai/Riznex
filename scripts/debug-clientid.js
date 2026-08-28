const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sups = await prisma.supplier.findMany({ select: { id: true, name: true, clientId: true } });
  console.table(sups);
}
run().catch(console.error).finally(() => prisma.$disconnect());
