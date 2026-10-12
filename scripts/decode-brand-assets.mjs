#!/usr/bin/env node
/**
 * Decode base64 brand assets into PNG paths expected by Expo / Next.
 * Supports single .b64 files or numbered .b64.part0, .part1, ... chunks.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const brandDir = path.join(__dirname, 'brand-assets');

function readB64(baseName) {
  const single = path.join(brandDir, baseName + '.b64');
  if (fs.existsSync(single)) {
    return fs.readFileSync(single, 'utf8').replace(/\s+/g, '');
  }
  let i = 0;
  let out = '';
  while (true) {
    const part = path.join(brandDir, `${baseName}.b64.part${i}`);
    if (!fs.existsSync(part)) break;
    out += fs.readFileSync(part, 'utf8').replace(/\s+/g, '');
    i += 1;
  }
  return out || null;
}

const mapping = [
  ['apps__web__public__favicon.png', 'apps/web/public/favicon.png'],
  ['apps__web__public__icon-192.png', 'apps/web/public/icon-192.png'],
  ['apps__web__public__icon-512.png', 'apps/web/public/icon-512.png'],
  ['apps__web__public__logo.png', 'apps/web/public/logo.png'],
  ['apps__mobile__assets__images__icon.png', 'apps/mobile/assets/images/icon.png'],
  ['apps__mobile__assets__images__favicon.png', 'apps/mobile/assets/images/favicon.png'],
  ['apps__mobile__assets__images__splash-icon.png', 'apps/mobile/assets/images/splash-icon.png'],
  ['apps__mobile__assets__images__splash-light.png', 'apps/mobile/assets/images/splash-light.png'],
];

for (const [baseName, destRel] of mapping) {
  const b64 = readB64(baseName);
  if (!b64) {
    console.warn('[brand] skip missing', baseName);
    continue;
  }
  const dest = path.join(root, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(dest, buf);
  console.log('[brand] wrote', destRel, buf.length, 'bytes');
}

const iconPath = path.join(root, 'apps/mobile/assets/images/icon.png');
const adaptivePath = path.join(root, 'apps/mobile/assets/images/adaptive-icon.png');
if (fs.existsSync(iconPath)) {
  fs.copyFileSync(iconPath, adaptivePath);
  console.log('[brand] wrote apps/mobile/assets/images/adaptive-icon.png (copy)');
}
