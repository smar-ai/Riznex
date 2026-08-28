const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf'; // Assume Admin Client ID or the primary one

  // 1. Add to auto expenses (template)
  await prisma.expense.create({
    data: {
      clientId,
      is2025: false,
      category: 'misc',
      subcategory: 'Hero Cleaning',
      amount: 50,
      period: 'template',
      date: new Date(),
      notes: 'Fixed weekly cleaning cost'
    }
  });
  console.log("Added Hero Cleaning to Auto-Expenses (Templates).");

  // 2. Add £50 per week from April to June 2026
  // List of all Sundays from April 1 to June 30, 2026
  const dates = [
    '2026-04-05', '2026-04-12', '2026-04-19', '2026-04-26',
    '2026-05-03', '2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31',
    '2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28'
  ];

  for (const dateStr of dates) {
    await prisma.expense.create({
      data: {
        clientId,
        is2025: false,
        category: 'misc',
        subcategory: 'Hero Cleaning',
        amount: 50,
        period: 'weekly',
        date: new Date(`${dateStr}T12:00:00Z`),
        notes: 'Backdated weekly cleaning cost'
      }
    });
  }
  console.log(`Added ${dates.length} weekly £50 expense records from April to June.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
