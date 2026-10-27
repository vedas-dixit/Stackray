/**
 * Rasterize the pixel stack glyph into the extension icons. No native deps:
 * the PNG is written by hand with Node's zlib. Run `pnpm icons`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

/** Same rows as packages/ui/src/components/PixelStack.tsx. */
const ROWS = [
  '........',
  '..#####.',
  '.#####..',
  '........',
  '...#####',
  '..#####.',
  '........',
  '.#####..',
];
const SIZES = [16, 32, 48, 96, 128];
const CREAM = [0xf2, 0xed, 0xe4] as const;
const BROWN = [0x5b, 0x3a, 0x2a] as const;
const OUT = resolve(import.meta.dirname, '../apps/extension/public/icon');

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u32(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes);
  body.set(data, typeBytes.length);
  return new Uint8Array([...u32(data.length), ...body, ...u32(crc32(body))]);
}

/**
 * Encode RGBA pixels as a PNG.
 *
 * @example
 * writeFileSync('dot.png', encodePng(1, 1, new Uint8Array([0, 0, 0, 255])));
 */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array([...u32(width), ...u32(height), 8, 6, 0, 0, 0]);
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new Uint8Array([
    ...signature,
    ...chunk('IHDR', ihdr),
    ...chunk('IDAT', new Uint8Array(deflateSync(raw))),
    ...chunk('IEND', new Uint8Array(0)),
  ]);
}

/** A cream tile with rounded corners and the brown glyph on a 10×10 grid (1 cell of margin). */
function drawIcon(size: number): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  const cell = size / 10;
  const radius = size * 0.22;
  const inside = (x: number, y: number) => {
    const cx = Math.min(size - radius, Math.max(radius, x));
    const cy = Math.min(size - radius, Math.max(radius, y));
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      if (!inside(x + 0.5, y + 0.5)) continue;
      const gx = Math.floor(x / cell) - 1;
      const gy = Math.floor(y / cell) - 1;
      const glyph = gx >= 0 && gy >= 0 && gx < 8 && gy < 8 && ROWS[gy]?.[gx] === '#';
      const color = glyph ? BROWN : CREAM;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

mkdirSync(OUT, { recursive: true });
for (const size of SIZES) {
  writeFileSync(resolve(OUT, `${size}.png`), encodePng(size, size, drawIcon(size)));
}
console.log(`icons written to ${OUT}: ${SIZES.join(', ')}`);
