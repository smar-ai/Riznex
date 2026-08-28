const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  const suppliers = await prisma.supplier.findMany({
    where: {
      clientId,
      name: { contains: 'Express' }
    },
    include: {
      invoices: true
    }
  });

  console.log("=== EXPRESS FOOD SERVICE INVOICES ===");
  suppliers.forEach(s => {
    console.log(`Supplier Name: ${s.name} (ID: ${s.id})`);
    console.log(`Franchise: ${s.franchise}`);
    console.log(`Invoice count: ${s.invoices.length}`);
    s.invoices.forEach(inv => {
      console.log(`  - Invoice: ${inv.fileName} | Amount: £${inv.amount} | Date: ${inv.invoiceDate?.toISOString().split('T')[0]} | is2025: ${inv.is2025}`);
    });
    console.log("");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
