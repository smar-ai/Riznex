const fs = require('fs');
const files = [
  'app/dashboard/expenses/HenleyExpenses.tsx',
  'app/dashboard/expenses/HenleyExpensesDashboard.tsx',
  'app/dashboard/expenses/suppliers/HenleySuppliers.tsx',
  'app/dashboard/expenses/wages/HenleyWages.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(
    /if\s*\(\s*session(?:\?\.|\.)user(?:\?\.|\.)clientId\s*\)\s*params\.set\('clientId'/g,
    "params.set('clientId'"
  );

  fs.writeFileSync(file, code);
  console.log('Fixed', file);
}
