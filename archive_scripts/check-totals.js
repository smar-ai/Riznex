const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({ where: { is2025: true } });
  const expenses = await prisma.expense.findMany({ where: { is2025: true } });
  const invoices = await prisma.invoice.findMany({ where: { is2025: true, type: 'supplier' } });

  const totalGross = sales.reduce((a, b) => a + b.grossSales, 0);
  const totalNetPaid = sales.reduce((a, b) => a + b.netPaid, 0);
  const totalCommission = sales.reduce((a, b) => a + b.commission, 0);
  const totalAdSpends = sales.reduce((a, b) => a + (b.adSpends || 0), 0);

  const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
  const totalSuppliers = invoices.reduce((a, b) => a + b.amount, 0);

  const netProfit = totalNetPaid - totalExpenses - totalSuppliers;

  console.log(`Gross Sales: £${totalGross.toFixed(2)}`);
  console.log(`Net Paid: £${totalNetPaid.toFixed(2)}`);
  console.log(`(Gap due to Commission/Ads/Fees: £${(totalGross - totalNetPaid).toFixed(2)})`);
  console.log(`Total Expenses: £${totalExpenses.toFixed(2)}`);
  console.log(`Total Suppliers: £${totalSuppliers.toFixed(2)}`);
  console.log(`-------------------------------------`);
  console.log(`NET PROFIT: £${netProfit.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
