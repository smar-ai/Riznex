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

  const staffId = await getStaff('Oxford Store Staff');

  await prisma.staffWage.create({
    data: { 
      clientId, 
      staffId, 
      amount: 5000, 
      weekEnd: new Date('2025-12-31T00:00:00.000Z'), 
      store: 'Oxford Store', 
      is2025: true 
    }
  });

  console.log(`Successfully added £5000 wage record for Oxford Store Staff.`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
