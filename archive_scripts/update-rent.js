const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const rentExpenses = await prisma.expense.findMany({
    where: {
      is2025: true,
      subcategory: 'Shop rent'
    },
    orderBy: { date: 'asc' }
  });

  if (rentExpenses.length === 0) {
    console.log("No shop rent expenses found.");
    return;
  }

  console.log(`Found ${rentExpenses.length} Shop rent expenses. Adjusting them...`);

  // Target for a full 52-week year is £15,500.
  // The proportion for however many weeks we have (39) is:
  const targetTotal = (15500 / 52) * rentExpenses.length;
  const baseWeekly = Math.round((15500 / 52) * 100) / 100; // 298.08

  let accumulated = 0;
  
  for (let i = 0; i < rentExpenses.length; i++) {
    const exp = rentExpenses[i];
    let amountToCharge = baseWeekly;

    if (i === rentExpenses.length - 1) {
      amountToCharge = targetTotal - accumulated;
      amountToCharge = Math.round(amountToCharge * 100) / 100;
    }

    await prisma.expense.update({
      where: { id: exp.id },
      data: { amount: amountToCharge }
    });

    accumulated += amountToCharge;
  }

  console.log(`Successfully updated ${rentExpenses.length} weeks of Shop Rent.`);
  console.log(`New Total Rent for this period: £${accumulated.toFixed(2)}`);
  console.log(`(This equates to exactly £15,500.00 per 52-week year).`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
