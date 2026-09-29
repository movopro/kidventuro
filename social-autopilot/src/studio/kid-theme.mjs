// Kidventuro's motion theme: the site's warm cream page, a slow yellow sun,
// mint waves and a dotted travel path, with bold ink type and orange/teal
// stickers. buildScenes() turns one post into animated scenes, sized to the
// narrator's voice when there is one; drawPin() makes the Pinterest pin.
// Everything important stays inside the phone safe area: TikTok and Reels
// cover the top ~200px, the bottom ~440px and a right-hand rail.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import {
  clamp, drawText, easeInOut, easeOutBack, easeOutCubic, font, hashSeed, layoutText,
  loadImageCached, phase, pill, plainText, registerFontFamily, rgba, roundRect, seeded
} from './canvas-kit.mjs';
import { loadDestinations } from '../destinations.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const autopilotRoot = path.resolve(here, '..', '..');
const repositoryRoot = path.resolve(autopilotRoot, '..');
const FAMILY = 'KidSans';
registerFontFamily(path.join(autopilotRoot, 'assets', 'fonts'), FAMILY, {
  500: 'Montserrat-Medium.ttf', 700: 'Montserrat-Bold.ttf', 800: 'Montserrat-ExtraBold.ttf', 900: 'Montserrat-Black.ttf'
});

export const W = 1080;
export const H = 1920;
export const SAFE = { left: 90, right: 960, top: 230, bottom: 1440 };
const CX = (SAFE.left + SAFE.right) / 2;
const TEXT_W = SAFE.right - SAFE.left;

export const COLORS = {
  cream: '#fff8ef', paper: '#fffdf9', ink: '#20312f', muted: '#5d6b67', orange: '#ff7d4d', orangeDark: '#e0582a',
  teal: '#2b7a78', mint: '#bfe6d6', mintSoft: '#dff4ea', yellow: '#ffd96a', sun: '#f7d898', myth: '#e0582a', fact: '#2b7a78'
};
const ACCENTS = [COLORS.orange, COLORS.teal, '#6a8cff', '#c65fb0'];

const words = (text) => String(text || '').split(/\s+/).filter(Boolean).length;
const readSeconds = (text, base = 1.2, min = 2.4, max = 6.5) => clamp(base + words(text) * 0.31, min, max);

// ---------- voice ----------

// The narrator's line for each part of the video: hook, every scene, outro.
// A scene's `say` overrides what is read; otherwise it reads what is shown.
export function voiceLines(post, names = {}) {
  // Web addresses are spoken the way a person would say them.
  const say = (text) => plainText(text).replace(/\s+/g, ' ').replace(/kidventuro\.com/gi, 'Kidventuro dot com').trim();
  const lines = [post.hook.say || say(post.hook.text)];
  let clue = 0;
  for (const scene of post.scenes) {
    if (scene.say) { lines.push(scene.say); continue; }
    switch (scene.type) {
      case 'rank': lines.push(`Number ${scene.rank}: ${say(scene.title)}. ${say(scene.text)}`); break;
      case 'choice': lines.push(`Would you rather ${say(scene.a)}? Or ${say(scene.b)}?`); break;
      case 'items': lines.push(scene.items.map(say).join('. ')); break;
      case 'claim': lines.push(`Myth or fact? ${say(scene.text)}`); break;
      case 'verdict': lines.push(`${scene.verdict === 'myth' ? 'Myth!' : 'Fact!'} ${say(scene.text)}`); break;
      case 'clue': clue += 1; lines.push(`Clue ${clue}. ${say(scene.text)}`); break;
      case 'answer': lines.push(`It's ${names[scene.destination] || scene.destination}! ${say(scene.text)}`); break;
      case 'chat': lines.push(scene.messages.map((message) => say(message.text)).join(' ... ')); break;
      case 'booklet': lines.push(say(scene.text || 'A personalised travel activity book, made for your explorer.')); break;
      default: lines.push(say(scene.text));
    }
  }
  lines.push(post.outro.say || [say(post.outro.text), post.outro.sub ? say(post.outro.sub) : ''].filter(Boolean).join(' '));
  return lines;
}

// ---------- shared layers ----------

function makeConfetti(seed) {
  const rand = seeded(seed);
  return Array.from({ length: 26 }, (_, i) => ({
    x: rand() * W, y: rand() * H, r: 6 + rand() * 12, speed: 8 + rand() * 18, spin: rand() * 2 - 1,
    color: ACCENTS[i % ACCENTS.length], shape: i % 3
  }));
}

const baseLayers = new Map();
function baseLayer(width, height) {
  const key = `${width}x${height}`;
  if (baseLayers.has(key)) return baseLayers.get(key);
  const layer = createCanvas(width, height);
  const ctx = layer.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width * 0.4, height);
  gradient.addColorStop(0, COLORS.paper);
  gradient.addColorStop(1, COLORS.cream);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  // A faint paper dot grid, like the activity books.
  ctx.fillStyle = rgba(COLORS.ink, 0.05);
  for (let y = 40; y < height; y += 60) for (let x = 40; x < width; x += 60) ctx.fillRect(x, y, 4, 4);
  baseLayers.set(key, layer);
  return layer;
}

function drawBackground(ctx, T, accent, confetti, width = W, height = H) {
  ctx.drawImage(baseLayer(width, height), 0, 0);
  // The sun, breathing slowly in the top-right corner.
  const sunR = width * (0.36 + 0.01 * Math.sin(T * 1.2));
  ctx.fillStyle = COLORS.sun;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(width * 0.93, height * 0.07, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Confetti drifting down.
  for (const bit of confetti) {
    const y = (bit.y + T * bit.speed * 4) % (height + 40) - 20;
    ctx.save();
    ctx.translate(bit.x * (width / W), y);
    ctx.rotate(T * bit.spin);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = bit.color;
    if (bit.shape === 0) { ctx.beginPath(); ctx.arc(0, 0, bit.r * 0.6, 0, Math.PI * 2); ctx.fill(); }
    else if (bit.shape === 1) ctx.fillRect(-bit.r / 2, -bit.r / 4, bit.r, bit.r / 2);
    else { ctx.beginPath(); ctx.moveTo(0, -bit.r / 2); ctx.lineTo(bit.r / 2, bit.r / 2); ctx.lineTo(-bit.r / 2, bit.r / 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  // Two mint waves rolling along the bottom.
  for (const [i, wave] of [[0, { y: 0.9, amp: 26, color: COLORS.mintSoft }], [1, { y: 0.94, amp: 20, color: COLORS.mint }]]) {
    ctx.fillStyle = wave.color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 20) {
      ctx.lineTo(x, height * wave.y + wave.amp * Math.sin(x / 160 + T * (0.9 + i * 0.4) + i * 2));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }
  // Accent glow behind the content, tinted per scene.
  const glow = ctx.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, width * 0.7);
  glow.addColorStop(0, rgba(accent, 0.1));
  glow.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, height * 0.45 - width * 0.7, width, width * 1.4);
}

function drawBrand(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  roundRect(ctx, 0, 0, 58, 58, 16);
  ctx.fillStyle = COLORS.orange;
  ctx.fill();
  ctx.font = font(900, 34, FAMILY);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', 29, 31);
  ctx.textAlign = 'left';
  ctx.font = font(800, 32, FAMILY);
  ctx.fillStyle = COLORS.ink;
  ctx.fillText('Kidventuro', 74, 31);
  ctx.restore();
}

// A white card with a soft shadow - the activity-book page look.
function card(c, x, y, w, h, { fill = '#ffffff', stroke = null, radius = 36, shadow = true } = {}) {
  c.save();
  if (shadow) { c.shadowColor = 'rgba(32,49,47,0.16)'; c.shadowBlur = 36; c.shadowOffsetY = 16; }
  roundRect(c, x, y, w, h, radius);
  c.fillStyle = fill;
  c.fill();
  c.restore();
  if (stroke) {
    c.save();
    roundRect(c, x, y, w, h, radius);
    c.lineWidth = 4;
    c.strokeStyle = stroke;
    c.stroke();
    c.restore();
  }
}

function sticker(c, label, { x, y, bg = COLORS.orange, fg = '#ffffff', size = 36, rotate = -0.05, p = 1 }) {
  const s = easeOutBack(p, 2.2);
  if (s <= 0) return;
  c.save();
  c.translate(x, y);
  c.rotate(rotate);
  c.scale(s, s);
  pill(c, label, { x: 0, y: -size, family: FAMILY, size, weight: 900, bg, fg });
  c.restore();
}

// The passport stamp used for places: a dashed ring with the city name.
function stamp(c, name, { cx, cy, r, color, p = 1 }) {
  const s = easeOutBack(p, 2.4) * (1.6 - 0.6 * clamp(p * 1.5));
  if (s <= 0) return;
  c.save();
  c.translate(cx, cy);
  c.rotate(-0.12);
  c.scale(s, s);
  c.globalAlpha *= clamp(p * 2);
  c.lineWidth = 10;
  c.strokeStyle = color;
  c.setLineDash([22, 14]);
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
  c.setLineDash([]);
  c.lineWidth = 5;
  c.beginPath(); c.arc(0, 0, r - 26, 0, Math.PI * 2); c.stroke();
  const label = name.toUpperCase();
  let size = r * 0.42;
  c.font = font(900, size, FAMILY);
  while (c.measureText(label).width > r * 1.55 && size > 20) { size -= 2; c.font = font(900, size, FAMILY); }
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, 0, 4);
  c.font = font(800, r * 0.13, FAMILY);
  c.fillText('VISITED', 0, r * 0.38);
  c.restore();
}

function envelope(ctx, t, duration) {
  const inP = easeOutCubic(phase(t, 0, 0.35));
  const outP = phase(t, duration - 0.2, 0.2);
  ctx.globalAlpha = inP * (1 - outP);
  ctx.translate(0, (1 - inP) * 40 - outP * 30);
}

const layout = (ctx, text, options) => layoutText(ctx, text, { family: FAMILY, ...options });
const INK = { color: COLORS.ink, accent: COLORS.orangeDark, shadow: null };

// ---------- scenes ----------

function hookScene(ctx, post, minDuration) {
  const hook = post.hook;
  const text = layout(ctx, hook.text, { weight: 900, maxSize: 112, minSize: 62, maxWidth: TEXT_W, maxLines: 5, lineHeight: 1.06 });
  const duration = Math.max(minDuration, hook.seconds || clamp(1.6 + words(hook.text) * 0.2, 2.4, 4.2));
  const top = 800 - text.height / 2;
  return {
    duration, accent: COLORS.orange, sfx: [{ name: 'boom', at: 0.02 }],
    draw(c, t) {
      envelope(c, t, duration);
      if (hook.kicker) sticker(c, hook.kicker.toUpperCase(), { x: CX, y: top - 90, bg: COLORS.teal, size: 40, p: phase(t, 0.05, 0.4) });
      const s = 1 + 0.12 * (1 - easeOutCubic(phase(t, 0, 0.5)));
      c.translate(CX, top + text.height / 2);
      c.scale(s, s);
      drawText(c, text, { x: 0, y: -text.height / 2, ...INK, reveal: phase(t, 0.05, 0.75) });
    }
  };
}

function rankScene(ctx, scene, names, minDuration) {
  const title = layout(ctx, scene.title, { weight: 900, maxSize: 92, minSize: 56, maxWidth: TEXT_W, maxLines: 3, lineHeight: 1.04 });
  const body = layout(ctx, scene.text, { weight: 700, maxSize: 58, minSize: 40, maxWidth: TEXT_W - 80, maxLines: 5, lineHeight: 1.2 });
  const duration = Math.max(minDuration, scene.seconds || readSeconds(scene.text, 1.8, 3.2, 6.5));
  const isFirst = scene.rank === 1;
  const color = isFirst ? COLORS.orange : COLORS.teal;
  const cardTop = 880;
  const cardH = title.height + body.height + 150;
  return {
    duration, accent: color,
    sfx: [{ name: 'whoosh', at: 0 }, { name: isFirst ? 'boom' : 'pop', at: 0.12 }, ...(isFirst ? [{ name: 'ding', at: 0.5 }] : [])],
    draw(c, t) {
      envelope(c, t, duration);
      const slam = easeOutBack(phase(t, 0, 0.45), 2.4);
      c.save();
      c.translate(CX, 600);
      c.rotate(-0.06);
      c.scale(0.3 + 0.7 * slam, 0.3 + 0.7 * slam);
      c.fillStyle = color;
      c.beginPath(); c.arc(0, 0, 170, 0, Math.PI * 2); c.fill();
      c.lineWidth = 12; c.strokeStyle = '#ffffff'; c.stroke();
      c.font = font(900, 170, FAMILY);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`#${scene.rank}`, 0, 10);
      c.restore();
      if (scene.destination) stamp(c, names[scene.destination] || scene.destination, { cx: SAFE.right - 90, cy: 470, r: 110, color: COLORS.orange, p: phase(t, 0.5, 0.5) });
      const p = easeOutCubic(phase(t, 0.2, 0.5));
      c.save();
      c.translate(0, (1 - p) * 80);
      c.globalAlpha *= p;
      card(c, SAFE.left, cardTop, TEXT_W, cardH);
      drawText(c, title, { x: CX, y: cardTop + 50, ...INK, color: color === COLORS.orange ? COLORS.orangeDark : COLORS.teal, reveal: phase(t, 0.25, 0.35) });
      drawText(c, body, { x: CX, y: cardTop + 80 + title.height, ...INK, reveal: phase(t, 0.55, Math.min(1.4, duration * 0.35)) });
      c.restore();
    }
  };
}

function textScene(ctx, scene, names, minDuration, defaultKicker = null) {
  const kicker = scene.kicker || defaultKicker;
  const body = layout(ctx, scene.text, { weight: 800, maxSize: 76, minSize: 46, maxWidth: TEXT_W - 90, maxLines: 7, lineHeight: 1.16 });
  const duration = Math.max(minDuration, scene.seconds || readSeconds(scene.text, 1.3, 2.6, 6.8));
  const cardH = body.height + 120;
  const cardTop = 860 - cardH / 2 + (scene.destination ? 90 : 0);
  return {
    duration, accent: COLORS.teal, sfx: [{ name: 'whoosh', at: 0 }],
    draw(c, t) {
      envelope(c, t, duration);
      if (scene.destination) stamp(c, names[scene.destination] || scene.destination, { cx: CX, cy: cardTop - 170, r: 125, color: COLORS.teal, p: phase(t, 0.05, 0.5) });
      card(c, SAFE.left, cardTop, TEXT_W, cardH);
      if (kicker) sticker(c, kicker.toUpperCase(), { x: CX, y: cardTop + 6, bg: COLORS.orange, size: 34, p: phase(t, 0.1, 0.4) });
      drawText(c, body, { x: CX, y: cardTop + 62, ...INK, reveal: phase(t, 0.15, Math.min(1.6, duration * 0.4)) });
    }
  };
}

function choiceScene(ctx, scene, minDuration) {
  const a = layout(ctx, scene.a, { weight: 800, maxSize: 64, minSize: 40, maxWidth: TEXT_W - 170, maxLines: 4, lineHeight: 1.14 });
  const b = layout(ctx, scene.b, { weight: 800, maxSize: 64, minSize: 40, maxWidth: TEXT_W - 170, maxLines: 4, lineHeight: 1.14 });
  const readA = readSeconds(scene.a, 0.4, 1.2, 3);
  const duration = Math.max(minDuration, scene.seconds || clamp(1.2 + readA + readSeconds(scene.b, 0.6, 1.4, 3.2), 3.8, 8));
  const bAt = Math.max(0.6 + readA, minDuration * 0.45);
  const cardH = Math.max(a.height, b.height) + 110;
  const topA = 820 - cardH - 70;
  const topB = 820 + 70;
  const option = (c, block, letter, color, top, p) => {
    if (p <= 0) return;
    c.save();
    c.globalAlpha *= clamp(p * 1.8);
    c.translate((1 - easeOutCubic(p)) * (letter === 'A' ? -160 : 160), 0);
    card(c, SAFE.left, top, TEXT_W, cardH, { fill: color });
    c.beginPath(); c.arc(SAFE.left + 80, top + cardH / 2, 50, 0, Math.PI * 2);
    c.fillStyle = '#ffffff'; c.fill();
    c.font = font(900, 60, FAMILY); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(letter, SAFE.left + 80, top + cardH / 2 + 4);
    drawText(c, block, { x: SAFE.left + 150, y: top + (cardH - block.height) / 2, align: 'left', color: '#ffffff', accent: COLORS.yellow, shadow: null, reveal: clamp(p * 1.4) });
    c.restore();
  };
  return {
    duration, accent: COLORS.orange,
    sfx: [{ name: 'whoosh', at: 0 }, { name: 'pop', at: 0.3 }, { name: 'pop', at: bAt }],
    draw(c, t) {
      envelope(c, t, duration);
      sticker(c, 'WOULD YOU RATHER', { x: CX, y: topA - 60, bg: COLORS.ink, size: 36, p: phase(t, 0, 0.4) });
      option(c, a, 'A', COLORS.orange, topA, phase(t, 0.3, 0.45));
      const orP = easeOutBack(phase(t, bAt - 0.15, 0.35), 2.4);
      if (orP > 0) {
        c.save(); c.translate(CX, 820); c.scale(orP, orP);
        c.beginPath(); c.arc(0, 0, 64, 0, Math.PI * 2); c.fillStyle = COLORS.yellow; c.fill();
        c.font = font(900, 46, FAMILY); c.fillStyle = COLORS.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('OR', 0, 3); c.restore();
      }
      option(c, b, 'B', COLORS.teal, topB, phase(t, bAt, 0.45));
    }
  };
}

function itemsScene(ctx, scene, minDuration) {
  const items = scene.items.map((item) => layout(ctx, item, { weight: 700, maxSize: 52, minSize: 36, maxWidth: TEXT_W - 200, maxLines: 4, lineHeight: 1.18 }));
  const title = scene.title ? layout(ctx, scene.title, { weight: 900, maxSize: 64, minSize: 44, maxWidth: TEXT_W, maxLines: 2 }) : null;
  const per = scene.items.map((item) => readSeconds(item, 0.5, 1.3, 3.2));
  const natural = 0.6 + per.reduce((x, y) => x + y, 0);
  const duration = Math.max(minDuration, scene.seconds || clamp(natural, 3, 9));
  const stretch = duration / natural;
  const starts = per.map((_, i) => (0.35 + per.slice(0, i).reduce((x, y) => x + y, 0)) * Math.min(stretch, 1.6));
  const rowGap = 36;
  const heights = items.map((item) => Math.max(item.height + 60, 150));
  const total = heights.reduce((x, y) => x + y, 0) + rowGap * (items.length - 1);
  const top = 880 - total / 2 + (title ? 60 : 0);
  return {
    duration, accent: COLORS.teal,
    sfx: [{ name: 'whoosh', at: 0 }, ...starts.map((at) => ({ name: 'pop', at: at + 0.25 }))],
    draw(c, t) {
      envelope(c, t, duration);
      if (title) drawText(c, title, { x: CX, y: top - title.height - 50, ...INK, color: COLORS.teal, reveal: 1 });
      let y = top;
      items.forEach((item, i) => {
        const p = phase(t, starts[i], 0.45);
        const h = heights[i];
        if (p > 0) {
          c.save();
          c.globalAlpha *= clamp(p * 1.6);
          c.translate((1 - easeOutCubic(p)) * 100, 0);
          card(c, SAFE.left, y, TEXT_W, h, { radius: 30 });
          // Checkbox that ticks itself, like the booklet checklists.
          const bx = SAFE.left + 45;
          const by = y + h / 2 - 34;
          roundRect(c, bx, by, 68, 68, 16);
          c.lineWidth = 6; c.strokeStyle = COLORS.teal; c.stroke();
          const tick = phase(t, starts[i] + 0.3, 0.35);
          if (tick > 0) {
            c.lineWidth = 11; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = COLORS.orange;
            c.beginPath();
            const pts = [[bx + 14, by + 36], [bx + 30, by + 52], [bx + 58, by + 16]];
            c.moveTo(...pts[0]);
            if (tick < 0.5) c.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * tick * 2, pts[0][1] + (pts[1][1] - pts[0][1]) * tick * 2);
            else { c.lineTo(...pts[1]); c.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * (tick - 0.5) * 2, pts[1][1] + (pts[2][1] - pts[1][1]) * (tick - 0.5) * 2); }
            c.stroke();
          }
          drawText(c, item, { x: SAFE.left + 150, y: y + (h - item.height) / 2, align: 'left', ...INK, reveal: clamp(p * 1.3) });
          c.restore();
        }
        y += h + rowGap;
      });
    }
  };
}

function claimScene(ctx, scene, minDuration) {
  const body = layout(ctx, `“${scene.text}”`, { weight: 800, maxSize: 72, minSize: 46, maxWidth: TEXT_W - 90, maxLines: 6, lineHeight: 1.16 });
  const duration = Math.max(minDuration, scene.seconds || readSeconds(scene.text, 1.8, 3, 6));
  const cardH = body.height + 130;
  const top = 840 - cardH / 2;
  const ticks = Array.from({ length: Math.floor(duration - 1) }, (_, i) => ({ name: 'tick', at: 1 + i }));
  return {
    duration, accent: COLORS.orange, sfx: [{ name: 'whoosh', at: 0 }, ...ticks],
    draw(c, t) {
      envelope(c, t, duration);
      sticker(c, 'MYTH OR FACT?', { x: CX, y: top - 50, bg: COLORS.ink, size: 40, p: phase(t, 0, 0.4) });
      card(c, SAFE.left, top, TEXT_W, cardH);
      drawText(c, body, { x: CX, y: top + 65, ...INK, reveal: phase(t, 0.1, 0.9) });
      const r = 52;
      const y = top + cardH + 120;
      c.lineWidth = 10; c.strokeStyle = rgba(COLORS.ink, 0.15);
      c.beginPath(); c.arc(CX, y, r, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = COLORS.orange;
      c.beginPath(); c.arc(CX, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(t / duration)); c.stroke();
      c.font = font(900, 44, FAMILY); c.fillStyle = COLORS.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(Math.max(1, Math.ceil(duration - t))), CX, y + 3);
    }
  };
}

function verdictScene(ctx, scene, minDuration) {
  const isMyth = scene.verdict === 'myth';
  const color = isMyth ? COLORS.myth : COLORS.fact;
  const label = isMyth ? 'MYTH' : 'FACT';
  const body = layout(ctx, scene.text, { weight: 700, maxSize: 58, minSize: 38, maxWidth: TEXT_W - 90, maxLines: 6, lineHeight: 1.2 });
  const duration = Math.max(minDuration, scene.seconds || readSeconds(scene.text, 1.8, 3.2, 6.8));
  return {
    duration, accent: color, sfx: [{ name: 'boom', at: 0.05 }, { name: 'ding', at: 0.25 }],
    draw(c, t) {
      envelope(c, t, duration);
      const p = easeOutBack(phase(t, 0, 0.4), 2.6);
      const shake = t < 0.5 ? Math.sin(t * 90) * 10 * (1 - t / 0.5) : 0;
      c.save();
      c.translate(CX + shake, 600);
      c.rotate(-0.1);
      c.scale(2.2 - 1.2 * p, 2.2 - 1.2 * p);
      c.globalAlpha *= clamp(p * 2);
      c.font = font(900, 160, FAMILY);
      const w = c.measureText(label).width + 100;
      roundRect(c, -w / 2, -115, w, 230, 34);
      c.fillStyle = color; c.fill();
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, 0, 8);
      c.restore();
      card(c, SAFE.left, 820, TEXT_W, body.height + 110);
      drawText(c, body, { x: CX, y: 875, ...INK, accent: color, reveal: phase(t, 0.45, Math.min(1.5, duration * 0.4)) });
    }
  };
}

function clueScene(ctx, scene, index, total, minDuration) {
  const body = layout(ctx, scene.text, { weight: 800, maxSize: 78, minSize: 46, maxWidth: TEXT_W - 90, maxLines: 6, lineHeight: 1.14 });
  const duration = Math.max(minDuration, scene.seconds || readSeconds(scene.text, 1.5, 2.8, 6));
  const cardH = body.height + 130;
  const top = 860 - cardH / 2;
  return {
    duration, accent: COLORS.teal, sfx: [{ name: 'whoosh', at: 0 }, { name: 'pop', at: 0.2 }],
    draw(c, t) {
      envelope(c, t, duration);
      sticker(c, `CLUE ${index}/${total}`, { x: CX, y: top - 50, bg: COLORS.teal, size: 40, p: phase(t, 0, 0.4) });
      card(c, SAFE.left, top, TEXT_W, cardH);
      drawText(c, body, { x: CX, y: top + 65, ...INK, reveal: phase(t, 0.15, Math.min(1.4, duration * 0.4)) });
    }
  };
}

function answerScene(ctx, scene, names, minDuration) {
  const name = names[scene.destination] || scene.destination;
  const body = layout(ctx, scene.text, { weight: 700, maxSize: 56, minSize: 38, maxWidth: TEXT_W - 90, maxLines: 5, lineHeight: 1.2 });
  const duration = Math.max(minDuration, scene.seconds || readSeconds(scene.text, 2, 3.2, 6.5));
  return {
    duration, accent: COLORS.orange, sfx: [{ name: 'boom', at: 0.02 }, { name: 'ding', at: 0.3 }],
    draw(c, t) {
      envelope(c, t, duration);
      sticker(c, 'ANSWER', { x: CX, y: 330, bg: COLORS.orange, size: 40, p: phase(t, 0, 0.3) });
      stamp(c, name, { cx: CX, cy: 620, r: 200, color: COLORS.orange, p: phase(t, 0.05, 0.6) });
      card(c, SAFE.left, 900, TEXT_W, body.height + 110);
      drawText(c, body, { x: CX, y: 955, ...INK, reveal: phase(t, 0.5, Math.min(1.4, duration * 0.4)) });
    }
  };
}

function chatScene(ctx, scene, minDuration) {
  const bubbleW = TEXT_W * 0.8;
  const messages = scene.messages.map((message) => ({
    ...message,
    body: layout(ctx, message.text, { weight: 700, maxSize: 50, minSize: 34, maxWidth: bubbleW - 64, maxLines: 5, lineHeight: 1.2 })
  }));
  const TYPING = 0.5;
  const per = messages.map((message) => readSeconds(message.text, 0.5, 1.2, 3) + TYPING);
  const natural = 0.8 + per.reduce((x, y) => x + y, 0);
  const duration = Math.max(minDuration, scene.seconds || clamp(natural, 3.2, 11));
  const stretch = Math.min(1.6, duration / natural);
  const starts = per.map((_, i) => (0.5 + per.slice(0, i).reduce((x, y) => x + y, 0) + TYPING) * stretch);
  return {
    duration, accent: COLORS.orange,
    sfx: [{ name: 'whoosh', at: 0 }, ...starts.map((at) => ({ name: 'pop', at }))],
    draw(c, t) {
      envelope(c, t, duration);
      const headerY = 330;
      card(c, SAFE.left, headerY - 70, TEXT_W, 140, { radius: 36 });
      c.font = font(900, 44, FAMILY); c.fillStyle = COLORS.ink; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(scene.title || 'Family chat', SAFE.left + 40, headerY + 4);
      c.fillStyle = COLORS.teal;
      c.beginPath(); c.arc(SAFE.left + 49, headerY + 35, 9, 0, Math.PI * 2); c.fill();
      c.font = font(700, 30, FAMILY);
      c.fillText('on the road', SAFE.left + 68, headerY + 46);
      let y = headerY + 130;
      messages.forEach((message, i) => {
        const kid = message.from === 'kid';
        const h = message.body.height + 48;
        const typing = phase(t, starts[i] - TYPING, 0.15) * (1 - phase(t, starts[i], 0.05));
        if (typing > 0) {
          c.save();
          c.globalAlpha *= typing;
          const tx = kid ? SAFE.left : SAFE.right - 150;
          roundRect(c, tx, y, 150, 84, 30);
          c.fillStyle = kid ? '#ffffff' : rgba(COLORS.orange, 0.3);
          c.fill();
          for (let d = 0; d < 3; d += 1) {
            c.globalAlpha = typing * (0.35 + 0.65 * Math.abs(Math.sin(t * 6 - d * 0.7)));
            c.beginPath(); c.arc(tx + 45 + d * 30, y + 42, 9, 0, Math.PI * 2);
            c.fillStyle = COLORS.ink; c.fill();
          }
          c.restore();
        }
        const p = phase(t, starts[i], 0.3);
        if (p <= 0) return;
        const w = Math.min(bubbleW, Math.max(...message.body.lines.map((line) => line.width)) + 64);
        const x = kid ? SAFE.left : SAFE.right - w;
        c.save();
        c.globalAlpha *= clamp(p * 2);
        const s = 0.8 + 0.2 * easeOutBack(p, 2);
        c.translate(x + (kid ? 0 : w), y + h);
        c.scale(s, s);
        if (kid) { c.shadowColor = 'rgba(32,49,47,0.12)'; c.shadowBlur = 20; c.shadowOffsetY = 8; }
        roundRect(c, kid ? 0 : -w, -h, w, h, 32);
        c.fillStyle = kid ? '#ffffff' : COLORS.orange;
        c.fill();
        c.shadowColor = 'transparent';
        drawText(c, message.body, { x: (kid ? 0 : -w) + 32, y: -h + 22, align: 'left', color: kid ? COLORS.ink : '#ffffff', accent: kid ? COLORS.orangeDark : COLORS.yellow, shadow: null, reveal: 1 });
        c.restore();
        y += h + 24;
      });
    }
  };
}

// The product itself: a personalised book cover, drawn the way the site shows it.
function drawBooklet(c, { cx, cy, w, name, child, t = 1 }) {
  const h = w * 1.18;
  c.save();
  c.translate(cx, cy);
  c.rotate(0.05);
  card(c, -w / 2 - 40, -h / 2 + 30, w, h, { fill: '#ffffff', radius: 34 });
  c.rotate(-0.09);
  card(c, -w / 2, -h / 2, w, h, { fill: COLORS.paper, stroke: '#e6dccd', radius: 34 });
  const x0 = -w / 2 + w * 0.1;
  roundRect(c, x0, -h / 2 + w * 0.09, w * 0.16, w * 0.16, w * 0.04);
  c.fillStyle = COLORS.orange; c.fill();
  c.font = font(900, w * 0.1, FAMILY); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('K', x0 + w * 0.08, -h / 2 + w * 0.175);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.font = font(800, w * 0.045, FAMILY); c.fillStyle = COLORS.orange;
  c.fillText('MY TRAVEL ADVENTURE', x0, -h / 2 + w * 0.36);
  let size = w * 0.17;
  const label = name.toUpperCase();
  c.font = font(900, size, FAMILY);
  while (c.measureText(label).width > w * 0.8 && size > 20) { size -= 2; c.font = font(900, size, FAMILY); }
  c.fillStyle = COLORS.ink;
  c.fillText(label, x0, -h / 2 + w * 0.36 + size * 1.05);
  c.font = font(700, w * 0.05, FAMILY); c.fillStyle = COLORS.muted;
  c.fillText(child ? `Made for ${child}` : 'Made for your explorer', x0, -h / 2 + w * 0.36 + size * 1.05 + w * 0.09);
  // The dotted route, drawing itself on.
  c.save();
  c.setLineDash([w * 0.025, w * 0.02]);
  c.lineWidth = w * 0.014; c.strokeStyle = COLORS.teal;
  c.beginPath();
  const pathY = h * 0.18;
  const steps = 40;
  const upto = Math.max(2, Math.round(steps * clamp(t)));
  for (let i = 0; i <= upto; i += 1) {
    const x = x0 + (w * 0.78) * (i / steps);
    const y = pathY + Math.sin((i / steps) * Math.PI * 2) * w * 0.035;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
  if (t >= 0.98) { c.fillStyle = COLORS.orange; c.beginPath(); c.arc(x0 + w * 0.78, pathY, w * 0.03, 0, Math.PI * 2); c.fill(); }
  c.font = font(800, w * 0.04, FAMILY); c.fillStyle = COLORS.ink;
  c.fillText('PLAY • DISCOVER • REMEMBER', x0, h / 2 - w * 0.09);
  c.restore();
}

function bookletScene(ctx, scene, names, config, minDuration) {
  const name = names[scene.destination] || scene.destination;
  const body = scene.text ? layout(ctx, scene.text, { weight: 800, maxSize: 54, minSize: 38, maxWidth: TEXT_W, maxLines: 3, lineHeight: 1.16 }) : null;
  const duration = Math.max(minDuration, scene.seconds || 4.5);
  return {
    duration, accent: COLORS.orange, sfx: [{ name: 'whoosh', at: 0 }, { name: 'ding', at: 1.1 }],
    draw(c, t) {
      envelope(c, t, duration);
      const p = easeOutCubic(phase(t, 0, 0.6));
      const bob = Math.sin(t * 1.6) * 8;
      c.save();
      c.translate(0, (1 - p) * 140 + bob);
      drawBooklet(c, { cx: CX, cy: 700, w: 600, name, child: scene.child, t: phase(t, 0.3, 1.2) });
      c.restore();
      sticker(c, config.priceLabel || 'from €5.90', { x: SAFE.right - 120, y: 420, bg: COLORS.orange, size: 44, rotate: 0.1, p: phase(t, 0.9, 0.4) });
      if (body) drawText(c, body, { x: CX, y: 1150, ...INK, reveal: phase(t, 0.6, 0.8) });
    }
  };
}

function outroScene(ctx, post, minDuration) {
  const outro = post.outro;
  const text = layout(ctx, outro.text, { weight: 900, maxSize: 92, minSize: 54, maxWidth: TEXT_W, maxLines: 4, lineHeight: 1.08 });
  const sub = outro.sub ? layout(ctx, outro.sub, { weight: 700, maxSize: 50, minSize: 36, maxWidth: TEXT_W, maxLines: 3 }) : null;
  const duration = Math.max(minDuration, outro.seconds || clamp(1.8 + words(`${outro.text} ${outro.sub || ''}`) * 0.22, 3, 5));
  const top = 800 - text.height / 2;
  return {
    duration, accent: COLORS.orange, sfx: [{ name: 'whoosh', at: 0 }],
    draw(c, t) {
      envelope(c, t, duration);
      drawText(c, text, { x: CX, y: top, ...INK, reveal: phase(t, 0.05, 0.6) });
      let y = top + text.height + 40;
      if (sub) {
        drawText(c, sub, { x: CX, y, ...INK, color: COLORS.teal, reveal: phase(t, 0.45, 0.5) });
        y += sub.height + 50;
      }
      sticker(c, 'kidventuro.com', { x: CX, y: y + 60, bg: COLORS.orange, size: 40, rotate: 0, p: phase(t, 0.7, 0.4) });
    }
  };
}

// ---------- timeline ----------

export async function prepareAssets() {
  const destinations = await loadDestinations(repositoryRoot);
  return { names: Object.fromEntries(destinations.map((entry) => [entry.slug, entry.name])) };
}

// voice: optional array (one entry per voiceLines() line) of { path, seconds }.
export function buildScenes(post, assets, config = {}, voice = null) {
  const measure = createCanvas(W, 200).getContext('2d');
  const names = assets.names;
  const lead = 0.25;
  const need = (i) => (voice?.[i] ? voice[i].seconds + lead + 0.45 : 0);
  const scenes = [hookScene(measure, post, need(0))];
  const clues = post.scenes.filter((scene) => scene.type === 'clue').length;
  let clueIndex = 0;
  post.scenes.forEach((scene, n) => {
    const min = need(n + 1);
    switch (scene.type) {
      case 'rank': scenes.push(rankScene(measure, scene, names, min)); break;
      case 'fact': scenes.push(textScene(measure, scene, names, min, post.format === 'didyouknow' ? 'Did you know?' : null)); break;
      case 'text': scenes.push(textScene(measure, scene, names, min)); break;
      case 'choice': scenes.push(choiceScene(measure, scene, min)); break;
      case 'items': scenes.push(itemsScene(measure, scene, min)); break;
      case 'claim': scenes.push(claimScene(measure, scene, min)); break;
      case 'verdict': scenes.push(verdictScene(measure, scene, min)); break;
      case 'clue': clueIndex += 1; scenes.push(clueScene(measure, scene, clueIndex, clues, min)); break;
      case 'answer': scenes.push(answerScene(measure, scene, names, min)); break;
      case 'chat': scenes.push(chatScene(measure, scene, min)); break;
      case 'booklet': scenes.push(bookletScene(measure, scene, names, config, min)); break;
      default: throw new Error(`Unknown scene type ${scene.type}`);
    }
  });
  scenes.push(outroScene(measure, post, need(post.scenes.length + 1)));
  let start = 0;
  for (const [i, scene] of scenes.entries()) {
    scene.start = start;
    if (voice?.[i]) scene.voice = { path: voice[i].path, at: start + lead };
    start += scene.duration;
  }
  return { scenes, duration: Number(start.toFixed(3)) };
}

export function frameDrawer(post, assets, timeline) {
  const confetti = makeConfetti(hashSeed(post.id));
  const { scenes, duration } = timeline;
  return (ctx, T) => {
    let index = scenes.findIndex((scene) => T < scene.start + scene.duration);
    if (index < 0) index = scenes.length - 1;
    const scene = scenes[index];
    drawBackground(ctx, T, scene.accent, confetti);
    ctx.save();
    const zoom = 1 + 0.025 * easeInOut(clamp((T - scene.start) / scene.duration));
    ctx.translate(W / 2, H * 0.45);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H * 0.45);
    scene.draw(ctx, T - scene.start);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBrand(ctx, SAFE.left - 20, 150, 0.95);
    ctx.fillStyle = rgba(COLORS.ink, 0.1);
    ctx.fillRect(0, 0, W, 12);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(0, 0, W * clamp(T / duration), 12);
  };
}

export function soundDesign(timeline, sfxFiles) {
  const cues = [];
  const voiced = timeline.scenes.some((scene) => scene.voice);
  for (const scene of timeline.scenes) {
    for (const cue of scene.sfx || []) {
      const file = sfxFiles[cue.name];
      // Under a narrator the effects step back, and the countdown ticks go.
      if (!file || (voiced && cue.name === 'tick')) continue;
      const base = cue.name === 'boom' ? 0.5 : 0.3;
      cues.push({ path: file, at: scene.start + cue.at, volume: voiced ? base * 0.6 : base });
    }
  }
  return cues.filter((cue) => cue.at < timeline.duration - 0.1);
}

export function voiceTrack(timeline) {
  return timeline.scenes.filter((scene) => scene.voice).map((scene) => scene.voice);
}

// ---------- Pinterest pin (1000 x 1500) ----------

export async function drawPin(ctx, post, assets, config = {}) {
  const width = 1000;
  const height = 1500;
  const cover = post.cover || {};
  drawBackground(ctx, 2, COLORS.orange, makeConfetti(hashSeed(post.id)), width, height);
  drawBrand(ctx, 70, 70, 1);
  const cx = width / 2;
  let y = 250;
  const kicker = (cover.kicker || post.hook.kicker || '').toUpperCase();
  if (kicker) {
    pill(ctx, kicker, { x: cx, y, family: FAMILY, size: 38, weight: 900, bg: COLORS.teal, fg: '#ffffff' });
    y += 130;
  }
  const title = layoutText(ctx, cover.title || post.hook.text, { family: FAMILY, weight: 900, maxSize: 96, minSize: 56, maxWidth: 840, maxLines: 5, lineHeight: 1.06 });
  drawText(ctx, title, { x: cx, y, ...INK });
  y += title.height + 50;
  if (cover.subtitle) {
    const sub = layoutText(ctx, cover.subtitle, { family: FAMILY, weight: 700, maxSize: 46, minSize: 34, maxWidth: 820, maxLines: 3 });
    drawText(ctx, sub, { x: cx, y, ...INK, color: COLORS.teal });
    y += sub.height + 40;
  }
  const destination = post.destination || post.scenes.find((scene) => scene.destination)?.destination;
  if (destination) {
    drawBooklet(ctx, { cx, cy: Math.min(y + 300, 1080), w: 440, name: assets.names[destination] || destination, child: null });
  }
  pill(ctx, 'kidventuro.com', { x: cx, y: 1360, family: FAMILY, size: 40, weight: 900, bg: COLORS.orange, fg: '#ffffff' });
}
