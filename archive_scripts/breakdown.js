const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const expenses = await prisma.expense.findMany({ where: { is2025: true } });
  
  const expMap = {};
  for (const e of expenses) {
    const name = e.subcategory || e.category;
    expMap[name] = (expMap[name] || 0) + e.amount;
  }

  // Sort them alphabetically or by size
  const sorted = Object.entries(expMap).sort((a, b) => b[1] - a[1]);

  console.log("=== EXPENSE BREAKDOWN ===");
  let total = 0;
  for (const [name, amount] of sorted) {
    console.log(`${name}: £${amount.toFixed(2)}`);
    total += amount;
  }
  console.log(`TOTAL: £${total.toFixed(2)}`);
}

main().finally(() => prisma.$disconnect())
