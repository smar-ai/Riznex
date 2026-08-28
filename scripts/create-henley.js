const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  // 1. Create Client
  const client = await prisma.client.create({
    data: {
      name: 'Henley on Thames',
      address: 'Henley on Thames, UK',
      email: 'henley@example.com',
      platforms: 'just_eat,uber_eats,deliveroo',
    }
  })

  // 2. Create User
  const user = await prisma.user.create({
    data: {
      name: 'Henley on Thames Admin',
      email: 'henley@example.com',
      password: passwordHash,
      role: 'client',
      clientId: client.id,
    }
  })

  console.log('Created User & Client successfully!')
  console.log('Email:', user.email)
  console.log('Password:', 'password123')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
