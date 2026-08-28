const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  // Find all invoices uploaded in May 2026 or from these suppliers
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      // Let's find ones where filename has "Supplier" or "One Stop" or type is "supplier"
      OR: [
        { type: 'supplier' },
        { fileName: { contains: 'Supplier' } },
        { fileName: { contains: 'One Stop' } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`=== DB SUPPLIER INVOICES PARSE AUDIT ===`);
  console.log(`Found ${invoices.length} invoices in database:`);
  
  for (const inv of invoices) {
    console.log(`\n- File Name: ${inv.fileName}`);
    console.log(`  ID: ${inv.id}`);
    console.log(`  Type: ${inv.type} | Status: ${inv.ocrStatus}`);
    console.log(`  Date: ${inv.invoiceDate?.toISOString().split('T')[0]} | Amount: £${inv.amount}`);
    console.log(`  Notes/Errors: ${inv.notes || 'None'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
