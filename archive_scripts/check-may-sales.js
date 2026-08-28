const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const henley = await prisma.client.findFirst({ where: { name: { contains: 'Henley' } } });
  if (!henley) return console.log("Henley client not found");

  const maySales = await prisma.sale.findMany({ 
    where: { 
      clientId: henley.id,
      weekStart: { gte: new Date('2026-05-01'), lt: new Date('2026-06-01') }
    }
  });

  console.log(`Found ${maySales.length} sales in May 2026 for Henley.`);
  if (maySales.length > 0) {
    console.log(`is2025 values: ${maySales.map(s => s.is2025).join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
