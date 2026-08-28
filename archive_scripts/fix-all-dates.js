const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getWeekStartUTC(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWeekEndUTC(weekStart) {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

async function main() {
  console.log("Fixing Sales...");
  const sales = await prisma.sale.findMany();
  for (const s of sales) {
    // Add 12 hours to safely push any shifted date over midnight into the correct intended day
    const baseDate = new Date(s.weekStart.getTime() + 12 * 60 * 60 * 1000);
    const newStart = getWeekStartUTC(baseDate);
    const newEnd = getWeekEndUTC(newStart);
    await prisma.sale.update({
      where: { id: s.id },
      data: { weekStart: newStart, weekEnd: newEnd }
    });
  }

  console.log("Fixing Stocks...");
  const stocks = await prisma.stock.findMany();
  for (const s of stocks) {
    const baseDate = new Date(s.weekEnd.getTime() + 12 * 60 * 60 * 1000);
    const newStart = getWeekStartUTC(baseDate);
    const newEnd = getWeekEndUTC(newStart);
    await prisma.stock.update({
      where: { id: s.id },
      data: { weekEnd: newEnd }
    });
  }

  console.log("Fixing StaffWages...");
  const wages = await prisma.staffWage.findMany();
  for (const w of wages) {
    const baseDate = new Date(w.weekEnd.getTime() + 12 * 60 * 60 * 1000);
    const newStart = getWeekStartUTC(baseDate);
    const newEnd = getWeekEndUTC(newStart);
    await prisma.staffWage.update({
      where: { id: w.id },
      data: { weekEnd: newEnd }
    });
  }

  console.log("All dates fixed!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
