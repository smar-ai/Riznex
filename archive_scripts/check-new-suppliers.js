const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  console.log("=== RECENT SUPPLIERS ===");
  const suppliers = await prisma.supplier.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.table(suppliers.map(s => ({
    name: s.name,
    category: s.category,
    franchise: s.franchise,
    createdAt: s.createdAt
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
