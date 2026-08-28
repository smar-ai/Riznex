const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const sales = await prisma.sale.findMany({
    where: { clientId, is2025 },
    orderBy: { weekStart: 'asc' },
  });

  const totalGrossSales = sales.reduce((s, r) => s + r.grossSales, 0);
  const totalCommission = sales.reduce((s, r) => s + (r.commission || 0), 0);
  const totalNetPaid = sales.reduce((s, r) => s + (r.netPaid || r.grossSales), 0);

  const expenses = await prisma.expense.findMany({ where: { clientId, is2025 } });
  const wages = await prisma.staffWage.findMany({ where: { clientId, is2025 } });
  const invoices = await prisma.invoice.findMany({ where: { clientId, is2025, type: 'supplier' } });

  const totalExp = expenses.reduce((s, e) => s + e.amount, 0) + wages.reduce((s, w) => s + w.amount, 0);
  const totalSuppliers = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpensesAll = totalExp + totalSuppliers;

  const netProfit = totalNetPaid - totalExpensesAll;

  console.log(`\n=== REAL TRUE FINANCIAL METRICS ===\n`);
  console.log(`- Total Gross Sales:  £${totalGrossSales.toFixed(2)}`);
  console.log(`- Total Net Sales:    £${totalNetPaid.toFixed(2)}`);
  console.log(`- Total Expenses:     £${totalExpensesAll.toFixed(2)}`);
  console.log(`- Net Profit:         £${netProfit.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
