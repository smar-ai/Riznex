const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  console.log("=== CHECKING HERBIES SUPPLIERS ===");
  const suppliers = await prisma.supplier.findMany({
    where: {
      clientId,
      name: {
        contains: 'Herbies',
        mode: 'insensitive'
      }
    }
  });

  console.log("Found suppliers:");
  console.dir(suppliers);

  for (const sup of suppliers) {
    if (sup.name.toLowerCase() === 'herbies pizza limited') {
      console.log("DELETING Herbies Pizza Limited...");
      try {
        await prisma.supplier.delete({ where: { id: sup.id } });
        console.log("Deleted Herbies Pizza Limited.");
      } catch (e) {
        console.log("Error deleting:", e.message);
      }
    }
    if (sup.name.toLowerCase() === 'herbies head office') {
      console.log("UPDATING Herbies Head office to be Herbies Pizza ONLY (split = false)...");
      await prisma.supplier.update({
        where: { id: sup.id },
        data: {
          store: 'Herbies Pizza',
          split: false
        }
      });
      console.log("Updated Herbies Head office.");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
