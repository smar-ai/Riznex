const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inv = await prisma.invoice.findMany({
    where: { supplier: { name: 'Herbies Head office' } },
    select: { id: true, fileName: true, ocrStatus: true, amount: true, invoiceDate: true, _count: { select: { sales: true } } }
  });
  console.table(inv);
}
run().catch(console.error).finally(() => prisma.$disconnect());
