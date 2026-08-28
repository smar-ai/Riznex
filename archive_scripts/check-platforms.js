const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const hbClient = await prisma.client.findFirst({ where: { name: 'Hungry Birds' } });
  if (!hbClient) return;
  const sales = await prisma.sale.findMany({ where: { clientId: hbClient.id } });
  console.log([...new Set(sales.map(s => s.platform))]);
}
main().catch(console.error).finally(() => prisma.$disconnect())
