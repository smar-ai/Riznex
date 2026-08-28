const fs = require('fs');
const files = [
  'app/dashboard/expenses/HenleyExpenses.tsx',
  'app/dashboard/expenses/HenleyExpensesDashboard.tsx',
  'app/dashboard/expenses/suppliers/HenleySuppliers.tsx',
  'app/dashboard/expenses/wages/HenleyWages.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(/clientId:\s*session\??\.user\??\.clientId/g, "clientId: session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId");
  code = code.replace(/clientId=\\?\$\\{session\??\.user\??\.clientId(?: \|\| '')?\\}/g, "clientId=\\");

  fs.writeFileSync(file, code);
  console.log('Fixed', file);
}
