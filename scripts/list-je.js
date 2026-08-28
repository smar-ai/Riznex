const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invs = await prisma.invoice.findMany({
    where: { platform: { contains: 'Just Eat' } },
    orderBy: { invoiceDate: 'desc' },
    take: 10
  });
  invs.forEach(i => console.log(i.id, i.fileName, i.filePath, i.amount));
}

run().finally(() => prisma.$disconnect());
