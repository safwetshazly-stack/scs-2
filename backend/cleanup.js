const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'src', 'routes'),
  path.join(__dirname, 'src', 'services'),
];

const files = [
  path.join(__dirname, 'src', 'middlewares', 'auth.middleware.ts'),
];

for (const d of dirs) {
  if (fs.existsSync(d)) {
    fs.rmSync(d, { recursive: true, force: true });
    console.log('DELETED dir:', d);
  } else {
    console.log('NOT FOUND dir:', d);
  }
}

for (const f of files) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log('DELETED file:', f);
  } else {
    console.log('NOT FOUND file:', f);
  }
}

// Also remove the __TO_DELETE__.txt marker and this script
const marker = path.join(__dirname, 'src', 'routes', '__TO_DELETE__.txt');
if (fs.existsSync(marker)) fs.unlinkSync(marker);

console.log('Cleanup complete');
