const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findFirst();
  if(!client) return console.log('No client found');

  const templates = [
    { clientId: client.id, category: 'rent', subcategory: 'Rent', amount: 340, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'tax', subcategory: 'Road Tax', amount: 10, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'misc', subcategory: 'Tasty Bun Franchise Fee', amount: 50, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'misc', subcategory: 'Andromeda POS', amount: 40, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'misc', subcategory: 'Car Installment', amount: 45, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'fuel', subcategory: 'Car Petrol', amount: 350, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'internet', subcategory: 'Internet', amount: 40, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'bin', subcategory: 'Bin Collection', amount: 30, period: 'template', date: new Date(), notes: 'Fixed weekly cost' },
    { clientId: client.id, category: 'gas', subcategory: 'Gas / Electric', amount: 130, period: 'template', date: new Date(), notes: 'Fixed weekly cost' }
  ];

  await prisma.expense.createMany({ data: templates });
  console.log('Successfully pre-seeded the 9 fixed expense templates into the database!');
}
main();
