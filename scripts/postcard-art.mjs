// Deterministic flat postcard illustration per destination (scene + slug), shared by build-family-guides.mjs (the guide
// page art, assets/destinations/<slug>.svg) and the social cards (scripts/social-cards). Pure functions, no I/O.
const esc = v => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const hash = s =>[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// ---------- Postcard illustration (consistent flat style, deterministic per slug) ----------
export const PALETTES = {
  snow: ['#dfeaf3', '#b9cfe2', '#7f9cb8', '#f7fbff', '#2f5d50'],
  mountains: ['#fde9cf', '#bcd7c4', '#6f9a83', '#f4f1ea', '#35594a'],
  coast: ['#ffe6c9', '#9fd3d6', '#3f8f9b', '#f3d9a8', '#c8553d'],
  island: ['#ffe2bf', '#8fd0c8', '#2f8f8a', '#f2d29b', '#3d7a4a'],
  city: ['#fde3cc', '#f2b78f', '#c06b4a', '#fff4e6', '#5b4a63'],
  canals: ['#fbe4d1', '#a9cfd8', '#4f8ea0', '#f5ecdf', '#b5523b'],
  temple: ['#fde0c4', '#f0a986', '#b84a3a', '#fff1df', '#6b3f3a'],
  desert: ['#fde4bf', '#f2c48a', '#d18a4a', '#fff3dc', '#8a4b2a'],
  jungle: ['#e9f0d6', '#a9cf9a', '#4f8a5b', '#f7f3e3', '#2f5d3f'],
  lake: ['#e8eef6', '#b8d3e3', '#5f8fb0', '#f6f3ec', '#3e6a58']
};
export function postcard(g) {
  const [sky, mid, deep, light, accent] = PALETTES[g.scene] || PALETTES.city;
  const r = rng(hash(g.slug));
  const W = 1200, H = 675, horizon = 470;
  const parts = [];
  const sunX = 180 + Math.round(r() * 840), sunY = 120 + Math.round(r() * 80);
  parts.push(`<circle cx="${sunX}" cy="${sunY}" r="${g.scene === 'snow' ? 46 : 58}" fill="${g.scene === 'snow' ? '#fff' : '#ffd27a'}" opacity=".95"/>`);
  const ridge = (base, amp, color, n) => {
    let d = `M0 ${H} L0 ${base}`;
    for (let i = 0; i <= n; i++) d += ` L${Math.round(i * W / n)} ${Math.round(base - amp * (0.35 + r() * 0.65))}`;
    return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
  };
  const water = c => `<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${c}"/>` +
    [0, 1, 2, 3].map(i => `<path d="M${80 + i * 270} ${horizon + 40 + i * 32} q30 -14 60 0 t60 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`).join('');
  const skyline = (base, color, count, maxH) => {
    let x = 60, out = '';
    for (let i = 0; i < count && x < W - 60; i++) {
      const w = 50 + Math.round(r() * 70), h = 80 + Math.round(r() * maxH);
      out += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" rx="4" fill="${color}"/>`;
      for (let wy = base - h + 18; wy < base - 24; wy += 30) for (let wx = x + 12; wx < x + w - 14; wx += 22) if (r() > 0.35) out += `<rect x="${wx}" y="${wy}" width="9" height="13" fill="${light}" opacity=".85"/>`;
      if (r() > 0.7) out += `<path d="M${x} ${base - h} L${x + w / 2} ${base - h - 34} L${x + w} ${base - h} Z" fill="${color}"/>`;
      x += w + 10 + Math.round(r() * 26);
    }
    return out;
  };
  const tree = (x, y, s, c) => `<path d="M${x} ${y - 90 * s} L${x - 34 * s} ${y} L${x + 34 * s} ${y} Z" fill="${c}"/><rect x="${x - 5 * s}" y="${y}" width="${10 * s}" height="${16 * s}" fill="#6b4f3a"/>`;
  const palm = (x, y) => `<path d="M${x} ${y} q8 -70 -6 -130" stroke="#7a5a3a" stroke-width="10" fill="none"/>` +
    [-1, 1].flatMap(d => [0, 1]).map((_, i) => `<path d="M${x - 6} ${y - 130} q${[-70, 70, -50, 60][i]} ${[-10, -6, 30, 34][i]} ${[-110, 110, -90, 96][i]} ${[30, 36, 60, 70][i]}" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>`).join('');
  switch (g.scene) {
    case 'snow':
      parts.push(ridge(330, 170, mid, 6), ridge(400, 120, deep, 9));
      parts.push(`<rect x="0" y="${horizon - 20}" width="${W}" height="${H - horizon + 20}" fill="${light}"/>`);
      for (let i = 0; i < 9; i++) parts.push(tree(70 + i * 130 + r() * 40, horizon + 10 + r() * 30, 0.8 + r() * 0.5, accent));
      for (let i = 0; i < 40; i++) parts.push(`<circle cx="${Math.round(r() * W)}" cy="${Math.round(r() * horizon)}" r="${2 + Math.round(r() * 4)}" fill="#fff" opacity=".9"/>`);
      break;
    case 'mountains':
      parts.push(ridge(300, 200, mid, 5), ridge(380, 140, deep, 7));
      parts.push(`<path d="M0 ${horizon} q300 -40 600 0 t600 0 V${H} H0 Z" fill="${light}"/>`);
      for (let i = 0; i < 6; i++) parts.push(tree(100 + i * 190 + r() * 50, horizon + 40, 0.9, accent));
      break;
    case 'coast':
      parts.push(ridge(410, 120, mid, 8), water(deep));
      parts.push(`<path d="M${W - 360} ${horizon} q120 -150 360 -180 V${horizon} Z" fill="${light}"/>`);
      parts.push(`<path d="M300 ${horizon + 70} h120 l-20 26 h-80 Z" fill="${accent}"/><path d="M360 ${horizon + 68} V${horizon - 30} l50 80 Z" fill="#fff"/>`);
      break;
    case 'island':
      parts.push(water(deep));
      parts.push(`<ellipse cx="${W / 2}" cy="${horizon + 20}" rx="330" ry="70" fill="${light}"/>`);
      parts.push(`<path d="M${W / 2 - 220} ${horizon + 6} q220 -190 440 0 Z" fill="${mid}"/>`);
      parts.push(palm(W / 2 + 200, horizon + 10), palm(W / 2 - 240, horizon + 16));
      break;
    case 'canals':
      parts.push(water(mid));
      { let x = 40; while (x < W - 40) { const w = 70 + Math.round(r() * 40), h = 170 + Math.round(r() * 110); const c = [accent, deep, '#d9a441', '#7f6a93'][Math.floor(r() * 4)];
        parts.push(`<path d="M${x} ${horizon} V${horizon - h} l${w / 2} -46 l${w / 2} 46 V${horizon} Z" fill="${c}"/>`);
        for (let wy = horizon - h + 20; wy < horizon - 30; wy += 46) parts.push(`<rect x="${x + 14}" y="${wy}" width="${w - 28}" height="22" fill="${light}" opacity=".9"/>`);
        x += w + 6; } }
      parts.push(`<path d="M380 ${horizon + 80} q220 -110 440 0" stroke="${light}" stroke-width="26" fill="none"/>`);
      break;
    case 'temple':
      parts.push(ridge(390, 130, mid, 6));
      parts.push(`<rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" fill="${light}"/>`);
      { const cx = W / 2 + Math.round((r() - 0.5) * 300); for (let t = 0; t < 4; t++) { const w = 260 - t * 50, y = horizon - t * 70;
        parts.push(`<rect x="${cx - w / 2 + 20}" y="${y - 52}" width="${w - 40}" height="52" fill="${accent}"/><path d="M${cx - w / 2 - 20} ${y - 52} q${w / 2 + 20} -36 ${w + 40} 0 Z" fill="${deep}"/>`); }
        parts.push(`<rect x="${cx - 4}" y="${horizon - 330}" width="8" height="60" fill="${deep}"/>`); }
      break;
    case 'desert':
      parts.push(`<path d="M0 ${horizon - 30} q300 -90 600 -10 t600 -20 V${H} H0 Z" fill="${mid}"/><path d="M0 ${horizon + 40} q400 -70 800 0 t400 -10 V${H} H0 Z" fill="${deep}"/>`);
      break;
    case 'jungle':
      parts.push(`<path d="M${W / 2 - 300} ${horizon} L${W / 2 - 40} ${180} h80 L${W / 2 + 300} ${horizon} Z" fill="${deep}"/><path d="M${W / 2 - 40} 180 q40 -60 80 0" fill="#9aa39a" opacity=".6"/>`);
      for (let i = 0; i < 14; i++) parts.push(`<ellipse cx="${Math.round(r() * W)}" cy="${horizon + 20 + Math.round(r() * 120)}" rx="${90 + Math.round(r() * 80)}" ry="${50 + Math.round(r() * 30)}" fill="${[mid, accent, '#6fae6a'][i % 3]}"/>`);
      break;
    case 'lake':
      parts.push(ridge(360, 150, mid, 6), water(deep));
      parts.push(`<path d="M520 ${horizon + 90} h140 l-24 26 h-92 Z" fill="${accent}"/>`);
      break;
    default: // city
      parts.push(skyline(horizon, mid, 16, 160), skyline(horizon + 10, deep, 14, 120));
      parts.push(`<rect x="0" y="${horizon + 10}" width="${W}" height="${H - horizon}" fill="${light}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t"><title id="t">${esc(g.name)} illustration</title>` +
    `<rect width="${W}" height="${H}" fill="${sky}"/>${parts.join('')}` +
    `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="26" fill="none" stroke="#fff" stroke-width="10" stroke-dasharray="2 18" stroke-linecap="round"/></svg>\n`;
}
