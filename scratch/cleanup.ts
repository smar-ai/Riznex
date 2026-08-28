import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deleted = await prisma.expense.deleteMany({
    where: {
      notes: {
        startsWith: 'Auto-created from supplier invoice'
      }
    }
  })
  console.log(`Deleted ${deleted.count} duplicate auto-created expenses.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
