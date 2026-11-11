/**
 * Write jimp-safe RGBA PNGs for Expo iOS prebuild.
 *
 * Indexed/palette PNGs (color type 3) cause:
 *   [ios.dangerous]: Unrecognised filter type - 127
 * when @expo/image-utils → jimp-compact processes icons.
 *
 * Pure Node (no deps). Safe to run on every EAS pre-install.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const IMAGES = path.join(__dirname, '..', 'assets', 'images');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Solid 8-bit RGBA PNG (filter 0). Compresses tightly for flat colors. */
function solidPng(width, height, r, g, b, a = 255) {
  const row = Buffer.alloc(1 + width * 4);
  row[0] = 0; // filter None
  for (let x = 0; x < width; x++) {
    const o = 1 + x * 4;
    row[o] = r;
    row[o + 1] = g;
    row[o + 2] = b;
    row[o + 3] = a;
  }
  const raw = Buffer.alloc(row.length * height);
  for (let y = 0; y < height; y++) row.copy(raw, y * row.length);
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(IMAGES, { recursive: true });

// Crestar copper (#D4AF37) — flat assets until brand PNGs are re-exported as RGBA
const gold = solidPng(1024, 1024, 0xd4, 0xaf, 0x37, 255);
const white = solidPng(512, 512, 255, 255, 255, 255);
const black = solidPng(512, 512, 0, 0, 0, 255);
const fav = solidPng(48, 48, 0xd4, 0xaf, 0x37, 255);

const writes = {
  'icon.png': gold,
  'adaptive-icon.png': gold,
  'splash-light.png': white,
  'splash-icon.png': black,
  'favicon.png': fav,
};

for (const [name, buf] of Object.entries(writes)) {
  const target = path.join(IMAGES, name);
  fs.writeFileSync(target, buf);
  console.log('[fix-mobile-pngs] wrote', target, buf.length, 'bytes');
}
