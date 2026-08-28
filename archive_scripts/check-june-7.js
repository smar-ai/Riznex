const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  // Find invoices for June 7
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      fileName: { contains: 'June 07' }
    },
    include: { sales: true }
  });

  console.log("=== JUNE 07 INVOICES AND SALES IN DB ===");
  console.log(`Found ${invoices.length} invoices:`);
  for (const inv of invoices) {
    console.log(`\nInvoice ID: ${inv.id}`);
    console.log(`File Name: ${inv.fileName}`);
    console.log(`Type: ${inv.type} | Platform: ${inv.platform}`);
    console.log(`Amount: £${inv.amount} | Date: ${inv.invoiceDate?.toISOString().split('T')[0]}`);
    console.log(`Linked Sales:`);
    inv.sales.forEach(s => {
      console.log(`  - ID: ${s.id} | Platform: ${s.platform} | Gross: £${s.grossSales} | Net: £${s.netPaid} | Comm: £${s.commission}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
