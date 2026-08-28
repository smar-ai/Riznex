const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoices = await prisma.invoice.findMany({
    where: { type: 'pos' },
    select: { id: true, fileName: true, ocrStatus: true, ocrData: true }
  });
  for (const inv of invoices) {
    console.log(inv.fileName, inv.ocrStatus);
    if (inv.ocrData) {
      try {
        const data = JSON.parse(inv.ocrData);
        console.log('posExpenses:', data.posExpenses, 'expenses:', data.expenses);
      } catch (e) {
        console.log('Error parsing JSON:', e.message);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
