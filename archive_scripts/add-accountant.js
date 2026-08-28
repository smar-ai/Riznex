const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  const monthsJulMar = [
    '2025-07-31T00:00:00.000Z',
    '2025-08-31T00:00:00.000Z',
    '2025-09-30T00:00:00.000Z',
    '2025-10-31T00:00:00.000Z',
    '2025-11-30T00:00:00.000Z',
    '2025-12-31T00:00:00.000Z',
    '2026-01-31T00:00:00.000Z',
    '2026-02-28T00:00:00.000Z',
    '2026-03-31T00:00:00.000Z'
  ]

  let count = 0;
  let totalAmount = 0;

  for (const m of monthsJulMar) {
    await prisma.expense.create({
      data: {
        clientId,
        category: 'other', // Or 'fees' / 'utilities'
        subcategory: 'Accountant Fee',
        amount: 240, // 200 + 20% VAT
        period: 'monthly',
        date: new Date(m),
        notes: '200 + 20% VAT added via 2025 batch script',
        is2025: true
      }
    });
    count++;
    totalAmount += 240;
  }

  console.log(`Added ${count} monthly Accountant Fee records (£240 each).`);
  console.log(`Total Added: £${totalAmount.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
