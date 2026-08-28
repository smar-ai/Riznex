const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const updated = await prisma.expense.updateMany({
    where: {
      is2025: true,
      subcategory: 'Store Reparation Fee'
    },
    data: {
      subcategory: 'Store Repossession Fee'
    }
  });

  console.log(`Successfully renamed ${updated.count} records to "Store Repossession Fee".`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
