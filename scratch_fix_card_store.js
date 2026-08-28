const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.sale.updateMany({
    where: { clientId: 'client-1', platform: 'Walk In Card', store: 'Combined' },
    data: { store: 'Hungry Birds' }
  });

  console.log(`Updated ${result.count} Walk-in Card sales records to store='Hungry Birds'`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
