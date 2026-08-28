const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sales = await prisma.sale.aggregate({ _sum: { grossSales: true, netPaid: true }, where: { store: 'Herbies Pizza', is2025: false } });
  const wages = await prisma.staffWage.findMany({ where: { is2025: false } });
  
  let wageSumH = 0;
  let wageSumT = 0;
  for(const w of wages) {
    if (w.store === 'Herbies Pizza') wageSumH += w.amount;
    else if (w.store === 'Tasty Bun') wageSumT += w.amount;
    else if (w.store === 'Combined' || !w.store) {
      wageSumH += w.amount * 0.5;
      wageSumT += w.amount * 0.5;
    }
  }

  const exps = await prisma.expense.findMany({ where: { is2025: false, period: { not: 'template' } } });
  let expSumH = 0;
  let expSumT = 0;
  for(const e of exps) {
    if(e.store === 'Herbies Pizza') expSumH += e.amount;
    else if (e.store === 'Tasty Bun') expSumT += e.amount;
    else if (e.store === 'Combined' || !e.store) {
      expSumH += e.amount * 0.5;
      expSumT += e.amount * 0.5;
    }
  }

  const invs = await prisma.invoice.findMany({ where: { is2025: false, type: 'supplier' }, include: { supplier: true } });
  let invSumH = 0;
  let invSumT = 0;
  for(const i of invs) {
    const fr = i.supplier?.franchise || 'Combined';
    if(fr === 'Herbies Pizza') invSumH += i.amount;
    else if(fr === 'Tasty Bun') invSumT += i.amount;
    else if (fr === 'Combined' || !fr) {
      invSumH += i.amount * 0.5;
      invSumT += i.amount * 0.5;
    }
  }
  
  const salesT = await prisma.sale.aggregate({ _sum: { grossSales: true, netPaid: true }, where: { store: 'Tasty Bun', is2025: false } });

  console.log('Herbies Sales:', sales._sum, 'Wages:', wageSumH, 'Expenses:', expSumH, 'Invoices:', invSumH);
  console.log('Herbies Net Profit:', sales._sum.netPaid - wageSumH - expSumH - invSumH);
  
  console.log('Tasty Sales:', salesT._sum, 'Wages:', wageSumT, 'Expenses:', expSumT, 'Invoices:', invSumT);
  console.log('Tasty Net Profit:', salesT._sum.netPaid - wageSumT - expSumT - invSumT);
}
run().finally(()=>prisma.$disconnect());
