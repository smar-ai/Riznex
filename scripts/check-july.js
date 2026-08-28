const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const gte = new Date('2026-07-01');
  const lte = new Date('2026-07-31T23:59:59.999Z');
  
  const sales = await prisma.sale.aggregate({ _sum: { grossSales: true, netPaid: true }, where: { store: 'Herbies Pizza', is2025: false, weekEnd: { gte, lte } } });
  const wages = await prisma.staffWage.findMany({ where: { is2025: false, weekEnd: { gte, lte } } });
  
  let wageSum = 0;
  for(const w of wages) {
    if (w.store === 'Herbies Pizza') wageSum += w.amount;
    else if (w.store === 'Combined' || !w.store) wageSum += w.amount * 0.5;
  }
  
  const exps = await prisma.expense.findMany({ where: { is2025: false, period: { not: 'template' }, date: { gte, lte } } });
  let expSum = 0;
  for(const e of exps) {
    if(e.store === 'Herbies Pizza') expSum += e.amount;
    else if (e.store === 'Combined' || !e.store) expSum += e.amount * 0.5;
  }
  
  const invs = await prisma.invoice.findMany({ where: { is2025: false, type: 'supplier', invoiceDate: { gte, lte } }, include: { supplier: true } });
  let invSum = 0;
  for(const i of invs) {
    const fr = i.supplier?.franchise || 'Combined';
    if(fr === 'Herbies Pizza') invSum += i.amount;
    else if (fr === 'Combined' || !fr) invSum += i.amount * 0.5;
  }
  
  console.log('Herbies Sales July:', sales._sum, 'Wages:', wageSum, 'Expenses:', expSum, 'Invoices:', invSum);
  console.log('Herbies Net Profit July:', sales._sum.netPaid - wageSum - expSum - invSum);
}
run().finally(()=>prisma.$disconnect());
