const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const is2025 = false; // Real data only
  console.log("=== DB REAL/ACTIVE DATA DETAILED BREAKDOWN ===");

  // Sales
  const salesByStore = await prisma.sale.groupBy({
    by: ['store', 'platform'],
    where: { is2025 },
    _count: { id: true },
    _min: { weekStart: true },
    _max: { weekEnd: true }
  });
  console.log("\nSales breakdown:");
  for (const group of salesByStore) {
    console.log(`  - Store: ${group.store} | Platform: ${group.platform}`);
    console.log(`    Count: ${group._count.id} weeks`);
    console.log(`    Date range: ${group._min.weekStart?.toISOString().split('T')[0]} to ${group._max.weekEnd?.toISOString().split('T')[0]}`);
  }

  // Wages
  const wagesByStore = await prisma.staffWage.groupBy({
    by: ['store'],
    where: { is2025 },
    _count: { id: true },
    _min: { weekEnd: true },
    _max: { weekEnd: true }
  });
  console.log("\nWages breakdown:");
  for (const group of wagesByStore) {
    console.log(`  - Store/Type: ${group.store}`);
    console.log(`    Count: ${group._count.id} records`);
    console.log(`    Date range: ${group._min.weekEnd?.toISOString().split('T')[0]} to ${group._max.weekEnd?.toISOString().split('T')[0]}`);
  }

  // Expenses
  const expensesByCategory = await prisma.expense.groupBy({
    by: ['category'],
    where: { is2025, period: { not: 'template' } },
    _count: { id: true },
    _min: { date: true },
    _max: { date: true }
  });
  console.log("\nExpenses breakdown:");
  for (const group of expensesByCategory) {
    console.log(`  - Category: ${group.category}`);
    console.log(`    Count: ${group._count.id} records`);
    console.log(`    Date range: ${group._min.date?.toISOString().split('T')[0]} to ${group._max.date?.toISOString().split('T')[0]}`);
  }

  // Invoices
  const invoicesByStore = await prisma.invoice.groupBy({
    by: ['type', 'platform'],
    where: { is2025 },
    _count: { id: true },
    _min: { invoiceDate: true },
    _max: { invoiceDate: true }
  });
  console.log("\nInvoices breakdown:");
  for (const group of invoicesByStore) {
    console.log(`  - Type: ${group.type} | Store/Platform: ${group.platform}`);
    console.log(`    Count: ${group._count.id} invoices`);
    console.log(`    Date range: ${group._min.invoiceDate?.toISOString().split('T')[0]} to ${group._max.invoiceDate?.toISOString().split('T')[0]}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
