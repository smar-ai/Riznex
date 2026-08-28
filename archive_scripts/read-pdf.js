const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('E:\\All Projects\\Herbies & Tasty Bun\\Invoices\\May\\Herbies Pizza POS 05 May 10.pdf');

pdf(dataBuffer).then(function(data) {
  console.log(data.text);
});
