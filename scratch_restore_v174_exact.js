const fs = require('fs');
const path = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Find line 174
const baseObj = JSON.parse(lines[174]);
const baseToolCalls = baseObj.planner_response?.tool_calls || baseObj.tool_calls || [];
let baseCode = '';

baseToolCalls.forEach(tc => {
  if (tc.name === 'replace_file_content' || tc.name === 'write_to_file') {
    baseCode = tc.args.ReplacementContent || tc.args.CodeContent || '';
  }
});

if (!baseCode.startsWith("'use client'")) {
  baseCode = "'use client'\n" + baseCode;
}

// Add full JSX closing structure
if (!baseCode.includes('export function HungryBirdsDashboard')) {
  console.log('Base code missing export function!');
}

console.log('Base code length:', baseCode.length);

// Let's also check line 1660 which had full component structure
const fullObj = JSON.parse(lines[1660]);
const fullToolCalls = fullObj.planner_response?.tool_calls || fullObj.tool_calls || [];
let fullCode = '';

fullToolCalls.forEach(tc => {
  if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
    fullCode = tc.args.CodeContent || tc.args.ReplacementContent || '';
  }
});

console.log('Restoring line 1660 full component code, length:', fullCode.length);
fs.writeFileSync('E:/Sales Software/restaurant-dashboard/app/dashboard/HungryBirdsDashboard.tsx', fullCode);
console.log('Successfully restored complete original HungryBirdsDashboard.tsx!');
