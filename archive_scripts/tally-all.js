const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const is2025 = true;
  const numMonths = 9;

  // 1. Sales
  const sales = await prisma.sale.findMany({ where: { is2025 } });
  const platSales = {};
  sales.forEach(s => {
    platSales[s.platform] = (platSales[s.platform] || 0) + s.grossSales;
  });

  // 2. Supplier Purchases
  const invoices = await prisma.invoice.findMany({ where: { is2025, type: 'supplier' }, include: { supplier: true } });
  const suppliers = {};
  invoices.forEach(i => {
    const name = i.supplier?.name || 'Unknown';
    suppliers[name] = (suppliers[name] || 0) + i.amount;
  });

  // 3. Expenses
  const expenses = await prisma.expense.findMany({ where: { is2025 } });
  const expObj = {};
  expenses.forEach(e => {
    const name = e.subcategory || e.category;
    expObj[name] = (expObj[name] || 0) + e.amount;
  });

  // 4. Wages
  const wages = await prisma.staffWage.findMany({ where: { is2025 }, include: { staff: true } });
  const wageObj = {};
  wages.forEach(w => {
    const name = w.staff?.name || 'Unknown Staff';
    wageObj[`Wages - ${name}`] = (wageObj[`Wages - ${name}`] || 0) + w.amount;
  });

  console.log("--- SALES (Total) ---");
  for (const [k, v] of Object.entries(platSales)) console.log(`${k}: ${v}`);
  
  console.log("\n--- SUPPLIER PURCHASES (Monthly Avg) ---");
  for (const [k, v] of Object.entries(suppliers)) console.log(`${k}: ${(v / numMonths).toFixed(2)}`);

  console.log("\n--- EXPENSES (Monthly Avg) ---");
  for (const [k, v] of Object.entries(expObj)) console.log(`${k}: ${(v / numMonths).toFixed(2)}`);

  console.log("\n--- WAGES (Monthly Avg) ---");
  for (const [k, v] of Object.entries(wageObj)) console.log(`${k}: ${(v / numMonths).toFixed(2)}`);

}

main().finally(() => prisma.$disconnect())
