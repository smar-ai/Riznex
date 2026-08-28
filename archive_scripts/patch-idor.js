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
  
  // Replace PUT logic
  if (content.includes('const { id } = await params')) {
    const authCheck = `  const { id } = await params\n  const clientId = session.user.role === 'admin' ? undefined : session.user.clientId\n  if (clientId) {\n    const existing = await prisma.${getModelName(file)}.findFirst({ where: { id, clientId } })\n    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })\n  }`;
    
    // Replace the simple params fetch with the auth check in both PUT and DELETE
    // This is a bit tricky with string replacement, so we'll do it carefully
    content = content.replace(/const \{ id \} = await params/g, authCheck);
    
    fs.writeFileSync(fullPath, content);
    console.log(`Patched ${file}`);
  }
});

function getModelName(file) {
  if (file.includes('expenses')) return 'expense';
  if (file.includes('invoices')) return 'invoice';
  if (file.includes('sales')) return 'sale';
  if (file.includes('wages')) return 'staffWage';
  if (file.includes('stocks')) return 'stock';
  if (file.includes('suppliers')) return 'supplier';
  return 'unknown';
}
