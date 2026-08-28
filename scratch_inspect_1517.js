const fs = require('fs');
const path = 'C:/Users/syedq/.gemini/antigravity/brain/fff3c3be-ce4e-49ff-b76d-5be74530568c/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');

console.log('Total lines:', lines.length);

[1517, 1493, 1385, 391, 174].forEach(idx => {
  if (lines[idx]) {
    try {
      const obj = JSON.parse(lines[idx]);
      const toolCalls = obj.planner_response?.tool_calls || obj.tool_calls || [];
      toolCalls.forEach(tc => {
        if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
          const code = tc.args.CodeContent || tc.args.ReplacementContent || '';
          console.log(`[Line ${idx}] ${tc.name} TargetFile: ${tc.args.TargetFile} | Length: ${code.length}`);
        }
      });
    } catch(e) {}
  }
});
