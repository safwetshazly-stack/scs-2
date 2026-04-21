const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'src', 'routes'),
  path.join(__dirname, 'src', 'services'),
];

const files = [
  path.join(__dirname, 'src', 'middlewares', 'auth.middleware.ts'),
];

let output = '';

for (const d of dirs) {
  const exists = fs.existsSync(d);
  output += `DIR ${d} exists=${exists}\n`;
  if (exists) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
      output += `  DELETED\n`;
    } catch(e) {
      output += `  ERROR: ${e.message}\n`;
    }
  }
}

for (const f of files) {
  const exists = fs.existsSync(f);
  output += `FILE ${f} exists=${exists}\n`;
  if (exists) {
    try {
      fs.unlinkSync(f);
      output += `  DELETED\n`;
    } catch(e) {
      output += `  ERROR: ${e.message}\n`;
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'cleanup-result.txt'), output);
