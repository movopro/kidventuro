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
  const headlineLines = wrapText(headline, variant === 'pinterest' ? 14 : 15, 3);
  const subheadLines = wrapText(subhead, variant === 'pinterest' ? 24 : 27, 3);
  const headlineSize = variant === 'pinterest' ? 100 : 94;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${brand.ink}"/>
    <circle cx="${width - 75}" cy="120" r="250" fill="${brand.orange}"/>
    <circle cx="110" cy="${height - 80}" r="270" fill="${brand.teal}"/>
    <circle cx="${width - 180}" cy="${height - 220}" r="120" fill="${brand.yellow}" opacity="0.95"/>
    <path d="M90 ${height - 350} C310 ${height - 520}, 570 ${height - 260}, ${width - 100} ${height - 430}" fill="none" stroke="${brand.paper}" stroke-width="9" stroke-linecap="round" stroke-dasharray="5 26" opacity="0.9"/>
    ${logo(74, 70, 0.9, true)}
    <g transform="translate(74 210)"><rect width="330" height="68" rx="34" fill="${brand.yellow}"/><text x="165" y="45" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="900" fill="${brand.ink}">STOP & PLAY</text></g>
    ${textLines(headlineLines, 74, 440, { size: headlineSize, lineHeight: Math.round(headlineSize * 0.98), weight: 900, fill: brand.paper })}
    ${textLines(subheadLines, 74, 470 + headlineLines.length * Math.round(headlineSize * 0.98), { size: variant === 'pinterest' ? 40 : 36, lineHeight: 50, weight: 600, fill: '#d8e3e0' })}
    <g transform="translate(74 ${height - 260})"><rect width="${Math.min(560, width - 148)}" height="102" rx="32" fill="${brand.orange}"/><text x="${Math.min(560, width - 148) / 2}" y="66" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#fff">Can you get it right?</text></g>
    <text x="74" y="${height - 78}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" fill="${brand.paper}">kidventuro.com</text>
  </svg>`;
}

function slideSvg({ width, height, slide, index, config, interactive = false }) {
  const brand = config.brand;
  if (interactive) {
    const isReveal = index === 3;
    const backgrounds = [brand.ink, brand.cream, brand.mint, brand.teal];
    const foreground = index === 0 || isReveal ? brand.paper : brand.ink;
    const accent = [brand.orange, brand.teal, brand.orangeDark, brand.yellow][index];
    const headline = wrapText(slide.headline, 14, 3);
    const body = wrapText(slide.body, 25, 3);
    const headlineSize = index === 0 ? 112 : 98;
    const bodyY = 670 + headline.length * Math.round(headlineSize * 0.98);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${backgrounds[index]}"/>
      <circle cx="950" cy="120" r="270" fill="${accent}" opacity="0.98"/>
      <circle cx="90" cy="1780" r="310" fill="${index === 0 ? brand.teal : brand.pink}" opacity="0.95"/>
      <path d="M735 340 C990 520, 680 760, 940 940" fill="none" stroke="${index === 0 ? brand.paper : accent}" stroke-width="12" stroke-linecap="round" stroke-dasharray="6 31" opacity="0.9"/>
      ${logo(70, 72, 1.0, index === 0 || isReveal)}
      <g transform="translate(70 310)"><rect width="390" height="72" rx="36" fill="${accent}"/><text x="195" y="47" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900" fill="${index === 3 ? brand.ink : '#fff'}">${xmlEscape(slide.kicker.toUpperCase())}</text></g>
      ${textLines(headline, 70, 560, { size: headlineSize, lineHeight: Math.round(headlineSize * 0.98), weight: 900, fill: foreground })}
      ${textLines(body, 70, bodyY, { size: 43, lineHeight: 57, weight: 600, fill: index === 0 || isReveal ? '#d8e3e0' : brand.muted })}
      <g transform="translate(70 1565)">
        <rect width="470" height="108" rx="34" fill="${accent}"/>
        <text x="235" y="69" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="900" fill="${index === 3 ? brand.ink : '#fff'}">${index === 0 ? 'PLAY →' : index === 3 ? 'SEE MORE →' : `0${index + 1} / 04`}</text>
      </g>
      ${index === 0 ? `<g transform="translate(650 1450) rotate(-7)"><rect width="300" height="140" rx="36" fill="${brand.yellow}"/><text x="150" y="58" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900" fill="${brand.ink}">DON'T</text><text x="150" y="100" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900" fill="${brand.ink}">SCROLL YET</text></g>` : ''}
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
  const interactiveDurations = [2.8, 2.3, 2.3, 2.6];
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
  const motionXSpeed = isInteractive ? 0.56 : 0.72;
  const motionYSpeed = isInteractive ? 0.42 : 0.48;
  const motionAmountX = isInteractive ? 20 : 32;
  const motionAmountY = isInteractive ? 34 : 54;
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
