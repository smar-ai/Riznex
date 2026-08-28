const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sales = await prisma.sale.findMany({
    where: {
      netPaid: {
        gt: prisma.sale.fields.grossSales
      }
    }
  });

  for (const s of sales) {
    console.log(`Fixing sale ${s.id} (${s.platform}): Swapping Gross (${s.grossSales}) and Net (${s.netPaid})`);
    await prisma.sale.update({
      where: { id: s.id },
      data: {
        grossSales: s.netPaid,
        netPaid: s.grossSales
      }
    });
  }
  console.log("Math errors fixed.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
