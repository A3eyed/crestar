/**
 * react-native-svg@15.12.x is incompatible with React Native 0.86's
 * ImageResponseObserver API (shared_ptr). Expo SDK 57 expects ~15.15.x.
 * Patch after yarn install so the Xcode archive can compile.
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '..', 'node_modules', 'react-native-svg', 'apple', 'Elements', 'RNSVGImage.mm'),
  path.join(__dirname, '..', '..', '..', 'node_modules', 'react-native-svg', 'apple', 'Elements', 'RNSVGImage.mm'),
];

const target = candidates.find((p) => fs.existsSync(p));
if (!target) {
  console.log('[patch-rnsvg] RNSVGImage.mm not found — skip');
  process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');
const before = src;

if (!src.includes('#include <memory>') && !src.includes('#import <memory>')) {
  // Prefer after the last #import block
  src = src.replace(
    /(#import[^\n]+\n)(?!#import)/,
    '$1\n#include <memory>\n',
  );
}

// Promote stack observer to shared_ptr (RN 0.86 observerCoordinator API).
src = src.replace(
  /RCTImageResponseObserverProxy\s+_imageResponseObserverProxy\s*;/,
  'std::shared_ptr<RCTImageResponseObserverProxy> _imageResponseObserverProxy;',
);

src = src.replace(
  /_imageResponseObserverProxy\s*=\s*RCTImageResponseObserverProxy\s*\(\s*self\s*\)\s*;/,
  '_imageResponseObserverProxy = std::make_shared<RCTImageResponseObserverProxy>(self);',
);

// Prefer non-dereferenced shared_ptr for RN > 0.84 APIs.
src = src.replace(
  /observerCoordinator\.removeObserver\(\s*\*_imageResponseObserverProxy\s*\)/g,
  'observerCoordinator.removeObserver(_imageResponseObserverProxy)',
);
src = src.replace(
  /observerCoordinator\.addObserver\(\s*\*_imageResponseObserverProxy\s*\)/g,
  'observerCoordinator.addObserver(_imageResponseObserverProxy)',
);

if (src === before) {
  console.log('[patch-rnsvg] no changes needed:', target);
} else {
  fs.writeFileSync(target, src);
  console.log('[patch-rnsvg] patched', target);
}
