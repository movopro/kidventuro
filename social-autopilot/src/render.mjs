import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { ensureDirectory, wrapText, xmlEscape } from './utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const autopilotRoot = path.resolve(here, '..');

function textLines(lines, x, y, options = {}) {
  const {
    size = 54,
    lineHeight = Math.round(size * 1.12),
    weight = 800,
    fill = '#20312f',
    anchor = 'start',
    family = 'Arial, Helvetica, sans-serif'
  } = options;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${xmlEscape(line)}</tspan>`).join('')}</text>`;
}

function logo(x, y, scale = 1, light = false) {
  const ink = light ? '#fffdf9' : '#20312f';
  return `<g transform="translate(${x} ${y}) scale(${scale})"><rect width="62" height="62" rx="18" fill="#ff7d4d"/><text x="31" y="44" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="39" font-weight="900" fill="#fff">K</text><text x="82" y="43" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="900" fill="${ink}">Kidventuro</text></g>`;
}

function routeDecoration(width, height, colors) {
  return `<g opacity="0.95"><circle cx="${width - 150}" cy="145" r="170" fill="${colors.yellow}"/><circle cx="${width - 70}" cy="${height - 120}" r="230" fill="${colors.mint}"/><path d="M${width - 400} ${height - 460} C${width - 240} ${height - 580}, ${width - 260} ${height - 260}, ${width - 90} ${height - 370}" fill="none" stroke="${colors.teal}" stroke-width="10" stroke-linecap="round" stroke-dasharray="4 27"/><circle cx="${width - 400}" cy="${height - 460}" r="16" fill="${colors.orange}"/><path d="M${width - 112} ${height - 395} l46 20 -46 20 11 -20z" fill="${colors.orangeDark}"/></g>`;
}

function imageSvg({ width, height, headline, subhead, kicker, config, variant }) {
  const brand = config.brand;
  const headlineLines = wrapText(headline, variant === 'pinterest' ? 18 : 20, 4);
  const subheadLines = wrapText(subhead, variant === 'pinterest' ? 31 : 34, 4);
  const top = variant === 'pinterest' ? 315 : 290;
  const headlineSize = variant === 'pinterest' ? 82 : 76;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${brand.cream}"/>
    <rect x="44" y="44" width="${width - 88}" height="${height - 88}" rx="42" fill="${brand.paper}" stroke="#e8e2d8" stroke-width="3"/>
    ${routeDecoration(width, height, brand)}
    ${logo(92, 90, 0.92)}
    <rect x="92" y="220" width="${variant === 'pinterest' ? 300 : 430}" height="54" rx="27" fill="${brand.teal}"/>
    ${textLines([kicker.toUpperCase()], variant === 'pinterest' ? 242 : 307, 256, { size: variant === 'pinterest' ? 22 : 20, weight: 900, fill: '#fffdf9', anchor: 'middle' })}
    ${textLines(headlineLines, 92, top + headlineSize, { size: headlineSize, lineHeight: Math.round(headlineSize * 1.03), weight: 900 })}
    ${textLines(subheadLines, 92, top + headlineSize + headlineLines.length * Math.round(headlineSize * 1.03) + 58, { size: variant === 'pinterest' ? 35 : 32, lineHeight: 44, weight: 500, fill: brand.muted })}
    <g transform="translate(92 ${height - 210})"><rect width="440" height="82" rx="26" fill="${brand.orange}"/><text x="220" y="53" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="900" fill="#fff">Create a free preview</text></g>
    <text x="92" y="${height - 82}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="${brand.teal}">kidventuro.com</text>
  </svg>`;
}

function interactivePosterSvg({ width, height, headline, subhead, config, variant }) {
  const brand = config.brand;
  const headlineLines = wrapText(headline, variant === 'pinterest' ? 12 : 13, 3);
  const subheadLines = wrapText(subhead, variant === 'pinterest' ? 22 : 24, 2);
  const headlineSize = variant === 'pinterest' ? 108 : 104;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${brand.ink}"/>
        <stop offset="100%" stop-color="#315a54"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#heroBg)"/>
    <circle cx="${width - 80}" cy="95" r="270" fill="${brand.orange}" opacity="0.96"/>
    <circle cx="70" cy="${height - 40}" r="300" fill="${brand.teal}" opacity="0.95"/>
    <circle cx="${width - 170}" cy="${height - 170}" r="135" fill="${brand.yellow}" opacity="0.98"/>
    <path d="M70 ${height - 355} C330 ${height - 540}, 600 ${height - 270}, ${width - 70} ${height - 455}" fill="none" stroke="#fffdf9" stroke-width="10" stroke-linecap="round" stroke-dasharray="6 30" opacity="0.8"/>
    ${logo(70, 65, 0.92, true)}
    <g transform="translate(70 195)"><rect width="390" height="76" rx="38" fill="${brand.yellow}"/><text x="195" y="50" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="900" fill="${brand.ink}">DON'T SCROLL YET</text></g>
    <g transform="translate(70 315)"><rect width="${width - 140}" height="${Math.min(760, height - 600)}" rx="54" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/></g>
    ${textLines(headlineLines, 94, 500, { size: headlineSize, lineHeight: Math.round(headlineSize * 0.94), weight: 900, fill: brand.paper })}
    ${textLines(subheadLines, 94, 540 + headlineLines.length * Math.round(headlineSize * 0.94), { size: variant === 'pinterest' ? 42 : 40, lineHeight: 52, weight: 700, fill: '#d8e3e0' })}
    <g transform="translate(94 ${height - 265})"><rect width="${Math.min(600, width - 188)}" height="112" rx="34" fill="${brand.orange}"/><text x="${Math.min(600, width - 188) / 2}" y="72" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="37" font-weight="900" fill="#fff">PLAY → STAY FOR THE REVEAL</text></g>
    <g transform="translate(${width - 258} ${height - 108})"><circle cx="0" cy="0" r="10" fill="${brand.orange}"/><circle cx="36" cy="0" r="10" fill="#fff" opacity="0.32"/><circle cx="72" cy="0" r="10" fill="#fff" opacity="0.32"/><circle cx="108" cy="0" r="10" fill="#fff" opacity="0.32"/></g>
    <text x="70" y="${height - 70}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" fill="${brand.paper}">kidventuro.com</text>
  </svg>`;
}

function slideSvg({ width, height, slide, index, config, interactive = false }) {
  const brand = config.brand;
  if (interactive) {
    const isReveal = index === 3;
    const gradientA = [brand.ink, '#fff8ef', '#dff4ee', '#20312f'][index];
    const gradientB = ['#315a54', '#f1e5d4', '#bfe6da', '#2b7a78'][index];
    const foreground = index === 0 || isReveal ? brand.paper : brand.ink;
    const accent = [brand.orange, brand.teal, brand.orangeDark, brand.yellow][index];
    const headline = wrapText(slide.headline, index === 0 ? 11 : 12, 3);
    const body = wrapText(slide.body, 22, 2);
    const headlineSize = index === 0 ? 132 : isReveal ? 138 : 118;
    const headlineLineHeight = Math.round(headlineSize * 0.92);
    const bodyY = 690 + headline.length * headlineLineHeight;
    const pageNumber = `${index + 1}/4`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="slideBg${index}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${gradientA}"/>
          <stop offset="100%" stop-color="${gradientB}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#slideBg${index})"/>
      <circle cx="960" cy="100" r="290" fill="${accent}" opacity="0.98"/>
      <circle cx="85" cy="1810" r="330" fill="${index === 0 ? brand.teal : brand.pink}" opacity="0.92"/>
      ${isReveal ? `<circle cx="870" cy="1490" r="28" fill="${brand.orange}"/><circle cx="955" cy="1570" r="17" fill="${brand.yellow}"/><circle cx="770" cy="1615" r="22" fill="${brand.paper}"/><circle cx="900" cy="1705" r="13" fill="${brand.pink}"/>` : ''}
      ${logo(66, 64, 0.98, index === 0 || isReveal)}
      <g transform="translate(785 78)"><rect width="220" height="72" rx="36" fill="${index === 0 || isReveal ? '#ffffff' : brand.ink}" fill-opacity="${index === 0 || isReveal ? 0.14 : 0.08}"/><text x="110" y="48" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900" fill="${foreground}">${pageNumber}</text></g>
      <g transform="translate(66 292)"><rect width="${index === 0 ? 500 : 420}" height="82" rx="41" fill="${accent}"/><text x="${index === 0 ? 250 : 210}" y="54" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="900" fill="${index === 3 ? brand.ink : '#fff'}">${xmlEscape(slide.kicker.toUpperCase())}</text></g>
      <g transform="translate(50 430)"><rect width="980" height="880" rx="62" fill="#ffffff" fill-opacity="${index === 0 || isReveal ? 0.075 : 0.62}" stroke="${index === 0 || isReveal ? '#ffffff' : '#20312f'}" stroke-opacity="${index === 0 || isReveal ? 0.14 : 0.06}" stroke-width="3"/></g>
      ${textLines(headline, 82, 650, { size: headlineSize, lineHeight: headlineLineHeight, weight: 900, fill: foreground })}
      ${textLines(body, 82, bodyY, { size: 54, lineHeight: 68, weight: 800, fill: index === 0 || isReveal ? '#e6efed' : '#405b57' })}
      <g transform="translate(66 1485)">
        <rect width="600" height="132" rx="42" fill="${accent}"/>
        <text x="300" y="83" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="43" font-weight="900" fill="${index === 3 ? brand.ink : '#fff'}">${index === 0 ? 'MAKE YOUR PICK →' : index === 3 ? 'REVEAL ✦' : 'KEEP WATCHING →'}</text>
      </g>
      <g transform="translate(66 1725)"><rect width="${(width - 132) * ((index + 1) / 4)}" height="18" rx="9" fill="${accent}"/><rect x="0" y="0" width="${width - 132}" height="18" rx="9" fill="none" stroke="${foreground}" stroke-opacity="0.24" stroke-width="2"/></g>
      ${index === 0 ? `<g transform="translate(700 1425) rotate(-6)"><rect width="315" height="155" rx="42" fill="${brand.yellow}"/><text x="158" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="900" fill="${brand.ink}">ANSWER</text><text x="158" y="107" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="900" fill="${brand.ink}">IN YOUR HEAD</text></g>` : ''}
    </svg>`;
  }

  const palettes = [
    [brand.cream, brand.orange, brand.ink],
    [brand.mint, brand.teal, brand.ink],
    [brand.blue, brand.orangeDark, brand.ink],
    [brand.ink, brand.orange, brand.paper]
  ];
  const [background, accent, foreground] = palettes[index % palettes.length];
  const headline = wrapText(slide.headline, 16, 4);
  const body = wrapText(slide.body, 28, 4);
  const isDark = index === 3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${background}"/>
    <circle cx="900" cy="160" r="260" fill="${isDark ? '#315a54' : brand.yellow}"/>
    <circle cx="90" cy="1760" r="320" fill="${isDark ? '#2b7a78' : brand.pink}"/>
    <path d="M760 390 C980 560, 680 770, 930 920" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" stroke-dasharray="5 34"/>
    <circle cx="760" cy="390" r="21" fill="${accent}"/><path d="M908 895 l70 29 -70 29 17 -29z" fill="${accent}"/>
    ${logo(78, 80, 1.05, isDark)}
    <rect x="78" y="345" width="340" height="64" rx="32" fill="${accent}"/>
    ${textLines([slide.kicker.toUpperCase()], 248, 386, { size: 23, weight: 900, fill: '#fff', anchor: 'middle' })}
    ${textLines(headline, 78, 600, { size: 98, lineHeight: 103, weight: 900, fill: foreground })}
    ${textLines(body, 78, 600 + headline.length * 103 + 85, { size: 43, lineHeight: 57, weight: 500, fill: isDark ? '#d8e3e0' : brand.muted })}
    <g transform="translate(78 1610)"><rect width="500" height="96" rx="30" fill="${accent}"/><text x="250" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#fff">${index === 3 ? 'kidventuro.com' : `0${index + 1} / 04`}</text></g>
  </svg>`;
}

async function renderJpeg(svg, outputPath) {
  await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toFile(outputPath);
}

async function renderPng(svg, outputPath) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toFile(outputPath);
}

function runFfmpeg(argumentsList) {
  const binary = process.env.FFMPEG_PATH?.trim() || ffmpegPath;
  if (!binary) throw new Error('FFmpeg binary is unavailable');
  return new Promise((resolve, reject) => {
    const processHandle = spawn(binary, argumentsList, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    processHandle.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    processHandle.on('error', reject);
    processHandle.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-1200)}`));
    });
  });
}

export function selectAudioClip(slotKey, config) {
  const tracks = config.audio?.tracks || [];
  if (tracks.length < 2) throw new Error('At least two audio tracks are required');

  const digest = createHash('sha256').update(slotKey).digest();
  const canonicalSlot = slotKey.split('-').at(-1);
  const canonicalIndex = Object.keys(config.slots).indexOf(canonicalSlot);
  const trackIndex = canonicalIndex >= 0 ? canonicalIndex : digest.readUInt8(4) % tracks.length;

  const rangeMilliseconds = Math.max(1, Math.floor((config.audio.excerptStartRangeSeconds || 60) * 1000));
  return {
    track: tracks[trackIndex % tracks.length],
    startSeconds: (digest.readUInt32BE(0) % rangeMilliseconds) / 1000
  };
}

export async function renderAssets({ content, outputDirectory, config }) {
  await ensureDirectory(outputDirectory);
  const instagramPath = path.join(outputDirectory, 'instagram.jpg');
  const pinterestPath = path.join(outputDirectory, 'pinterest.jpg');
  const videoPath = path.join(outputDirectory, 'short-video.mp4');
  const slidePaths = [];
  const isInteractive = content.seed?.format && content.seed.format !== 'standard';

  await renderJpeg((isInteractive ? interactivePosterSvg : imageSvg)({
    width: 1080,
    height: 1350,
    headline: content.visual.instagramHeadline,
    subhead: content.visual.instagramSubhead,
    kicker: 'SCREEN-FREE FAMILY TRAVEL',
    config,
    variant: 'instagram'
  }), instagramPath);

  await renderJpeg((isInteractive ? interactivePosterSvg : imageSvg)({
    width: 1000,
    height: 1500,
    headline: content.visual.pinterestHeadline,
    subhead: content.visual.pinterestSubhead,
    kicker: 'TRAVEL WITH KIDS',
    config,
    variant: 'pinterest'
  }), pinterestPath);

  for (const [index, slide] of content.visual.slides.entries()) {
    const slidePath = path.join(outputDirectory, `slide-${index + 1}.png`);
    await renderPng(slideSvg({ width: 1080, height: 1920, slide, index, config, interactive: isInteractive }), slidePath);
    slidePaths.push(slidePath);
  }

  const concatPath = path.join(outputDirectory, 'slides.txt');
  const escapePath = (value) => value.replaceAll("'", "'\\''");
  const interactiveDurations = [4.4, 3.8, 3.8, 4.2];
  const standardDuration = Number(config.audio?.slideDurationSeconds) || 3.2;
  const slideDurations = slidePaths.map((_, index) => isInteractive ? interactiveDurations[index] : standardDuration);
  const concat = slidePaths
    .flatMap((slidePath, index) => [`file '${escapePath(slidePath)}'`, `duration ${slideDurations[index]}`])
    .concat(`file '${escapePath(slidePaths.at(-1))}'`)
    .join('\n');
  await fs.writeFile(concatPath, concat, 'utf8');
  const audioClip = selectAudioClip(content.slotKey, config);
  const audioPath = path.join(autopilotRoot, 'assets', 'audio', audioClip.track);
  await fs.access(audioPath);
  const interactiveDuration = slideDurations.reduce((sum, duration) => sum + duration, 0);
  const videoDuration = isInteractive
    ? Number(interactiveDuration.toFixed(1))
    : (Number(config.audio?.videoDurationSeconds) || Number((slidePaths.length * standardDuration).toFixed(1)));
  const fadeDuration = Math.min(config.audio.fadeSeconds || 0.6, Math.max(0.25, videoDuration / 8));
  const fadeOutStart = Math.max(0, videoDuration - fadeDuration);
  const targetLoudness = config.audio.targetLoudnessLufs || -16;
  const motionXSpeed = isInteractive ? 0.24 : 0.72;
  const motionYSpeed = isInteractive ? 0.18 : 0.48;
  const motionAmountX = isInteractive ? 10 : 32;
  const motionAmountY = isInteractive ? 16 : 54;
  await runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatPath,
    '-ss', audioClip.startSeconds.toFixed(3),
    '-stream_loop', '-1',
    '-i', audioPath,
    '-filter_complex', `[0:v]fps=30,scale=1160:2062,crop=1080:1920:x='40+${motionAmountX}*sin(t*${motionXSpeed})':y='71+${motionAmountY}*cos(t*${motionYSpeed})',setsar=1,format=yuv420p[video];[1:a]loudnorm=I=${targetLoudness}:TP=-2:LRA=7,afade=t=in:st=0:d=${fadeDuration},afade=t=out:st=${fadeOutStart}:d=${fadeDuration}[audio]`,
    '-map', '[video]',
    '-map', '[audio]',
    '-t', String(videoDuration),
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '24',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '48000',
    '-movflags', '+faststart',
    videoPath
  ]);

  return { instagramPath, pinterestPath, videoPath, slidePaths, audioClip };
}
