const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const result = await prisma.staffWage.updateMany({
    data: { store: 'Herbies Pizza' }
  });
  console.log('Updated:', result.count);
}

run().finally(() => prisma.$disconnect());
