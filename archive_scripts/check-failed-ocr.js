const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  const failedInvoices = await prisma.invoice.findMany({
    where: {
      clientId,
      ocrStatus: 'error'
    }
  });

  console.log(`Failed Invoices: ${failedInvoices.length}`);
  failedInvoices.forEach(inv => {
    console.log(`- ${inv.fileName} | Error: ${inv.notes}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
