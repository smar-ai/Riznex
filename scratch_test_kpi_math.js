const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  const sales = await prisma.sale.findMany({
    where: { clientId, is2025 },
    include: { invoice: true },
    orderBy: { weekStart: 'asc' },
  });

  let totalGrossSales = 0;
  let totalCalculatedCommission = 0;
  let totalCalculatedNetPaid = 0;

  sales.forEach(s => {
    totalGrossSales += s.grossSales;

    const p = (s.platform || '').toLowerCase();
    const st = (s.store || '').toLowerCase();
    const isTasty = st.includes('tasty') || p.includes('tasty');
    const isHerbies = st.includes('herbies') || p.includes('herbies');

    let comm = s.commission || 0;
    let net = s.netPaid || s.grossSales;

    if (isTasty) {
      if (p.includes('website') || p.includes('app') || p.includes('pos')) {
        comm = s.grossSales * 0.04;
        net = s.grossSales - comm;
      }
    } else if (isHerbies || !isTasty) {
      if (p.includes('website') || p.includes('app')) {
        const baseNet = s.netPaid || s.grossSales;
        comm = baseNet * 0.085;
        net = baseNet - comm;
      } else if (p.includes('pos')) {
        comm = 0;
        net = s.netPaid || s.grossSales;
      }
    }

    totalCalculatedCommission += comm;
    totalCalculatedNetPaid += net;
  });

  const expenses = 58263.74;
  const suppliers = 31240.92;
  const totalExpenses = expenses + suppliers;
  const netProfit = totalCalculatedNetPaid - totalExpenses;

  console.log(`\n=== ACCURATE KPI MATH (NO SPLIT) ===\n`);
  console.log(`- Gross Sales:       £${totalGrossSales.toFixed(2)}`);
  console.log(`- Total Commission:  £${totalCalculatedCommission.toFixed(2)}`);
  console.log(`- Net Sales (Rec'd): £${totalCalculatedNetPaid.toFixed(2)}`);
  console.log(`- Total Expenses:    £${totalExpenses.toFixed(2)}`);
  console.log(`- Net Profit:        £${netProfit.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
