const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const suppliers = await prisma.supplier.findMany();
  console.log("Suppliers:");
  suppliers.forEach(s => console.log(`- ${s.name} | Category: ${s.category} | Franchise: ${s.franchise}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
