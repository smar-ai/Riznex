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

  const staffId = await getStaff('Shgufta');

  const months = [
    '2025-07-31T00:00:00.000Z',
    '2025-08-31T00:00:00.000Z',
    '2025-09-30T00:00:00.000Z'
  ]

  let count = 0;
  let totalAmount = 0;

  for (const m of months) {
    await prisma.staffWage.create({
      data: { clientId, staffId, amount: 1000, weekEnd: new Date(m), store: 'Herbies Pizza', is2025: true }
    });
    count++;
    totalAmount += 1000;
  }

  console.log(`Successfully added ${count} wage records for Shgufta.`);
  console.log(`Total Payroll for this batch: £${totalAmount.toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
