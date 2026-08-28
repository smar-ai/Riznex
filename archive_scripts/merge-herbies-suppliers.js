const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';

  console.log("=== MERGING HERBIES SUPPLIERS ===");

  // 1. Fetch both suppliers
  const sourceSupplier = await prisma.supplier.findFirst({
    where: { clientId, name: 'Herbies Pizza Limited' }
  });

  const targetSupplier = await prisma.supplier.findFirst({
    where: { clientId, name: 'Herbies Head office' }
  });

  if (!sourceSupplier) {
    console.log("Source supplier 'Herbies Pizza Limited' not found in database.");
  }
  if (!targetSupplier) {
    console.log("Target supplier 'Herbies Head office' not found in database.");
  }

  if (!sourceSupplier && !targetSupplier) {
    console.log("Cannot proceed: neither supplier exists.");
    return;
  }

  let finalTargetId = '';

  if (targetSupplier) {
    finalTargetId = targetSupplier.id;
    // Update target supplier's franchise to 'Herbies Pizza'
    await prisma.supplier.update({
      where: { id: targetSupplier.id },
      data: {
        franchise: 'Herbies Pizza',
        active: true
      }
    });
    console.log(`Updated 'Herbies Head office' franchise to 'Herbies Pizza'.`);
  } else if (sourceSupplier) {
    // If only Herbies Pizza Limited exists, rename it to Herbies Head office
    const renamed = await prisma.supplier.update({
      where: { id: sourceSupplier.id },
      data: {
        name: 'Herbies Head office',
        franchise: 'Herbies Pizza',
        active: true
      }
    });
    console.log(`Renamed 'Herbies Pizza Limited' to 'Herbies Head office' and set franchise to 'Herbies Pizza'.`);
    return;
  }

  // If both exist, re-link invoices from source to target and delete source
  if (sourceSupplier && targetSupplier) {
    // Re-link invoices
    const invoiceUpdate = await prisma.invoice.updateMany({
      where: { supplierId: sourceSupplier.id },
      data: { supplierId: targetSupplier.id }
    });
    console.log(`Re-linked ${invoiceUpdate.count} invoice(s) from 'Herbies Pizza Limited' to 'Herbies Head office'.`);

    // Delete source supplier
    await prisma.supplier.delete({
      where: { id: sourceSupplier.id }
    });
    console.log(`Deleted duplicate supplier 'Herbies Pizza Limited'.`);
  }

  console.log("\nMerge complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
