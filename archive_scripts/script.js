const fs = require('fs');
const path = require('path');

const pages = [
  { dir: 'app/dashboard', name: 'Dashboard' },
  { dir: 'app/dashboard/sales', name: 'Sales' },
  { dir: 'app/dashboard/expenses', name: 'Expenses' },
  { dir: 'app/dashboard/stocks', name: 'Stocks' },
  { dir: 'app/dashboard/suppliers', name: 'Suppliers' },
  { dir: 'app/dashboard/invoices', name: 'Invoices' }
];

for (const p of pages) {
  const pagePath = path.join(p.dir, 'page.tsx');
  if (!fs.existsSync(pagePath)) continue;
  
  const content = fs.readFileSync(pagePath, 'utf8');
  
  // Create Henley and HungryBirds components
  let henleyContent = content.replace(/export default function \w+\(\) {/g, 'export function Henley' + p.name + '() {');
  let hungryContent = content.replace(/export default function \w+\(\) {/g, 'export function HungryBirds' + p.name + '() {');
  
  if (!henleyContent.includes('use client')) henleyContent = '"use client";\n' + henleyContent;
  if (!hungryContent.includes('use client')) hungryContent = '"use client";\n' + hungryContent;
  
  fs.writeFileSync(path.join(p.dir, 'Henley' + p.name + '.tsx'), henleyContent);
  fs.writeFileSync(path.join(p.dir, 'HungryBirds' + p.name + '.tsx'), hungryContent);
  
  // Rewrite page.tsx to be the router
  const routerContent = `import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Henley${p.name} } from './Henley${p.name}'
import { HungryBirds${p.name} } from './HungryBirds${p.name}'

export default async function ${p.name}PageRouter() {
  const session = await getServerSession(authOptions)
  const clientName = session?.user?.clientName

  if (clientName === 'Hungry Birds') {
    return <HungryBirds${p.name} />
  }
  
  return <Henley${p.name} />
}
`;
  fs.writeFileSync(pagePath, routerContent);
  console.log('Processed', p.dir);
}
