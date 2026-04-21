const fs = require('fs');
const path = require('path');
const base = __dirname;

// Delete entire directories
['src/routes', 'src/services'].forEach(dir => {
  const full = path.join(base, dir);
  try {
    fs.rmSync(full, { recursive: true, force: true });
    const still = fs.existsSync(full);
    fs.appendFileSync(path.join(base, 'del-log.txt'), `${dir}: exists after=${still}\n`);
  } catch(e) {
    fs.appendFileSync(path.join(base, 'del-log.txt'), `${dir}: ERROR ${e.message}\n`);
  }
});

// Delete specific file
const authMw = path.join(base, 'src', 'middlewares', 'auth.middleware.ts');
try {
  fs.unlinkSync(authMw);
  const still = fs.existsSync(authMw);
  fs.appendFileSync(path.join(base, 'del-log.txt'), `auth.middleware.ts: exists after=${still}\n`);
} catch(e) {
  fs.appendFileSync(path.join(base, 'del-log.txt'), `auth.middleware.ts: ERROR ${e.message}\n`);
}

// Clean up temp files
['cleanup.js', 'cleanup2.js', 'cleanup.bat', 'do-delete.js'].forEach(f => {
  try { fs.unlinkSync(path.join(base, f)); } catch {}
});
try { fs.unlinkSync(path.join(base, 'del-log.txt')); } catch {}
