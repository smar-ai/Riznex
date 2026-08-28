const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientsToKeep = ['Henley', 'Hungry Birds'];

  const allClients = await prisma.client.findMany();
  
  for (const c of allClients) {
    if (!c.name.includes('Henley') && !c.name.includes('Hungry')) {
      console.log(`Deleting client: ${c.name} and their users...`);
      
      // Delete users associated with this client first (no cascade on User in schema)
      await prisma.user.deleteMany({
        where: { clientId: c.id }
      });

      // Delete the client (cascade will handle sales, expenses, invoices, etc.)
      await prisma.client.delete({
        where: { id: c.id }
      });
      
      console.log(`Successfully deleted ${c.name} and all related data!`);
    }
  }

  // Also delete any stray users that aren't admin and have no client, just in case
  const strayUsers = await prisma.user.findMany({
    where: { role: 'client', clientId: null }
  });
  
  if (strayUsers.length > 0) {
    for (const u of strayUsers) {
      await prisma.user.delete({ where: { id: u.id } });
      console.log(`Deleted stray user: ${u.email}`);
    }
  }

  console.log("Cleanup complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
