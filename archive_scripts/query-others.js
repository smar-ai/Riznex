const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const supplier = await prisma.supplier.findFirst({where: {name: 'Others'}});
  if (!supplier) return console.log("Supplier 'Others' not found");
  const invoices = await prisma.invoice.findMany({ 
    where: { supplierId: supplier.id }, 
    orderBy: { createdAt: 'desc' } 
  }); 
  console.log(JSON.stringify(invoices, null, 2)); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
