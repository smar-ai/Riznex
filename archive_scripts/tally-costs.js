const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const expenses = await prisma.expense.findMany({ where: { is2025: true } });
  const invoices = await prisma.invoice.findMany({ where: { is2025: true, type: 'supplier' }, include: { supplier: true } });

  console.log('--- EXPENSES (2025) ---');
  const expMap = {};
  for (const e of expenses) {
    const key = e.category + ' - ' + (e.subcategory || 'General');
    expMap[key] = (expMap[key] || 0) + e.amount;
  }
  
  for (const [key, amount] of Object.entries(expMap)) {
    console.log(`- ${key}: £${amount.toFixed(2)}`);
  }
  console.log(`\nTOTAL EXPENSES: £${expenses.reduce((a, b) => a + b.amount, 0).toFixed(2)}\n`);

  console.log('--- SUPPLIER INVOICES (2025) ---');
  const invMap = {};
  for (const i of invoices) {
    const key = i.supplier?.name || 'Unknown Supplier';
    invMap[key] = (invMap[key] || 0) + i.amount;
  }
  
  for (const [key, amount] of Object.entries(invMap)) {
    console.log(`- ${key}: £${amount.toFixed(2)}`);
  }
  console.log(`\nTOTAL SUPPLIER INVOICES: £${invoices.reduce((a, b) => a + b.amount, 0).toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
