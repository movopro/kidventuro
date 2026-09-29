// Drawing toolkit for the motion studio: fonts, text layout that measures
// instead of guessing, easing, and small shape helpers. Pure canvas (Skia via
// @napi-rs/canvas) so every runner - Node 1, Node 2, GitHub Actions - draws the
// same pixels without system fonts or a browser.
import fs from 'node:fs';
import { GlobalFonts, Path2D, loadImage } from '@napi-rs/canvas';

// ---------- fonts ----------

const registered = new Set();
// files: { 500: 'Montserrat-Medium.ttf', 800: 'Montserrat-ExtraBold.ttf', ... }
// Static instances, one per weight: the variable font only ever rendered its
// default (Thin) instance in Skia, whatever weight was asked for.
export function registerFontFamily(directory, family, files) {
  for (const file of Object.values(files)) {
    const key = `${family}:${file}`;
    if (registered.has(key)) continue;
    const path = `${directory}/${file}`;
    if (!fs.existsSync(path)) throw new Error(`Missing font file ${path}`);
    GlobalFonts.registerFromPath(path, family);
    registered.add(key);
  }
}

export const font = (weight, size, family) => `${weight} ${Math.round(size)}px ${family}`;

// ---------- easing ----------

export const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOutCubic = (t) => 1 - (1 - clamp(t)) ** 3;
export const easeInCubic = (t) => clamp(t) ** 3;
export const easeInOut = (t) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};
// Overshoots then settles: the "slam" used for ranks, stamps and prices.
export const easeOutBack = (t, s = 1.9) => {
  const x = clamp(t) - 1;
  return 1 + (s + 1) * x ** 3 + s * x ** 2;
};
// 0 -> 1 over [start, start + duration] of a scene clock.
export const phase = (t, start, duration) => clamp((t - start) / Math.max(0.0001, duration));

// ---------- colour ----------

export function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (hex, alpha = 1) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};
export function mixHex(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const c = (x, y) => Math.round(lerp(x, y, clamp(t))).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

// ---------- text ----------

// "*word*" marks an accent run. Returns [{ text, accent }] word tokens.
export function tokenize(text) {
  const tokens = [];
  let accent = false;
  for (const raw of String(text).split(/\s+/).filter(Boolean)) {
    let word = raw;
    // An accent may open after a quote mark ("„*Ти") and close before
    // punctuation ("години*."), so look for the marker, not just the edges.
    const open = word.match(/^([„“"«(]*)\*/);
    if (open) { accent = true; word = open[1] + word.slice(open[0].length); }
    const close = word.match(/\*([.,!?;:…"“”»)]*)$/);
    if (close) word = word.slice(0, close.index) + close[1];
    if (word) tokens.push({ text: word, accent });
    if (close) accent = false;
  }
  return tokens;
}

export const plainText = (text) => tokenize(text).map((token) => token.text).join(' ');

// Wraps and shrinks until the text fits `maxLines` at `maxWidth`, measuring
// every candidate with the real font. Throws rather than letting text run off
// the frame: an overflowing slide is a QA failure, not something to post.
export function layoutText(ctx, text, {
  family, weight, maxSize, minSize = Math.round(maxSize * 0.55), maxWidth, maxLines, lineHeight = 1.12, upper = false
}) {
  const tokens = tokenize(upper ? String(text).toLocaleUpperCase('bg') : text);
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = font(weight, size, family);
    const space = ctx.measureText(' ').width;
    const lines = [];
    let current = [];
    let width = 0;
    let fits = true;
    for (const token of tokens) {
      const w = ctx.measureText(token.text).width;
      if (w > maxWidth) { fits = false; break; }
      const next = current.length ? width + space + w : w;
      if (next > maxWidth && current.length) {
        lines.push({ tokens: current, width });
        current = [{ ...token, width: w }];
        width = w;
      } else {
        current.push({ ...token, width: w });
        width = next;
      }
    }
    if (!fits) continue;
    if (current.length) lines.push({ tokens: current, width });
    if (lines.length <= maxLines) {
      return { size, space, lines, lineHeight: size * lineHeight, height: lines.length * size * lineHeight, family, weight };
    }
  }
  throw new Error(`Text does not fit (${maxLines} lines, ${maxWidth}px, min ${minSize}px): "${plainText(text)}"`);
}

// Draws a layout. `reveal` (0..1) pops words in one after another - the
// kinetic-caption style that holds attention on short video.
export function drawText(ctx, layout, {
  x, y, align = 'center', color = '#ffffff', accent = '#f2c96b', reveal = 1, shadow = 'rgba(0,0,0,0.35)', stagger = null
}) {
  ctx.save();
  ctx.font = font(layout.weight, layout.size, layout.family);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const words = layout.lines.reduce((n, line) => n + line.tokens.length, 0);
  const step = stagger ?? 1 / Math.max(1, words);
  let index = 0;
  layout.lines.forEach((line, lineIndex) => {
    let cursor = align === 'center' ? x - line.width / 2 : align === 'right' ? x - line.width : x;
    const baseline = y + layout.size * 0.8 + lineIndex * layout.lineHeight;
    for (const token of line.tokens) {
      const local = clamp((reveal - index * step * 0.85) / Math.max(step * 1.6, 0.0001));
      if (local > 0) {
        const scale = 0.72 + 0.28 * easeOutBack(local, 2.2);
        const cx = cursor + token.width / 2;
        const cy = baseline - layout.size * 0.35;
        ctx.save();
        ctx.globalAlpha *= clamp(local * 1.6);
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        // Blurred shadows are the costliest thing Skia draws here; only large
        // type needs one to stand off the sky.
        if (shadow && layout.size >= 64) { ctx.shadowColor = shadow; ctx.shadowBlur = layout.size * 0.14; ctx.shadowOffsetY = layout.size * 0.04; }
        ctx.fillStyle = token.accent ? accent : color;
        ctx.fillText(token.text, -token.width / 2, baseline - cy);
        ctx.restore();
      }
      cursor += token.width + layout.space;
      index += 1;
    }
  });
  ctx.restore();
}

// ---------- shapes ----------

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function pill(ctx, label, { x, y, family, size = 34, weight = 800, bg, fg, align = 'center', padX = 30, height = null }) {
  ctx.save();
  ctx.font = font(weight, size, family);
  const w = ctx.measureText(label).width + padX * 2;
  const h = height || size * 1.9;
  const left = align === 'center' ? x - w / 2 : x;
  roundRect(ctx, left, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(label, left + w / 2, y + h / 2 + size * 0.04);
  ctx.restore();
  return { x: left, y, w, h };
}

// ---------- images ----------

const imageCache = new Map();
export async function loadImageCached(source) {
  if (imageCache.has(source)) return imageCache.get(source);
  let data;
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source, { headers: { 'User-Agent': 'Mozilla/5.0 (social-autopilot studio)' } });
    if (!response.ok) throw new Error(`Image HTTP ${response.status}: ${source}`);
    data = Buffer.from(await response.arrayBuffer());
  } else {
    data = fs.readFileSync(source);
  }
  const image = await loadImage(data);
  imageCache.set(source, image);
  return image;
}

// Draws `image` to cover the box (like CSS object-fit: cover).
export function drawCover(ctx, image, x, y, w, h, zoom = 1) {
  const scale = Math.max(w / image.width, h / image.height) * zoom;
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ---------- SVG glyphs ----------

// Converts the zodiac icon SVG snippets (path/line/circle in a 64x64 box) into
// canvas paths once, so they can be stroked and drawn on with a dash offset.
export function svgToPaths(svg) {
  const paths = [];
  const attr = (element, name) => {
    const match = element.match(new RegExp(`\\s${name}="([^"]*)"`));
    return match ? match[1] : null;
  };
  for (const element of svg.match(/<(path|line|circle)\b[^>]*>/g) || []) {
    let d;
    if (element.startsWith('<path')) d = attr(element, 'd');
    else if (element.startsWith('<line')) d = `M${attr(element, 'x1')} ${attr(element, 'y1')} L${attr(element, 'x2')} ${attr(element, 'y2')}`;
    else {
      const cx = Number(attr(element, 'cx'));
      const cy = Number(attr(element, 'cy'));
      const r = Number(attr(element, 'r'));
      d = `M${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy}`;
    }
    paths.push({ path: new Path2D(d), width: Number(attr(element, 'stroke-width') || 4) });
  }
  return paths;
}

// progress 0..1 draws the strokes on; 1 is the finished glyph.
export function drawGlyph(ctx, paths, { cx, cy, size, color, progress = 1, glow = null }) {
  ctx.save();
  const scale = size / 64;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 18 / scale; }
  const length = 220;
  for (const { path, width } of paths) {
    ctx.lineWidth = width;
    if (progress < 1) {
      ctx.setLineDash([length * clamp(progress), length]);
      ctx.lineDashOffset = 0;
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke(path);
  }
  ctx.restore();
}

// Deterministic pseudo-random numbers, so a re-render draws the same frame.
export function seeded(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
