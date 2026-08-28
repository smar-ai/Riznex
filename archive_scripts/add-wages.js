const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  // Helper to get or create staff
  async function getStaff(name) {
    let staff = await prisma.staff.findFirst({ where: { clientId, name } })
    if (!staff) {
      staff = await prisma.staff.create({ data: { clientId, name, active: true } })
    }
    return staff.id;
  }

  const staffIds = {
    saad: await getStaff('Saad ali'),
    abdullah: await getStaff('Abdullah'),
    shgufta: await getStaff('Shgufta'),
    abad: await getStaff('Abad khan'),
    arslan: await getStaff('Arslan'),
    pavan: await getStaff('Pavan')
  }

  const months = [
    { date: '2025-07-31T00:00:00.000Z', isJulDec: true, isJanMar: false },
    { date: '2025-08-31T00:00:00.000Z', isJulDec: true, isJanMar: false },
    { date: '2025-09-30T00:00:00.000Z', isJulDec: true, isJanMar: false },
    { date: '2025-10-31T00:00:00.000Z', isJulDec: true, isJanMar: false },
    { date: '2025-11-30T00:00:00.000Z', isJulDec: true, isJanMar: false },
    { date: '2025-12-31T00:00:00.000Z', isJulDec: true, isJanMar: false },
    { date: '2026-01-31T00:00:00.000Z', isJulDec: false, isJanMar: true },
    { date: '2026-02-28T00:00:00.000Z', isJulDec: false, isJanMar: true },
    { date: '2026-03-31T00:00:00.000Z', isJulDec: false, isJanMar: true },
  ]

  let count = 0;
  let totalAmount = 0;

  async function addWage(staffId, amount, dateStr) {
    await prisma.staffWage.create({
      data: {
        clientId,
        staffId,
        amount,
        weekEnd: new Date(dateStr),
        store: 'Herbies Pizza',
        is2025: true
      }
    });
    count++;
    totalAmount += amount;
  }

  // Clear existing 2025 wages to prevent duplicates if script is re-run
  const deleted = await prisma.staffWage.deleteMany({ where: { is2025: true } });
  console.log(`Cleared ${deleted.count} existing 2025 wages.`);

  for (let i = 0; i < months.length; i++) {
    const m = months[i];

    // Pavan (Jul - Mar)
    await addWage(staffIds.pavan, 2000, m.date);
    // Abad khan (Jul - Mar)
    await addWage(staffIds.abad, 1400, m.date);
    // Arslan (Jul - Mar)
    await addWage(staffIds.arslan, 1600, m.date);

    // Jul - Dec Only
    if (m.isJulDec) {
      // Abdullah
      await addWage(staffIds.abdullah, 1800, m.date);
      
      // Shgufta (Paid for 3 months = Jul, Aug, Sept)
      if (i < 3) {
        // £3000 total for 3 months = £1000/month
        await addWage(staffIds.shgufta, 1000, m.date);
      }

      // Saad ali (£6800.90 Paid in total)
      // I will log it as a single lump sum in December so it hits the P&L correctly without repeating
      if (i === 5) { // December
        await addWage(staffIds.saad, 6800.90, m.date);
      }
    }
  }

  console.log(`Successfully added ${count} wage records.`);
  console.log(`Total Payroll: £${totalAmount.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
