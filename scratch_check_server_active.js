const http = require('http');

http.get('http://localhost:3000', (res) => {
  console.log(`SERVER STATUS: ${res.statusCode} ${res.statusMessage}`);
}).on('error', (e) => {
  console.log(`SERVER ERROR: ${e.message}`);
});
