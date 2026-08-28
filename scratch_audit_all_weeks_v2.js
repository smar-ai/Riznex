const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'client-1';

  // 15 Mondays from May 4, 2026 to Aug 10, 2026
  const mondays = [
    '2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25',
    '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29',
    '2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27',
    '2026-08-03', '2026-08-10'
  ];

  console.log('--- COMPREHENSIVE WEEKLY AUTO-EXPENSE AUDIT (MAY - AUG 16, 2026) ---');

  const results = [];

  for (const mStr of mondays) {
    const startRange = new Date(mStr + 'T00:00:00.000Z');
    const endRange   = new Date(mStr + 'T23:59:59.999Z');

    // Check Wages
    const wages = await prisma.staffWage.findMany({
      where: { clientId, weekEnd: { gte: startRange, lte: endRange } }
    });
    const wageSum = wages.reduce((a, b) => a + b.amount, 0);

    // Check Supplier Invoices
    const suppliers = await prisma.invoice.findMany({
      where: { clientId, type: 'supplier', invoiceDate: { gte: startRange, lte: endRange } }
    });
    const supplierSum = suppliers.reduce((a, b) => a + (b.amount || 0), 0);

    // Check Utilities & Fixed Expenses
    const expenses = await prisma.expense.findMany({
      where: { clientId, date: { gte: startRange, lte: endRange } }
    });
    const expenseSum = expenses.reduce((a, b) => a + b.amount, 0);

    // Check Walk In Cash Sales
    const cashSales = await prisma.sale.findMany({
      where: { clientId, platform: 'Walk In Cash', weekStart: { gte: startRange, lte: endRange } }
    });
    const cashSum = cashSales.reduce((a, b) => a + b.grossSales, 0);

    const isComplete = wages.length > 0 && suppliers.length > 0 && expenses.length > 0 && cashSales.length > 0;

    results.push({
      monday: mStr,
      wagesCount: wages.length,
      wageSum,
      supplierCount: suppliers.length,
      supplierSum,
      expenseCount: expenses.length,
      expenseSum,
      cashCount: cashSales.length,
      cashSum,
      isComplete
    });

    console.log(`Week ${mStr}: Wages=£${wageSum} (${wages.length}), Suppliers=£${supplierSum} (${suppliers.length}), Expenses=£${expenseSum} (${expenses.length}), Cash=£${cashSum} (${cashSales.length}) -> STATUS: ${isComplete ? 'OK ✅' : 'MISSING ❌'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
