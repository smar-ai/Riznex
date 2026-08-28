const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const s = await prisma.sale.findMany({ 
    where: { 
      clientId: 'cmpv4dvik0000vdj089wl6zmf', 
      platform: { contains: 'Tasty Bun App' }
    } 
  });
  console.log("Tasty Bun App Records:");
  console.log(s);

  // Also fix all Tasty Bun POS, Website, and App records to exactly 4%
  const allTasty = await prisma.sale.findMany({
    where: {
      clientId: 'cmpv4dvik0000vdj089wl6zmf',
      store: 'Tasty Bun',
      platform: { in: ['Tasty Bun Website', 'Tasty Bun POS', 'Tasty Bun App'] }
    }
  });

  console.log(`Found ${allTasty.length} total Tasty Bun proprietary records.`);
  for (const record of allTasty) {
    const expectedComm = record.grossSales * 0.04;
    // If it's not 4%, or if otherFees is not 0, fix it
    if (Math.abs(record.commission - expectedComm) > 0.01 || record.otherFees !== 0) {
      await prisma.sale.update({
        where: { id: record.id },
        data: {
          commission: expectedComm,
          otherFees: 0,
          netPaid: record.grossSales - expectedComm
        }
      });
      console.log(`Fixed 4% commission for ${record.platform} on ${record.weekStart.toISOString()}`);
    }
  }
}
main().finally(()=>prisma.$disconnect())
