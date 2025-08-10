
const fs = require('fs');
const path = require('path');

const EXCLUDE = ['node_modules', 'dist', 'build', '.git'];
const MAX_DEPTH = 3;

function walk(dir, depth = 0) {
  if (depth > MAX_DEPTH) return '';
  let result = '';
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (EXCLUDE.includes(item)) continue;
    const fullPath = path.join(dir, item);
    const indent = '│   '.repeat(depth);
    result += `${indent}├── ${item}\n`;
    if (fs.statSync(fullPath).isDirectory()) {
      result += walk(fullPath, depth + 1);
    }
  }
  return result;
}

const output = walk('C:/Projects/SchoolManagementApp');
fs.writeFileSync('structure.txt', output);