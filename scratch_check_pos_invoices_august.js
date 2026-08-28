const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const henleyClientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId: henleyClientId,
      type: 'pos'
    }
  });

  console.log(`Found ${invoices.length} POS invoices for Henley:`);
  invoices.forEach(inv => {
    console.log(`- ID: ${inv.id} | Platform: ${inv.platform} | Date: ${inv.invoiceDate?.toISOString().split('T')[0]} | OCR Text Snippet: ${inv.ocrText?.substring(0, 300)}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
