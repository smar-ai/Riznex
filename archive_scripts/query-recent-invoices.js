const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recentInvoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      fileName: true,
      ocrStatus: true,
      invoiceDate: true,
      type: true,
      platform: true,
      supplier: { select: { name: true } },
      createdAt: true
    }
  });

  console.log("=== LAST 10 UPLOADED FILES ===");
  recentInvoices.forEach(inv => {
    console.log(`- File: ${inv.fileName}`);
    console.log(`  Type: ${inv.type} | OCR: ${inv.ocrStatus} | Date: ${inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : 'NULL'}`);
    console.log(`  Supplier: ${inv.supplier ? inv.supplier.name : 'None'} | Platform: ${inv.platform || 'None'}`);
    console.log(`  Uploaded at: ${inv.createdAt.toISOString()}`);
    console.log('---');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
