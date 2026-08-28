const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up Hungry Birds Wages...");
  const clientId = 'client-1';
  
  // Find all Staff members who have wages in Hungry Birds
  const hbWages = await prisma.staffWage.findMany({
    where: { store: 'Hungry Birds' },
    include: { staff: true }
  });

  const validNames = ['Staff 1', 'Staff 2', 'Owner', 'Chef'];

  let count = 0;
  for (const wage of hbWages) {
    if (!validNames.includes(wage.staff.name)) {
      console.log(`Found incorrect wage name: ${wage.staff.name}`);
      // Find or create 'Staff 1' as default fallback for rogue imports
      let defaultStaff = await prisma.staff.findFirst({
        where: { clientId: wage.clientId, name: 'Staff 1' }
      });
      if (!defaultStaff) {
        defaultStaff = await prisma.staff.create({
          data: { clientId: wage.clientId, name: 'Staff 1', role: 'Staff Member', active: true }
        });
      }
      
      // Reassign wage
      await prisma.staffWage.update({
        where: { id: wage.id },
        data: { staffId: defaultStaff.id }
      });
      console.log(`Reassigned wage ${wage.id} to Staff 1`);
      count++;
    }
  }

  // Also rename "Jassi" if it exists for this client just in case
  const jassi = await prisma.staff.findFirst({
    where: { clientId, name: 'Jassi' }
  });
  if (jassi) {
    console.log("Found staff 'Jassi'. Note: Not deleting to preserve other store's data, just ensured HB doesn't use it.");
  }

  console.log(`Cleanup complete. Reassigned ${count} wage records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
