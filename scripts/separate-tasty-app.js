const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sales = await prisma.sale.findMany({
    where: { store: 'Tasty Bun', platform: 'Website' }
  });

  // Group by weekStart
  const grouped = {};
  for (const s of sales) {
    const key = s.weekStart.toISOString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  let updatedCount = 0;
  for (const [key, records] of Object.entries(grouped)) {
    if (records.length === 2) {
      // Sort by grossSales, the smaller one is the Mobile App
      records.sort((a, b) => a.grossSales - b.grossSales);
      const appRecord = records[0];
      
      await prisma.sale.update({
        where: { id: appRecord.id },
        data: { platform: 'Mobile App' }
      });
      console.log(`Separated ${appRecord.weekStart.toISOString().split('T')[0]}: ${appRecord.grossSales} is now Mobile App`);
      updatedCount++;
    }
  }
  
  console.log(`Successfully separated ${updatedCount} records to Mobile App.`);
}

run().finally(() => prisma.$disconnect());
