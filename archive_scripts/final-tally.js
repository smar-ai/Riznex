const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const is2025 = true;

  // 1. Sales
  const sales = await prisma.sale.findMany({ where: { is2025 } });
  const totalGross = sales.reduce((a, b) => a + b.grossSales, 0);
  const totalNetPaid = sales.reduce((a, b) => a + b.netPaid, 0);
  const totalCommission = sales.reduce((a, b) => a + b.commission, 0);
  const totalAdSpends = sales.reduce((a, b) => a + (b.adSpends || 0), 0);
  // Sanity check: Gross - Commission - AdSpends should equal NetPaid approx
  // Actually on the dashboard, totalCommission = Gross - NetPaid - AdSpends

  // 2. Supplier Purchases
  const invoices = await prisma.invoice.findMany({ where: { is2025, type: 'supplier' } });
  const totalSuppliers = invoices.reduce((a, b) => a + b.amount, 0);

  // 3. Expenses
  const expenses = await prisma.expense.findMany({ where: { is2025 } });
  const totalExpensesObj = expenses.reduce((a, b) => a + b.amount, 0);

  // 4. Wages
  const wages = await prisma.staffWage.findMany({ where: { is2025 } });
  const totalWages = wages.reduce((a, b) => a + b.amount, 0);

  // Total Expenses (Expenses + Wages)
  const allExpenses = totalExpensesObj + totalWages;

  // Net Profit
  const netProfit = totalNetPaid - allExpenses - totalSuppliers;

  console.log("=== FINAL DASHBOARD NUMBERS ===");
  console.log(`Gross Sales: £${totalGross.toFixed(2)}`);
  console.log(`Net Sales (Net Paid to Bank): £${totalNetPaid.toFixed(2)}`);
  console.log(`3rd Party Deductions & Ads: £${(totalGross - totalNetPaid).toFixed(2)}`);
  console.log(`-----------------------------------`);
  console.log(`Total Expenses (Bills, Wages, Fees): £${allExpenses.toFixed(2)}`);
  console.log(`  - General Expenses/Fees: £${totalExpensesObj.toFixed(2)}`);
  console.log(`  - Staff Wages: £${totalWages.toFixed(2)}`);
  console.log(`Total Supplier Purchases: £${totalSuppliers.toFixed(2)}`);
  console.log(`-----------------------------------`);
  console.log(`NET PROFIT: £${netProfit.toFixed(2)}`);

}

main().finally(() => prisma.$disconnect())
