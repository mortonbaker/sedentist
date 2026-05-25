import fs from 'fs';
import path from 'path';
const root = 'C:/Users/morto/Code/sedentist';
const pagesDir = path.join(root, 'pages');
function walk(d){let r=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())r=r.concat(walk(p));else if(e.name.endsWith('.html'))r.push(p);}return r;}
const files = walk(pagesDir);
console.log('HTML_COUNT=' + files.length);
const refs = new Map();
const re = /(?:src|href)=["']([^"']+)["']|url\(([^)]+)\)/g;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(c))) {
    let u = m[1] || m[2];
    if (!u) continue;
    u = u.trim().replace(/^['"]|['"]$/g, '');
    if (u.startsWith('http') || u.startsWith('mailto:') || u.startsWith('tel:') || u.startsWith('#') || u.startsWith('data:')) continue;
    if (!refs.has(u)) refs.set(u, new Set());
    refs.get(u).add(path.relative(root, f));
  }
}
const missingAssets = [];
const missingRoutes = [];
for (const [u, set] of refs) {
  if (!u.startsWith('/')) continue;
  const clean = u.split('?')[0].split('#')[0];
  const tryPaths = [path.join(pagesDir, clean), path.join(pagesDir, clean, 'index.html')];
  let ok = false;
  for (const p of tryPaths) { if (fs.existsSync(p)) { ok = true; break; } }
  if (!ok) {
    if (clean.startsWith('/assets/') || clean.startsWith('/src/')) missingAssets.push({ u: clean, where: [...set] });
    else missingRoutes.push({ u: clean, where: [...set] });
  }
}
console.log('\n=== MISSING ASSETS (' + missingAssets.length + ') ===');
for (const m of missingAssets) console.log('  ' + m.u + '\n      <- ' + m.where.slice(0,3).join(', ') + (m.where.length>3?` (+${m.where.length-3} more)`:''));
console.log('\n=== MISSING ROUTES (' + missingRoutes.length + ') ===');
for (const m of missingRoutes) console.log('  ' + m.u + '\n      <- ' + m.where.slice(0,3).join(', ') + (m.where.length>3?` (+${m.where.length-3} more)`:''));

// Compare source assets/ vs pages/assets/
function relWalk(d, base) { let r=[]; if (!fs.existsSync(d)) return r; for (const e of fs.readdirSync(d,{withFileTypes:true})) { const p=path.join(d,e.name); if (e.isDirectory()) r=r.concat(relWalk(p,base)); else r.push(path.relative(base,p).replace(/\\/g,'/'));} return r;}
const srcAssets = relWalk(path.join(root,'assets'), path.join(root,'assets'));
const pagesAssets = new Set(relWalk(path.join(pagesDir,'assets'), path.join(pagesDir,'assets')));
const notCopied = srcAssets.filter(f => !pagesAssets.has(f));
console.log('\n=== SOURCE ASSETS NOT COPIED (' + notCopied.length + ' of ' + srcAssets.length + ') ===');
// group by top dir
const byDir = {};
for (const f of notCopied) { const d = f.split('/')[0]; byDir[d] = (byDir[d]||0)+1; }
console.log('  By top-dir:', byDir);
console.log('  First 30:');
for (const f of notCopied.slice(0,30)) console.log('    ' + f);
