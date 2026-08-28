import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { ensureDirectory, wrapText, xmlEscape } from './utils.mjs';

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

function slideSvg({ width, height, slide, index, config }) {
  const brand = config.brand;
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

export async function renderAssets({ content, outputDirectory, config }) {
  await ensureDirectory(outputDirectory);
  const instagramPath = path.join(outputDirectory, 'instagram.jpg');
  const pinterestPath = path.join(outputDirectory, 'pinterest.jpg');
  const videoPath = path.join(outputDirectory, 'short-video.mp4');
  const slidePaths = [];

  await renderJpeg(imageSvg({
    width: 1080,
    height: 1350,
    headline: content.visual.instagramHeadline,
    subhead: content.visual.instagramSubhead,
    kicker: 'SCREEN-FREE FAMILY TRAVEL',
    config,
    variant: 'instagram'
  }), instagramPath);

  await renderJpeg(imageSvg({
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
    await renderPng(slideSvg({ width: 1080, height: 1920, slide, index, config }), slidePath);
    slidePaths.push(slidePath);
  }

  const concatPath = path.join(outputDirectory, 'slides.txt');
  const escapePath = (value) => value.replaceAll("'", "'\\''");
  const concat = slidePaths.flatMap((slidePath) => [`file '${escapePath(slidePath)}'`, 'duration 2.2']).concat(`file '${escapePath(slidePaths.at(-1))}'`).join('\n');
  await fs.writeFile(concatPath, concat, 'utf8');
  await runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatPath,
    '-vf', 'fps=30,format=yuv420p',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '24',
    '-movflags', '+faststart',
    '-an',
    videoPath
  ]);

  return { instagramPath, pinterestPath, videoPath, slidePaths };
}
