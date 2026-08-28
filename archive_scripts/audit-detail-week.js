const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;
  const targetDate = new Date('2026-04-05T23:59:59.000Z');
  
  // Find all invoices for this week
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      is2025,
      invoiceDate: {
        gte: new Date('2026-04-01T00:00:00Z'),
        lte: new Date('2026-04-07T00:00:00Z')
      }
    },
    include: { sales: true }
  });

  console.log("=== INVOICES AND SALES FOR WEEK ENDING 2026-04-05 ===");
  
  for (const inv of invoices) {
    console.log(`\nInvoice ID: ${inv.id}`);
    console.log(`File Name: ${inv.fileName}`);
    console.log(`Type: ${inv.type} | Platform: ${inv.platform}`);
    console.log(`Invoice Amount: £${inv.amount}`);
    
    console.log(`Linked Sales:`);
    if (inv.sales.length === 0) {
      console.log("  (None)");
    } else {
      inv.sales.forEach(s => {
        console.log(`  - ID: ${s.id} | Platform: ${s.platform}`);
        console.log(`    Gross Sales: £${s.grossSales} | Net Paid: £${s.netPaid} | Commission: £${s.commission} | VAT: £${s.vat}`);
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
