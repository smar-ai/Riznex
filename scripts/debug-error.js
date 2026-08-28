const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inv = await prisma.invoice.findMany({
    where: { ocrStatus: 'error' },
    orderBy: { createdAt: 'desc' },
    take: 4
  });
  console.log(inv.map(i => ({ id: i.id, createdAt: i.createdAt, updatedAt: i.updatedAt })));
}
run().catch(console.error).finally(() => prisma.$disconnect());
