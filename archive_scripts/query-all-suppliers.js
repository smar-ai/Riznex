const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suppliers = await prisma.supplier.findMany();
  console.table(suppliers.map(s => ({ id: s.id, name: s.name, franchise: s.franchise })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
