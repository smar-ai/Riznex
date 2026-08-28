const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { platform: 'Herbies Pizza Website & App' }
  });
  
  if (sales.length > 0) {
    await prisma.sale.updateMany({
      where: { platform: 'Herbies Pizza Website & App' },
      data: { platform: 'Website', store: 'Herbies Pizza' }
    });
    console.log(`Successfully cleaned up ${sales.length} lingering Herbies Pizza Website & App platform names.`);
  } else {
    console.log('No Herbies Pizza Website & App platform names found.');
  }
}

run().finally(() => prisma.$disconnect());
