const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const salesHerbies = await prisma.sale.count({
    where: { platform: { contains: 'deliveroo' }, store: { contains: 'Herbies' } }
  });
  
  const salesTastyBun = await prisma.sale.count({
    where: { platform: { contains: 'deliveroo' }, store: { contains: 'Tasty' } }
  });

  const invoices = await prisma.invoice.findMany({
    where: { platform: { contains: 'deliveroo' } },
    select: { platform: true, fileName: true, notes: true }
  });

  let invoiceHerbiesCount = 0;
  let invoiceTastyBunCount = 0;
  let invoiceUnknownCount = 0;

  invoices.forEach(inv => {
    const text = (inv.fileName + ' ' + (inv.notes || '')).toLowerCase();
    if (text.includes('herbie')) {
      invoiceHerbiesCount++;
    } else if (text.includes('tasty') || text.includes('bun')) {
      invoiceTastyBunCount++;
    } else {
      invoiceUnknownCount++;
    }
  });

  console.log('=== SALES RECORDS ===');
  console.log(`Deliveroo Sales for Herbies Pizza: ${salesHerbies}`);
  console.log(`Deliveroo Sales for Tasty Bun: ${salesTastyBun}`);
  
  console.log('\n=== UPLOADED INVOICES ===');
  console.log(`Total Deliveroo Invoices: ${invoices.length}`);
  console.log(`- Deliveroo Invoices for Herbies: ${invoiceHerbiesCount}`);
  console.log(`- Deliveroo Invoices for Tasty Bun: ${invoiceTastyBunCount}`);
  console.log(`- Unknown/Combined: ${invoiceUnknownCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
