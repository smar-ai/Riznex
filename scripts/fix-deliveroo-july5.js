const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invoiceId = 'cmrpkzlrt0001vd50f55y25i1';
  
  await prisma.sale.updateMany({
    where: { invoiceId },
    data: { platform: 'Deliveroo' }
  });
  
  console.log('Fixed platform name for Herbies Pizza Deliveroo July 05.pdf');
}

run().finally(() => prisma.$disconnect());
