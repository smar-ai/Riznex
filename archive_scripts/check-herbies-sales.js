const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const henley = await prisma.client.findFirst({ where: { name: { contains: 'Henley' } } });
  if (!henley) return console.log("Henley not found");

  const records = await prisma.sale.findMany({
    where: {
      clientId: henley.id,
      platform: { contains: 'Herbies Pizza Website' }
    },
    orderBy: { weekStart: 'desc' },
    take: 5
  });

  console.log(records);
}
main().finally(() => prisma.$disconnect());
