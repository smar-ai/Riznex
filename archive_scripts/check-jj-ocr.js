const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jj = await prisma.invoice.findMany({
    where: { supplier: { name: 'JJ Food Service' }, invoiceDate: { gte: new Date('2026-06-01') } },
    orderBy: { invoiceDate: 'desc' }
  });

  for (const inv of jj) {
    console.log(`\n=== ${inv.fileName} ===`);
    console.log(`Amount: £${inv.amount} | OCR: ${inv.ocrStatus}`);
    const ocrData = JSON.parse(inv.ocrData || '{}');
    console.log("Extracted JSON from AI:", JSON.stringify(ocrData).substring(0, 300));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
