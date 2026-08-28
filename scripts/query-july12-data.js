const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.sale.findFirst({ where: { invoiceId: 'cmrpkzm270003vd502ov24tyk' } }).then(console.log).finally(() => prisma.$disconnect());
