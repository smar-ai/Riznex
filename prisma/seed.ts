import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@riznex.com' },
    update: {},
    create: {
      email: 'admin@riznex.com',
      password: adminPassword,
      name: 'Riznex Admin',
      role: 'admin',
    },
  })
  console.log('✅ Admin created:', admin.email)

  // Create 5 demo clients
  const clientsData = [
    { name: 'Hungry Birds', address: '12 High Street, Manchester', phone: '0161 000 0001', email: 'hungrybirdsmcr@gmail.com' },
    { name: 'Tasty Buns', address: '45 Market Street, Leeds', phone: '0113 000 0002', email: 'tastybuns@gmail.com' },
    { name: 'Herbies Kitchen', address: '8 Church Road, Birmingham', phone: '0121 000 0003', email: 'herbies@gmail.com' },
    { name: 'Andromeda Grill', address: '22 Broad Lane, Sheffield', phone: '0114 000 0004', email: 'andromeda@gmail.com' },
    { name: 'Spice Garden', address: '67 Victoria Ave, Liverpool', phone: '0151 000 0005', email: 'spicegarden@gmail.com' },
  ]

  for (let i = 0; i < clientsData.length; i++) {
    const c = clientsData[i]
    const client = await prisma.client.upsert({
      where: { id: `client-${i + 1}` },
      update: {},
      create: {
        id: `client-${i + 1}`,
        name: c.name,
        address: c.address,
        phone: c.phone,
        email: c.email,
      },
    })

    const password = await bcrypt.hash(`client${i + 1}pass`, 10)
    await prisma.user.upsert({
      where: { email: c.email! },
      update: {},
      create: {
        email: c.email!,
        password,
        name: c.name,
        role: 'client',
        clientId: client.id,
      },
    })

    // Create default staff for each client
    const staffNames = ['Alex Johnson', 'Maria Garcia', 'James Wilson', 'Sarah Brown', 'Tom Davis', 'Emma Taylor']
    for (const staffName of staffNames) {
      await prisma.staff.create({
        data: {
          clientId: client.id,
          name: staffName,
          role: 'Staff Member',
          weeklyWage: 350,
        },
      })
    }

    // Create default suppliers
    const suppliers = [
      { name: 'Express Foods', category: 'food' },
      { name: 'JJ Foodservice', category: 'food' },
      { name: 'Bidfood', category: 'food' },
      { name: 'Packaging Direct', category: 'packaging' },
    ]
    for (const sup of suppliers) {
      await prisma.supplier.create({
        data: { clientId: client.id, name: sup.name, category: sup.category },
      })
    }

    console.log(`✅ Client created: ${c.name} | Login: ${c.email} / client${i + 1}pass`)
  }

  console.log('\n🎉 Seed complete!')
  console.log('Admin login: admin@riznex.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
