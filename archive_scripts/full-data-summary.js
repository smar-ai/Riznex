const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("=== DB DATA RANGE AUDIT ===");

  // 1. Sales Summary
  const salesSummary = await prisma.sale.aggregate({
    _min: { weekStart: true, weekEnd: true },
    _max: { weekStart: true, weekEnd: true },
    _count: { id: true }
  });
  console.log("\nSales records:");
  console.log(`  Count: ${salesSummary._count.id}`);
  console.log(`  Min Date: ${salesSummary._min.weekStart ? salesSummary._min.weekStart.toISOString().split('T')[0] : 'None'}`);
  console.log(`  Max Date: ${salesSummary._max.weekEnd ? salesSummary._max.weekEnd.toISOString().split('T')[0] : 'None'}`);

  // Break down sales by store/platform
  const salesByStore = await prisma.sale.groupBy({
    by: ['store', 'platform'],
    _count: { id: true },
    _min: { weekStart: true },
    _max: { weekEnd: true }
  });
  console.log("\nSales breakdown by store/platform:");
  for (const group of salesByStore) {
    console.log(`  - Store: ${group.store} | Platform: ${group.platform}`);
    console.log(`    Count: ${group._count.id}`);
    console.log(`    Date range: ${group._min.weekStart?.toISOString().split('T')[0]} to ${group._max.weekEnd?.toISOString().split('T')[0]}`);
  }

  // 2. Staff Wages Summary
  const wagesSummary = await prisma.staffWage.aggregate({
    _min: { weekEnd: true },
    _max: { weekEnd: true },
    _count: { id: true }
  });
  console.log("\nStaff Wages records:");
  console.log(`  Count: ${wagesSummary._count.id}`);
  console.log(`  Min Date: ${wagesSummary._min.weekEnd ? wagesSummary._min.weekEnd.toISOString().split('T')[0] : 'None'}`);
  console.log(`  Max Date: ${wagesSummary._max.weekEnd ? wagesSummary._max.weekEnd.toISOString().split('T')[0] : 'None'}`);

  // 3. Expenses Summary (fixed/weekly/monthly/etc.)
  const expensesSummary = await prisma.expense.aggregate({
    where: { period: { not: 'template' } },
    _min: { date: true },
    _max: { date: true },
    _count: { id: true }
  });
  console.log("\nExpenses (excluding templates):");
  console.log(`  Count: ${expensesSummary._count.id}`);
  console.log(`  Min Date: ${expensesSummary._min.date ? expensesSummary._min.date.toISOString().split('T')[0] : 'None'}`);
  console.log(`  Max Date: ${expensesSummary._max.date ? expensesSummary._max.date.toISOString().split('T')[0] : 'None'}`);

  // 4. Invoices Summary (Suppliers/POS/etc.)
  const invoicesSummary = await prisma.invoice.aggregate({
    _min: { invoiceDate: true },
    _max: { invoiceDate: true },
    _count: { id: true }
  });
  console.log("\nInvoices (scanned/uploaded):");
  console.log(`  Count: ${invoicesSummary._count.id}`);
  console.log(`  Min Date: ${invoicesSummary._min.invoiceDate ? invoicesSummary._min.invoiceDate.toISOString().split('T')[0] : 'None'}`);
  console.log(`  Max Date: ${invoicesSummary._max.invoiceDate ? invoicesSummary._max.invoiceDate.toISOString().split('T')[0] : 'None'}`);

  // Break down invoices by type
  const invoicesByType = await prisma.invoice.groupBy({
    by: ['type'],
    _count: { id: true }
  });
  console.log("\nInvoices breakdown by type:");
  for (const group of invoicesByType) {
    console.log(`  - Type: ${group.type} | Count: ${group._count.id}`);
  }

  // 5. Stocks Summary
  const stocksSummary = await prisma.stock.aggregate({
    _min: { weekEnd: true },
    _max: { weekEnd: true },
    _count: { id: true }
  });
  console.log("\nStock counts:");
  console.log(`  Count: ${stocksSummary._count.id}`);
  console.log(`  Min Date: ${stocksSummary._min.weekEnd ? stocksSummary._min.weekEnd.toISOString().split('T')[0] : 'None'}`);
  console.log(`  Max Date: ${stocksSummary._max.weekEnd ? stocksSummary._max.weekEnd.toISOString().split('T')[0] : 'None'}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
