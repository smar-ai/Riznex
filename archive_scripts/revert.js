const fs = require('fs');
const path = require('path');

const files = [
  'app/api/expenses/[id]/route.ts',
  'app/api/invoices/[id]/route.ts',
  'app/api/sales/[id]/route.ts',
  'app/api/staff/wages/[id]/route.ts',
  'app/api/stocks/[id]/route.ts',
  'app/api/suppliers/[id]/route.ts'
];

files.forEach(file => {
  const fullPath = path.join('E:/restaurant-dashboard', file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  const badAuthCheckRegex = /const clientId = session\.user\.role === 'admin' \? undefined : session\.user\.clientId\s+if \(clientId\) \{\s+const existing = await prisma\.[a-zA-Z]+\.findFirst\(\{ where: \{ id, clientId \} \}\)\s+if \(!existing\) return NextResponse\.json\(\{ error: 'Not found' \}, \{ status: 404 \}\)\s+\}/g;
  
  content = content.replace(badAuthCheckRegex, '');
  
  fs.writeFileSync(fullPath, content);
  console.log(`Reverted IDOR patch in ${file}`);
});
