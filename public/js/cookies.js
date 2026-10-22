// Illustrated cookies for the cart box: one shared style, flavor-specific colors/toppings.
const R = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const blobPath = (cx, cy, r, bumps, amp, seed) => {
  const rnd = R(seed), n = 28, pts = [];
  const ph = Array.from({ length: bumps }, () => rnd() * 6.28);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + ph.reduce((s, p, k) => s + Math.sin(a * (k + 2) + p) * amp / (k + 1), 0));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.96]);
  }
  // smooth closed curve through points (Catmull-Rom → Bézier)
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
};
const SPOTS = [[34, 36, 7], [60, 30, 6], [70, 54, 7.5], [44, 60, 8], [26, 56, 5.5], [56, 72, 6], [50, 45, 5], [74, 38, 4.5], [36, 76, 4.5], [64, 64, 4]];
const FLAVORS = {
  'brown-butter': { dough: ['#e2a868', '#b8763b', '#8d5426'], chunks: ['choc'], salt: true },
  'white-choco-oreo': { dough: ['#e6b979', '#c28a4c', '#946130'], chunks: ['oreo', 'white', 'oreo'] },
  'birthday-bomb': { dough: ['#f3d6a2', '#dcb377', '#b88a50'], chunks: ['white'], sprinkles: true },
  'red-velvet': { dough: ['#c2403f', '#952326', '#6b1519'], chunks: ['white'], crumbs: '#b8393a' },
};
function chunk(kind, x, y, r, i) {
  const p = blobPath(x, y, r, 3, 0.16, 7 + i * 13);
  const col = { choc: ['#5a3220', '#3a1d10'], oreo: ['#3a3134', '#1d1719'], white: ['#fffaf0', '#eadfc8'] }[kind];
  const hl = kind === 'white' ? '#ffffff' : 'rgba(255,255,255,.35)';
  return `<path d="${p}" fill="${col[0]}" stroke="${col[1]}" stroke-width="1.4"/>` +
    `<ellipse cx="${(x - r * .3).toFixed(1)}" cy="${(y - r * .35).toFixed(1)}" rx="${(r * .38).toFixed(1)}" ry="${(r * .22).toFixed(1)}" fill="${hl}" opacity="${kind === 'white' ? .9 : .55}" transform="rotate(-25 ${x} ${y})"/>` +
    (kind === 'oreo' ? `<circle cx="${(x + r * .25).toFixed(1)}" cy="${(y + r * .2).toFixed(1)}" r="${(r * .18).toFixed(1)}" fill="#f4eee4" opacity=".8"/>` : '');
}
export function cookieSVG(pid) {
  const f = FLAVORS[pid] || FLAVORS['brown-butter'];
  const id = 'ck' + pid.replace(/[^a-z]/g, '');
  const body = blobPath(50, 52, 42, 4, 0.02, 3), top = blobPath(48, 48, 36, 4, 0.05, 11);
  let s = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="${f.dough[0]}"/><stop offset=".7" stop-color="${f.dough[1]}"/><stop offset="1" stop-color="${f.dough[2]}"/></radialGradient></defs>`;
  s += `<path d="${body}" fill="${f.dough[2]}"/>`;
  s += `<path d="${blobPath(49, 50, 41, 4, 0.02, 3)}" fill="url(#${id})"/>`;
  s += `<path d="${top}" fill="${f.dough[0]}" opacity=".35"/>`;
  // baked cracks
  s += `<g fill="none" stroke="${f.dough[2]}" stroke-width="1.6" stroke-linecap="round" opacity=".45"><path d="M30 44q8-6 16-2"/><path d="M54 50q6 6 14 4"/><path d="M38 68q6-4 12 0"/><path d="M62 34q4 4 2 9"/></g>`;
  if (f.sprinkles) {
    const c = ['#ef5d7a', '#ffcb3d', '#4f9de8', '#5cc27a', '#b07ce6', '#ff8c3a'];
    const rnd = R(5);
    for (let i = 0; i < 22; i++) {
      const a = rnd() * 6.28, r = 6 + rnd() * 30, x = 49 + Math.cos(a) * r, y = 50 + Math.sin(a) * r;
      s += `<rect x="${(x - 3.5).toFixed(1)}" y="${(y - 1.2).toFixed(1)}" width="7" height="2.4" rx="1.2" fill="${c[i % c.length]}" transform="rotate(${(rnd() * 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
  }
  SPOTS.forEach(([x, y, r], i) => { s += chunk(f.chunks[i % f.chunks.length], x, y, r, i); });
  if (f.salt) [[42, 34], [66, 44], [30, 64], [56, 60], [48, 78]].forEach(([x, y], i) => { s += `<rect x="${x}" y="${y}" width="3" height="3" rx=".6" fill="#fff" opacity=".9" transform="rotate(${i * 30} ${x} ${y})"/>`; });
  return s + '</svg>';
}
export function barSVG(pid) {
  const bis = pid === 'biscoff-revel';
  const fudge = bis ? ['#a8642b', '#7a4318'] : ['#4a2616', '#2b140a'];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
  <rect x="10" y="18" width="80" height="68" rx="9" fill="#a8743f"/>
  <rect x="10" y="14" width="80" height="66" rx="9" fill="#e0b273"/>
  <rect x="10" y="40" width="80" height="16" fill="${fudge[0]}"/>
  <path d="M10 40q10 6 20 0t20 0 20 0 20 0v4H10Z" fill="${fudge[1]}" opacity=".5"/>
  <g fill="#c8935a">${[[22, 24], [40, 22], [60, 26], [76, 22], [30, 66], [52, 70], [72, 64]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" />`).join('')}</g>
  <g fill="#f1cf98" opacity=".9">${[[30, 28], [66, 30], [44, 68], [80, 70]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.5" ry="2"/>`).join('')}</g>
  <path d="M18 46q14 6 26 0" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${bis ? '<g fill="#c47a35" stroke="#8a4b1c" stroke-width="1"><rect x="26" y="8" width="20" height="13" rx="3" transform="rotate(-8 36 14)"/><rect x="56" y="8" width="20" height="13" rx="3" transform="rotate(10 66 14)"/></g>' : ''}
</svg>`;
}
