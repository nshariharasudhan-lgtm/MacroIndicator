import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function calculateCrc(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = calculateCrc(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generateOgPng(width: number, height: number): Buffer {
  // 1200 x 630 RGBA
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  // Simple 5x7 bitmap font for drawing clean text
  const font5x7: Record<string, number[]> = {
    ' ': [0, 0, 0, 0, 0],
    'A': [0x7e, 0x11, 0x11, 0x11, 0x7e],
    'B': [0x7f, 0x49, 0x49, 0x49, 0x36],
    'C': [0x3e, 0x41, 0x41, 0x41, 0x22],
    'D': [0x7f, 0x41, 0x41, 0x22, 0x1c],
    'E': [0x7f, 0x49, 0x49, 0x49, 0x41],
    'F': [0x7f, 0x09, 0x09, 0x09, 0x01],
    'G': [0x3e, 0x41, 0x49, 0x49, 0x7a],
    'H': [0x7f, 0x08, 0x08, 0x08, 0x7f],
    'I': [0x00, 0x41, 0x7f, 0x41, 0x00],
    'J': [0x20, 0x40, 0x41, 0x3f, 0x01],
    'K': [0x7f, 0x08, 0x14, 0x22, 0x41],
    'L': [0x7f, 0x40, 0x40, 0x40, 0x40],
    'M': [0x7f, 0x02, 0x0c, 0x02, 0x7f],
    'N': [0x7f, 0x04, 0x08, 0x10, 0x7f],
    'O': [0x3e, 0x41, 0x41, 0x41, 0x3e],
    'P': [0x7f, 0x09, 0x09, 0x09, 0x06],
    'Q': [0x3e, 0x41, 0x51, 0x21, 0x5e],
    'R': [0x7f, 0x09, 0x19, 0x29, 0x46],
    'S': [0x46, 0x49, 0x49, 0x49, 0x31],
    'T': [0x01, 0x01, 0x7f, 0x01, 0x01],
    'U': [0x3f, 0x40, 0x40, 0x40, 0x3f],
    'V': [0x1f, 0x20, 0x40, 0x20, 0x1f],
    'W': [0x7f, 0x20, 0x18, 0x20, 0x7f],
    'X': [0x63, 0x14, 0x08, 0x14, 0x63],
    'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
    'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
    'a': [0x20, 0x54, 0x54, 0x54, 0x78],
    'b': [0x7f, 0x48, 0x44, 0x44, 0x38],
    'c': [0x38, 0x44, 0x44, 0x44, 0x20],
    'd': [0x38, 0x44, 0x44, 0x48, 0x7f],
    'e': [0x38, 0x54, 0x54, 0x54, 0x18],
    'f': [0x08, 0x7e, 0x09, 0x01, 0x02],
    'g': [0x0c, 0x52, 0x52, 0x52, 0x3e],
    'h': [0x7f, 0x08, 0x04, 0x04, 0x78],
    'i': [0x00, 0x44, 0x7d, 0x40, 0x00],
    'j': [0x20, 0x40, 0x44, 0x3d, 0x00],
    'k': [0x7f, 0x10, 0x28, 0x44, 0x00],
    'l': [0x00, 0x41, 0x7f, 0x40, 0x00],
    'm': [0x7c, 0x04, 0x18, 0x04, 0x78],
    'n': [0x7c, 0x08, 0x04, 0x04, 0x78],
    'o': [0x38, 0x44, 0x44, 0x44, 0x38],
    'p': [0x7c, 0x14, 0x14, 0x14, 0x08],
    'q': [0x08, 0x14, 0x14, 0x18, 0x7c],
    'r': [0x7c, 0x08, 0x04, 0x04, 0x08],
    's': [0x48, 0x54, 0x54, 0x54, 0x20],
    't': [0x04, 0x3f, 0x44, 0x40, 0x20],
    'u': [0x3c, 0x40, 0x40, 0x20, 0x7c],
    'v': [0x1c, 0x20, 0x40, 0x20, 0x1c],
    'w': [0x3c, 0x40, 0x30, 0x40, 0x3c],
    'x': [0x44, 0x28, 0x10, 0x28, 0x44],
    'y': [0x0c, 0x50, 0x50, 0x50, 0x3c],
    'z': [0x44, 0x64, 0x54, 0x4c, 0x44],
    '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
    '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
    '2': [0x42, 0x61, 0x51, 0x49, 0x46],
    '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
    '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
    '5': [0x27, 0x45, 0x45, 0x45, 0x39],
    '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
    '7': [0x01, 0x71, 0x09, 0x05, 0x03],
    '8': [0x36, 0x49, 0x49, 0x49, 0x36],
    '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
    '.': [0x00, 0x60, 0x60, 0x00, 0x00],
    ',': [0x00, 0x80, 0x60, 0x00, 0x00],
    ':': [0x00, 0x36, 0x36, 0x00, 0x00],
    '-': [0x08, 0x08, 0x08, 0x08, 0x08],
    '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
    '/': [0x20, 0x10, 0x08, 0x04, 0x02],
    '|': [0x00, 0x00, 0x7f, 0x00, 0x00],
    '&': [0x36, 0x49, 0x55, 0x22, 0x50],
    '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  };

  // 2D Pixel array in memory: [y][x] = [r, g, b]
  const pixels: Uint8Array = new Uint8Array(width * height * 3);

  function setPixel(x: number, y: number, r: number, g: number, b: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 3;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
  }

  // 1. Fill sleek background gradient (Deep slate #0b1120 to #1e293b)
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const r = Math.round(11 + t * 15);
    const g = Math.round(17 + t * 24);
    const b = Math.round(32 + t * 35);
    for (let x = 0; x < width; x++) {
      // Subtle grid pattern
      const isGridX = x % 60 === 0;
      const isGridY = y % 60 === 0;
      if ((isGridX || isGridY) && Math.random() > 0.3) {
        setPixel(x, y, r + 6, g + 8, b + 10);
      } else {
        setPixel(x, y, r, g, b);
      }
    }
  }

  // Draw Card Container
  function drawRect(rx: number, ry: number, rw: number, rh: number, cr: number, cg: number, cb: number) {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        setPixel(x, y, cr, cg, cb);
      }
    }
  }

  // Top accent bar: Emerald green (#10b981)
  drawRect(80, 70, width - 160, 6, 16, 185, 129);

  // Draw Text using 5x7 font with scale
  function drawText(text: string, startX: number, startY: number, scale: number, cr: number, cg: number, cb: number) {
    let curX = startX;
    for (const char of text) {
      const glyph = font5x7[char] || font5x7[' '];
      for (let col = 0; col < 5; col++) {
        const bits = glyph[col];
        for (let row = 0; row < 7; row++) {
          if ((bits >> row) & 1) {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                setPixel(curX + col * scale + sx, startY + row * scale + sy, cr, cg, cb);
              }
            }
          }
        }
      }
      curX += 6 * scale;
    }
  }

  // Brand Name: MacroNest.online
  drawText('MacroNest', 90, 110, 8, 255, 255, 255); // White
  drawText('.online', 90 + 9 * 6 * 8, 110, 8, 52, 211, 153); // Emerald-400

  // Tagline
  drawText('KNOWLEDGE TODAY  -  A BRIGHTER TOMORROW', 95, 180, 3, 148, 163, 184); // Slate-400

  // Main Headline
  drawText('India Macroeconomic Indicators & Policy Rates', 90, 240, 5, 241, 245, 249); // White
  drawText('Reserve Bank of India (RBI) | MoSPI | GSTN | Ministry of Finance', 92, 290, 3, 125, 211, 252); // Sky-300

  // Draw 4 stat cards in a row
  const cardDefs = [
    { label: 'RBI REPO RATE', value: '5.25%', sub: 'Neutral Stance', r: 16, g: 185, b: 129 },
    { label: 'CPI INFLATION', value: '4.82%', sub: 'August 2026', r: 245, g: 158, b: 11 },
    { label: 'FOREX RESERVES', value: '$780.8 Bn', sub: 'Week ended 11 Sep', r: 59, g: 130, b: 246 },
    { label: 'GDP GROWTH (Q1)', value: '7.8% YoY', sub: 'Q1 FY2026-27', r: 168, g: 85, b: 247 },
  ];

  const cardW = 235;
  const cardH = 170;
  const startCardX = 90;
  const cardY = 345;
  const cardGap = 26;

  cardDefs.forEach((card, idx) => {
    const cx = startCardX + idx * (cardW + cardGap);

    // Card background
    drawRect(cx, cardY, cardW, cardH, 24, 33, 53);

    // Border outline
    for (let x = cx; x < cx + cardW; x++) {
      setPixel(x, cardY, 45, 60, 90);
      setPixel(x, cardY + cardH - 1, 45, 60, 90);
    }
    for (let y = cardY; y < cardY + cardH; y++) {
      setPixel(cx, y, 45, 60, 90);
      setPixel(cx + cardW - 1, y, 45, 60, 90);
    }

    // Indicator top accent pill
    drawRect(cx + 16, cardY + 16, 8, 8, card.r, card.g, card.b);

    // Label
    drawText(card.label, cx + 32, cardY + 16, 2, 148, 163, 184);

    // Big Value
    drawText(card.value, cx + 18, cardY + 54, 5, 255, 255, 255);

    // Subtitle
    drawText(card.sub, cx + 18, cardY + 115, 2, card.r, card.g, card.b);
  });

  // Footer banner on card
  drawText('macronest.online  |  Compiled from Official Public Data Feeds', 92, 555, 2, 100, 116, 139);

  // Convert pixels to scanline rawData
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pIdx = (y * width + x) * 3;
      rawData[offset++] = pixels[pIdx];
      rawData[offset++] = pixels[pIdx + 1];
      rawData[offset++] = pixels[pIdx + 2];
      rawData[offset++] = 255; // Alpha
    }
  }

  // Build PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pngBuffer = generateOgPng(1200, 630);
const outPath = path.join(process.cwd(), 'public', 'og-image.png');
fs.writeFileSync(outPath, pngBuffer);
console.log(`Generated 1200x630 OpenGraph PNG: ${outPath} (${pngBuffer.length} bytes)`);
