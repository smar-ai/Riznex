const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const id = 'cmrl7i8ak0033vdk0ttamlkrh';

  const sale = await prisma.sale.findUnique({
    where: { id }
  });

  if (!sale) {
    console.log("Sale record not found!");
    return;
  }

  // Calculate correct netPaid
  const netPaid = parseFloat((sale.grossSales - sale.commission - (sale.offersOnItems || 0) - (sale.adSpends || 0) - (sale.topRankFee || 0) - (sale.vat || 0)).toFixed(2));

  await prisma.sale.update({
    where: { id },
    data: { netPaid }
  });

  console.log(`Updated sale record successfully!`);
  console.log(`Gross: £${sale.grossSales}`);
  console.log(`Commission: £${sale.commission}`);
  console.log(`Offers: £${sale.offersOnItems}`);
  console.log(`Ads: £${sale.adSpends}`);
  console.log(`New Net Paid: £${netPaid} (was £${sale.netPaid})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
