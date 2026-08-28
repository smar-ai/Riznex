const rawText = `i\nPAGE NO.\nADDRESS\n1\nREADING COLLECTION\nCASH AND CARD ONLY, NO CHO:NO CREDIT:\nOPEN FROM 10 AM TO 5 PM, MON TO FRI. ~\n| TAKES 15 TO 30 MIN TO PREPARE ORDER. Service\nUnited Kingdom Leaders in Food S€\nbil eader 51793514440\nTel: 0844 880 2020 Fax:\nr CREDITTERAS SPECIAL NOTE\neS Reference\nAccount No Invoice No. Tt Route Sales Rep 01047471\ncovsss So2081 | 13/05/2006] 0000 CollectRe-Col ek VAT\ni Ms (5 i Discounted Net Rate |\nCode Quantity) ProductDetalls, caboose UDRP ures Amosmt\n33.99 2649 52.98 C\nolLoos 2.00 KTC VEGETABLE OIL 1X20LTR ;\nel) ¥ 3\nTun TE\na\nShe : : a -\nha nr 5 3A Bel iat stile Ripe . —\n: 2 HE TIGER gel frum slOdUGRRIAIE. Sia\nj 20 Gare Sioihie Ehong ark arin grsldo pieced. = a\nee ed lee al aed woth ol ne cham Sedpeniel a\ni (Cheque payable to N&B Foods Ltd Total NET Invoice VAT Invoice Total\nVio Balance Any clisqliex istrisd willbe\n0.00 © charged a minimum sum of £25 52.98 0.00 52.98\nos Te 18a SubTotal | VAT Total | Total Credit\nEE\n`;

// Test: find "Invoice Total" then grab all numbers from next line, take last one
const match1 = rawText.match(/Invoice\s+Total[\s\S]{0,5}\n[\s\S]{0,200}?([\d,]+\.\d{2})\s*(?:\n|$)/i);
console.log('match1:', match1 ? match1[0].substring(0,100) : 'NO MATCH');

// Test: just find "Invoice Total" block and get numbers after it 
const headerLine = rawText.indexOf('Invoice Total');
console.log('headerLine index:', headerLine);
console.log('text around it:', JSON.stringify(rawText.substring(headerLine - 10, headerLine + 100)));

// Test: find the data row after the header
const dataRow = rawText.match(/Invoice\s+Total\s*\n[\s\S]{0,100}?\n([\d\s.]+)\n/i);
console.log('dataRow:', dataRow ? dataRow[0] : 'NO MATCH');

// Simpler: just find "52.98 0.00 52.98" pattern - three numbers on same line where last matches first 
const threeNums = rawText.match(/(\d+\.\d{2})\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s*(?:\n|$)/);
console.log('threeNums:', threeNums ? threeNums[0] : 'NO MATCH');
if (threeNums) console.log('last num:', threeNums[3]);

// Try grabbing the line with 52.98 that comes AFTER "Invoice Total" header line
const lines = rawText.split('\n');
let foundHeader = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Invoice Total')) { foundHeader = true; console.log('Header line:', JSON.stringify(lines[i])); continue; }
  if (foundHeader) {
    console.log('Data line:', JSON.stringify(lines[i]));
    const nums = lines[i].match(/[\d,]+\.\d{2}/g);
    console.log('Numbers on data line:', nums);
    if (nums && nums.length > 0) {
      console.log('ANSWER - Invoice Total is:', nums[nums.length - 1]);
    }
    break;
  }
}
