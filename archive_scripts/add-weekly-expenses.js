const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  const weeklyExpenses = [
    { category: 'internet', subcategory: 'Internet', amount: 40.00 },
    { category: 'bin', subcategory: 'Bin', amount: 30.00 },
    { category: 'utilities', subcategory: 'Gas/Electric', amount: 125.00 },
    { category: 'rent', subcategory: 'Shop rent', amount: 333.25 },
    { category: 'fuel', subcategory: 'Car Petrol', amount: 150.00 },
    { category: 'misc', subcategory: 'Car Instalment', amount: 44.50 },
    { category: 'tax', subcategory: 'Road tax', amount: 10.00 }
  ]

  let currentDate = new Date('2025-07-07T00:00:00.000Z') // First Monday of July
  const endDate = new Date('2026-03-31T23:59:59.000Z')

  let createdCount = 0;

  console.log("Adding Weekly Expenses...")
  while (currentDate <= endDate) {
    const expenseDate = new Date(currentDate)
    
    for (const exp of weeklyExpenses) {
      // Check for duplicates
      const existing = await prisma.expense.findFirst({
        where: {
          clientId,
          is2025: true,
          category: exp.category,
          subcategory: exp.subcategory,
          amount: exp.amount,
          date: expenseDate,
          period: 'weekly'
        }
      })

      if (!existing) {
        await prisma.expense.create({
          data: {
            clientId,
            category: exp.category,
            subcategory: exp.subcategory,
            amount: exp.amount,
            period: 'weekly',
            date: expenseDate,
            is2025: true,
            notes: 'Manual Entry'
          }
        })
        createdCount++;
      }
    }

    // Add 7 days
    currentDate.setDate(currentDate.getDate() + 7)
  }

  console.log(`Created ${createdCount} weekly expense records across 39 weeks.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
