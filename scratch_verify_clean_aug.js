const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientId = 'client-1';

  const wages = await prisma.staffWage.findMany({
    where: { clientId, weekEnd: { gte: new Date('2026-08-01') } },
    include: { staff: true },
    orderBy: { weekEnd: 'desc' }
  });

  console.log('--- RECONCILED AUGUST WAGES IN DB ---');
  wages.forEach(w => {
    console.log(`- Date: ${w.weekEnd.toISOString().split('T')[0]} | Staff: ${w.staff.name} | Amount: £${w.amount}`);
  });

  // Calculate sum for week ending 09 Aug 2026
  const week9Aug = wages.filter(w => w.weekEnd.toISOString().startsWith('2026-08-09'));
  const sum9Aug = week9Aug.reduce((a, b) => a + b.amount, 0);
  console.log(`\nWeek ending 09 Aug 2026 Total Wages: £${sum9Aug} (${week9Aug.length} entries)`);

  // Calculate sum for week ending 16 Aug 2026
  const week16Aug = wages.filter(w => w.weekEnd.toISOString().startsWith('2026-08-16'));
  const sum16Aug = week16Aug.reduce((a, b) => a + b.amount, 0);
  console.log(`Week ending 16 Aug 2026 Total Wages: £${sum16Aug} (${week16Aug.length} entries)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
