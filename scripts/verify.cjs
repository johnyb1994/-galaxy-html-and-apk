/**
 * @fileoverview Automated Compliance & Syntax Verification Suite for Galaxy Outlast.
 * Run via `npm test` or `npm run check`.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let errors = 0;

function report(status, msg) {
  if (status) {
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${msg}`);
  } else {
    console.error(`\x1b[31m✖ [FAIL]\x1b[0m ${msg}`);
    errors++;
  }
}

console.log('\x1b[36m=== GALAXY OUTLAST AUTOMATED VERIFICATION SUITE ===\x1b[0m\n');

// 1. Check www/ directory contents
const wwwDir = path.resolve(__dirname, '../www');
if (!fs.existsSync(wwwDir)) {
  report(false, 'www/ directory does not exist. Run "npm run build" first.');
} else {
  const files = fs.readdirSync(wwwDir);
  report(files.length === 1 && files[0] === 'index.html', `www/ contains strictly ONLY index.html (Found: ${files.join(', ')})`);
}

// 2. Check no .htm files in project
function findHtmFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'android') {
        results = results.concat(findHtmFiles(fullPath));
      }
    } else if (file.endsWith('.htm')) {
      results.push(fullPath);
    }
  });
  return results;
}
const htmFiles = findHtmFiles(path.resolve(__dirname, '..'));
report(htmFiles.length === 0, `Strict HTML extension rule: No .htm files found in project`);

// 3. Check game html for android.html preservation
const origPath = path.resolve(__dirname, '../../../game html for android.html');
const origAltPath = path.resolve(__dirname, '../../game html for android.html');
const origExists = fs.existsSync(origPath) || fs.existsSync(origAltPath);
report(origExists, 'Preservation rule: "game html for android.html" exists in workspace root');

// 4. Check www/index.html AST / VM Script Syntax
const indexPath = path.join(wwwDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const scripts = html.match(/<script[\s\S]*?<\/script>/gi) || [];
  report(scripts.length > 0, `www/index.html contains ${scripts.length} script block(s)`);

  scripts.forEach((s, i) => {
    const code = s.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      new vm.Script(code);
      report(true, `Script block #${i + 1} (${code.length.toLocaleString()} chars) Node VM AST syntax verification PASSED`);
    } catch (err) {
      report(false, `Script block #${i + 1} VM syntax check FAILED: ${err.message}`);
    }
  });

  // 5. DOM Elements Integrity
  report(html.includes('id="root"'), 'Required DOM element: #root present');
  report(html.includes('id="wrap"') || html.includes('canvas#c'), 'Required DOM structure: canvas viewport scaling preserved');
  report(html.includes('id="dev-diag-panel"'), 'Dev Diagnostics overlay: #dev-diag-panel present');
  report(html.includes('id="dev-toggle-btn"'), 'Dev Diagnostics overlay: #dev-toggle-btn present');
  report(html.includes('id="dev-copy-report-btn"') || html.includes('id="diag-copy-btn"'), 'Dev Diagnostics overlay: copy button present');
}

// 6. Check GAME_CONSTANTS integrity
const statePath = path.resolve(__dirname, '../src/game/state.js');
if (fs.existsSync(statePath)) {
  const stateCode = fs.readFileSync(statePath, 'utf8');
  const hasWidth = /CANVAS_WIDTH\s*:\s*433/.test(stateCode);
  const hasHeight = /CANVAS_HEIGHT\s*:\s*915/.test(stateCode);
  const hasHeader = /HEADER_HEIGHT\s*:\s*86/.test(stateCode);
  const hasWaves = /MAX_WAVES\s*:\s*30/.test(stateCode);
  report(hasWidth && hasHeight && hasHeader && hasWaves, 'GAME_CONSTANTS preserved: CANVAS_WIDTH=433, CANVAS_HEIGHT=915, HEADER_HEIGHT=86, MAX_WAVES=30');
} else {
  report(false, 'src/game/state.js not found');
}

// 7. Check source modules structure
const requiredSrcFiles = [
  'src/main.js',
  'src/styles/main.css',
  'src/assets/boss_skull.png',
  'src/assets/siren.mp3',
  'src/game/bosses.js',
  'src/game/audio.js',
  'src/game/state.js',
  'src/game/weapons.js',
  'src/game/render.js',
  'src/game/diagnostics.js'
];
requiredSrcFiles.forEach(rel => {
  const full = path.resolve(__dirname, '..', rel);
  const exists = fs.existsSync(full);
  report(exists, `Modular source file exists: ${rel}`);
});

console.log(`\n\x1b[36m====================================================\x1b[0m`);
if (errors === 0) {
  console.log('\x1b[32m✔ ALL CHECKS PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
} else {
  console.error(`\x1b[31m✖ ${errors} CHECK(S) FAILED.\x1b[0m\n`);
  process.exit(1);
}
