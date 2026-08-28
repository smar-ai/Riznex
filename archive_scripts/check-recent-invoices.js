const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  console.log("=== CHECKING RECENT INVOICES ===");
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { supplier: true }
  });

  for (const inv of invoices) {
    console.log(`ID: ${inv.id}`);
    console.log(`File: ${inv.fileName}`);
    console.log(`Supplier: ${inv.supplier?.name}`);
    console.log(`Invoice Date: ${inv.invoiceDate}`);
    console.log(`Amount: ${inv.amount}`);
    console.log(`OCR Status: ${inv.ocrStatus}`);
    if (inv.ocrData) {
        console.log(`OCR Data: ${inv.ocrData.substring(0, 100)}...`);
    }
    console.log("------------------------");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
