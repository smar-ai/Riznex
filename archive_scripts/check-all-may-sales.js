const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const maySales = await prisma.sale.findMany({ 
    where: { 
      weekStart: { gte: new Date('2026-05-01'), lt: new Date('2026-06-01') }
    },
    include: { client: true }
  });

  console.log(`Found ${maySales.length} total sales across ALL clients in May 2026.`);
  if (maySales.length > 0) {
    maySales.forEach(s => {
      console.log(`- ${s.client.name}: ${s.weekStart.toISOString().split('T')[0]} to ${s.weekEnd.toISOString().split('T')[0]} (is2025: ${s.is2025})`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
