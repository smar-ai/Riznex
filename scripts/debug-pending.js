const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inv = await prisma.invoice.findMany({
    where: { ocrStatus: 'pending' }
  });
  console.table(inv.map(i => ({ id: i.id, fileName: i.fileName, createdAt: i.createdAt })));
}
run().catch(console.error).finally(() => prisma.$disconnect());
