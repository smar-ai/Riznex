const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { type: 'pos', platform: { contains: 'Herbies' } },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(inv, null, 2));
}

main().finally(() => prisma.$disconnect());
