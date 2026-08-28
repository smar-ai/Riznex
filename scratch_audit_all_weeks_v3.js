const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'client-1';

  // 15 Sundays from May 4 to Aug 16, 2026
  const sundays = [
    '2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25',
    '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29',
    '2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27',
    '2026-08-09', '2026-08-16'
  ];

  console.log('--- COMPREHENSIVE WEEKLY AUTO-EXPENSE AUDIT (MAY - AUG 16, 2026) ---');

  for (const sStr of sundays) {
    const startRange = new Date(sStr + 'T00:00:00.000Z');
    const endRange   = new Date(sStr + 'T23:59:59.999Z');

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
      where: { clientId, platform: 'Walk In Cash', weekEnd: { gte: startRange, lte: endRange } }
    });
    const cashSum = cashSales.reduce((a, b) => a + b.grossSales, 0);

    const isComplete = wages.length > 0 && suppliers.length > 0 && expenses.length > 0 && cashSales.length > 0;

    console.log(`Week ${sStr}: Wages=£${wageSum} (${wages.length}), Suppliers=£${supplierSum} (${suppliers.length}), Expenses=£${expenseSum} (${expenses.length}), Cash=£${cashSum} (${cashSales.length}) -> STATUS: ${isComplete ? 'OK ✅' : 'MISSING ❌'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
