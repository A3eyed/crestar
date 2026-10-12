#!/usr/bin/env node
/**
 * Decode base64 brand assets into PNG paths expected by Expo / Next.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const brandDir = path.join(__dirname, 'brand-assets');

const mapping = [
  ['apps__web__public__favicon.png.b64', 'apps/web/public/favicon.png'],
  ['apps__web__public__icon-192.png.b64', 'apps/web/public/icon-192.png'],
  ['apps__web__public__icon-512.png.b64', 'apps/web/public/icon-512.png'],
  ['apps__web__public__logo.png.b64', 'apps/web/public/logo.png'],
  ['apps__mobile__assets__images__icon.png.b64', 'apps/mobile/assets/images/icon.png'],
  ['apps__mobile__assets__images__favicon.png.b64', 'apps/mobile/assets/images/favicon.png'],
  ['apps__mobile__assets__images__splash-icon.png.b64', 'apps/mobile/assets/images/splash-icon.png'],
  ['apps__mobile__assets__images__splash-light.png.b64', 'apps/mobile/assets/images/splash-light.png'],
];

for (const [b64Name, destRel] of mapping) {
  const b64Path = path.join(brandDir, b64Name);
  if (!fs.existsSync(b64Path)) {
    console.warn('[brand] skip missing', b64Name);
    continue;
  }
  const dest = path.join(root, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = Buffer.from(fs.readFileSync(b64Path, 'utf8').replace(/\s+/g, ''), 'base64');
  fs.writeFileSync(dest, buf);
  console.log('[brand] wrote', destRel, buf.length, 'bytes');
}

const iconPath = path.join(root, 'apps/mobile/assets/images/icon.png');
const adaptivePath = path.join(root, 'apps/mobile/assets/images/adaptive-icon.png');
if (fs.existsSync(iconPath)) {
  fs.copyFileSync(iconPath, adaptivePath);
  console.log('[brand] wrote apps/mobile/assets/images/adaptive-icon.png (copy)');
}
