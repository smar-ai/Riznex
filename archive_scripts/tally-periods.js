const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const expenses = await prisma.expense.findMany({ where: { is2025: true } });
  
  const weekly = {};
  const monthly = {};

  for (const e of expenses) {
    const name = e.subcategory || e.category;
    if (e.period === 'weekly') {
      weekly[name] = e.amount;
    } else if (e.period === 'monthly') {
      monthly[name] = e.amount;
    }
  }

  console.log("WEEKLY");
  for (const [k, v] of Object.entries(weekly)) {
    console.log(`- ${k}: £${v}`);
  }

  console.log("\nMONTHLY");
  for (const [k, v] of Object.entries(monthly)) {
    console.log(`- ${k}: £${v}`);
  }
}

main().finally(() => prisma.$disconnect())
