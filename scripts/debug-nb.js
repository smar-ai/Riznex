const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const invs = await prisma.invoice.findMany({
    where: { supplier: { name: 'N&B Food Service' } },
    select: { id: true, ocrStatus: true, amount: true, invoiceDate: true, type: true }
  });
  console.table(invs);
}
run().catch(console.error).finally(() => prisma.$disconnect());
