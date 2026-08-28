const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const updated = await prisma.staffWage.updateMany({
    data: { store: 'Herbies Pizza' }
  });
  console.log(`Updated ${updated.count} wages to Herbies Pizza.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
