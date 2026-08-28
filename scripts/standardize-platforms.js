const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const updates = [
    { old: 'Herbies Pizza Just Eat', new: 'Just Eat' },
    { old: 'Tasty Bun Just Eat', new: 'Just Eat' },
    { old: 'Tasty Bun Uber Eats', new: 'Uber Eats' },
    { old: 'Herbies Pizza POS', new: 'POS' },
    { old: 'Tasty Bun POS', new: 'POS' },
    { old: 'Herbies Pizza Website & Mobile', new: 'Website' },
    { old: 'Tasty Bun Website', new: 'Website' },
    { old: 'Tasty Bun App', new: 'Website' },
    { old: 'Herbies Pizza Deliveroo', new: 'Deliveroo' },
    { old: 'Tasty Bun Deliveroo', new: 'Deliveroo' },
  ];

  for (const { old, new: newName } of updates) {
    const res = await prisma.sale.updateMany({
      where: { platform: old },
      data: { platform: newName }
    });
    console.log(`Updated ${res.count} records from '${old}' to '${newName}'`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
