const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  async function getStaff(name) {
    let staff = await prisma.staff.findFirst({ where: { clientId, name } })
    if (!staff) staff = await prisma.staff.create({ data: { clientId, name, active: true } })
    return staff.id;
  }

  const staffIds = {
    abad: await getStaff('Abad khan'),
    arslan: await getStaff('Arslan'),
    pavan: await getStaff('Pavan')
  }

  const months = [
    '2026-01-31T00:00:00.000Z',
    '2026-02-28T00:00:00.000Z',
    '2026-03-31T00:00:00.000Z'
  ]

  let count = 0;
  let totalAmount = 0;

  async function addWage(staffId, amount, dateStr) {
    await prisma.staffWage.create({
      data: { clientId, staffId, amount, weekEnd: new Date(dateStr), store: 'Herbies Pizza', is2025: true }
    });
    count++;
    totalAmount += amount;
  }

  for (let i = 0; i < months.length; i++) {
    const m = months[i];

    await addWage(staffIds.abad, 1400, m);
    await addWage(staffIds.arslan, 1600, m);
    await addWage(staffIds.pavan, 2000, m);
  }

  console.log(`Successfully added ${count} wage records for Jan-Mar 2026.`);
  console.log(`Total Payroll for this batch: £${totalAmount.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
