const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const juneStart = new Date('2026-06-01T00:00:00Z');
  const juneEnd = new Date('2026-06-30T23:59:59Z');

  const juneInvoices = await prisma.invoice.findMany({
    where: { 
      type: 'supplier',
      invoiceDate: { gte: juneStart, lte: juneEnd }
    },
    include: { supplier: true }
  });

  console.log(`\n=== JUNE SUPPLIER INVOICES ===`);
  console.log(`Found ${juneInvoices.length} invoices in June.`);
  juneInvoices.forEach(inv => {
    console.log(`- ${inv.invoiceDate.toISOString().split('T')[0]}: ${inv.supplier?.name} | £${inv.amount} | File: ${inv.fileName}`);
  });

  const mayStart = new Date('2026-05-01T00:00:00Z');
  const mayEnd = new Date('2026-05-31T23:59:59Z');

  const mayInvoices = await prisma.invoice.findMany({
    where: { 
      type: 'supplier',
      invoiceDate: { gte: mayStart, lte: mayEnd }
    }
  });
  console.log(`\n=== MAY SUPPLIER INVOICES ===`);
  console.log(`Found ${mayInvoices.length} invoices in May.`);

  // Also check if there are ghost invoices uploaded recently
  const ghostInvoices = await prisma.invoice.findMany({
    where: { 
      type: 'supplier',
      invoiceDate: null
    }
  });
  console.log(`\n=== GHOST SUPPLIER INVOICES (NULL DATES) ===`);
  console.log(`Found ${ghostInvoices.length} ghost invoices.`);
  ghostInvoices.forEach(inv => {
    console.log(`- File: ${inv.fileName} | Uploaded: ${inv.createdAt.toISOString()}`);
  });

  // What about invoices with OCR failed?
  const failedInvoices = await prisma.invoice.findMany({
    where: { 
      type: 'supplier',
      ocrStatus: { not: 'done' }
    }
  });
  console.log(`\n=== FAILED OCR SUPPLIER INVOICES ===`);
  console.log(`Found ${failedInvoices.length} failed invoices.`);
  failedInvoices.forEach(inv => {
    console.log(`- File: ${inv.fileName} | Status: ${inv.ocrStatus} | Uploaded: ${inv.createdAt.toISOString()}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
