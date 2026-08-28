import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const result = await p.expense.deleteMany({
  where: { 
    id: { in: ['cmq7173rd0001vdf0dqfim8qw', 'cmq71y6in0003vdf01g7pch08'] }
  }
})
console.log('Deleted:', result.count, 'orphaned expense records')
await p.$disconnect()
