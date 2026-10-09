import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const filesUnder = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true }))
  .map(entry => entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
const hash = data => createHash('sha256').update(data).digest('hex');

for (const test of ['test-massage-tracking.mjs', 'test-hand-overlay.mjs', 'test-anatomical-targets.mjs', 'test-hand-focus.mjs']) {
  const result = spawnSync(process.execPath, [join(root, 'scripts', test)], { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${test} failed`);
}

const html = await readFile(join(dist, 'index.html'), 'utf8');
const builtAt = (await stat(join(dist, 'index.html'))).mtimeMs;
const sourceFiles = [...await filesUnder(join(root, 'src')), ...['index.html', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'].map(file => join(root, file))];
for (const file of sourceFiles) assert((await stat(file)).mtimeMs <= builtAt, `Build is older than ${file}; run npm run build`);
for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (/^(?:data:|https?:)/.test(url)) continue;
  assert(!url.startsWith('/'), `Absolute asset path prevents subfolder hosting: ${url}`);
  assert((await stat(resolve(dist, decodeURIComponent(url)))).isFile(), `Missing entry asset: ${url}`);
}
const builtFiles = await filesUnder(dist);
let fontReferences = 0;
for (const file of builtFiles.filter(file => extname(file) === '.css')) {
  const css = await readFile(file, 'utf8');
  for (const [, quoted, bare] of css.matchAll(/url\((?:["']([^"']+)["']|([^\)]+))\)/g)) {
    const url = (quoted || bare).trim();
    if (/^(?:data:|https?:|#)/.test(url)) continue;
    assert(!url.startsWith('/'), `Absolute CSS asset path: ${url}`);
    assert((await stat(resolve(dirname(file), decodeURIComponent(url.split(/[?#]/)[0])))).isFile(), `Missing CSS asset: ${url}`);
    if (/\.woff2?(?:[?#]|$)/.test(url)) fontReferences++;
  }
}
assert(fontReferences > 0, 'Bundled local fonts were not found');
for (const name of ['รูปเริ่มต้น.jpg', 'โลโก้.png', 'แนะนำ.png', 'ท่อนบน.png', 'ท่อนกลาง.png', 'ท่อนล่าง.png', 'ภาพพื้นหลัง01.png']) {
  const stem = basename(name, extname(name));
  const builtImage = builtFiles.find(file => basename(file).startsWith(`${stem}-`) && extname(file) === extname(name));
  assert(builtImage, `Missing bundled image: ${name}`);
  assert.equal(hash(await readFile(builtImage)), hash(await readFile(join(root, 'รูป', name))), `Bundled image differs from source: ${name}`);
}
const bundledJs = (await Promise.all(builtFiles.filter(file => extname(file) === '.js').map(file => readFile(file, 'utf8')))).join('\n');
for (const text of ['จำนวนมือที่โฟกัส', 'เลือกมือใหม่', 'need-two-hands', '#fb923c'])
  assert(bundledJs.includes(text), `Latest hand tracking UI missing from build: ${text}`);
assert(!html.includes('@mediapipe/camera_utils') && !html.includes('@mediapipe/pose/') && !html.includes('@mediapipe/hands/'), 'Unused legacy MediaPipe scripts remain');
console.log(`Project checks passed: fresh build, ${builtFiles.length} output files, ${fontReferences} local font references, 7 matching source images and latest hand focus UI.`);
