const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const invoices = await prisma.invoice.findMany({ 
    where: { id: { in: ['cmrmj3h7m001zvdd0ooiuos3l', 'cmrmj3hb80021vdd0ty6cwsl8'] } } 
  }); 
  console.log(JSON.stringify(invoices, null, 2)); 
} 
main().then(() => prisma.$disconnect());
