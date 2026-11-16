/**
 * react-native-svg@15.12.x is incompatible with React Native 0.86's
 * ImageResponseObserver API (shared_ptr). Expo SDK 57 expects ~15.15.x;
 * until the lockfile can be upgraded on a full yarn install, patch the
 * compiled source after install so Xcode archive succeeds.
 *
 * Upstream fix: software-mansion/react-native-svg (shared_ptr observers).
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

// RN 0.86+: addObserver/removeObserver take shared_ptr, not a dereferenced proxy.
// Match both const and non-const observerCoordinator usages.
src = src.replace(
  /observerCoordinator\.removeObserver\(\s*\*_imageResponseObserverProxy\s*\)/g,
  'observerCoordinator.removeObserver(_imageResponseObserverProxy)',
);
src = src.replace(
  /observerCoordinator\.addObserver\(\s*\*_imageResponseObserverProxy\s*\)/g,
  'observerCoordinator.addObserver(_imageResponseObserverProxy)',
);

// Ensure the member is shared_ptr (newer svg already is; older is stack value).
if (src.includes('RCTImageResponseObserverProxy _imageResponseObserverProxy') && !src.includes('std::shared_ptr<RCTImageResponseObserverProxy> _imageResponseObserverProxy')) {
  src = src.replace(
    /RCTImageResponseObserverProxy _imageResponseObserverProxy/g,
    'std::shared_ptr<RCTImageResponseObserverProxy> _imageResponseObserverProxy',
  );
  src = src.replace(
    /_imageResponseObserverProxy = RCTImageResponseObserverProxy\s*\(\s*self\s*\)/g,
    '_imageResponseObserverProxy = std::make_shared<RCTImageResponseObserverProxy>(self)',
  );
}

if (src === before) {
  console.log('[patch-rnsvg] no changes needed:', target);
} else {
  fs.writeFileSync(target, src);
  console.log('[patch-rnsvg] patched', target);
}
