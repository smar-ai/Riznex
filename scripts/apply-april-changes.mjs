import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Applying April Changes...");

  // 1. Update Commissions
  const sales = await prisma.sale.findMany();
  let updatedSales = 0;
  for (const s of sales) {
    let newCommission = null;

    if (s.store === 'Tasty Bun') {
      newCommission = s.grossSales * 0.04;
    } else if (s.store === 'Herbies Pizza') {
      if (s.platform.includes('POS')) {
        newCommission = 0;
      } else if (s.platform.includes('Website') || s.platform.includes('App')) {
        newCommission = s.grossSales * 0.085;
      }
    }

    if (newCommission !== null) {
      const newNetPaid = s.grossSales - newCommission - s.otherFees;
      await prisma.sale.update({
        where: { id: s.id },
        data: {
          commission: newCommission,
          netPaid: newNetPaid
        }
      });
      updatedSales++;
    }
  }
  console.log(`Updated ${updatedSales} sale commissions.`);

  // 2. Rename Petrol
  const { count } = await prisma.expense.updateMany({
    where: { subcategory: 'Petrol (from POS)' },
    data: { subcategory: 'Drivers Petrol' }
  });
  console.log(`Renamed ${count} POS petrol expenses to Drivers Petrol.`);

  // 3. Create Fixed Expenses for the 4 weeks of April
  const client = await prisma.client.findFirst();
  if (!client) {
    console.log("No client found");
    return;
  }

  const aprilDates = [
    new Date("2026-04-05T00:00:00.000Z"),
    new Date("2026-04-12T00:00:00.000Z"),
    new Date("2026-04-19T00:00:00.000Z"),
    new Date("2026-04-26T00:00:00.000Z")
  ];

  let addedExpenses = 0;
  for (const date of aprilDates) {
    const fixedExpenses = [
      { category: 'fees', subcategory: 'Accountant Fee', amount: 60.00 },
      { category: 'internet', subcategory: 'Internet', amount: 49.00 },
      { category: 'fees', subcategory: 'Card Terminal Fee', amount: 6.25 },
      { category: 'fuel', subcategory: 'Car Petrol', amount: 150.00 },
      { category: 'fees', subcategory: 'Herbies Pizza POS Fee - Herbies Pizza', amount: 37.50 }
    ];

    for (const fe of fixedExpenses) {
      await prisma.expense.create({
        data: {
          clientId: client.id,
          category: fe.category,
          subcategory: fe.subcategory,
          amount: fe.amount,
          period: 'weekly',
          date: date,
          notes: 'Auto-Added Fixed Cost'
        }
      });
      addedExpenses++;
    }
  }
  console.log(`Added ${addedExpenses} fixed expenses for April.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
