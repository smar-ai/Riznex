const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  // 1. Create Supplier "Shahzad Loan"
  let supplier = await prisma.supplier.findFirst({
    where: { name: 'Shahzad Loan', clientId }
  })
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { name: 'Shahzad Loan', category: 'loan', clientId }
    })
  }
  const supplierId = supplier.id

  // 2. Add weekly payments (July 2025 to March 2026)
  // £2300 / month * 9 months = £20700
  // Spread across 39 weeks -> £20700 / 39 = £530.7692...
  // I will use £530.77 for the first 38 weeks, and £530.74 for the final week.
  
  const totalAmountTarget = 2300 * 9; // 20700
  const weeklyStandardAmount = 530.77;
  
  let currentDate = new Date('2025-07-07T00:00:00.000Z') // First Monday of July
  const endDate = new Date('2026-03-31T23:59:59.000Z')

  let createdCount = 0;
  let accumulatedAmount = 0;
  let weekNum = 1;
  const totalWeeks = 39;

  console.log("Adding Shahzad Loan weekly supplier invoices...")
  while (currentDate <= endDate) {
    const invoiceDate = new Date(currentDate)
    const dateStr = invoiceDate.toISOString().substring(0,10)
    
    // Check for duplicates
    const existing = await prisma.invoice.findFirst({
      where: {
        clientId, supplierId, is2025: true,
        fileName: { contains: 'Shahzad Loan Payment' },
        invoiceDate
      }
    })

    if (!existing) {
      let amountToCharge = weeklyStandardAmount;
      if (weekNum === totalWeeks) {
        // Last week, balance it out
        amountToCharge = totalAmountTarget - accumulatedAmount;
      }
      // Round to 2 decimal places to prevent floating point issues
      amountToCharge = Math.round(amountToCharge * 100) / 100;

      await prisma.invoice.create({
        data: {
          clientId,
          supplierId,
          type: 'supplier',
          platform: null,
          fileName: `Manual Entry Shahzad Loan Payment ${dateStr}`,
          fileType: 'manual',
          filePath: 'manual',
          amount: amountToCharge,
          invoiceDate,
          ocrStatus: 'done',
          is2025: true,
          notes: 'UNKNOWN'
        }
      })
      accumulatedAmount += amountToCharge;
      createdCount++;
      console.log(`Created Loan Payment for ${dateStr} at £${amountToCharge}`);
    } else {
      console.log(`Skipped duplicate Loan Payment for ${dateStr}`);
      accumulatedAmount += existing.amount;
    }

    // Add 7 days
    currentDate.setDate(currentDate.getDate() + 7)
    weekNum++;
  }

  console.log(`Created ${createdCount} weekly loan payments. Total amount: £${accumulatedAmount.toFixed(2)}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
