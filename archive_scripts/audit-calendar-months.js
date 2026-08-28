const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  console.log("=== MONTHLY TOTALS AUDIT (APRIL & MAY 2026) ===");

  const months = [
    { name: 'April 2026', from: new Date('2026-03-30T00:00:00Z'), to: new Date('2026-05-03T23:59:59Z') }, // Align with 5-week block or calendar
    { name: 'May 2026', from: new Date('2026-05-04T00:00:00Z'), to: new Date('2026-05-31T23:59:59Z') }
  ];

  // Let's do strict calendar month first
  const calMonths = [
    { name: 'April 2026 (Strict Calendar)', from: new Date('2026-04-01T00:00:00Z'), to: new Date('2026-04-30T23:59:59Z') },
    { name: 'May 2026 (Strict Calendar)', from: new Date('2026-05-01T00:00:00Z'), to: new Date('2026-05-31T23:59:59Z') }
  ];

  for (const m of calMonths) {
    console.log(`\n--- ${m.name} ---`);

    // 1. Sales from Sale Table
    const sales = await prisma.sale.aggregate({
      where: {
        clientId,
        is2025,
        weekEnd: { gte: m.from, lte: m.to }
      },
      _sum: { grossSales: true, netPaid: true, commission: true, vat: true }
    });

    // 2. Invoices from Invoice Table
    const invoices = await prisma.invoice.aggregate({
      where: {
        clientId,
        is2025,
        type: { in: ['platform', 'pos'] },
        invoiceDate: { gte: m.from, lte: m.to }
      },
      _sum: { amount: true }
    });

    console.log(`  Sales Table:`);
    console.log(`    Gross Sales: £${(sales._sum.grossSales || 0).toFixed(2)}`);
    console.log(`    Commission:  £${(sales._sum.commission || 0).toFixed(2)}`);
    console.log(`    VAT:         £${(sales._sum.vat || 0).toFixed(2)}`);
    console.log(`    Net Paid:    £${(sales._sum.netPaid || 0).toFixed(2)}`);

    console.log(`  Invoices Table (Platform/POS):`);
    console.log(`    Total Amount: £${(invoices._sum.amount || 0).toFixed(2)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
