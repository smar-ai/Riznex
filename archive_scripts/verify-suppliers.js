const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  console.log("=== CHECKING SUPPLIERS ===");
  const suppliers = await prisma.supplier.findMany({
    where: { clientId }
  });

  for (const sup of suppliers) {
    if (sup.name.toLowerCase().includes('herbies')) {
      console.log("Found Herbies:", sup.name);
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
        console.log("UPDATING Herbies Head office to be Herbies Pizza ONLY...");
        await prisma.supplier.update({
          where: { id: sup.id },
          data: {
            franchise: 'Herbies Pizza',
          }
        });
        console.log("Updated Herbies Head office.");
      }
    }
    
    if (sup.name.toLowerCase().includes('jj')) {
        console.log("Found JJ Food:", sup.name, "Franchise:", sup.franchise);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
