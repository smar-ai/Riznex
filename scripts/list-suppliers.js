const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  });
  
  console.log("--- SUPPLIER LIST ---");
  suppliers.forEach(s => {
    console.log(`- ${s.name} | Category: ${s.category || 'N/A'} | Store: ${s.franchise || 'Combined'}`);
  });
}

getSuppliers()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
