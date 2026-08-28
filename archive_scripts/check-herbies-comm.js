const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const henley = await prisma.client.findFirst({ where: { name: { contains: 'Henley' } } });
  if (!henley) return console.log("Henley not found");

  const records = await prisma.platform.findMany({
    where: {
      clientId: henley.id,
      name: { contains: 'Herbies' }
    },
    orderBy: { weekStart: 'desc' }
  });

  console.log(records.slice(0, 5));
}
main().finally(() => prisma.$disconnect());
