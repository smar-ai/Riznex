const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sampleInvoice = await prisma.invoice.findFirst({ where: { is2025: true } })
  if (!sampleInvoice) throw new Error("No 2025 invoices found to copy clientId from")
  const clientId = sampleInvoice.clientId

  // Find Express food service supplier
  let supplier = await prisma.supplier.findFirst({ where: { name: 'Express food service', clientId } });
  if (!supplier) {
    supplier = await prisma.supplier.create({ data: { name: 'Express food service', category: 'Food', clientId, active: true } });
  }

  // Add £5000 invoice
  await prisma.invoice.create({
    data: {
      clientId,
      supplierId: supplier.id,
      amount: 5000,
      invoiceDate: new Date('2025-12-31T00:00:00.000Z'),
      is2025: true,
      type: 'supplier',
      fileName: 'Manual Adjustment 5k',
      filePath: 'manual',
      fileType: 'application/pdf'
    }
  });

  console.log(`Successfully added £5000 invoice for Express food service.`);
}

main().catch(console.error).finally(() => prisma.$disconnect())
