const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const invoice = await prisma.invoice.findFirst({
    where: { fileName: { contains: 'Herbies POS 04 April 05' } },
    include: { sales: true }
  });

  if (!invoice) {
    console.log("Invoice not found");
    return;
  }

  console.log(`Invoice: ${invoice.fileName}`);
  console.log(`Invoice Amount: £${invoice.amount}`);
  console.log(`OCR Data:`, JSON.parse(invoice.ocrData || '{}'));
  
  console.log("\nLinked Sales records:");
  invoice.sales.forEach(s => {
    console.log(`  - Platform: ${s.platform}`);
    console.log(`    Gross Sales: £${s.grossSales}`);
    console.log(`    Commission: £${s.commission}`);
    console.log(`    VAT: £${s.vat}`);
    console.log(`    Other Fees: £${s.otherFees}`);
    console.log(`    Net Paid: £${s.netPaid}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
