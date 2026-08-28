const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const updated = await prisma.invoice.updateMany({
    where: {
      ocrStatus: 'error',
      amount: { gt: 0 },
      invoiceDate: { not: null }
    },
    data: {
      ocrStatus: 'done',
      notes: 'SUCCESS'
    }
  });
  console.log(`Updated ${updated.count} manually fixed invoices to done.`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
