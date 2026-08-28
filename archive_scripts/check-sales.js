const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sales = await prisma.sale.findMany({ where: { is2025: true } });
  const byPlat = {};
  let gross = 0;
  let net = 0;
  sales.forEach(s => {
    byPlat[s.platform] = (byPlat[s.platform] || 0) + s.grossSales;
    gross += s.grossSales;
    net += s.netPaid;
  });
  console.log('TOTAL GROSS:', gross);
  console.log('TOTAL NET:', net);
  console.log(byPlat);
}

main().finally(() => prisma.$disconnect())
