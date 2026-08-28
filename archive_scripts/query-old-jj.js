const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldJJ = await prisma.invoice.findFirst({
    where: { 
      supplier: { name: 'JJ Food Service' },
      invoiceDate: { lt: new Date('2026-06-01') },
      amount: { gt: 0 }
    },
    orderBy: { invoiceDate: 'desc' }
  });

  if (!oldJJ) return console.log("Not found");
  
  const ocrData = JSON.parse(oldJJ.ocrData || '{}');
  console.log("=== OLD JJ INVOICE ===");
  console.log(`Date: ${oldJJ.invoiceDate}`);
  console.log(`Amount: ${oldJJ.amount}`);
  
  const rawText = ocrData.rawText || '';
  console.log("\nMatches for TOTAL:");
  const lines = rawText.split('\n');
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes('total')) console.log(`Line ${i}:`, l);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
