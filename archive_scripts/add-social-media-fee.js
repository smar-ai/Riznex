const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  const is2025 = false;

  // 1. Create the template
  const newTemplate = await prisma.expense.create({
    data: {
      clientId,
      is2025,
      category: 'social_media',
      subcategory: 'Handling Fee',
      store: 'Combined',
      amount: 25.00,
      period: 'template',
      date: new Date('2026-07-19T00:00:00.000Z'),
      notes: 'Weekly Social Media Fee',
    }
  });

  console.log('Created Template:', newTemplate);

  // 2. Generate past data
  const dates = [
    '2026-05-03', '2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31',
    '2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28',
    '2026-07-05', '2026-07-12'
  ];

  for (const d of dates) {
    const targetDate = new Date(`${d}T12:00:00.000Z`);

    // Herbies half
    await prisma.expense.create({
      data: {
        clientId,
        is2025,
        category: 'social_media',
        subcategory: 'Handling Fee - Herbies Pizza',
        store: 'Herbies Pizza',
        amount: 12.50,
        period: 'weekly',
        date: targetDate,
        notes: 'Auto-filled 50/50 split (Backdated manually)',
      }
    });

    // Tasty Bun half
    await prisma.expense.create({
      data: {
        clientId,
        is2025,
        category: 'social_media',
        subcategory: 'Handling Fee - Tasty Bun',
        store: 'Tasty Bun',
        amount: 12.50,
        period: 'weekly',
        date: targetDate,
        notes: 'Auto-filled 50/50 split (Backdated manually)',
      }
    });
    
    console.log(`Backdated for ${d}`);
  }

  // 3. Fetch all current templates to list them to the user
  const allTemplates = await prisma.expense.findMany({
    where: { clientId, is2025, period: 'template' },
    orderBy: { category: 'asc' }
  });

  console.log('\n--- CURRENT FIXED COSTS TEMPLATES ---');
  allTemplates.forEach(t => {
    console.log(`- ${t.category} / ${t.subcategory || 'N/A'}: £${t.amount} (${t.store})`);
  });
}

main().catch(console.error);
