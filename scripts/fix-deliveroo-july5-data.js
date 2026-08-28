const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invoiceId = 'cmrpkzlrt0001vd50f55y25i1';
  
  await prisma.sale.updateMany({
    where: { invoiceId },
    data: { 
      grossSales: 1071.54,
      netPaid: 886.02,
      commission: 180.13,
      otherFees: 142.75,
      otherPayments: 137.36,
      topRankFee: 0,
      refunds: 0,
      marketing: 0,
      offersOnItems: 0,
      adSpends: 0,
      notes: 'Fixed manually from user screenshot'
    }
  });
  
  console.log('Fixed math data for Herbies Pizza Deliveroo July 05.pdf');
}

run().finally(() => prisma.$disconnect());
