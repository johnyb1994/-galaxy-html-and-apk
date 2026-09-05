/**
 * @fileoverview Auto-backup www/index.html + release APK to OneDrive/AGALAXY.
 * Run via `npm run sync` or automatically after `npm run build`.
 * Usage:
 *   node scripts/sync-onedrive.cjs           -> one-time copy
 *   node scripts/sync-onedrive.cjs --watch   -> keep watching www/ and copy on change
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcFile = path.join(projectRoot, 'www', 'index.html');
// Gradle output + versioned root copies. First existing newest wins for "latest",
// but we copy the gradle output with a stable name plus any root APKs.
const gradleApk = path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

function getOneDriveDir() {
  const base =
    process.env.OneDrive ||
    process.env.OneDriveCommercial ||
    path.join(process.env.USERPROFILE || 'C:\\Users\\ACER', 'OneDrive');
  return path.join(base, 'AGALAXY');
}

function copyIfNewer(src, dest) {
  if (!fs.existsSync(src)) return 'missing';
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    const s = fs.statSync(src);
    const d = fs.statSync(dest);
    if (s.size === d.size && s.mtimeMs <= d.mtimeMs + 1000) {
      console.log(`[sync] up-to-date: ${dest}`);
      return 'up-to-date';
    }
  }
  fs.copyFileSync(src, dest);
  console.log(`[sync] backed up ${path.basename(src)} (${fs.statSync(dest).size} bytes) -> ${dest}`);
  return 'copied';
}

function syncApks(destDir) {
  // LATEST-ONLY mode: AGALAXY always contains exactly 1 APK:
  //   GalaxyOutlast-latest-release.apk
  // Source = newest of gradle output + any root *.apk.
  const LATEST_NAME = 'GalaxyOutlast-latest-release.apk';
  const candidates = [];
  if (fs.existsSync(gradleApk)) candidates.push(gradleApk);
  try {
    for (const f of fs.readdirSync(projectRoot)) {
      if (f.toLowerCase().endsWith('.apk')) candidates.push(path.join(projectRoot, f));
    }
  } catch (_) {
    // ignore
  }
  if (candidates.length === 0) {
    console.log('[sync] no APK found to sync.');
  } else {
    // Pick newest by mtime.
    candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    const newest = candidates[0];
    copyIfNewer(newest, path.join(destDir, LATEST_NAME));
  }
  // Delete any old/stale APKs so only the latest remains.
  try {
    for (const f of fs.readdirSync(destDir)) {
      if (f.toLowerCase().endsWith('.apk') && f !== LATEST_NAME) {
        fs.unlinkSync(path.join(destDir, f));
        console.log(`[sync] deleted old: ${f}`);
      }
    }
  } catch (_) {
    // ignore
  }
}

function syncOnce() {
  const destDir = getOneDriveDir();
  fs.mkdirSync(destDir, { recursive: true });
  let ok = true;
  if (!fs.existsSync(srcFile)) {
    console.error(`[sync] SKIP html: ${srcFile} not found. Run "npm run build" first.`);
    ok = false;
  } else {
    copyIfNewer(srcFile, path.join(destDir, 'index.html'));
  }
  syncApks(destDir);
  console.log('[sync] OneDrive will upload changes automatically.');
  return ok;
}

if (process.argv.includes('--watch')) {
  syncOnce();
  console.log('[sync] watching www/ + *.apk for changes... (Ctrl+C to stop)');
  const watched = [path.dirname(srcFile), projectRoot, path.dirname(gradleApk)].filter((d) => fs.existsSync(d));
  for (const dir of watched) {
    try {
      fs.watch(dir, (event, filename) => {
        if (!filename) return;
        const f = filename.toLowerCase();
        if (!(f.endsWith('.html') || f.endsWith('.apk'))) return;
        try {
          syncOnce();
        } catch (err) {
          console.error('[sync] error:', err.message);
        }
      });
    } catch (_) {
      // ignore unwatched dirs
    }
  }
} else if (require.main === module) {
  const ok = syncOnce();
  process.exit(ok ? 0 : 1);
}

module.exports = { syncOnce, getOneDriveDir };
