const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  console.log("=== MERGING DUPLICATE SUPPLIERS ===");

  // 1. Merge Express Food Service
  const expressMainId = 'cmpxy1vv10003vdx8kvsdheu9'; // Express Food Service (Tasty Bun)
  const expressDupId = 'cmqb8grx00005vdi4hni7vs75';  // Express food service (Combined)

  const expMain = await prisma.supplier.findUnique({ where: { id: expressMainId } });
  const expDup = await prisma.supplier.findUnique({ where: { id: expressDupId } });

  if (expMain && expDup) {
    // Re-link invoices
    const reLinked = await prisma.invoice.updateMany({
      where: { supplierId: expressDupId },
      data: { supplierId: expressMainId }
    });
    console.log(`Re-linked ${reLinked.count} invoice(s) from duplicate 'Express food service' to main 'Express Food Service'.`);

    // Delete duplicate
    await prisma.supplier.delete({ where: { id: expressDupId } });
    console.log(`Deleted duplicate supplier 'Express food service'.`);
  }

  // 2. Merge N&B Food Service
  const nbSuppliers = await prisma.supplier.findMany({
    where: { clientId, name: { contains: 'N&B' } },
    include: { invoices: true }
  });

  if (nbSuppliers.length > 1) {
    console.log(`\nFound ${nbSuppliers.length} N&B suppliers. Merging them...`);
    // Find the one with most invoices or first one as main
    const mainNb = nbSuppliers[0];
    const duplicates = nbSuppliers.slice(1);

    for (const dup of duplicates) {
      // Re-link invoices
      const reLinked = await prisma.invoice.updateMany({
        where: { supplierId: dup.id },
        data: { supplierId: mainNb.id }
      });
      console.log(`Re-linked ${reLinked.count} invoice(s) from duplicate '${dup.name}' to main '${mainNb.name}'.`);

      // Delete duplicate
      await prisma.supplier.delete({ where: { id: dup.id } });
      console.log(`Deleted duplicate supplier '${dup.name}'.`);
    }
  }

  console.log("\nMerge complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
