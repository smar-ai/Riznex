const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  const posSales = await prisma.sale.findMany({
    where: {
      clientId: henleyClientId,
      platform: 'POS',
      weekEnd: {
        gte: new Date('2026-08-01T00:00:00.000Z'),
        lte: new Date('2026-08-31T23:59:59.999Z')
      }
    }
  });

  console.log(`Found ${posSales.length} POS sales records in August 2026:`);
  console.log(JSON.stringify(posSales, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
