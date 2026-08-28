const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const expenses = await prisma.expense.findMany();
  let updatedCount = 0;

  for (const exp of expenses) {
    if (exp.store === 'Combined') {
      const matchText = `${exp.subcategory || ''} ${exp.notes || ''}`.toLowerCase();
      let newStore = null;

      // Only re-assign if it explicitly belongs to one franchise
      if (matchText.includes('tasty bun') && !matchText.includes('herbies')) {
        newStore = 'Tasty Bun';
      } else if (matchText.includes('herbies') && !matchText.includes('tasty bun')) {
        newStore = 'Herbies Pizza';
      } else if (exp.category === 'herbies_head_office') {
        newStore = 'Herbies Pizza';
      }

      if (newStore) {
        await prisma.expense.update({
          where: { id: exp.id },
          data: { store: newStore }
        });
        updatedCount++;
        console.log(`Updated [${exp.period}] ${exp.category} / ${exp.subcategory} to store: ${newStore}`);
      }
    }
  }

  console.log(`\nSuccessfully fixed ${updatedCount} records!`);
}

main().catch(console.error);
