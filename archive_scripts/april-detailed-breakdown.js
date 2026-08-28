const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;
  const from = new Date('2026-04-01T00:00:00Z');
  const to = new Date('2026-04-30T23:59:59Z');

  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      is2025,
      type: { in: ['platform', 'pos'] },
      invoiceDate: { gte: from, lte: to }
    },
    include: { sales: true }
  });

  console.log("=== INVOICE VS LINKED SALES BREAKDOWN FOR APRIL 2026 ===");
  let totalInvoiceAmt = 0;
  let totalSalesGross = 0;

  for (const inv of invoices) {
    const invAmt = inv.amount || 0;
    const saleAmtSum = inv.sales.reduce((sum, s) => sum + s.grossSales, 0);
    const diff = invAmt - saleAmtSum;
    totalInvoiceAmt += invAmt;
    totalSalesGross += saleAmtSum;

    console.log(`- ${inv.fileName}`);
    console.log(`  Date: ${inv.invoiceDate.toISOString().split('T')[0]} | Type: ${inv.type}`);
    console.log(`  Invoice Amount: £${invAmt.toFixed(2)} | Linked Sales: £${saleAmtSum.toFixed(2)} | Diff: £${diff.toFixed(2)}`);
  }

  console.log(`\nTOTALS:`);
  console.log(`  Total Invoice Amount: £${totalInvoiceAmt.toFixed(2)}`);
  console.log(`  Total Sales Gross:    £${totalSalesGross.toFixed(2)}`);
  console.log(`  Overall Diff:         £${(totalInvoiceAmt - totalSalesGross).toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
