const fs = require('fs');
let code = fs.readFileSync('app/dashboard/expenses/HenleyExpenses.tsx', 'utf8');
code = code.replace("clientId=${session.user.clientId}", "clientId=${session?.user?.role === 'admin' ? 'cmpv4dvik0000vdj089wl6zmf' : session?.user?.clientId}");
fs.writeFileSync('app/dashboard/expenses/HenleyExpenses.tsx', code);
console.log('Fixed HenleyExpenses');
