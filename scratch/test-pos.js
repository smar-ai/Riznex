const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const inv = await prisma.invoice.findFirst({ orderBy: { createdAt: 'desc' } });
  const ocrData = JSON.parse(inv.ocrData);
  const expenseDate = new Date();
  const weekStart = new Date();
  const weekEnd = new Date();
  const storeName = 'Herbies Pizza';
  const clientId = inv.clientId;

  try {
      console.log('Creating sale...');
      await prisma.sale.create({ data: { clientId, platform: storeName, weekStart, weekEnd, totalOrders: ocrData.totalOrders ?? 0, grossSales: ocrData.grossSales ?? 0, vat: ocrData.vat ?? 0, netPaid: ocrData.netPaid ?? 0, cashOrders: ocrData.receipts?.cash ?? 0, otherPayments: ocrData.receipts?.webCard ?? 0, notes: 'Test POS', invoiceId: inv.id } });
      console.log('Creating OneStop...');
      let oneStopSup = await prisma.supplier.findFirst({ where: { name: 'One Stop', clientId } });
      if (!oneStopSup) { oneStopSup = await prisma.supplier.create({ data: { clientId, name: 'One Stop', category: 'food', franchise: 'Combined' } }); }
      await prisma.invoice.create({ data: { clientId, type: 'supplier', supplierId: oneStopSup.id, platform: storeName, amount: ocrData.posExpenses.oneStop, invoiceDate: expenseDate, fileName: 'Test POS', filePath: '#', fileType: 'pdf', ocrStatus: 'done', notes: 'Test' } });
      console.log('Creating Petrol...');
      await prisma.expense.create({ data: { clientId, category: 'fuel', subcategory: 'Petrol (from POS)', amount: ocrData.posExpenses.petrol, period: 'weekly', date: expenseDate, notes: 'Test' } });
      console.log('Creating Wages...');
      let jassi = await prisma.staff.findFirst({ where: { name: { contains: 'jassi' }, clientId } });
      if (!jassi) jassi = await prisma.staff.create({ data: { clientId, name: 'Jassi' } });
      await prisma.staffWage.create({ data: { clientId, staffId: jassi.id, amount: ocrData.posExpenses.wages, weekEnd, store: storeName } });
      console.log('Creating Other Expense...');
      await prisma.expense.create({ data: { clientId, category: 'misc', subcategory: 'Other POS Expense', amount: ocrData.posExpenses.other, period: 'weekly', date: expenseDate, notes: 'Test' } });
      console.log('Success!');
  } catch (e) {
      console.error(e);
  }
}
main();
