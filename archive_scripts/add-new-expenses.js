const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  // 1. Update Franchise Fees to £300 (£250 + 20% VAT)
  const updatedFees = await prisma.expense.updateMany({
    where: { is2025: true, category: 'fees', subcategory: 'Franchise Fee' },
    data: { amount: 300 }
  });
  console.log(`Updated ${updatedFees.count} Franchise Fee records to £300/week.`);

  // Date arrays for adding new monthly expenses
  const monthsJulDec = [
    '2025-07-31T00:00:00.000Z',
    '2025-08-31T00:00:00.000Z',
    '2025-09-30T00:00:00.000Z',
    '2025-10-31T00:00:00.000Z',
    '2025-11-30T00:00:00.000Z',
    '2025-12-31T00:00:00.000Z'
  ]
  const monthsJulMar = [
    ...monthsJulDec,
    '2026-01-31T00:00:00.000Z',
    '2026-02-28T00:00:00.000Z',
    '2026-03-31T00:00:00.000Z'
  ]

  async function addExpense(category, subcategory, amount, dateStr) {
    await prisma.expense.create({
      data: {
        clientId,
        category,
        subcategory,
        amount,
        period: 'monthly',
        date: new Date(dateStr),
        notes: 'Added via 2025 batch script',
        is2025: true
      }
    });
  }

  // 2. Oxford Store: £1669 * 6 for July to Dec
  for (const m of monthsJulDec) {
    await addExpense('other', 'Oxford Store', 1669, m);
  }
  console.log(`Added 6 monthly Oxford Store expenses (£1669 each).`);

  // 3. Building Insurance: £2000 total from July to March (9 months)
  // Let's divide it evenly: 2000 / 9 = 222.22
  const insBase = Math.round((2000 / 9) * 100) / 100; // 222.22
  let insTotal = 0;
  for (let i = 0; i < monthsJulMar.length; i++) {
    let amt = insBase;
    if (i === monthsJulMar.length - 1) amt = 2000 - insTotal;
    amt = Math.round(amt * 100) / 100;
    await addExpense('utilities', 'Building Insurance', amt, monthsJulMar[i]);
    insTotal += amt;
  }
  console.log(`Added 9 monthly Building Insurance expenses totaling £${insTotal.toFixed(2)}.`);

  // 4. Store Reparation Fee: £2000 total from July to March (9 months)
  const repBase = Math.round((2000 / 9) * 100) / 100; // 222.22
  let repTotal = 0;
  for (let i = 0; i < monthsJulMar.length; i++) {
    let amt = repBase;
    if (i === monthsJulMar.length - 1) amt = 2000 - repTotal;
    amt = Math.round(amt * 100) / 100;
    await addExpense('other', 'Store Reparation Fee', amt, monthsJulMar[i]);
    repTotal += amt;
  }
  console.log(`Added 9 monthly Store Reparation Fee expenses totaling £${repTotal.toFixed(2)}.`);

}

main().catch(console.error).finally(() => prisma.$disconnect())
