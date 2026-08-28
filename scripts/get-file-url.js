const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inv = await prisma.invoice.findUnique({ where: { id: 'cmrtsa1lp001bvdvkor1ksc4w' } });
  console.log(inv.filePath);
}

run().finally(() => prisma.$disconnect());
