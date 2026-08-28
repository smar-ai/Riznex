const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hb = await prisma.client.findFirst({ where: { name: { contains: 'Hungry' } } });
  console.log("Client ID:", hb.id);

  const sales = await prisma.sale.findMany({
    where: { clientId: hb.id, store: 'Combined' }
  });
  console.log("Sales found:", sales.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
