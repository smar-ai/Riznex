const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inv = await prisma.invoice.findFirst({
    where: { fileName: 'Supplier JJ Foods June 29.pdf', invoiceDate: { gte: new Date('2026-06-01') } }
  });
  const ocrData = JSON.parse(inv.ocrData || '{}');
  const rawText = ocrData.rawText || '';
  // Print full text so we can see where the total is
  console.log("=== FULL RAW TEXT ===");
  console.log(rawText);
}

main().catch(console.error).finally(() => prisma.$disconnect());
