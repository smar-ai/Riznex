const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.invoice.findMany({ 
    where: { 
      type: 'supplier'
    }, 
    select: { 
      id: true, 
      invoiceDate: true, 
      amount: true, 
      supplier: { select: { name: true } } 
    } 
  }); 
  console.log(inv); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
