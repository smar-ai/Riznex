const fs = require('fs');
const path = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');

console.log('Total transcript lines:', lines.length);

lines.forEach((line, idx) => {
  if (line.includes('HungryBirdsDashboard.tsx')) {
    try {
      const obj = JSON.parse(line);
      const toolCalls = obj.planner_response?.tool_calls || obj.tool_calls || [];
      toolCalls.forEach(tc => {
        if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
          const code = tc.args.CodeContent || tc.args.ReplacementContent || '';
          if (code.length > 1000) {
            console.log(`[Line ${idx}] Tool: ${tc.name} | Length: ${code.length} chars | First 100 chars: ${code.substring(0, 100).replace(/\n/g, ' ')}`);
          }
        }
      });
    } catch(e) {}
  }
});
