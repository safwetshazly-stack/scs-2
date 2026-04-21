import { rmSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dirs = [
  join(__dirname, 'src', 'routes'),
  join(__dirname, 'src', 'services'),
];

const files = [
  join(__dirname, 'src', 'middlewares', 'auth.middleware.ts'),
];

console.log('Starting cleanup...');

for (const d of dirs) {
  console.log(`Checking dir: ${d}, exists=${existsSync(d)}`);
  if (existsSync(d)) {
    rmSync(d, { recursive: true, force: true });
    console.log(`DELETED dir: ${d}`);
  }
}

for (const f of files) {
  console.log(`Checking file: ${f}, exists=${existsSync(f)}`);
  if (existsSync(f)) {
    unlinkSync(f);
    console.log(`DELETED file: ${f}`);
  }
}

// Clean up this script itself
try { unlinkSync(join(__dirname, 'delete-legacy.mjs')); } catch {}
try { unlinkSync(join(__dirname, 'cleanup.js')); } catch {}
try { unlinkSync(join(__dirname, 'cleanup2.js')); } catch {}
try { unlinkSync(join(__dirname, 'cleanup.bat')); } catch {}
try { unlinkSync(join(__dirname, 'do-delete.js')); } catch {}

console.log('Cleanup complete!');
