const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany();
  let updated = 0;
  
  for (const s of sales) {
    let newPlat = s.platform;
    if (newPlat.includes('Herbies Pizza ')) newPlat = newPlat.replace('Herbies Pizza ', '');
    if (newPlat.includes('Tasty Bun ')) newPlat = newPlat.replace('Tasty Bun ', '');
    
    if (newPlat !== s.platform) {
      await prisma.sale.update({
        where: { id: s.id },
        data: { platform: newPlat }
      });
      updated++;
    }
  }
  
  console.log(`Successfully cleaned up ${updated} lingering platform names.`);
}

run().finally(() => prisma.$disconnect());
