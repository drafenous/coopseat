// Regenerates every app icon and favicon from the brand mark (the Armchair tile in @coopseat/ui's Brand).
// Run from the repo root: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINT = '#b0f3d2',
  INK = '#122b25';
const ARMCHAIR = [
  'M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3',
  'M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z',
  'M5 18v2',
  'M19 18v2',
];

/** 512-unit tile. `glyph` is the armchair's share of the tile, `radius` 0 means full-bleed square. */
function svg({ glyph = 22 / 35, radius = 10 / 35, stroke = 2 } = {}) {
  const box = 512 * glyph,
    offset = (512 - box) / 2,
    scale = box / 24;
  const paths = ARMCHAIR.map((d) => `<path d="${d}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<rect width="512" height="512" rx="${+(512 * radius).toFixed(2)}" fill="${MINT}"/>` +
    `<g transform="translate(${+offset.toFixed(2)} ${+offset.toFixed(2)}) scale(${+scale.toFixed(4)})" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${paths}</g>` +
    `</svg>\n`
  );
}

const tile = svg();
// Tab-sized icons get a bigger, bolder glyph so the chair stays readable at 16px.
const small = svg({ glyph: 0.74, stroke: 2.4 });
const square = svg({ radius: 0, glyph: 0.6 });
const maskable = svg({ radius: 0, glyph: 0.5 });

const png = (source, size) =>
  sharp(Buffer.from(source), { density: ((72 * size) / 512) * 4 })
    .resize(size, size)
    .png()
    .toBuffer();

async function ico(sizes) {
  const images = await Promise.all(
    sizes.map((size) => png(size <= 32 ? small : tile, size)),
  );
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(images[i].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += images[i].length;
  });
  return Buffer.concat([header, ...images]);
}

function write(path, data) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log(`wrote ${path}`);
}

write('coopseat-web/src/app/favicon.ico', await ico([16, 32, 48]));
write('coopseat-web/src/app/icon.svg', tile);
write('coopseat-web/src/app/apple-icon.png', await png(square, 180));
write('coopseat-web/public/icon-192.png', await png(tile, 192));
write('coopseat-web/public/icon-512.png', await png(tile, 512));
write('coopseat-web/public/icon-maskable-512.png', await png(maskable, 512));
write('coopseat-desktop/build/icon.ico', await ico([16, 24, 32, 48, 64, 128, 256]));
write('coopseat-desktop/public/icon.png', await png(tile, 256));
