const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invoiceIds = [
    'cms52v86l001zvdx0zajmec6b', // July 26
    'cms52v81h001xvdx0lfvkvrv0'  // July 19
  ];

  for (const id of invoiceIds) {
    // 1. Delete associated sales records
    await prisma.sale.deleteMany({
      where: { invoiceId: id }
    });

    // 2. Update the invoice to correct platform and trigger re-parse
    await prisma.invoice.update({
      where: { id },
      data: {
        platform: 'Tasty Bun POS',
        ocrStatus: 'pending',
        ocrData: null
      }
    });

    console.log(`Reset invoice ${id} and set to Tasty Bun POS for re-parsing.`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
