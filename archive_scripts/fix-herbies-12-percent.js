const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const id = 'cmre2azui002xvdr4s2jevclc';
  const record = await prisma.sale.findUnique({ where: { id } });
  if (!record) return console.log("Record not found");

  const newOtherFees = 0;
  const newNetPaid = record.grossSales - record.commission - newOtherFees;

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      otherFees: newOtherFees,
      netPaid: newNetPaid
    }
  });

  console.log("Updated record successfully!");
  console.log(`Gross: ${updated.grossSales}, Comm: ${updated.commission}, Other: ${updated.otherFees}, Net: ${updated.netPaid}`);
}

main().finally(() => prisma.$disconnect());
