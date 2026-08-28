const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inv = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, fileName: true, ocrStatus: true, platform: true }
  });
  console.table(inv);
}
run().catch(console.error).finally(() => prisma.$disconnect());
