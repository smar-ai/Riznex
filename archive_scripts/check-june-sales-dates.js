const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clientId = 'cmpv4dvik0000vdj089wl6zmf';
  
  const sales = await prisma.sale.findMany({
    where: {
      clientId,
      weekStart: {
        gte: new Date('2026-06-01T00:00:00.000Z')
      }
    },
    orderBy: { weekStart: 'asc' }
  });

  console.log("=== JUNE 2026 SALES RECORDS IN DB ===");
  sales.forEach(s => {
    console.log(`- Platform: ${s.platform}`);
    console.log(`  Store: ${s.store}`);
    console.log(`  weekStart: ${s.weekStart.toISOString()}`);
    console.log(`  weekEnd:   ${s.weekEnd.toISOString()}`);
    console.log(`  weekStart Day: ${s.weekStart.getUTCDay()} (1=Mon, 0=Sun)`);
    console.log(`  weekEnd Day:   ${s.weekEnd.getUTCDay()} (1=Mon, 0=Sun)`);
    console.log("");
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
