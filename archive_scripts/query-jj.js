const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recentInvoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { supplier: true }
  });

  console.log("=== LAST 10 INVOICES UPLOADED ===");
  recentInvoices.forEach(inv => {
    console.log(`- File: ${inv.fileName}`);
    console.log(`  Type: ${inv.type} | OCR: ${inv.ocrStatus} | Date: ${inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : 'NULL'}`);
    console.log(`  Supplier: ${inv.supplier?.name || 'None'} | Amount: £${inv.amount}`);
    console.log(`  Uploaded: ${inv.createdAt.toISOString()}`);
    console.log(`  Notes: ${inv.notes || ''}`);
    console.log('---');
  });

  // Also query any logs or errors?
}

main().catch(console.error).finally(() => prisma.$disconnect());
