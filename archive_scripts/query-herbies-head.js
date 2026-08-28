const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recentInvoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { supplier: true }
  });

  console.log("=== LAST 20 INVOICES UPLOADED ===");
  recentInvoices.forEach(inv => {
    console.log(`- File: ${inv.fileName}`);
    console.log(`  Type: ${inv.type} | OCR: ${inv.ocrStatus} | Date: ${inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : 'NULL'}`);
    console.log(`  Supplier: ${inv.supplier?.name || 'None'} | Platform: ${inv.platform || 'None'} | Amount: £${inv.amount}`);
    console.log(`  Uploaded: ${inv.createdAt.toISOString()}`);
    console.log('---');
  });

  const headOffice = await prisma.invoice.findMany({
    where: { 
      fileName: { contains: 'head', mode: 'insensitive' }
    }
  });

  console.log(`\nFound ${headOffice.length} invoices matching 'head' in filename.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
