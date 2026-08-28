const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function run() { 
  const updates = [ 
    { id: 'cmrpkzvwv0005vd50vcua0d1n', gross: 1141.28, net: 1208.51, comm: 159.78, add: 76.15, cred: 258.97 }, 
    { id: 'cmrpl0ggz0007vd50yoa3lkxg', gross: 1387.16, net: 1264.27, comm: 194.20, add: 65.60, cred: 110.15 }, 
    { id: 'cmrpl51wa000zvd50h813t014', gross: 930.56, net: 893.82, comm: 108.97, add: 112.30, cred: 94.02 }, 
    { id: 'cmrpl5jh70011vd50apbj85h5', gross: 1201.27, net: 1143.97, comm: 168.19, add: 136.49, cred: 144.52 } 
  ]; 
  
  for (const u of updates) { 
    await prisma.sale.update({ 
      where: { id: u.id }, 
      data: { 
        grossSales: u.gross, 
        commission: u.comm, 
        topRankFee: u.add, 
        otherPayments: u.cred, 
        netPaid: u.net, 
        otherFees: 0, 
        notes: 'Fixed manually from text dump after API rate limits' 
      } 
    }); 
    console.log('Updated', u.id); 
  } 
} 

run().catch(console.error).finally(()=>prisma.$disconnect());
