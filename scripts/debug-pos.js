const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inv = await prisma.invoice.findMany({
    where: { fileName: { contains: 'pos' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { sales: true }
  });
  console.log(JSON.stringify(inv, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
