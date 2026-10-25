/**
 * cityRenderer.ts
 * -----------------------------------------------------------------------------
 * Renderer isometrik untuk distrik regional (kavling perusahaan lain, SuperMart,
 * Stasiun, taman, dan lahan rumput distrik).
 *
 * Semua objek digambar dengan primitif isometrik 3D yang benar (kotak, silinder,
 * bidang dinding) dan diurutkan per kedalaman (painter's algorithm: x + z),
 * sehingga tidak ada lagi furnitur "datar" berbentuk persegi layar.
 *
 * Konvensi proyeksi (sama dengan IsometricOffice):
 *   isoX = (x - z) * 30 * zoom,  isoY = (x + z) * 16 * zoom
 *   Penonton melihat dari arah +x +z, jadi sisi yang terlihat dari sebuah kotak
 *   adalah sisi +z (kiri-depan), sisi +x (kanan-depan), dan atas.
 *   Tinggi (h) dinyatakan dalam piksel pada zoom 1.
 */
import type { OfficeLayoutTemplateId } from '@/types/office';

// =============================================================================
// TYPES
// =============================================================================
export interface IsoCtx {
  ctx: CanvasRenderingContext2D;
  toIso: (x: number, z: number) => { isoX: number; isoY: number };
  zoom: number;
  t: number;
  labelQueue?: Array<() => void>;
}

interface Pt {
  x: number;
  y: number;
}

export interface KavlingEmployeeLike {
  id: string;
  name?: string;
  role?: string;
  avatarColor: string;
  hairColor: string;
  wx: number;
  wz: number;
  state: 'working' | 'meeting' | 'coffee' | 'walking';
}

export interface KavlingLike {
  id: string;
  name: string;
  shortName: string;
  ownerName: string;
  level: number;
  badgeIcon: string;
  layoutTemplate: OfficeLayoutTemplateId;
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  employees: KavlingEmployeeLike[];
  isEmptyLot?: boolean;
  plotLabel?: string;
}

/** Geometri kavling yang sudah dihitung. */
interface Geo {
  cx: number;
  cz: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** true bila pintu masuk berada di sisi z0 (baris selatan, menghadap jalan di utara) */
  entranceAtBack: boolean;
  primary: string;
  secondary: string;
  accent: string;
}

// =============================================================================
// DISTRICT LAYOUT (Satu sumber kebenaran untuk koordinat kota)
// =============================================================================
export const DISTRICT = {
  minX: -108,
  maxX: 108,
  minZ: -25,
  maxZ: 62,
  roadMinX: -108,
  roadMaxX: 108,
  northRowZ: -1.0,
  southRowZ: 39.5,
  plotHalfW: 16.5,
  plotHalfD: 11.0,
  supermart: { cx: -84, cz: -1.0 },
  station: { cx: 84, cz: -1.0 },
  parkWest: { cx: -84, cz: 39.5 },
  parkEast: { cx: 84, cz: 39.5 },
  crosswalks: [-84, -42, 0, 42, 84],
};

// =============================================================================
// COLOR + LOW LEVEL HELPERS
// =============================================================================
const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** f < 1 menggelapkan, f > 1 mencerahkan. */
export const shade = (hex: string, f: number): string => {
  if (!hex.startsWith('#')) return hex;
  let [r, g, b] = hexToRgb(hex);
  if (f >= 1) {
    const k = Math.min(1, f - 1);
    r += (255 - r) * k;
    g += (255 - g) * k;
    b += (255 - b) * k;
  } else {
    r *= f;
    g *= f;
    b *= f;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
};

export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** Hash deterministik kecil untuk pola acak yang stabil antar frame. */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const P = (c: IsoCtx, x: number, z: number, h = 0): Pt => {
  const p = c.toIso(x, z);
  return { x: p.isoX, y: p.isoY - h * c.zoom };
};

const poly = (c: IsoCtx, pts: Pt[], fill?: string | CanvasGradient, stroke?: string, lw = 1) => {
  const { ctx } = c;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
};

const line = (c: IsoCtx, a: Pt, b: Pt, color: string, lw: number) => {
  const { ctx } = c;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};

// =============================================================================
// ISOMETRIC PRIMITIVES
// =============================================================================
export interface BoxOpts {
  elev?: number;
  top?: string;
  left?: string;
  right?: string;
  stroke?: string | null;
  alpha?: number;
}

/** Kotak isometrik 3D. (x, z) adalah titik tengah, w = lebar sumbu x, d = sumbu z. */
export const isoBox = (c: IsoCtx, x: number, z: number, w: number, d: number, h: number, color: string, o: BoxOpts = {}) => {
  const e = o.elev ?? 0;
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const z0 = z - d / 2;
  const z1 = z + d / 2;
  const st = o.stroke === null ? undefined : o.stroke ?? 'rgba(15,23,42,0.22)';
  const lw = Math.max(0.5, 0.7 * c.zoom);
  if (o.alpha !== undefined) {
    c.ctx.save();
    c.ctx.globalAlpha = o.alpha;
  }
  poly(c, [P(c, x0, z1, e), P(c, x1, z1, e), P(c, x1, z1, e + h), P(c, x0, z1, e + h)], o.left ?? shade(color, 0.84), st, lw);
  poly(c, [P(c, x1, z0, e), P(c, x1, z1, e), P(c, x1, z1, e + h), P(c, x1, z0, e + h)], o.right ?? shade(color, 0.68), st, lw);
  poly(c, [P(c, x0, z0, e + h), P(c, x1, z0, e + h), P(c, x1, z1, e + h), P(c, x0, z1, e + h)], o.top ?? color, st, lw);
  if (o.alpha !== undefined) c.ctx.restore();
};

/** Persegi panjang di bidang vertikal z = konstan (sisi +z terlihat). */
export const faceZ = (c: IsoCtx, xa: number, xb: number, z: number, ha: number, hb: number, fill: string, stroke?: string) =>
  poly(c, [P(c, xa, z, ha), P(c, xb, z, ha), P(c, xb, z, hb), P(c, xa, z, hb)], fill, stroke, Math.max(0.5, 0.7 * c.zoom));

/** Persegi panjang di bidang vertikal x = konstan (sisi +x terlihat). */
export const faceX = (c: IsoCtx, x: number, za: number, zb: number, ha: number, hb: number, fill: string, stroke?: string) =>
  poly(c, [P(c, x, za, ha), P(c, x, zb, ha), P(c, x, zb, hb), P(c, x, za, hb)], fill, stroke, Math.max(0.5, 0.7 * c.zoom));

/** Lantai / area datar. */
export const isoRect = (c: IsoCtx, x0: number, z0: number, x1: number, z1: number, fill?: string, stroke?: string, elev = 0) =>
  poly(c, [P(c, x0, z0, elev), P(c, x1, z0, elev), P(c, x1, z1, elev), P(c, x0, z1, elev)], fill, stroke, Math.max(0.6, 1 * c.zoom));

/** Elips lantai (lingkaran dunia yang diproyeksikan). */
export const isoEllipse = (c: IsoCtx, x: number, z: number, r: number, fill: string, elev = 0, stroke?: string) => {
  const p = P(c, x, z, elev);
  const { ctx } = c;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r * 42.4 * c.zoom, r * 22.6 * c.zoom, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(0.6, c.zoom);
    ctx.stroke();
  }
};

/** Silinder isometrik. */
export const isoCyl = (c: IsoCtx, x: number, z: number, r: number, h: number, color: string, elev = 0, topColor?: string) => {
  const { ctx } = c;
  const base = P(c, x, z, elev);
  const top = P(c, x, z, elev + h);
  const rx = r * 42.4 * c.zoom;
  const ry = r * 22.6 * c.zoom;
  const grad = ctx.createLinearGradient(base.x - rx, 0, base.x + rx, 0);
  grad.addColorStop(0, shade(color, 0.9));
  grad.addColorStop(0.6, shade(color, 0.75));
  grad.addColorStop(1, shade(color, 0.58));
  ctx.beginPath();
  ctx.moveTo(base.x - rx, top.y);
  ctx.lineTo(base.x - rx, base.y);
  ctx.ellipse(base.x, base.y, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(base.x + rx, top.y);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = topColor ?? color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(15,23,42,0.18)';
  ctx.lineWidth = Math.max(0.5, 0.6 * c.zoom);
  ctx.stroke();
};

const glow = (c: IsoCtx, x: number, z: number, h: number, radius: number, color: string) => {
  const p = P(c, x, z, h);
  const { ctx } = c;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * c.zoom);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius * c.zoom, 0, Math.PI * 2);
  ctx.fill();
};

// =============================================================================
// DEPTH QUEUE (painter's algorithm)
// =============================================================================
class DepthQueue {
  private items: { d: number; f: () => void }[] = [];
  add(x: number, z: number, f: () => void, bias = 0) {
    this.items.push({ d: x + z + bias, f });
  }
  flush() {
    this.items.sort((a, b) => a.d - b.d);
    for (const it of this.items) it.f();
    this.items = [];
  }
}

// =============================================================================
// REUSABLE PROPS
// =============================================================================
export const drawPerson = (
  c: IsoCtx,
  x: number,
  z: number,
  body: string,
  hair: string,
  o: { seated?: boolean; back?: boolean; bob?: number; cup?: boolean; skin?: string } = {}
) => {
  const { ctx } = c;
  const s = c.zoom;
  const p = P(c, x, z, 0);
  const bob = (o.bob ?? 0) * s;
  const lift = o.seated ? 4 * s : 0;
  const skin = o.skin ?? '#f5cfa5';

  // Ground shadow proportional to chibi body
  ctx.fillStyle = 'rgba(15,23,42,0.22)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 10 * s, 4.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!o.seated) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(p.x - 4.5 * s, p.y - 10 * s, 3.6 * s, 10 * s);
    ctx.fillRect(p.x + 0.9 * s, p.y - 10 * s, 3.6 * s, 10 * s);
    // Shoes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(p.x - 2.7 * s, p.y - 1 * s, 2.8 * s, 1.6 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + 2.7 * s, p.y - 1 * s, 2.8 * s, 1.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const by = p.y - 22 * s - lift + bob;
  // Torso / Shirt
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(p.x - 7.5 * s, by, 15 * s, 13 * s, 4 * s);
  ctx.fill();
  ctx.fillStyle = shade(body, 0.82);
  ctx.fillRect(p.x - 7.5 * s, by + 10 * s, 15 * s, 2 * s);

  // White collar
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(p.x - 2.8 * s, by);
  ctx.lineTo(p.x, by + 3.2 * s);
  ctx.lineTo(p.x + 2.8 * s, by);
  ctx.closePath();
  ctx.fill();

  // Head
  const hy = by - 7.5 * s;
  ctx.fillStyle = o.back ? hair : skin;
  ctx.beginPath();
  ctx.arc(p.x, hy, 7.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(p.x, hy - 1.2 * s, 7.8 * s, Math.PI * 0.9, Math.PI * 2.1);
  ctx.fill();

  if (!o.back) {
    // Cheeks
    ctx.fillStyle = 'rgba(255, 120, 140, 0.42)';
    ctx.beginPath();
    ctx.ellipse(p.x - 4.2 * s, hy + 2.2 * s, 2 * s, 1.4 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + 4.2 * s, hy + 2.2 * s, 2 * s, 1.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(p.x - 2.8 * s, hy + 0.5 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.arc(p.x + 2.8 * s, hy + 0.5 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x - 3.2 * s, hy + 0.1 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.arc(p.x + 2.4 * s, hy + 0.1 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.cup) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x + 5.5 * s, by + 3 * s, 3.8 * s, 4.5 * s);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(p.x + 5.5 * s, by + 3 * s, 3.8 * s, 1.3 * s);
  }
};

export const drawEmployeeTag = (
  c: IsoCtx,
  x: number,
  z: number,
  name: string,
  role?: string,
  seated = false
) => {
  if (c.zoom < 0.6) return;
  const { ctx } = c;
  const p = P(c, x, z, seated ? 40 : 46);
  const firstName = (name || 'Agent').split(' ')[0];
  const isFemale = ['siti', 'maya', 'dewi', 'putri', 'anisa', 'nadia', 'rachel', 'clarissa', 'salsa', 'elena'].some(
    (fn) => (name || '').toLowerCase().includes(fn)
  );

  let roleEmoji = '💻';
  const r = (role || '').toLowerCase();
  if (r.includes('lead') || r.includes('founder') || r.includes('architect') || r.includes('principal')) roleEmoji = '📋';
  else if (r.includes('design') || r.includes('creative') || r.includes('art') || r.includes('ui')) roleEmoji = '🎨';
  else if (r.includes('security') || r.includes('sre') || r.includes('mesh')) roleEmoji = '🛡️';
  else if (r.includes('devops') || r.includes('cloud') || r.includes('hardware')) roleEmoji = '⚡';
  else if (r.includes('trader') || r.includes('quant') || r.includes('analyst')) roleEmoji = '📊';

  const genderSymbol = isFemale ? '♀' : '♂';
  const tagText = `${firstName} ${genderSymbol}`;
  ctx.font = `bold ${Math.round(8.5 * c.zoom)}px sans-serif`;
  const textW = ctx.measureText(tagText).width;
  const pillW = textW + 18 * c.zoom;
  const pillH = 14 * c.zoom;
  const pillY = p.y - 14 * c.zoom;

  // Soft drop shadow
  ctx.fillStyle = 'rgba(40, 25, 15, 0.14)';
  ctx.beginPath();
  ctx.roundRect(p.x - pillW / 2, pillY + 1.5, pillW, pillH, 6 * c.zoom);
  ctx.fill();

  // White clean pill
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2d5c3';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(p.x - pillW / 2, pillY, pillW, pillH, 6 * c.zoom);
  ctx.fill();
  ctx.stroke();

  // Employee name text
  ctx.fillStyle = isFemale ? '#831843' : '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, p.x - pillW / 2 + 5 * c.zoom, pillY + pillH / 2);

  // Role emoji icon
  ctx.font = `${Math.round(8 * c.zoom)}px sans-serif`;
  ctx.fillText(roleEmoji, p.x + pillW / 2 - 11 * c.zoom, pillY + pillH / 2);
};

export const drawPlant = (c: IsoCtx, x: number, z: number, size = 1, pot = '#c2703d', leaf = '#2f9e44') => {
  const { ctx } = c;
  isoCyl(c, x, z, 0.32 * size, 8 * size, pot, 0, shade(pot, 0.7));
  const p = P(c, x, z, 8 * size);
  const s = c.zoom * size;
  const sway = Math.sin(c.t * 1.4 + x * 3) * 0.8 * s;
  ctx.fillStyle = shade(leaf, 0.8);
  ctx.beginPath();
  ctx.arc(p.x - 4 * s + sway, p.y - 6 * s, 5 * s, 0, Math.PI * 2);
  ctx.arc(p.x + 4 * s + sway, p.y - 7 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(p.x + sway, p.y - 11 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(leaf, 1.25);
  ctx.beginPath();
  ctx.arc(p.x - 1.5 * s + sway, p.y - 13 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
};

export const drawTree = (c: IsoCtx, x: number, z: number, size = 1, seed = 0) => {
  const { ctx } = c;
  const s = c.zoom * size;
  const p = P(c, x, z, 0);
  const sway = Math.sin(c.t * 1.2 + seed) * 1.6 * s;
  ctx.fillStyle = 'rgba(30,60,20,0.2)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 16 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath();
  ctx.moveTo(p.x - 3 * s, p.y);
  ctx.lineTo(p.x - 2 * s, p.y - 22 * s);
  ctx.lineTo(p.x + 2 * s, p.y - 22 * s);
  ctx.lineTo(p.x + 3 * s, p.y);
  ctx.closePath();
  ctx.fill();
  const cy = p.y - 34 * s;
  ctx.fillStyle = '#3f8f3a';
  ctx.beginPath();
  ctx.arc(p.x - 9 * s + sway, cy + 4 * s, 11 * s, 0, Math.PI * 2);
  ctx.arc(p.x + 9 * s + sway, cy + 4 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#56a84a';
  ctx.beginPath();
  ctx.arc(p.x + sway, cy - 4 * s, 13 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7cc56b';
  ctx.beginPath();
  ctx.arc(p.x - 4 * s + sway, cy - 9 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
};

/** Meja kerja dengan monitor (layar menghadap +z, ke arah pekerja). */
const deskWithMonitors = (
  c: IsoCtx,
  x: number,
  z: number,
  o: { w?: number; top?: string; body?: string; screen?: string; screen2?: string; monitors?: number; frame?: string; stacked?: boolean } = {}
) => {
  const w = o.w ?? 2;
  const d = 0.95;
  const top = o.top ?? '#f8fafc';
  const body = o.body ?? shade(top, 0.75);
  isoBox(c, x, z - d / 2 + 0.06, w - 0.1, 0.1, 11, body);
  isoBox(c, x - w / 2 + 0.1, z + d / 2 - 0.1, 0.12, 0.12, 11, shade(body, 0.8), { stroke: null });
  isoBox(c, x + w / 2 - 0.1, z + d / 2 - 0.1, 0.12, 0.12, 11, shade(body, 0.8), { stroke: null });
  isoBox(c, x, z, w, d, 1.6, top, { elev: 11 });
  const n = o.monitors ?? 2;
  const frame = o.frame ?? '#111827';
  const rows = o.stacked ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      const mx = x + (i - (n - 1) / 2) * (Math.min(0.66, (w - 0.2) / n));
      const mw = Math.min(0.6, (w - 0.3) / n);
      const elev = 15 + r * 8.5;
      if (r === 0) isoBox(c, mx, z - 0.28, 0.08, 0.08, 3, '#475569', { elev: 12.6, stroke: null });
      const scr = (i + r) % 2 === 0 ? o.screen ?? '#38bdf8' : o.screen2 ?? o.screen ?? '#22d3ee';
      isoBox(c, mx, z - 0.3, mw, 0.07, 7.5, frame, { elev, left: frame });
      faceZ(c, mx - mw / 2 + 0.05, mx + mw / 2 - 0.05, z - 0.3 + 0.035, elev + 1, elev + 6.6, scr);
      // garis kode / grafik kecil di layar
      const a = P(c, mx - mw / 2 + 0.1, z - 0.26, elev + 4.5);
      const b = P(c, mx + mw / 2 - 0.15, z - 0.26, elev + 3.2);
      line(c, a, b, 'rgba(255,255,255,0.55)', Math.max(0.5, 0.6 * c.zoom));
    }
  }
  // keyboard
  isoBox(c, x, z + 0.15, Math.min(0.9, w * 0.45), 0.25, 0.6, '#e5e7eb', { elev: 12.6, stroke: null });
};

const officeChair = (c: IsoCtx, x: number, z: number, color = '#334155') => {
  isoCyl(c, x, z, 0.06, 6, '#64748b');
  isoBox(c, x, z, 0.62, 0.62, 1.6, color, { elev: 6 });
};

const stool = (c: IsoCtx, x: number, z: number, seat = '#1f2937', h = 10) => {
  isoCyl(c, x, z, 0.05, h, '#9ca3af');
  isoCyl(c, x, z, 0.26, 1.6, seat, h);
};

const sofa = (c: IsoCtx, x: number, z: number, w: number, color: string, facing: 'z' | 'x' = 'z') => {
  if (facing === 'z') {
    // sandaran di sisi z0 (belakang), dudukan menghadap +z
    isoBox(c, x, z - 0.38, w, 0.34, 13, shade(color, 0.92));
    isoBox(c, x, z + 0.12, w, 0.8, 6, color);
    isoBox(c, x - w / 2 + 0.15, z, 0.3, 1.1, 9, shade(color, 0.85));
    isoBox(c, x + w / 2 - 0.15, z, 0.3, 1.1, 9, shade(color, 0.85));
  } else {
    // sandaran di sisi x0 (kiri), dudukan menghadap +x
    isoBox(c, x - 0.38, z, 0.34, w, 13, shade(color, 0.92));
    isoBox(c, x + 0.12, z, 0.8, w, 6, color);
    isoBox(c, x, z - w / 2 + 0.15, 1.1, 0.3, 9, shade(color, 0.85));
    isoBox(c, x, z + w / 2 - 0.15, 1.1, 0.3, 9, shade(color, 0.85));
  }
};

const roundTable = (c: IsoCtx, x: number, z: number, r: number, top: string, h = 12) => {
  isoCyl(c, x, z, 0.07, h, '#374151');
  isoCyl(c, x, z, r, 1.4, top, h);
};

// =============================================================================
// SHARED KAVLING SHELL: plinth, walls, rails, sign
// =============================================================================
const plinth = (c: IsoCtx, g: Geo, floor: string, hovered: boolean, slabSide = '#c8b59e') => {
  const { ctx } = c;
  const slab = 9;
  const tl = P(c, g.x0, g.z0);
  const tr = P(c, g.x1, g.z0);
  const br = P(c, g.x1, g.z1);
  const bl = P(c, g.x0, g.z1);
  ctx.fillStyle = 'rgba(40,30,15,0.16)';
  ctx.beginPath();
  ctx.moveTo(bl.x, bl.y + (slab + 6) * c.zoom);
  ctx.lineTo(br.x, br.y + (slab + 10) * c.zoom);
  ctx.lineTo(tr.x + 8 * c.zoom, tr.y + (slab + 6) * c.zoom);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();
  poly(c, [bl, br, { x: br.x, y: br.y + slab * c.zoom }, { x: bl.x, y: bl.y + slab * c.zoom }], slabSide, 'rgba(0,0,0,0.12)');
  poly(c, [br, tr, { x: tr.x, y: tr.y + slab * c.zoom }, { x: br.x, y: br.y + slab * c.zoom }], shade(slabSide, 0.85), 'rgba(0,0,0,0.12)');
  poly(c, [tl, tr, br, bl], floor, hovered ? g.accent : 'rgba(0,0,0,0.15)', hovered ? 2.4 * c.zoom : 1);
};

const floorGrid = (c: IsoCtx, x0: number, z0: number, x1: number, z1: number, step: number, color: string, both = true) => {
  const lw = Math.max(0.5, 0.7 * c.zoom);
  for (let x = x0 + step; x < x1 - 0.01; x += step) line(c, P(c, x, z0), P(c, x, z1), color, lw);
  if (both) for (let z = z0 + step; z < z1 - 0.01; z += step) line(c, P(c, x0, z), P(c, x1, z), color, lw);
};

interface WallStyle {
  color: string;
  h: number;
  kind: 'glass' | 'brick' | 'metal' | 'plain' | 'concrete';
  trim?: string;
  window?: string;
}

/** Dinding belakang-kiri (x0) dan belakang-kanan (z0). Bila entranceAtBack, sisi z0 menjadi etalase kaca. */
const backWalls = (c: IsoCtx, g: Geo, ws: WallStyle) => {
  const t = 0.3;
  const lw = Math.max(0.5, 0.6 * c.zoom);
  const decorate = (side: 'x' | 'z', a: number, b: number) => {
    const fixed = side === 'x' ? g.x0 + t : g.z0 + t;
    const face = (pa: number, pb: number, ha: number, hb: number, fill: string, stroke?: string) =>
      side === 'x' ? faceX(c, fixed, pa, pb, ha, hb, fill, stroke) : faceZ(c, pa, pb, fixed, ha, hb, fill, stroke);
    const seg = (u: number, h: number): Pt => (side === 'x' ? P(c, fixed, u, h) : P(c, u, fixed, h));
    if (ws.kind === 'brick') {
      for (let h = 4; h < ws.h; h += 4) line(c, seg(a, h), seg(b, h), 'rgba(255,235,220,0.28)', lw);
      for (let u = a + 1.6; u < b; u += 3.2) {
        const wa = u;
        const wb = Math.min(b - 0.3, u + 1.6);
        face(wa, wb, 10, ws.h - 7, '#1f2937');
        face(wa + 0.1, wb - 0.1, 11, ws.h - 8, ws.window ?? '#cfe8f3');
        const mid = (wa + wb) / 2;
        line(c, seg(mid, 11), seg(mid, ws.h - 8), '#1f2937', lw * 1.4);
      }
    } else if (ws.kind === 'metal') {
      for (let u = a + 0.45; u < b; u += 0.45) line(c, seg(u, 0), seg(u, ws.h), 'rgba(15,23,42,0.18)', lw);
      face(a, b, ws.h - 5, ws.h - 3, ws.trim ?? '#f97316');
    } else if (ws.kind === 'glass') {
      face(a, b, 3, ws.h - 3, ws.window ?? 'rgba(186,230,253,0.55)');
      for (let u = a + 2; u < b; u += 2) line(c, seg(u, 3), seg(u, ws.h - 3), 'rgba(255,255,255,0.75)', lw * 1.5);
      if (ws.trim) face(a, b, ws.h - 3, ws.h, ws.trim);
    } else if (ws.kind === 'concrete') {
      for (let u = a + 3; u < b; u += 3) line(c, seg(u, 0), seg(u, ws.h), 'rgba(15,23,42,0.1)', lw);
      if (ws.trim) face(a, b, ws.h - 4, ws.h - 2.5, ws.trim);
    } else if (ws.trim) {
      face(a, b, ws.h - 5, ws.h - 2, ws.trim);
    }
    face(a, b, 0, 3, shade(ws.color.startsWith('#') ? ws.color : '#94a3b8', 0.7));
  };

  // dinding kiri (x0)
  isoBox(c, g.x0 + t / 2, g.cz, t, g.z1 - g.z0, ws.h, ws.color);
  decorate('x', g.z0 + t, g.z1);

  if (!g.entranceAtBack) {
    isoBox(c, g.cx, g.z0 + t / 2, g.x1 - g.x0, t, ws.h, ws.color);
    decorate('z', g.x0 + t, g.x1);
  } else {
    // Etalase kaca + pintu masuk di tengah sisi z0
    const doorHalf = 2.4;
    [
      [g.x0 + t, g.cx - doorHalf],
      [g.cx + doorHalf, g.x1],
    ].forEach(([a, b]) => {
      isoBox(c, (a + b) / 2, g.z0 + 0.1, b - a, 0.2, 22, '#e0f2fe', { alpha: 0.35, stroke: 'rgba(255,255,255,0.8)' });
      faceZ(c, a, b, g.z0 + 0.2, 20, 23, g.primary);
    });
    // kanopi pintu
    isoBox(c, g.cx, g.z0 - 0.4, doorHalf * 2 + 0.6, 1.4, 2, g.primary, { elev: 24 });
  }
};

/** Pagar kaca rendah di sisi depan (x1 dan z1), dengan celah pintu masuk. */
const frontRails = (c: IsoCtx, g: Geo) => {
  const alpha = 0.32;
  const col = '#dbeafe';
  // sisi x1
  isoBox(c, g.x1 - 0.08, g.cz, 0.16, g.z1 - g.z0, 9, col, { alpha, stroke: 'rgba(255,255,255,0.9)' });
  // sisi z1, dengan celah pintu bila pintu ada di depan
  if (!g.entranceAtBack) {
    const doorHalf = 2.6;
    isoBox(c, (g.x0 + g.cx - doorHalf) / 2, g.z1 - 0.08, g.cx - doorHalf - g.x0, 0.16, 9, col, { alpha, stroke: 'rgba(255,255,255,0.9)' });
    isoBox(c, (g.cx + doorHalf + g.x1) / 2, g.z1 - 0.08, g.x1 - g.cx - doorHalf, 0.16, 9, col, { alpha, stroke: 'rgba(255,255,255,0.9)' });
    // pilar pintu
    isoBox(c, g.cx - doorHalf, g.z1 - 0.1, 0.35, 0.35, 26, g.primary);
    isoBox(c, g.cx + doorHalf, g.z1 - 0.1, 0.35, 0.35, 26, g.primary);
    isoBox(c, g.cx, g.z1 - 0.1, doorHalf * 2 + 0.35, 0.4, 3, g.primary, { elev: 26 });
  } else {
    isoBox(c, g.cx, g.z1 - 0.08, g.x1 - g.x0, 0.16, 9, col, { alpha, stroke: 'rgba(255,255,255,0.9)' });
  }
};

/** Monumen nama perusahaan (3D) di depan pintu masuk. */
const monumentSign = (c: IsoCtx, x: number, z: number, title: string, subtitle: string, color: string, hovered: boolean) => {
  const { ctx } = c;
  // 1. Fondasi tiang monumen fisik 3D di tanah
  isoBox(c, x, z, 4.2, 0.5, 4, '#e7e0d4');
  isoBox(c, x, z, 3.8, 0.35, 12, color, { elev: 4 });

  // 2. Badge papan nama 2D mengambang (render di top overlay layer agar bebas tertutup slab / z-index issue)
  const drawBadge = () => {
    const s = c.zoom;
    // Lift position - ensure label stays clearly above monument
    const p = P(c, x, z, Math.max(26, 32 * s));

    // Minimum readable font sizes at any zoom level
    const titleFontSize = Math.max(10, Math.round(11.5 * s));
    const subFontSize = Math.max(8, Math.round(9 * s));
    const titleFont = `bold ${titleFontSize}px sans-serif`;
    const subFont = `bold ${subFontSize}px sans-serif`;

    ctx.font = titleFont;
    const tw = ctx.measureText(title).width;
    ctx.font = subFont;
    const sw = subtitle ? ctx.measureText(subtitle).width : 0;

    const contentW = Math.max(tw, sw);
    // Padding around text must have a minimum pixel width (never shrink to zero when zoomed out)
    const padX = Math.max(20, Math.round(28 * s));
    const w = contentW + padX;

    const showSub = Boolean(subtitle);
    const lineGap = Math.max(3, Math.round(4 * s));
    const padY = Math.max(10, Math.round(14 * s));
    // Total container height is guaranteed to fit all lines plus padding
    const h = titleFontSize + (showSub ? subFontSize + lineGap : 0) + padY;

    // Drop shadow
    ctx.fillStyle = 'rgba(20, 15, 10, 0.25)';
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2 + 1.5, p.y - h / 2 + 2, w, h, 6);
    ctx.fill();

    // Body
    ctx.fillStyle = hovered ? '#ffffff' : 'rgba(255,252,245,0.98)';
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, p.y - h / 2, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = hovered ? 2.5 : Math.max(1.5, 2 * s);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2c231c';

    if (showSub) {
      const titleCenterY = p.y - (subFontSize / 2 + lineGap / 2);
      const subCenterY = p.y + (titleFontSize / 2 + lineGap / 2);
      ctx.font = titleFont;
      ctx.fillText(title, p.x, titleCenterY);
      ctx.fillStyle = color;
      ctx.font = subFont;
      ctx.fillText(subtitle, p.x, subCenterY);
    } else {
      ctx.font = titleFont;
      ctx.fillText(title, p.x, p.y);
    }
  };

  if (c.labelQueue) {
    c.labelQueue.push(drawBadge);
  } else {
    drawBadge();
  }
};

// =============================================================================
// TEMPLATE INTERIORS
// =============================================================================
interface Seat {
  dx: number;
  dz: number;
  seated?: boolean;
  back?: boolean;
}

interface TemplateDef {
  floor: string;
  slabSide: string;
  walls: WallStyle;
  drawFloor: (c: IsoCtx, g: Geo) => void;
  addItems: (c: IsoCtx, g: Geo, q: DepthQueue) => void;
  /** Urutan kursi: [0],[1] kerja duduk, [2] meeting berdiri, [3] ngopi berdiri. */
  seats: Seat[];
}

const serverRack = (c: IsoCtx, x: number, z: number, h: number, seed: number) => {
  isoBox(c, x, z, 0.95, 0.95, h, '#111827', { top: '#1f2937' });
  const fz = z + 0.476;
  faceZ(c, x - 0.4, x + 0.4, fz, 3, h - 3, '#0b1220');
  for (let r = 0; r < 7; r++) {
    const hh = 6 + r * ((h - 10) / 7);
    for (let k = 0; k < 3; k++) {
      const on = Math.sin(c.t * (4 + k) + seed * 1.7 + r) > -0.2;
      const xx = x - 0.3 + k * 0.12;
      faceZ(c, xx, xx + 0.07, fz + 0.005, hh, hh + 1.4, on ? (k === 2 ? '#f59e0b' : '#22c55e') : '#0e7490');
    }
    line(c, P(c, x + 0.05, fz, hh + 0.7), P(c, x + 0.36, fz, hh + 0.7), 'rgba(148,163,184,0.45)', Math.max(0.5, 0.6 * c.zoom));
  }
};

const TEMPLATES: Record<OfficeLayoutTemplateId, TemplateDef> = {
  // ---------------------------------------------------------------------------
  cloud_datacenter: {
    floor: '#2b3748',
    slabSide: '#94a3b8',
    walls: { color: '#64748b', h: 42, kind: 'concrete', trim: '#22d3ee' },
    drawFloor: (c, g) => {
      floorGrid(c, g.x0, g.z0, g.x1, g.z1, 1.1, 'rgba(148,163,184,0.16)');
      // Cold aisles (lantai perforasi bercahaya biru)
      isoRect(c, g.cx - 15.2, g.cz - 7.7, g.cx - 4.6, g.cz - 6.1, 'rgba(56,189,248,0.22)');
      isoRect(c, g.cx + 4.6, g.cz - 7.7, g.cx + 15.2, g.cz - 6.1, 'rgba(56,189,248,0.22)');
      // Ruang NOC berlantai terang
      isoRect(c, g.cx - 16.2, g.cz - 1.8, g.cx + 16.2, g.cz + 11.7, '#dfe7f1');
      floorGrid(c, g.cx - 16.2, g.cz - 1.8, g.cx + 16.2, g.cz + 11.7, 1.6, 'rgba(100,116,139,0.18)');
      isoRect(c, g.cx + 8.5, g.cz + 4.5, g.cx + 15.5, g.cz + 10.8, '#bfe3f2');
    },
    addItems: (c, g, q) => {
      const { cx, cz } = g;
      const xs = [5.6, 6.6, 7.6, 8.6, 9.6, 10.6, 11.6, 12.6, 13.6, 14.6];
      [-9.6, -4.4].forEach((dz) => {
        xs.forEach((ax, i) => {
          [-ax, ax].forEach((dx) => q.add(cx + dx, cz + dz, () => serverRack(c, cx + dx, cz + dz, 38, i + dz + dx)));
        });
        // tray kabel kuning di atas baris rak
        [-1, 1].forEach((sgn) =>
          q.add(cx + sgn * 10.1, cz + dz + 0.6, () =>
            isoBox(c, cx + sgn * 10.1, cz + dz, 9.8, 0.5, 1.2, '#f59e0b', { elev: 44, stroke: null })
          )
        );
      });
      // Unit pendingin CRAC di tengah aula server
      q.add(cx, cz - 9.6, () => {
        isoBox(c, cx, cz - 9.6, 3, 1, 36, '#e5e7eb');
        for (let i = 0; i < 6; i++) faceZ(c, cx - 1.3, cx + 1.3, cz - 9.1 + 0.01, 8 + i * 4, 9.4 + i * 4, '#9ca3af');
      });
      // Partisi kaca antara aula server & NOC (dengan pintu di tengah)
      for (let dx = -15.5; dx < 15.5; dx += 2) {
        if (Math.abs(dx + 1) < 2.6) continue;
        q.add(cx + dx + 1, cz - 2, () =>
          isoBox(c, cx + dx + 1, cz - 2, 2, 0.12, 28, '#bae6fd', { alpha: 0.3, stroke: 'rgba(255,255,255,0.8)' })
        );
      }
      // Video wall NOC di dinding kiri
      q.add(g.x0 + 0.5, cz + 5, () => {
        isoBox(c, g.x0 + 0.5, cz + 5, 0.25, 8, 24, '#0f172a', { elev: 10 });
        const fx = g.x0 + 0.63;
        for (let r = 0; r < 2; r++)
          for (let k = 0; k < 3; k++) {
            const za = cz + 1.2 + k * 2.6;
            const ha = 12 + r * 11;
            const col = ['#0369a1', '#0f766e', '#1d4ed8'][(k + r) % 3];
            faceX(c, fx, za, za + 2.4, ha, ha + 9.5, col);
            for (let b = 0; b < 5; b++) {
              const bh = 2 + Math.abs(Math.sin(c.t * 1.5 + b + k * 2 + r)) * 5;
              const zb = za + 0.3 + b * 0.42;
              faceX(c, fx + 0.005, zb, zb + 0.25, ha + 1, ha + 1 + bh, '#67e8f9');
            }
          }
      });
      // Meja operator NOC (3 monitor)
      [-6, -2, 2].forEach((dx) => q.add(cx + dx, cz + 4.5, () => deskWithMonitors(c, cx + dx, cz + 4.5, { w: 2.4, monitors: 3, top: '#e2e8f0', screen: '#0ea5e9', screen2: '#10b981' })));
      [-6, -2, 2].forEach((dx) => q.add(cx + dx, cz + 5.7, () => officeChair(c, cx + dx, cz + 5.7, '#1e3a8a')));
      // Lounge kecil
      q.add(cx + 12, cz + 9.4, () => sofa(c, cx + 12, cz + 9.4, 4, '#0e7490'));
      q.add(cx + 12, cz + 7.4, () => isoBox(c, cx + 12, cz + 7.4, 2, 1, 7, '#f8fafc'));
      q.add(cx + 15.2, cz + 2.6, () => {
        isoBox(c, cx + 15.2, cz + 2.6, 1, 1.1, 30, '#e5e7eb');
        faceZ(c, cx + 14.8, cx + 15.6, cz + 3.16, 10, 26, '#7dd3fc');
      });
      q.add(cx - 15, cz + 10.6, () => drawPlant(c, cx - 15, cz + 10.6, 1.1));
      q.add(cx + 8.8, cz + 10.6, () => drawPlant(c, cx + 8.8, cz + 10.6, 1));
    },
    seats: [
      { dx: -6, dz: 5.7, seated: true, back: true },
      { dx: -2, dz: 5.7, seated: true, back: true },
      { dx: -13.2, dz: 6, back: false },
      { dx: 11.2, dz: 7.6 },
    ],
  },

  // ---------------------------------------------------------------------------
  cafe_agency: {
    floor: '#c48a5c',
    slabSide: '#b58660',
    walls: { color: '#a3472a', h: 42, kind: 'brick', window: '#d7ecf3' },
    drawFloor: (c, g) => {
      // parket herringbone sederhana
      const lw = Math.max(0.5, 0.7 * c.zoom);
      for (let z = g.z0 + 0.6; z < g.z1; z += 0.6) line(c, P(c, g.x0, z), P(c, g.x1, z), 'rgba(90,50,25,0.2)', lw);
      for (let z = g.z0; z < g.z1; z += 0.6) {
        const off = (Math.round((z - g.z0) / 0.6) % 2) * 1.2;
        for (let x = g.x0 + off; x < g.x1; x += 2.4) line(c, P(c, x, z), P(c, x, Math.min(g.z1, z + 0.6)), 'rgba(90,50,25,0.18)', lw);
      }
      // karpet lounge hijau
      isoRect(c, g.cx - 15.6, g.cz - 10.8, g.cx - 7.5, g.cz - 4, '#3f6b4f', '#2f5240');
      // area bar (lantai ubin hitam putih)
      isoRect(c, g.cx + 2.2, g.cz - 11.7, g.cx + 15.8, g.cz - 5.8, '#efe9df');
      for (let x = g.cx + 2.2; x < g.cx + 15.8; x += 0.9)
        for (let z = g.cz - 11.7; z < g.cz - 5.8; z += 0.9)
          if ((Math.round((x - g.cx) / 0.9) + Math.round((z - g.cz) / 0.9)) % 2 === 0)
            isoRect(c, x, z, Math.min(x + 0.9, g.cx + 15.8), Math.min(z + 0.9, g.cz - 5.8), '#3b3634');
    },
    addItems: (c, g, q) => {
      const { cx, cz } = g;
      // Rak dinding & papan menu
      q.add(cx + 8.5, cz - 11.4, () => {
        isoBox(c, cx + 8.5, cz - 11.3, 10, 0.5, 1.5, '#5b3a29', { elev: 22 });
        for (let i = 0; i < 9; i++) isoCyl(c, cx + 4.2 + i * 1.05, cz - 11.3, 0.18, 4, ['#f8fafc', '#fde68a', '#a16207'][i % 3], 23.5);
        faceZ(c, cx + 4.5, cx + 12.5, cz - 11.38, 28, 38, '#1f2937', '#5b3a29');
        for (let r = 0; r < 3; r++) line(c, P(c, cx + 5, cz - 11.37, 35 - r * 2.6), P(c, cx + 9.5 - r, cz - 11.37, 35 - r * 2.6), 'rgba(255,255,255,0.75)', Math.max(0.5, 0.8 * c.zoom));
      });
      // Konter bar marmer
      [3.6, 6.2, 8.8, 11.4, 14].forEach((dx) =>
        q.add(cx + dx, cz - 8.4, () => isoBox(c, cx + dx, cz - 8.4, 2.6, 1.2, 13, '#5b3a29', { top: '#ece7e1' }))
      );
      q.add(cx + 6, cz - 8.3, () => {
        isoBox(c, cx + 6, cz - 8.6, 1.5, 0.8, 7, '#cbd5e1', { elev: 13 });
        faceZ(c, cx + 5.5, cx + 6.5, cz - 8.19, 15, 18, '#475569');
        glow(c, cx + 6.4, cz - 8.2, 19, 4, 'rgba(239,68,68,0.9)');
        const sy = (c.t * 9) % 12;
        glow(c, cx + 6, cz - 8.6, 22 + sy, 6, 'rgba(255,255,255,0.55)');
      });
      q.add(cx + 11.4, cz - 8.3, () => {
        isoBox(c, cx + 11.4, cz - 8.4, 2, 0.9, 6, '#e0f2fe', { elev: 13, alpha: 0.5, stroke: 'rgba(255,255,255,0.9)' });
        for (let i = 0; i < 4; i++) isoCyl(c, cx + 10.7 + i * 0.45, cz - 8.4, 0.16, 1.5, ['#f59e0b', '#b45309', '#fcd34d', '#78350f'][i], 14);
      });
      [4.4, 6.8, 9.2, 11.6].forEach((dx) => q.add(cx + dx, cz - 6.6, () => stool(c, cx + dx, cz - 6.6)));
      // Meja komunal kayu & bangku
      q.add(cx - 6, cz + 0.2, () => isoBox(c, cx - 6, cz - 0.6, 7, 0.45, 6, '#6b4226'));
      q.add(cx - 6, cz + 1, () => {
        isoBox(c, cx - 6, cz + 1, 7.4, 1.8, 2, '#8b5a2b', { elev: 11 });
        isoBox(c, cx - 9.4, cz + 1, 0.3, 1.5, 11, '#4b2e1a');
        isoBox(c, cx - 2.6, cz + 1, 0.3, 1.5, 11, '#4b2e1a');
        [-8.5, -6, -3.5].forEach((lx) => {
          isoBox(c, cx + lx, cz + 0.9, 0.9, 0.6, 0.5, '#d1d5db', { elev: 13 });
          isoBox(c, cx + lx, cz + 0.6, 0.9, 0.06, 4.5, '#9ca3af', { elev: 13.5, left: '#1e293b' });
        });
      });
      q.add(cx - 6, cz + 2.6, () => isoBox(c, cx - 6, cz + 2.6, 7, 0.45, 6, '#6b4226'));
      // Lampu gantung industrial
      q.add(cx - 6, cz + 1.4, () => {
        [-8.5, -6, -3.5].forEach((lx) => {
          line(c, P(c, cx + lx, cz + 1, 70), P(c, cx + lx, cz + 1, 40), '#1f2937', Math.max(0.6, 0.8 * c.zoom));
          const p = P(c, cx + lx, cz + 1, 40);
          const s = c.zoom;
          c.ctx.fillStyle = '#111827';
          c.ctx.beginPath();
          c.ctx.moveTo(p.x - 1.5 * s, p.y);
          c.ctx.lineTo(p.x + 1.5 * s, p.y);
          c.ctx.lineTo(p.x + 4 * s, p.y + 4 * s);
          c.ctx.lineTo(p.x - 4 * s, p.y + 4 * s);
          c.ctx.closePath();
          c.ctx.fill();
          glow(c, cx + lx, cz + 1, 34, 9, 'rgba(253,224,71,0.55)');
        });
      }, 0.5);
      // Meja bundar kafe
      [
        [5, 3],
        [10, 3],
        [7.5, 7.5],
        [12.8, 8],
      ].forEach(([dx, dz]) => {
        q.add(cx + dx - 0.9, cz + dz, () => stool(c, cx + dx - 0.9, cz + dz, '#7c2d12', 8));
        q.add(cx + dx, cz + dz, () => {
          roundTable(c, cx + dx, cz + dz, 0.6, '#fafaf9');
          isoCyl(c, cx + dx + 0.15, cz + dz, 0.1, 1.6, '#ffffff', 13.4);
        });
        q.add(cx + dx + 0.9, cz + dz + 0.3, () => stool(c, cx + dx + 0.9, cz + dz + 0.3, '#7c2d12', 8));
      });
      // Lounge: sofa Chesterfield + kursi + meja kopi
      q.add(g.x0 + 1, cz - 7.4, () => sofa(c, g.x0 + 1.2, cz - 7.4, 4.6, '#14532d', 'x'));
      q.add(cx - 11.5, cz - 7.2, () => isoBox(c, cx - 11.5, cz - 7.2, 1.6, 1.2, 6, '#78350f', { top: '#92400e' }));
      q.add(cx - 9, cz - 9.6, () => sofa(c, cx - 9, cz - 9.6, 1.8, '#b45309'));
      // Rak buku di dinding kiri
      q.add(g.x0 + 0.6, cz + 1.5, () => {
        isoBox(c, g.x0 + 0.6, cz + 1.5, 0.6, 4.5, 32, '#5b3a29');
        const books = ['#dc2626', '#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#0d9488'];
        for (let r = 0; r < 4; r++)
          for (let b = 0; b < 9; b++) {
            const zz = cz - 0.6 + b * 0.46;
            faceX(c, g.x0 + 0.91, zz, zz + 0.36, 3 + r * 7.5, 8.5 + r * 7.5 - (b % 3), books[(b + r) % books.length]);
          }
      });
      // Tanaman monstera
      q.add(cx - 15.2, cz - 11, () => drawPlant(c, cx - 15.2, cz - 11, 1.4));
      q.add(cx - 15.2, cz + 10.6, () => drawPlant(c, cx - 15.2, cz + 10.6, 1.2));
      q.add(cx + 15.2, cz + 10.6, () => drawPlant(c, cx + 15.2, cz + 10.6, 1.2));
      q.add(cx + 1.2, cz - 11, () => drawPlant(c, cx + 1.2, cz - 11, 1.1));
    },
    seats: [
      { dx: -8.5, dz: 2.6, seated: true, back: false },
      { dx: -4.5, dz: 2.6, seated: true, back: false },
      { dx: 7.6, dz: -6.2 },
      { dx: 8.4, dz: -9.9 },
    ],
  },

  // ---------------------------------------------------------------------------
  fintech_trading: {
    floor: '#171f2e',
    slabSide: '#475569',
    walls: { color: '#1f2937', h: 44, kind: 'glass', window: 'rgba(16,185,129,0.22)', trim: '#10b981' },
    drawFloor: (c, g) => {
      const { ctx } = c;
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 7; i++) {
        const a = P(c, g.x0 + hash(i) * 30, g.z0 + 1);
        const b = P(c, g.x0 + hash(i + 9) * 30, g.z1 - 1);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.max(0.5, 0.6 * c.zoom);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo((a.x + b.x) / 2 + 30 * c.zoom, (a.y + b.y) / 2, b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
      isoRect(c, g.x0 + 0.9, g.z0 + 0.9, g.x1 - 0.9, g.z1 - 0.9, 'rgba(0,0,0,0)', 'rgba(234,179,8,0.6)');
      isoRect(c, g.cx - 14.5, g.cz - 3.4, g.cx + 0.5, g.cz + 6.6, '#12332c', 'rgba(16,185,129,0.6)');
      isoRect(c, g.cx + 4.2, g.cz + 0.6, g.cx + 15.6, g.cz + 11.2, '#2b2420', 'rgba(234,179,8,0.45)');
    },
    addItems: (c, g, q) => {
      const { cx, cz } = g;
      // Dinding pasar (market wall) dengan candlestick bergerak
      q.add(g.x0 + 0.5, cz, () => {
        isoBox(c, g.x0 + 0.5, cz, 0.25, 13, 26, '#020617', { elev: 10 });
        const fx = g.x0 + 0.63;
        for (let r = 0; r < 2; r++)
          for (let k = 0; k < 4; k++) {
            const za = cz - 6.2 + k * 3.15;
            const ha = 12 + r * 11.5;
            faceX(c, fx, za, za + 2.95, ha, ha + 10, '#0b1324');
            for (let b = 0; b < 7; b++) {
              const v = Math.sin(c.t * 0.9 + b * 1.3 + k * 2.1 + r * 3);
              const mid = ha + 5 + v * 2;
              const len = 1.2 + Math.abs(Math.cos(c.t + b + k)) * 2.2;
              const zb = za + 0.3 + b * 0.38;
              faceX(c, fx + 0.005, zb, zb + 0.2, mid - len / 2, mid + len / 2, v > 0 ? '#22c55e' : '#ef4444');
            }
          }
        // ticker berjalan
        faceX(c, fx, cz - 6.4, cz + 6.4, 34.5, 37, '#022c22');
        for (let i = 0; i < 10; i++) {
          const zz = cz - 6.2 + ((i * 1.3 + c.t * 1.6) % 12.6);
          faceX(c, fx + 0.005, zz, zz + 0.8, 35, 36.5, i % 3 === 0 ? '#ef4444' : '#34d399');
        }
      });
      // Meja trading (monitor bertumpuk)
      [-1.6, 3.6].forEach((dz) =>
        [-11.4, -7.4, -3.4].forEach((dx) => {
          q.add(cx + dx, cz + dz, () =>
            deskWithMonitors(c, cx + dx, cz + dz, { w: 2.8, monitors: 3, stacked: true, top: '#1f2937', body: '#0b1220', screen: '#16a34a', screen2: '#0ea5e9' })
          );
          q.add(cx + dx, cz + dz + 1.2, () => officeChair(c, cx + dx, cz + dz + 1.2, '#111827'));
        })
      );
      // Meja resepsionis emas dekat pintu (sisi z0)
      q.add(cx, cz - 8.2, () => {
        isoBox(c, cx, cz - 8.2, 4.4, 1, 13, '#0f172a', { top: '#ca8a04' });
        faceZ(c, cx - 1.6, cx + 1.6, cz - 7.69, 4, 10, '#10b981');
      });
      // Ruang rapat kaca
      for (let dz = 1; dz < 11; dz += 2) q.add(cx + 4.3, cz + dz + 1, () => isoBox(c, cx + 4.3, cz + dz + 1, 0.12, 2, 30, '#a7f3d0', { alpha: 0.25, stroke: 'rgba(255,255,255,0.7)' }));
      for (let dx = 4.3; dx < 15.5; dx += 2) q.add(cx + dx + 1, cz + 0.7, () => isoBox(c, cx + dx + 1, cz + 0.7, 2, 0.12, 30, '#a7f3d0', { alpha: 0.25, stroke: 'rgba(255,255,255,0.7)' }));
      q.add(cx + 10, cz + 1, () => {
        isoBox(c, cx + 10, cz + 1, 3.6, 0.12, 13, '#020617', { elev: 12 });
        faceZ(c, cx + 8.4, cx + 11.6, cz + 1.07, 13.5, 24, '#1d4ed8');
        for (let b = 0; b < 8; b++) faceZ(c, cx + 8.7 + b * 0.35, cx + 8.9 + b * 0.35, cz + 1.075, 14, 15 + (Math.sin(b + c.t) + 1.2) * 3.5, '#93c5fd');
      });
      [8.2, 10, 11.8].forEach((dx) => q.add(cx + dx, cz + 4.4, () => officeChair(c, cx + dx, cz + 4.4, '#78350f')));
      q.add(cx + 10, cz + 5.8, () => isoBox(c, cx + 10, cz + 5.8, 6, 2, 2, '#4a2f1d', { elev: 11 }));
      [8.2, 10, 11.8].forEach((dx) => q.add(cx + dx, cz + 7.2, () => officeChair(c, cx + dx, cz + 7.2, '#78350f')));
      // Brankas
      q.add(cx + 13.6, cz - 8.6, () => {
        isoBox(c, cx + 13.6, cz - 8.6, 3, 2, 30, '#9ca3af', { top: '#d1d5db' });
        const p = P(c, cx + 13.6, cz - 7.6, 15);
        c.ctx.fillStyle = '#ca8a04';
        c.ctx.beginPath();
        c.ctx.ellipse(p.x, p.y, 13 * c.zoom, 9 * c.zoom, 0, 0, Math.PI * 2);
        c.ctx.fill();
        c.ctx.strokeStyle = '#78350f';
        c.ctx.lineWidth = 1.4 * c.zoom;
        c.ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + c.t * 0.3;
          line(c, p, { x: p.x + Math.cos(a) * 9 * c.zoom, y: p.y + Math.sin(a) * 6 * c.zoom }, '#78350f', 1.2 * c.zoom);
        }
      });
      // Pajangan emas batangan
      q.add(cx + 8.4, cz - 8.6, () => {
        isoBox(c, cx + 8.4, cz - 8.6, 1.6, 1.6, 10, '#111827', { top: '#1f2937' });
        isoBox(c, cx + 8.2, cz - 8.6, 0.5, 0.3, 1.5, '#facc15', { elev: 10 });
        isoBox(c, cx + 8.7, cz - 8.6, 0.5, 0.3, 1.5, '#facc15', { elev: 10 });
        isoBox(c, cx + 8.45, cz - 8.6, 0.5, 0.3, 1.5, '#fde047', { elev: 11.5 });
        isoBox(c, cx + 8.4, cz - 8.6, 1.4, 1.4, 7, '#e0f2fe', { elev: 10, alpha: 0.25 });
      });
      [
        [-15.2, 10.6],
        [2.6, 10.6],
        [15.2, -4],
      ].forEach(([dx, dz]) => q.add(cx + dx, cz + dz, () => drawPlant(c, cx + dx, cz + dz, 1.1, '#111827', '#15803d')));
    },
    seats: [
      { dx: -11.4, dz: -0.4, seated: true, back: true },
      { dx: -7.4, dz: 4.8, seated: true, back: true },
      { dx: 13.6, dz: 6 },
      { dx: -2.4, dz: -6.8 },
    ],
  },

  // ---------------------------------------------------------------------------
  creative_genai: {
    floor: '#f5eee5',
    slabSide: '#d8c7b4',
    walls: { color: '#fdf2f8', h: 40, kind: 'plain', trim: '#f9a8d4' },
    drawFloor: (c, g) => {
      const cols = ['#f472b6', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa'];
      for (let i = 0; i < 140; i++) {
        const x = g.x0 + 0.5 + hash(i * 3.1) * (g.x1 - g.x0 - 1);
        const z = g.z0 + 0.5 + hash(i * 7.7) * (g.z1 - g.z0 - 1);
        isoEllipse(c, x, z, 0.06 + hash(i) * 0.06, rgba(['#f472b6', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa'][i % 5], 0.55));
      }
      void cols;
      isoEllipse(c, g.cx - 5.5, g.cz + 4.5, 3.6, '#fbcfe8', 0, '#f9a8d4');
      isoEllipse(c, g.cx - 5.5, g.cz + 4.5, 2.4, '#fce7f3');
      // area studio green-screen
      isoRect(c, g.cx + 6.4, g.cz + 3.4, g.cx + 15.6, g.cz + 6.2, '#4ade80');
      isoRect(c, g.cx + 6.4, g.cz + 6.2, g.cx + 15.6, g.cz + 11.4, '#e5e7eb');
    },
    addItems: (c, g, q) => {
      const { cx, cz } = g;
      // Galeri seni AI di dinding kiri (warna berpendar)
      q.add(g.x0 + 0.4, cz - 3, () => {
        const fx = g.x0 + 0.31;
        faceX(c, fx, g.z0 + 0.3, g.z1, 30, 33, '#a7f3d0');
        faceX(c, fx, g.z0 + 0.3, g.z1, 33, 36, '#fed7aa');
        [-9.5, -5.5, -1.5, 2.5].forEach((dz, i) => {
          faceX(c, fx + 0.01, cz + dz, cz + dz + 3, 10, 27, '#1f2937');
          const ctx = c.ctx;
          const a = P(c, fx, cz + dz + 0.2, 26);
          const b = P(c, fx, cz + dz + 2.8, 11);
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          const hue = (c.t * 22 + i * 80) % 360;
          grad.addColorStop(0, `hsl(${hue},85%,68%)`);
          grad.addColorStop(1, `hsl(${(hue + 120) % 360},80%,60%)`);
          faceX(c, fx + 0.02, cz + dz + 0.2, cz + dz + 2.8, 11, 26, grad as unknown as string);
        });
      });
      // Meja gambar dengan tablet pen-display
      [-5.2, 0.2].forEach((dz) => {
        q.add(cx - 10.4, cz + dz, () => {
          isoBox(c, cx - 10.4, cz + dz, 2.6, 1.1, 12, '#ffffff', { top: '#fafafa' });
          isoBox(c, cx - 10.4, cz + dz - 0.1, 1.4, 0.7, 1, '#111827', { elev: 12, top: `hsl(${(c.t * 30 + dz * 40) % 360},75%,70%)` });
          line(c, P(c, cx - 9.4, cz + dz - 0.3, 12), P(c, cx - 9.2, cz + dz - 0.4, 24), '#f59e0b', 1.2 * c.zoom);
          line(c, P(c, cx - 9.2, cz + dz - 0.4, 24), P(c, cx - 9.8, cz + dz - 0.2, 22), '#f59e0b', 1.2 * c.zoom);
          glow(c, cx - 9.8, cz + dz - 0.2, 20, 5, 'rgba(253,224,71,0.6)');
        });
        q.add(cx - 10.4, cz + dz + 1.2, () => officeChair(c, cx - 10.4, cz + dz + 1.2, '#f472b6'));
      });
      // Easel di tengah
      q.add(cx - 3, cz - 4, () => {
        line(c, P(c, cx - 3.5, cz - 3.7, 0), P(c, cx - 3, cz - 4, 26), '#92400e', 1.4 * c.zoom);
        line(c, P(c, cx - 2.5, cz - 3.7, 0), P(c, cx - 3, cz - 4, 26), '#92400e', 1.4 * c.zoom);
        isoBox(c, cx - 3, cz - 4, 1.8, 0.1, 12, '#ffffff', { elev: 9, left: `hsl(${(c.t * 18 + 200) % 360},70%,72%)` });
      });
      // Bean bag di atas karpet
      [
        [-6.8, 5.6, '#f472b6'],
        [-4.2, 6.2, '#a78bfa'],
        [-5.6, 3.2, '#fbbf24'],
      ].forEach(([dx, dz, col]) =>
        q.add(cx + (dx as number), cz + (dz as number), () => {
          const p = P(c, cx + (dx as number), cz + (dz as number), 0);
          c.ctx.fillStyle = col as string;
          c.ctx.beginPath();
          c.ctx.ellipse(p.x, p.y - 4 * c.zoom, 12 * c.zoom, 7 * c.zoom, 0, 0, Math.PI * 2);
          c.ctx.fill();
          c.ctx.fillStyle = shade(col as string, 1.25);
          c.ctx.beginPath();
          c.ctx.ellipse(p.x - 2 * c.zoom, p.y - 7 * c.zoom, 6 * c.zoom, 3 * c.zoom, 0, 0, Math.PI * 2);
          c.ctx.fill();
        })
      );
      // Studio green-screen: backdrop + lampu softbox + kamera
      q.add(cx + 11, cz + 3.4, () => isoBox(c, cx + 11, cz + 3.4, 9.2, 0.2, 32, '#22c55e', { top: '#16a34a' }));
      [8, 14].forEach((dx) =>
        q.add(cx + dx, cz + 7.6, () => {
          line(c, P(c, cx + dx, cz + 7.6, 0), P(c, cx + dx, cz + 7.6, 22), '#374151', 1.2 * c.zoom);
          isoBox(c, cx + dx, cz + 7.4, 1.2, 0.3, 6, '#ffffff', { elev: 20 });
          glow(c, cx + dx, cz + 7.2, 23, 10, 'rgba(255,255,255,0.7)');
        })
      );
      q.add(cx + 11, cz + 9.6, () => {
        [-0.4, 0.4].forEach((o) => line(c, P(c, cx + 11 + o, cz + 9.8, 0), P(c, cx + 11, cz + 9.6, 16), '#111827', 1.1 * c.zoom));
        isoBox(c, cx + 11, cz + 9.6, 0.8, 0.6, 3.5, '#111827', { elev: 16 });
        glow(c, cx + 11.2, cz + 9.6, 19, 2.5, 'rgba(239,68,68,0.9)');
      });
      // Papan moodboard & printer plotter
      q.add(cx + 5.6, cz - 9.2, () => {
        isoBox(c, cx + 5.6, cz - 9.2, 3.6, 0.2, 24, '#d6a86c');
        const sw = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#ec4899', '#8b5cf6'];
        sw.forEach((col, i) => {
          const xa = cx + 4.1 + (i % 4) * 0.78;
          const ha = 8 + Math.floor(i / 4) * 7;
          faceZ(c, xa, xa + 0.6, cz - 9.09, ha, ha + 5, col);
        });
      });
      q.add(cx + 11.4, cz - 9, () => {
        isoBox(c, cx + 11.4, cz - 9, 3.4, 1.2, 12, '#e5e7eb', { top: '#f3f4f6' });
        faceZ(c, cx + 10, cx + 12.8, cz - 8.39, 9, 10.5, '#111827');
        isoBox(c, cx + 11.4, cz - 8.2, 3, 0.5, 0.3, `hsl(${(c.t * 40) % 360},80%,70%)`, { elev: 9 });
      });
      [
        [-15.2, 10.6, '#f9a8d4'],
        [2.4, 10.6, '#c4b5fd'],
        [15.2, -4, '#fde68a'],
        [-15.2, -11, '#99f6e4'],
      ].forEach(([dx, dz, pot]) => q.add(cx + (dx as number), cz + (dz as number), () => drawPlant(c, cx + (dx as number), cz + (dz as number), 1.1, pot as string, '#22c55e')));
    },
    seats: [
      { dx: -10.4, dz: -4, seated: true, back: true },
      { dx: -10.4, dz: 1.4, seated: true, back: true },
      { dx: 11, dz: 5.4 },
      { dx: -3.6, dz: 4.4 },
    ],
  },

  // ---------------------------------------------------------------------------
  robotics_hardware: {
    floor: '#9aa4ae',
    slabSide: '#6b7280',
    walls: { color: '#6b7280', h: 46, kind: 'metal', trim: '#f97316' },
    drawFloor: (c, g) => {
      floorGrid(c, g.x0, g.z0, g.x1, g.z1, 2, 'rgba(255,255,255,0.18)');
      // jalur kuning keselamatan
      isoRect(c, g.x0 + 0.5, g.cz - 0.2, g.x1 - 0.5, g.cz + 0.4, '#facc15');
      isoRect(c, g.cx + 3.6, g.z0 + 0.5, g.cx + 4.2, g.z1 - 0.5, '#facc15');
      // zona bahaya robot arm (hatch)
      isoRect(c, g.cx - 14, g.cz - 10, g.cx - 6.5, g.cz - 2.6, 'rgba(250,204,21,0.25)', '#ca8a04');
      for (let i = 0; i < 12; i++) {
        const a = g.cx - 14 + i * 0.65;
        line(c, P(c, a, g.cz - 2.6), P(c, Math.min(a + 2, g.cx - 6.5), g.cz - 4.6), 'rgba(17,24,39,0.35)', Math.max(0.6, c.zoom));
      }
      // landasan drone
      isoRect(c, g.cx + 5.4, g.cz + 1.6, g.cx + 15.4, g.cz + 11.2, '#4b5563');
      isoEllipse(c, g.cx + 10.4, g.cz + 6.4, 2.8, '#facc15', 0, '#ca8a04');
      isoEllipse(c, g.cx + 10.4, g.cz + 6.4, 2.1, '#4b5563');
    },
    addItems: (c, g, q) => {
      const { cx, cz } = g;
      // Sel robot arm 6-axis dengan pagar pengaman
      q.add(cx - 10.2, cz - 6.3, () => {
        isoCyl(c, cx - 10.2, cz - 6.3, 0.8, 6, '#f97316');
        const base = P(c, cx - 10.2, cz - 6.3, 6);
        const a1 = -Math.PI / 2 + Math.sin(c.t * 0.9) * 0.6;
        const a2 = a1 + 1.2 + Math.sin(c.t * 1.3) * 0.5;
        const s = c.zoom;
        const j1 = { x: base.x + Math.cos(a1) * 22 * s, y: base.y + Math.sin(a1) * 22 * s };
        const j2 = { x: j1.x + Math.cos(a2) * 18 * s, y: j1.y + Math.sin(a2) * 18 * s };
        line(c, base, j1, '#ea580c', 6 * s);
        line(c, j1, j2, '#fb923c', 4.5 * s);
        c.ctx.fillStyle = '#1f2937';
        [base, j1].forEach((p) => {
          c.ctx.beginPath();
          c.ctx.arc(p.x, p.y, 3 * s, 0, Math.PI * 2);
          c.ctx.fill();
        });
        line(c, j2, { x: j2.x - 3 * s, y: j2.y + 4 * s }, '#111827', 1.6 * s);
        line(c, j2, { x: j2.x + 3 * s, y: j2.y + 4 * s }, '#111827', 1.6 * s);
        if (Math.sin(c.t * 6) > 0.6) glow(c, cx - 10.2, cz - 6.3, 8, 7, 'rgba(56,189,248,0.8)');
      });
      // pagar sel (tiang kuning + jaring)
      [
        [-14, -10],
        [-6.5, -10],
        [-14, -2.6],
        [-6.5, -2.6],
      ].forEach(([dx, dz]) => q.add(cx + dx, cz + dz, () => isoBox(c, cx + dx, cz + dz, 0.2, 0.2, 18, '#facc15')));
      q.add(cx - 10.2, cz - 2.6, () => isoBox(c, cx - 10.2, cz - 2.6, 7.5, 0.06, 14, '#111827', { alpha: 0.15, stroke: '#facc15' }), 0.1);
      q.add(cx - 6.5, cz - 6.3, () => isoBox(c, cx - 6.5, cz - 6.3, 0.06, 7.4, 14, '#111827', { alpha: 0.15, stroke: '#facc15' }), 0.1);
      // Meja kerja baja
      [2.2, 6.6].forEach((dz) => {
        q.add(cx - 10, cz + dz, () => {
          isoBox(c, cx - 10, cz + dz, 4.4, 1.3, 12, '#475569', { top: '#cbd5e1' });
          isoBox(c, cx - 11.4, cz + dz - 0.2, 0.7, 0.5, 2.5, '#2563eb', { elev: 12 });
          isoBox(c, cx - 10.2, cz + dz, 0.9, 0.5, 1.5, '#111827', { elev: 12 });
          glow(c, cx - 10.2, cz + dz, 14, 3, 'rgba(56,189,248,0.8)');
          isoBox(c, cx - 8.6, cz + dz - 0.3, 0.6, 0.06, 5, '#111827', { elev: 12.5, left: '#22c55e' });
        });
        q.add(cx - 10, cz + dz + 1.2, () => stool(c, cx - 10, cz + dz + 1.2, '#f97316', 8));
      });
      // Pegboard perkakas di dinding kiri
      q.add(g.x0 + 0.4, cz + 4, () => {
        const fx = g.x0 + 0.32;
        faceX(c, fx, cz - 1, cz + 9, 14, 34, '#d6d3d1', '#78716c');
        for (let i = 0; i < 12; i++) {
          const za = cz - 0.5 + (i % 6) * 1.6;
          const ha = 17 + Math.floor(i / 6) * 9;
          faceX(c, fx + 0.01, za, za + 0.3 + (i % 3) * 0.3, ha, ha + 5 - (i % 2) * 2, ['#dc2626', '#2563eb', '#111827', '#f59e0b'][i % 4]);
        }
      });
      // Rak suku cadang + printer 3D (biarkan tengah sisi z0 untuk pintu)
      [5.4, 9.2].forEach((dx) =>
        q.add(cx + dx, cz - 9.6, () => {
          isoBox(c, cx + dx, cz - 9.6, 3.2, 1, 34, '#374151', { top: '#4b5563' });
          for (let r = 0; r < 5; r++)
            for (let k = 0; k < 3; k++) {
              const xa = cx + dx - 1.4 + k * 1;
              faceZ(c, xa, xa + 0.85, cz - 9.09, 3 + r * 6.4, 7.5 + r * 6.4, ['#f97316', '#2563eb', '#16a34a'][(r + k) % 3]);
            }
        })
      );
      q.add(cx + 13.6, cz - 9.4, () => {
        isoBox(c, cx + 13.6, cz - 9.4, 2.6, 1.4, 10, '#1f2937');
        [-0.6, 0.6].forEach((o) => {
          isoBox(c, cx + 13.6 + o, cz - 9.4, 1, 1, 9, '#e5e7eb', { elev: 10, alpha: 0.6 });
          glow(c, cx + 13.6 + o, cz - 9.2, 13, 4, 'rgba(249,115,22,0.85)');
        });
      });
      // Kandang uji drone (jaring) + drone melayang
      q.add(cx + 10.4, cz + 6.4, () => {
        const ctx = c.ctx;
        const x0 = cx + 5.4;
        const x1 = cx + 15.4;
        const z0 = cz + 1.6;
        const z1 = cz + 11.2;
        const H = 40;
        const lw = Math.max(0.6, 0.9 * c.zoom);
        const mesh = 'rgba(30,41,59,0.55)';
        [
          [x0, z0],
          [x1, z0],
          [x0, z1],
          [x1, z1],
        ].forEach(([px, pz]) => line(c, P(c, px, pz), P(c, px, pz, H), '#1f2937', lw * 1.6));
        poly(c, [P(c, x0, z0, H), P(c, x1, z0, H), P(c, x1, z1, H), P(c, x0, z1, H)], 'rgba(148,163,184,0.08)', mesh, lw);
        // drone
        const hx = cx + 10.4 + Math.sin(c.t * 0.8) * 2.5;
        const hz = cz + 6.4 + Math.cos(c.t * 0.6) * 2;
        const hh = 20 + Math.sin(c.t * 2.2) * 4;
        isoEllipse(c, hx, hz, 0.5, 'rgba(15,23,42,0.25)');
        isoBox(c, hx, hz, 0.7, 0.7, 2.2, '#111827', { elev: hh });
        [
          [-0.7, -0.7],
          [0.7, -0.7],
          [-0.7, 0.7],
          [0.7, 0.7],
        ].forEach(([ox, oz]) => {
          const pr = P(c, hx + ox, hz + oz, hh + 2.5);
          ctx.strokeStyle = 'rgba(14,165,233,0.85)';
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.ellipse(pr.x, pr.y, 6 * c.zoom, 2.2 * c.zoom, (c.t * 30) % Math.PI, 0, Math.PI * 2);
          ctx.stroke();
        });
        glow(c, hx - 0.4, hz, hh + 1, 3, 'rgba(34,197,94,0.9)');
        glow(c, hx + 0.4, hz, hh + 1, 3, 'rgba(239,68,68,0.9)');
        // sisi depan kandang digambar terakhir
        line(c, P(c, x0, z1, H), P(c, x1, z1, H), mesh, lw);
        line(c, P(c, x1, z0, H), P(c, x1, z1, H), mesh, lw);
      }, 4);
      // Robot AGV yang berpatroli di jalur kuning
      const agvX = cx - 4 + ((Math.sin(c.t * 0.35) + 1) / 2) * 7;
      q.add(agvX, cz + 0.1, () => {
        isoBox(c, agvX, cz + 0.1, 1.2, 0.9, 4, '#f97316', { top: '#fb923c' });
        isoBox(c, agvX, cz + 0.1, 0.9, 0.7, 2.5, '#e5e7eb', { elev: 4 });
        glow(c, agvX + 0.5, cz + 0.1, 3, 3, 'rgba(56,189,248,0.9)');
      });
      // Stasiun pengisian baterai
      q.add(cx + 1.6, cz + 10.4, () => {
        isoBox(c, cx + 1.6, cz + 10.4, 1.4, 0.8, 16, '#1f2937');
        faceZ(c, cx + 1.1, cx + 2.1, cz + 10.81, 9, 14, '#22c55e');
      });
    },
    seats: [
      { dx: -10, dz: 3.4, seated: true, back: true },
      { dx: -10, dz: 7.8, seated: true, back: true },
      { dx: 4.8, dz: 6 },
      { dx: 1.6, dz: 8.6 },
    ],
  },

  // ---------------------------------------------------------------------------
  tech_startup: {
    floor: '#efe3cf',
    slabSide: '#c8b59e',
    walls: { color: '#f8fafc', h: 40, kind: 'glass', window: 'rgba(186,230,253,0.5)', trim: '#c85a2b' },
    drawFloor: (c, g) => {
      const lw = Math.max(0.5, 0.7 * c.zoom);
      for (let x = g.x0 + 1.2; x < g.x1; x += 1.2) line(c, P(c, x, g.z0), P(c, x, g.z1), 'rgba(160,130,95,0.22)', lw);
      isoRect(c, g.cx - 14.6, g.cz - 9.6, g.cx - 1.4, g.cz + 1.6, '#cfe8d4');
      isoRect(c, g.cx + 4.4, g.cz + 2.6, g.cx + 15.4, g.cz + 11, '#dfd5f0');
    },
    addItems: (c, g, q) => {
      const { cx, cz } = g;
      [-12, -8, -4].forEach((dx) =>
        [-7.6, -2.4].forEach((dz) => {
          q.add(cx + dx, cz + dz, () => deskWithMonitors(c, cx + dx, cz + dz, { w: 2.2, monitors: 2, screen: '#38bdf8', screen2: '#a78bfa' }));
          q.add(cx + dx, cz + dz + 1.2, () => officeChair(c, cx + dx, cz + dz + 1.2, '#c85a2b'));
        })
      );
      q.add(g.x0 + 0.5, cz + 6, () => {
        faceX(c, g.x0 + 0.32, cz + 3, cz + 9, 12, 30, '#ffffff', '#cbd5e1');
        const cols = ['#fde047', '#f9a8d4', '#86efac', '#93c5fd'];
        for (let i = 0; i < 10; i++) faceX(c, g.x0 + 0.33, cz + 3.4 + (i % 5) * 1.1, cz + 4.2 + (i % 5) * 1.1, 15 + Math.floor(i / 5) * 7, 20 + Math.floor(i / 5) * 7, cols[i % 4]);
      });
      q.add(cx + 9.6, cz + 6.4, () => {
        isoBox(c, cx + 9.6, cz + 6.4, 4.4, 2.4, 1.2, '#1d4ed8', { elev: 11 });
        isoBox(c, cx + 9.6, cz + 6.4, 0.08, 2.4, 2.5, '#ffffff', { elev: 12.2, alpha: 0.7 });
        isoBox(c, cx + 8, cz + 6.4, 0.3, 0.3, 11, '#374151');
        isoBox(c, cx + 11.2, cz + 6.4, 0.3, 0.3, 11, '#374151');
      });
      q.add(cx + 9, cz - 9.2, () => {
        isoBox(c, cx + 9, cz - 9.2, 7, 1.1, 13, '#ffffff', { top: '#e7e5e4' });
        isoBox(c, cx + 7, cz - 9.4, 1, 0.6, 5, '#111827', { elev: 13 });
      });
      [6.5, 9, 11.5].forEach((dx) => q.add(cx + dx, cz - 7.6, () => stool(c, cx + dx, cz - 7.6, '#c85a2b')));
      q.add(cx - 15.2, cz + 10.6, () => drawPlant(c, cx - 15.2, cz + 10.6, 1.2));
      q.add(cx + 15.2, cz - 11, () => drawPlant(c, cx + 15.2, cz - 11, 1.2));
    },
    seats: [
      { dx: -12, dz: -6.4, seated: true, back: true },
      { dx: -8, dz: -1.2, seated: true, back: true },
      { dx: 8, dz: 8.2 },
      { dx: 9, dz: -7 },
    ],
  },
};

/** Sinkronkan posisi karyawan dengan kursi template (dipanggil sekali saat modul dimuat). */
export const applyTemplateSeats = (companies: KavlingLike[]) => {
  companies.forEach((k) => {
    const def = TEMPLATES[k.layoutTemplate] ?? TEMPLATES.tech_startup;
    k.employees.forEach((e, i) => {
      const s = def.seats[i % def.seats.length];
      e.wx = k.cx + s.dx;
      e.wz = k.cz + s.dz;
    });
  });
};

const makeGeo = (cx: number, cz: number, hw: number, hd: number, primary: string, secondary: string, accent: string): Geo => ({
  cx,
  cz,
  x0: cx - hw,
  x1: cx + hw,
  z0: cz - hd,
  z1: cz + hd,
  entranceAtBack: cz > (DISTRICT.northRowZ + DISTRICT.southRowZ) / 2,
  primary,
  secondary,
  accent,
});

// =============================================================================
// PUBLIC: EMPTY KAVLING (KAVLING KOSONG / TERSEDIA)
// =============================================================================
export const renderEmptyKavling = (c: IsoCtx, k: KavlingLike, hovered: boolean) => {
  const g = makeGeo(k.cx, k.cz, k.halfW, k.halfD, '#059669', '#10b981', '#34d399');
  const lotLabel = k.plotLabel || `Parcel #${k.id.replace(/\D/g, '') || '1'}`;
  const signTitle = `📍 KAVLING REGIONAL TERSEDIA`;
  const signSub = `SIAP DIBANGUN • AWAITING P2P PEER`;

  const ctx = c.ctx;
  const s = c.zoom;

  // 1. Tanah kavling datar (FLUSH DENGAN TANAH, elev = 0, tidak melayang)
  const groundFill = hovered ? '#ecfdf5' : '#8fbe80';
  const groundBorder = hovered ? '#059669' : '#7ca86f';
  isoRect(c, g.x0, g.z0, g.x1, g.z1, groundFill, groundBorder, 0);

  // 2. Garis batas paving perbatasan tapak tanah kapling
  isoRect(c, g.x0 + 0.4, g.z0 + 0.4, g.x1 - 0.4, g.z1 - 0.4, undefined, hovered ? 'rgba(5, 150, 105, 0.4)' : 'rgba(100, 140, 90, 0.35)', 0);

  // 3. Garis surveyor tape putus-putus (menempel pas di tanah, elev = 0)
  ctx.save();
  ctx.setLineDash([6 * s, 4 * s]);
  const pTL = P(c, g.x0 + 0.8, g.z0 + 0.8, 0);
  const pTR = P(c, g.x1 - 0.8, g.z0 + 0.8, 0);
  const pBR = P(c, g.x1 - 0.8, g.z1 - 0.8, 0);
  const pBL = P(c, g.x0 + 0.8, g.z1 - 0.8, 0);
  ctx.strokeStyle = hovered ? '#059669' : 'rgba(16, 185, 129, 0.75)';
  ctx.lineWidth = Math.max(1, 1.4 * s);
  ctx.beginPath();
  ctx.moveTo(pTL.x, pTL.y);
  ctx.lineTo(pTR.x, pTR.y);
  ctx.lineTo(pBR.x, pBR.y);
  ctx.lineTo(pBL.x, pBL.y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 4. Surveyor Grid halus arsitektur tanah
  floorGrid(c, g.x0 + 1.0, g.z0 + 1.0, g.x1 - 1.0, g.z1 - 1.0, 3.0, 'rgba(80, 120, 70, 0.22)');

  // 5. Patok kayu surveyor di 4 sudut menancap di tanah
  const corners = [
    { x: g.x0 + 1.0, z: g.z0 + 1.0 },
    { x: g.x1 - 1.0, z: g.z0 + 1.0 },
    { x: g.x1 - 1.0, z: g.z1 - 1.0 },
    { x: g.x0 + 1.0, z: g.z1 - 1.0 },
  ];
  corners.forEach((cp, ci) => {
    // Tiang kayu kecil menancap
    isoBox(c, cp.x, cp.z, 0.2, 0.2, 8, '#92400e', { elev: 0 });
    // Bendera surveyor
    const top = P(c, cp.x, cp.z, 8);
    ctx.fillStyle = ci % 2 === 0 ? '#ea580c' : '#10b981';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x + 6 * s, top.y - 2.5 * s);
    ctx.lineTo(top.x, top.y - 5 * s);
    ctx.closePath();
    ctx.fill();
  });

  // 6. Label & Target Survey di tengah tanah kavling
  const centerIso = P(c, g.cx, g.cz, 0);
  if (s >= 0.5) {
    ctx.save();
    // Lingkaran target survey
    ctx.strokeStyle = hovered ? 'rgba(5, 150, 105, 0.85)' : 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.beginPath();
    ctx.ellipse(centerIso.x, centerIso.y, 44 * s, 23 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Pulse marker animasi lembut
    const pulseR = (28 + Math.sin(c.t * 2.5) * 5) * s;
    ctx.beginPath();
    ctx.ellipse(centerIso.x, centerIso.y, pulseR, pulseR * 0.52, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.stroke();

    // Label di tengah tanah
    const groundFontSize = Math.max(8, Math.round(9 * s));
    ctx.font = `bold ${groundFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hovered ? '#065f46' : '#14532d';
    ctx.fillText(`[ ${lotLabel.toUpperCase()} ]`, centerIso.x, centerIso.y - 5 * s);
    ctx.font = `${Math.max(7, Math.round(7.5 * s))}px sans-serif`;
    ctx.fillStyle = '#475569';
    ctx.fillText('Lahan Terbuka • Siap Terhubung ke Node P2P', centerIso.x, centerIso.y + 6 * s);
    ctx.restore();
  }

  // 7. Monumen penanda kavling di dalam tapak kavling (tidak mepet atau menabrak trotoar/jalan)
  if (g.entranceAtBack) {
    monumentSign(c, g.cx - 5.0, g.z0 + 1.2, signTitle, signSub, '#059669', hovered);
  } else {
    monumentSign(c, g.cx + 5.0, g.z1 - 1.2, signTitle, signSub, '#059669', hovered);
  }
};

// =============================================================================
// PUBLIC: COMPANY KAVLING
// =============================================================================
export const renderCompanyKavling = (c: IsoCtx, k: KavlingLike, hovered: boolean) => {
  // Bila kavling ditandai kosong atau belum memiliki karyawan (tidak ada node peer aktif),
  // render tampilan Kavling Kosong arsitektural resmi!
  if (k.isEmptyLot || !k.employees || k.employees.length === 0) {
    renderEmptyKavling(c, k, hovered);
    return;
  }

  const def = TEMPLATES[k.layoutTemplate] ?? TEMPLATES.tech_startup;
  const g = makeGeo(k.cx, k.cz, k.halfW, k.halfD, k.primaryColor, k.secondaryColor, k.accentColor);
  const signTitle = `${k.badgeIcon} ${k.shortName}`;
  const signSub = `${k.ownerName.split(' ')[0].toUpperCase()} • LV ${k.level}`;


  plinth(c, g, def.floor, hovered, def.slabSide);
  def.drawFloor(c, g);
  // jalur masuk
  if (g.entranceAtBack) isoRect(c, g.cx - 2.2, g.z0, g.cx + 2.2, g.z0 + 2.4, 'rgba(255,255,255,0.35)');
  else isoRect(c, g.cx - 2.2, g.z1 - 2.4, g.cx + 2.2, g.z1, 'rgba(255,255,255,0.35)');
  backWalls(c, g, def.walls);

  const q = new DepthQueue();
  def.addItems(c, g, q);

  k.employees.forEach((e, i) => {
    const seat = def.seats[i % def.seats.length];
    const seated = !!seat.seated;
    const ex = e.wx;
    const ez = e.wz;
    q.add(
      ex,
      ez,
      () => {
        drawPerson(c, ex, ez, e.avatarColor, e.hairColor, {
          seated,
          back: seated ? seat.back !== false : false,
          bob: seated ? Math.sin(c.t * 9 + i) * 0.4 : Math.sin(c.t * 2 + i) * 0.5,
          cup: e.state === 'coffee',
        });
        drawEmployeeTag(c, ex, ez, e.name || 'Agent', e.role, seated);
      },
      0.05
    );
  });
  q.flush();

  frontRails(c, g);
  if (g.entranceAtBack) {
    monumentSign(c, g.cx - 5.5, g.z0 - 0.7, signTitle, signSub, g.primary, hovered);
  } else {
    monumentSign(c, g.cx + 5.5, g.z1 + 1.1, signTitle, signSub, g.primary, hovered);
  }
};

// =============================================================================
// PUBLIC: SUPERMART 24/7 MEGA STORE (GRAND ARCHITECTURE & 3D INTERIOR)
// =============================================================================
export const renderSuperMart = (c: IsoCtx, hovered: boolean) => {
  const { cx, cz } = DISTRICT.supermart;
  const g = makeGeo(cx, cz, DISTRICT.plotHalfW, DISTRICT.plotHalfD, '#16a34a', '#22c55e', '#15803d');
  const ctx = c.ctx;
  const s = c.zoom;

  // 1. Plinth / Pondasi Gedung Supermarket 3D
  plinth(c, g, '#f8fafc', hovered, '#94a3b8');

  // Lantai ubin supermarket marmer putih-gading dengan lis emerald
  floorGrid(c, g.x0, g.z0, g.x1, g.z1, 1.8, 'rgba(22, 163, 74, 0.12)');

  // Entrance & Exit Walkway Runners (Karpet Keset Selamat Datang di Depan Kiri)
  isoRect(c, cx - 14.5, cz + 6.0, cx - 9.0, cz + 9.6, '#15803d', '#166534', 0.2);
  isoRect(c, cx - 14.2, cz + 6.3, cx - 9.3, cz + 9.3, '#16a34a', '#86efac', 0.2);

  // Panah Sirkulasi Lantai (Traffic Flow Guides)
  const entP = P(c, cx - 11.8, cz + 7.8, 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(4, Math.round(5 * s))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ENTRY ➔', entP.x, entP.y);

  // 2. Dinding Belakang & Kiri (Modern High Backwall & Canopy)
  backWalls(c, g, { color: '#f8fafc', h: 48, kind: 'plain', trim: '#16a34a' });

  // Papan Nama Toko Neon 3D Megah di Dinding Belakang (Z = g.z0 + 0.31)
  faceZ(c, cx - 12.5, cx + 12.5, g.z0 + 0.31, 33, 46, '#15803d', '#14532d');
  faceZ(c, cx - 12.2, cx + 12.2, g.z0 + 0.32, 34, 45, '#16a34a', '#22c55e');

  const signPos = P(c, cx, g.z0 + 0.32, 40.5);
  ctx.save();
  ctx.translate(signPos.x, signPos.y);
  ctx.transform(1, 16 / 30, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(6.5, Math.round(11 * s))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛒 VIGENT SUPERMART 24/7', 0, -2 * s);
  ctx.fillStyle = '#dcfce7';
  ctx.font = `bold ${Math.max(4, Math.round(6 * s))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText('MEGA STORE • ALWAYS FRESH • 100% LOCAL PRODUCE', 0, 5 * s);
  ctx.restore();

  const q = new DepthQueue();

  // 3. ZONA DINDING UTARA: WALK-IN CHILLED BEVERAGE & DAIRY WALL
  // Kulkas chiller kaca tinggi (height 38px!) berisi 4 tingkat rak minuman segar
  const coolerW = 4.2;
  const coolerOffsets = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5];
  coolerOffsets.forEach((dx, cIdx) => {
    const xMid = cx + dx;
    const zMid = g.z0 + 1.2;
    q.add(xMid, zMid, () => {
      // Bodi kulkas hitam baja
      isoBox(c, xMid, zMid, coolerW, 1.8, 38, '#0f172a', { top: '#1e293b' });
      // Pintu kaca es berpendar cyan dingin
      faceZ(c, xMid - coolerW / 2 + 0.15, xMid + coolerW / 2 - 0.15, zMid + 0.91, 2, 37, 'rgba(56, 189, 248, 0.32)', '#38bdf8');

      // 4 Tingkat Rak Minuman di dalam Kulkas
      const drinkCols = [
        ['#ef4444', '#dc2626', '#b91c1c'], // Soda merah / Cola
        ['#f97316', '#ea580c', '#c2410c'], // Jus jeruk / Energy
        ['#ffffff', '#f1f5f9', '#e2e8f0'], // Susu segar / Yogurt
        ['#0ea5e9', '#0284c7', '#0369a1'], // Air mineral / Isotonik
      ];
      for (let tier = 0; tier < 4; tier++) {
        const tierH = 5 + tier * 8;
        // Ambalan rak stainless
        faceZ(c, xMid - coolerW / 2 + 0.2, xMid + coolerW / 2 - 0.2, zMid + 0.88, tierH, tierH + 1.2, '#94a3b8');
        // Botol-botol minuman tebal berjejer
        for (let b = 0; b < 6; b++) {
          const bx0 = xMid - coolerW / 2 + 0.35 + b * 0.6;
          const bx1 = bx0 + 0.42;
          const colSet = drinkCols[(tier + cIdx) % drinkCols.length];
          const col = colSet[b % colSet.length];
          faceZ(c, bx0, bx1, zMid + 0.89, tierH + 1.2, tierH + 5.8, col);
          // Tutup botol putih
          faceZ(c, bx0 + 0.08, bx1 - 0.08, zMid + 0.89, tierH + 5.8, tierH + 6.8, '#f8fafc');
        }
      }
      // Handle pintu chrome
      faceZ(c, xMid + coolerW / 2 - 0.4, xMid + coolerW / 2 - 0.25, zMid + 0.92, 14, 26, '#f8fafc', '#94a3b8');
    });
  });

  // 4. ZONA TENGAH: 3 LORONG RAK GONDOLA 3D BESAR (MAIN GROCERY AISLES)
  // Lorong rak besar, kokoh, tinggi 27px, dan sarat produk
  const aisleConfigs = [
    {
      dx: -6.0,
      aisleNo: '01',
      title: 'SNACKS & DRINKS',
      colors: ['#ef4444', '#f97316', '#eab308', '#dc2626', '#b91c1c'],
    },
    {
      dx: 0.0,
      aisleNo: '02',
      title: 'GROCERY & STAPLES',
      colors: ['#16a34a', '#10b981', '#059669', '#0d9488', '#0284c7'],
    },
    {
      dx: 6.0,
      aisleNo: '03',
      title: 'BREAKFAST & BAKERY',
      colors: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'],
    },
  ];

  aisleConfigs.forEach(({ dx, aisleNo, title, colors }, aIdx) => {
    const ax = cx + dx;
    const shelfWidth = 2.6; // Tebal & kokoh!
    const shelfH = 27;     // Tinggi 27px!

    // 4 Segmen membujur per lorong (z: cz - 7.5 s.d cz + 1.5)
    for (let sIdx = 0; sIdx < 4; sIdx++) {
      const az = cz - 6.5 + sIdx * 2.2;
      q.add(ax, az, () => {
        // Bodi rak gondola logam putih bersih
        isoBox(c, ax, az, shelfWidth, 2.0, shelfH, '#e2e8f0', { top: '#f8fafc', right: '#cbd5e1' });

        // Produk di sisi kanan (+x) rak
        for (let tier = 0; tier < 3; tier++) {
          const tH = 3.5 + tier * 7.5;
          // Ambalan logam
          faceX(c, ax + shelfWidth / 2 + 0.02, az - 0.95, az + 0.95, tH, tH + 1.0, '#94a3b8');
          // Kotak / kemasan produk 3D
          for (let p = 0; p < 4; p++) {
            const za = az - 0.85 + p * 0.45;
            const zb = za + 0.36;
            const pCol = colors[(p + tier * 2 + sIdx + aIdx) % colors.length];
            faceX(c, ax + shelfWidth / 2 + 0.04, za, zb, tH + 1.0, tH + 5.5, pCol);
            // Label / kemasan detail
            faceX(c, ax + shelfWidth / 2 + 0.05, za + 0.06, zb - 0.06, tH + 2.0, tH + 4.2, '#ffffff');
          }
        }

        // Jika segmen depan (sIdx === 3), buat End-Cap Display khusus promosi!
        if (sIdx === 3) {
          // Promo Endcap Stand kuning cerah / merah
          const endCapZ = az + 1.05;
          isoBox(c, ax, endCapZ + 0.5, shelfWidth * 0.9, 0.9, 22, '#eab308', { top: '#fde047' });
          // Header Promo Banner
          faceZ(c, ax - 1.0, ax + 1.0, endCapZ + 0.96, 17, 21, '#dc2626', '#b91c1c');
          const pP = P(c, ax, endCapZ + 0.96, 19);
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(3.5, Math.round(4.5 * s))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BEST BUY', pP.x, pP.y);
          ctx.restore();

          // Barang diskon di rak promo
          for (let tier = 0; tier < 3; tier++) {
            const tH = 2.5 + tier * 5.5;
            for (let b = 0; b < 3; b++) {
              const bx0 = ax - 0.8 + b * 0.6;
              faceZ(c, bx0, bx0 + 0.45, endCapZ + 0.96, tH + 0.8, tH + 4.5, colors[(b + tier) % colors.length]);
            }
          }
        }
      });
    }

    // Papan Kategori Menggantung di Atas Lorong
    q.add(ax, cz - 2.5, () => {
      // Tiang gantung kawat dari plafon
      line(c, P(c, ax, cz - 2.5, 48), P(c, ax, cz - 2.5, 36), '#64748b', 1.2 * s);
      // Papan hijau neon
      isoBox(c, ax, cz - 2.5, 0.2, 2.8, 6.5, '#15803d', { elev: 33, top: '#16a34a', right: '#166534' });
      // Teks kategori
      const signPt = P(c, ax + 0.15, cz - 2.5, 36.5);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(4.5, Math.round(6.5 * s))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`AISLE ${aisleNo} • ${title}`, signPt.x, signPt.y);
      ctx.restore();
    }, 4);
  });

  // 5. ZONA BARAT (DEPAN-KIRI): FRESH PRODUCE ISLAND (BUAH & SAYUR SEGAR & BAKERY)
  // Meja pulau display kayu berundak yang besar dan padat buah
  const fruitTables = [
    { x: cx - 12.0, z: cz - 2.0, w: 3.4, d: 2.4, fruit: '🍎 Apel Fuji', col: '#ef4444', col2: '#22c55e' },
    { x: cx - 12.0, z: cz + 1.5, w: 3.4, d: 2.4, fruit: '🍊 Jeruk & Pisang', col: '#f97316', col2: '#eab308' },
  ];

  fruitTables.forEach((tab) => {
    q.add(tab.x, tab.z, () => {
      // Meja kayu jati tebal
      isoBox(c, tab.x, tab.z, tab.w, tab.d, 12, '#78350f', { top: '#92400e', right: '#451a03' });

      // Keranjang kayu berundak berisi buah-buahan bervolume jelas
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const fx = tab.x - tab.w / 2 + 0.5 + col * 0.8;
          const fz = tab.z - tab.d / 2 + 0.4 + row * 0.8;
          const fp = P(c, fx, fz, 13.5);
          const fColor = (row + col) % 2 === 0 ? tab.col : tab.col2;

          // Buah bulat besar dengan kilau pantulan
          ctx.fillStyle = fColor;
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, 4.2 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.beginPath();
          ctx.arc(fp.x - 1.2 * s, fp.y - 1.2 * s, 1.4 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Plang label kayu
      const lblPt = P(c, tab.x, tab.z + tab.d / 2 + 0.05, 8);
      ctx.save();
      ctx.fillStyle = '#fef3c7';
      ctx.font = `bold ${Math.max(3.5, Math.round(4.5 * s))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(tab.fruit, lblPt.x, lblPt.y);
      ctx.restore();
    });
  });

  // Display Artisan Bakery & Roti Segar (Di sebelah pulau buah)
  q.add(cx - 12.0, cz - 5.5, () => {
    // Meja display roti kayu
    isoBox(c, cx - 12.0, cz - 5.5, 3.4, 2.0, 14, '#9a3412', { top: '#c2410c' });
    // Kanopi kain melengkung garis hijau-putih
    for (let str = 0; str < 5; str++) {
      const sx0 = cx - 13.7 + str * 0.68;
      const strCol = str % 2 === 0 ? '#16a34a' : '#f8fafc';
      faceZ(c, sx0, sx0 + 0.68, cz - 4.45, 17, 23, strCol);
    }
    // Roti baguette & croissant di rak
    for (let b = 0; b < 4; b++) {
      const bp = P(c, cx - 13.2 + b * 0.8, cz - 5.5, 15);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y, 5 * s, 2.5 * s, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 6. ZONA TIMUR (DEPAN-KANAN): 2 MODERN POS CHECKOUT LANES (MEJA KASIR LENGKAP)
  const cashierLanes = [
    { dx: 10.5, dz: 3.5, no: '01', open: true },
    { dx: 13.8, dz: 4.8, no: '02', open: true },
  ];

  cashierLanes.forEach((lane) => {
    const kx = cx + lane.dx;
    const kz = cz + lane.dz;
    const laneW = 1.6;
    const laneD = 4.2;

    q.add(kx, kz, () => {
      // Meja kasir utama (Modern Charcoal Slate)
      isoBox(c, kx, kz, laneW, laneD, 13, '#334155', { top: '#475569', right: '#1e293b' });

      // Conveyor belt karet hitam berputar
      isoBox(c, kx - 0.2, kz - 0.5, 0.9, 2.8, 0.6, '#0f172a', { elev: 13, top: '#1e293b' });

      // Barang belanjaan di conveyor belt
      isoBox(c, kx - 0.2, kz - 1.2, 0.4, 0.4, 2.5, '#ef4444', { elev: 13.6 });
      isoBox(c, kx - 0.2, kz - 0.5, 0.35, 0.5, 3.2, '#f59e0b', { elev: 13.6 });
      isoBox(c, kx - 0.2, kz + 0.2, 0.4, 0.35, 2.0, '#3b82f6', { elev: 13.6 });

      // Monitor POS Touchscreen Layar Biru Menyala di atas tiang
      line(c, P(c, kx + 0.4, kz + 1.2, 13), P(c, kx + 0.4, kz + 1.2, 21), '#94a3b8', 1.5 * s);
      isoBox(c, kx + 0.4, kz + 1.2, 0.4, 0.7, 5.5, '#0284c7', { elev: 19, top: '#38bdf8', left: '#0369a1' });

      // Barcode Scanner Laser Merah
      line(c, P(c, kx, kz + 0.8, 13.6), P(c, kx - 0.4, kz + 0.8, 13.6), '#ef4444', 1.2 * s);

      // Rak Impulse Buy (permen, cokelat kecil di depan kasir)
      faceX(c, kx + laneW / 2 + 0.05, kz - 1.5, kz + 0.5, 4, 11, '#64748b');
      faceX(c, kx + laneW / 2 + 0.08, kz - 1.4, kz - 0.6, 5, 10, '#ec4899');
      faceX(c, kx + laneW / 2 + 0.08, kz - 0.4, kz + 0.4, 5, 10, '#eab308');

      // Kantong Belanja Kuning SuperMart di Ujung Meja
      isoBox(c, kx - 0.2, kz + 1.7, 0.5, 0.5, 4.5, '#facc15', { elev: 13, top: '#fde047' });

      // Papan Nomor Kasir Menyala Menggantung
      line(c, P(c, kx, kz + 1.8, 38), P(c, kx, kz + 1.8, 26), '#64748b', 1 * s);
      isoBox(c, kx, kz + 1.8, 0.1, 1.4, 4, '#15803d', { elev: 23, top: '#16a34a' });
      const kP = P(c, kx + 0.1, kz + 1.8, 25);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(4, Math.round(5.5 * s))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(lane.no, kP.x, kP.y);
      ctx.restore();
    });

    // NPC Kasir berseragam hijau di balik meja
    q.add(kx + 0.9, kz + 0.2, () => {
      drawPerson(c, kx + 0.9, kz + 0.2, '#16a34a', '#1e293b', {
        bob: Math.sin(c.t * 2 + lane.dx) * 0.3,
      });
    }, 0.05);
  });

  // 7. ZONA PINTU MASUK (SELATAN-BARAT): SHOPPING CART BAY & SECURITY GATES
  // Deretan Troli Belanja Stainless Steel Chrome
  for (let t = 0; t < 5; t++) {
    const tx = cx - 13.5 + t * 0.9;
    const tz = cz + 8.2;
    q.add(tx, tz, () => {
      // Keranjang troli kawat chrome
      isoBox(c, tx, tz, 0.7, 1.2, 7.5, '#cbd5e1', { elev: 2.5, alpha: 0.9, top: 'rgba(203,213,225,0.5)' });
      // Roda & sasis troli
      isoBox(c, tx, tz, 0.6, 1.1, 1.2, '#475569');
      // Gagang troli merah menyala
      isoBox(c, tx, tz + 0.6, 0.65, 0.1, 1.6, '#dc2626', { elev: 9.5 });
    });
  }

  // Tiang Sensor Masuk RFID Chrome
  [cx - 8.2, cx - 6.2].forEach((px) => {
    q.add(px, cz + 8.0, () => {
      isoBox(c, px, cz + 8.0, 0.35, 0.35, 18, '#94a3b8', { top: '#cbd5e1' });
      isoBox(c, px, cz + 8.0, 0.36, 0.36, 2, '#38bdf8', { elev: 15 }); // Sensor LED biru
    });
  });

  // 8. LIVING ANIMATED NPCS (PELANGGAN & PETUGAS)
  // Shopper 1: Budi mendorong troli belanja di lorong Aisle 01
  const shopperZ = cz - 4.5 + ((Math.sin(c.t * 0.4) + 1) / 2) * 5.0;
  q.add(cx - 3.5, shopperZ, () => {
    drawPerson(c, cx - 3.5, shopperZ, '#2563eb', '#451a03', {
      bob: Math.abs(Math.sin(c.t * 4)) * 0.8,
    });
    // Troli yang didorong
    isoBox(c, cx - 3.5, shopperZ + 1.1, 0.7, 1.2, 7, '#cbd5e1', { elev: 2.5, alpha: 0.9 });
    isoBox(c, cx - 3.5, shopperZ + 1.65, 0.65, 0.1, 1.6, '#dc2626', { elev: 9 });
  }, 0.05);

  // Shopper 2: Maya sedang memilih buah di Fresh Produce Island
  q.add(cx - 9.8, cz - 0.5, () => {
    drawPerson(c, cx - 9.8, cz - 0.5, '#db2777', '#172554', {
      bob: Math.sin(c.t * 1.5) * 0.2,
      cup: true, // Membawa kantong belanja
    });
  }, 0.05);

  // Staf Restocking: Dani berseragam polo hijau sedang menata kardus di Aisle 02
  q.add(cx + 2.5, cz - 3.5, () => {
    drawPerson(c, cx + 2.5, cz - 3.5, '#16a34a', '#1e293b', {
      bob: Math.sin(c.t * 2) * 0.3,
    });
    // Kardus stok barang cokelat
    isoBox(c, cx + 2.5, cz - 2.5, 0.9, 0.9, 5.5, '#b45309', { top: '#d97706' });
  }, 0.05);

  q.flush();

  // Pagar Depan & Monumen Identitas SuperMart
  frontRails(c, g);
  monumentSign(c, cx + 6.0, g.z1 - 0.5, '🛒 SuperMart 24/7 Mega Store', 'PUBLIC FACILITY • RETAIL CENTER', '#16a34a', hovered);
};

// =============================================================================
// =============================================================================
// PUBLIC: STASIUN KERETA CEPAT SENTRAL (AERORAIL TRANSIT HUB 350 KM/H)
// =============================================================================
export const renderSentralTrainStation = (c: IsoCtx, cx: number, cz: number, hovered: boolean) => {
  const g = makeGeo(cx, cz, DISTRICT.plotHalfW, DISTRICT.plotHalfD, '#ea580c', '#fb923c', '#c2410c');
  const ctx = c.ctx;
  plinth(c, g, '#f1f5f9', hovered, '#94a3b8');
  floorGrid(c, g.x0, cz - 3.8, g.x1, g.z1, 2.0, 'rgba(148, 163, 184, 0.22)');

  // 1. ZONA DOUBLE-TRACK REL KERETA API (North Corridor: z in [cz - 11.6, cz - 4.0])
  // Ballast bed batu kerikil granit hitam keabuan
  isoRect(c, g.x0, cz - 11.6, g.x1, cz - 4.0, '#1e293b', '#334155');

  // Jalur 2: Rel Bypass / Langsir (North Track: center at track2Z = cz - 9.8)
  const track2Z = cz - 9.8;
  for (let x = g.x0 + 0.6; x <= g.x1 - 0.6; x += 1.2) {
    isoBox(c, x, track2Z, 0.42, 2.8, 1.4, '#475569', { elev: 0, top: '#94a3b8' });
  }
  [-0.8, 0.8].forEach((o) => {
    line(c, P(c, g.x0, track2Z + o, 1.4), P(c, g.x1, track2Z + o, 1.4), '#94a3b8', 1.8 * c.zoom);
    line(c, P(c, g.x0, track2Z + o, 2.1), P(c, g.x1, track2Z + o, 2.1), '#ffffff', 0.8 * c.zoom);
  });
  // Buffer stop hidrolik darurat di ujung barat Jalur 2
  isoBox(c, g.x0 + 1.2, track2Z, 1.2, 2.2, 8, '#dc2626', { elev: 0, top: '#ef4444' });
  isoBox(c, g.x0 + 1.7, track2Z, 0.35, 1.6, 6, '#1e293b', { elev: 1 });

  // Jalur 1: Rel Utama Peron (Platform Track: center at track1Z = cz - 6.2)
  const track1Z = cz - 6.2;
  for (let x = g.x0 + 0.5; x <= g.x1 - 0.5; x += 1.0) {
    isoBox(c, x, track1Z, 0.45, 3.0, 1.6, '#475569', { elev: 0, top: '#94a3b8' });
  }
  [-0.8, 0.8].forEach((o) => {
    line(c, P(c, g.x0, track1Z + o, 1.4), P(c, g.x1, track1Z + o, 1.4), '#cbd5e1', 2.0 * c.zoom);
    line(c, P(c, g.x0, track1Z + o, 2.3), P(c, g.x1, track1Z + o, 2.3), '#ffffff', 0.9 * c.zoom);
  });

  // Sistem Listrik Aliran Atas (Catenary Overhead System)
  const catMasts = [cx - 12.5, cx, cx + 12.5];
  catMasts.forEach((px) => {
    isoBox(c, px, cz - 11.5, 0.5, 0.5, 46, '#334155', { top: '#475569' });
    line(c, P(c, px, cz - 11.5, 43), P(c, px, track1Z, 37), '#475569', 1.6 * c.zoom);
    line(c, P(c, px, cz - 11.5, 34), P(c, px, track1Z, 34), '#475569', 1.2 * c.zoom);
    line(c, P(c, px, track1Z, 37), P(c, px, track1Z, 34), '#64748b', 1.2 * c.zoom);
  });
  line(c, P(c, g.x0, track1Z, 34), P(c, g.x1, track1Z, 34), '#cbd5e1', 1.2 * c.zoom);
  line(c, P(c, g.x0, track2Z, 34), P(c, g.x1, track2Z, 34), '#94a3b8', 1.0 * c.zoom);

  const q = new DepthQueue();

  // 2. KERETA CEPAT AERORAIL EXPRESS (WHOOSH 350 KM/H)
  // Sits strictly on track1Z = cz - 6.2 (100% PARALEL DAN SEJAJAR DENGAN PERON & REL)
  const trainZ = track1Z;
  const bounce = Math.sin(c.t * 3.5) * 0.35;
  const elevBase = 2.4 + bounce;

  const cars = [
    { type: 'coach', cx: cx - 11.0, len: 6.4 },
    { type: 'bellows', cx: cx - 7.4, len: 0.8 },
    { type: 'panto', cx: cx - 3.5, len: 7.0 },
    { type: 'bellows', cx: cx + 0.4, len: 0.8 },
    { type: 'coach', cx: cx + 4.3, len: 7.0 },
    { type: 'bellows', cx: cx + 8.2, len: 0.8 },
    { type: 'loco', cx: cx + 11.2, len: 5.2 },
  ];

  cars.forEach((car) => {
    q.add(car.cx, trainZ, () => {
      if (car.type === 'bellows') {
        // Sambungan antar-gerbong fleksibel akordeon
        isoBox(c, car.cx, trainZ, car.len, 1.85, 13.5, '#0f172a', { elev: elevBase + 2, top: '#1e293b' });
        for (let fold = -0.25; fold <= 0.25; fold += 0.25) {
          line(c, P(c, car.cx + fold, trainZ + 0.93, elevBase + 2), P(c, car.cx + fold, trainZ + 0.93, elevBase + 15), '#334155', 0.8 * c.zoom);
        }
        return;
      }

      const len = car.len;
      // Bogie & Roda Baja (Dual Two-Axle Bogies per gerbong)
      [-len * 0.3, len * 0.3].forEach((bx) => {
        isoBox(c, car.cx + bx, trainZ, 1.7, 1.75, 3.2, '#0f172a', { elev: 0 });
        [-0.55, 0.55].forEach((wx) => {
          glow(c, car.cx + bx + wx, trainZ + 0.85, 1.6, 1.2, '#64748b');
        });
      });

      // Skirt aerodinamis bawah gelap
      isoBox(c, car.cx, trainZ, len, 2.05, 3.5, '#1e293b', { elev: elevBase, top: '#334155' });

      // Fuselage utama putih mutiara aerodinamis
      isoBox(c, car.cx, trainZ, len, 2.05, 12, '#f8fafc', { elev: elevBase + 3.5, top: '#ffffff', left: '#e2e8f0', right: '#cbd5e1' });

      // Cyber Crimson / Whoosh Red Speed Stripe & Cyan Accent Line
      faceZ(c, car.cx - len / 2, car.cx + len / 2, trainZ + 1.03, elevBase + 5.5, elevBase + 8.5, '#ea580c');
      faceZ(c, car.cx - len / 2, car.cx + len / 2, trainZ + 1.032, elevBase + 8.8, elevBase + 9.5, '#0284c7');

      // Jendela Kaca Panorama Berpendar Lampu Kabin Hangat
      const winCount = car.type === 'loco' ? 3 : 5;
      const wSpan = (len - 1.4) / winCount;
      for (let w = 0; w < winCount; w++) {
        const wx0 = car.cx - len / 2 + 0.7 + w * wSpan;
        const wx1 = wx0 + wSpan - 0.35;
        // Frame gelap
        faceZ(c, wx0, wx1, trainZ + 1.034, elevBase + 10, elevBase + 14.5, '#0f172a');
        // Kaca dengan cahaya kabin hangat
        faceZ(c, wx0 + 0.08, wx1 - 0.08, trainZ + 1.036, elevBase + 10.4, elevBase + 14.1, 'rgba(254,240,138,0.92)');
        // Siluet komuter di dalam gerbong
        faceZ(c, wx0 + (wx1 - wx0) * 0.35, wx0 + (wx1 - wx0) * 0.65, trainZ + 1.038, elevBase + 10.4, elevBase + 12.8, '#78350f');
      }

      // Fairing AC atap
      isoBox(c, car.cx, trainZ, len * 0.38, 1.2, 1.4, '#e2e8f0', { elev: elevBase + 15.5 });

      // PANTOGRAPH (Khusus Gerbong Tengah)
      if (car.type === 'panto') {
        const pX = car.cx;
        const pBaseH = elevBase + 15.5;
        line(c, P(c, pX - 0.7, trainZ, pBaseH), P(c, pX, trainZ, pBaseH + 8), '#dc2626', 1.8 * c.zoom);
        line(c, P(c, pX + 0.7, trainZ, pBaseH), P(c, pX, trainZ, pBaseH + 8), '#dc2626', 1.8 * c.zoom);
        line(c, P(c, pX, trainZ, pBaseH + 8), P(c, pX - 0.55, trainZ, 34), '#475569', 1.6 * c.zoom);
        line(c, P(c, pX, trainZ, pBaseH + 8), P(c, pX + 0.55, trainZ, 34), '#475569', 1.6 * c.zoom);
        line(c, P(c, pX - 1.0, trainZ, 34), P(c, pX + 1.0, trainZ, 34), '#0f172a', 2.6 * c.zoom);
        if (Math.sin(c.t * 7) > 0.8) glow(c, pX, trainZ, 34, 4.5, 'rgba(56,189,248,0.95)');
      }

      // HIDUNG AERODINAMIS 3D (Khusus Lokomotif Terdepan)
      if (car.type === 'loco') {
        const n0 = car.cx + len / 2;
        const nTip = n0 + 2.7;
        const noseElevTip = elevBase + 4.5;
        const noseRoofH = elevBase + 15.5;

        // 1. Kap Mesin Aerodinamis Miring Atas (Top Hood)
        poly(c, [
          P(c, n0, trainZ - 1.0, noseRoofH),
          P(c, n0, trainZ + 1.0, noseRoofH),
          P(c, nTip - 0.3, trainZ + 0.3, noseElevTip + 1.8),
          P(c, nTip - 0.3, trainZ - 0.3, noseElevTip + 1.8),
        ], '#f8fafc', 'rgba(15,23,42,0.18)');

        // 2. Kaca Depan Kokpit Masinis (Cockpit Windshield)
        poly(c, [
          P(c, n0 + 0.2, trainZ - 0.9, noseRoofH - 0.5),
          P(c, n0 + 0.2, trainZ + 0.9, noseRoofH - 0.5),
          P(c, n0 + 1.3, trainZ + 0.6, noseRoofH - 4.5),
          P(c, n0 + 1.3, trainZ - 0.6, noseRoofH - 4.5),
        ], '#0f172a');
        poly(c, [
          P(c, n0 + 0.3, trainZ - 0.5, noseRoofH - 1.2),
          P(c, n0 + 0.3, trainZ + 0.2, noseRoofH - 1.2),
          P(c, n0 + 1.1, trainZ + 0.1, noseRoofH - 4.2),
          P(c, n0 + 1.1, trainZ - 0.4, noseRoofH - 4.2),
        ], 'rgba(56,189,248,0.75)');

        // 3. Pipi Aerodinamis Depan (+z face)
        poly(c, [
          P(c, n0, trainZ + 1.02, elevBase + 3.5),
          P(c, n0, trainZ + 1.02, noseRoofH),
          P(c, nTip - 0.3, trainZ + 0.3, noseElevTip + 1.8),
          P(c, nTip, trainZ, noseElevTip),
          P(c, nTip, trainZ, elevBase + 1.8),
        ], '#e2e8f0', 'rgba(15,23,42,0.18)');

        // Crimson racing stripe melengkung mengikuti moncong
        poly(c, [
          P(c, n0, trainZ + 1.03, elevBase + 5.5),
          P(c, n0, trainZ + 1.03, elevBase + 8.5),
          P(c, nTip - 0.3, trainZ + 0.28, noseElevTip + 1.5),
          P(c, nTip, trainZ, noseElevTip),
        ], '#ea580c');

        // Skirt aerodinamis bawah moncong
        poly(c, [
          P(c, n0, trainZ + 1.02, elevBase),
          P(c, n0, trainZ + 1.02, elevBase + 3.5),
          P(c, nTip, trainZ, elevBase + 1.8),
          P(c, nTip, trainZ, elevBase),
        ], '#1e293b');

        // Lampu Depan LED Kembar Berpendar Terang (Projector Headlights)
        glow(c, nTip - 0.1, trainZ + 0.15, noseElevTip, 6.5, 'rgba(254,240,138,0.95)');
        glow(c, nTip - 0.1, trainZ - 0.15, noseElevTip, 6.5, 'rgba(254,240,138,0.95)');

        // Berkas Cahaya Lampu Menyorot ke Depan Rel
        poly(c, [
          P(c, nTip, trainZ, noseElevTip),
          P(c, g.x1 + 3.0, trainZ - 1.2, 0),
          P(c, g.x1 + 3.0, trainZ + 1.2, 0),
        ], 'rgba(254,240,138,0.18)');
      }
    }, -1.0);
  });

  // 3. PERON PENUMPANG STASIUN (ELEVATED PLATFORM: z in [cz - 3.8, cz + 2.5])
  // Raised platform deck elevated 4.5 px (flush dengan pintu kereta api)
  q.add(cx, cz - 0.6, () => {
    isoBox(c, cx, cz - 0.6, 31.0, 6.4, 4.5, '#e2e8f0', { elev: 0, top: '#f8fafc', left: '#cbd5e1', right: '#94a3b8' });
    // Ubin taktil keselamatan kuning cerah sepanjang bibir peron
    isoRect(c, cx - 15.5, cz - 3.7, cx + 15.5, cz - 3.2, '#facc15', '#ca8a04', 4.5);
    for (let tx = cx - 15.0; tx <= cx + 15.0; tx += 1.0) {
      isoBox(c, tx, cz - 3.45, 0.4, 0.3, 0.4, '#eab308', { elev: 4.5, stroke: null });
    }
    // Garis batas keselamatan putih
    line(c, P(c, cx - 15.5, cz - 3.1, 4.5), P(c, cx + 15.5, cz - 3.1, 4.5), '#ffffff', 1.5 * c.zoom);
  }, -0.5);

  // Bangku Tunggu Stainless Steel & Teak Wood di Peron
  [-9.5, -1.0, 7.5].forEach((bx) => {
    q.add(cx + bx, cz - 0.8, () => {
      isoBox(c, cx + bx, cz - 0.8, 2.4, 0.7, 2.5, '#64748b', { elev: 4.5 });
      isoBox(c, cx + bx, cz - 0.8, 2.2, 0.6, 0.8, '#b45309', { elev: 7.0, top: '#d97706' });
    });
  });

  // Papan Informasi Jadwal Jalur 1 Gantung (Platform Overhead Display)
  [-4.0, 5.0].forEach((sx) => {
    q.add(cx + sx, cz - 1.5, () => {
      line(c, P(c, cx + sx, cz - 1.5, 18), P(c, cx + sx, cz - 1.5, 34), '#475569', 1.2 * c.zoom);
      isoBox(c, cx + sx, cz - 1.5, 3.4, 0.3, 2.0, '#0f172a', { elev: 16 });
      faceZ(c, cx + sx - 1.6, cx + sx + 1.6, cz - 1.34, 16.2, 17.8, '#0f172a');
      faceZ(c, cx + sx - 1.5, cx + sx + 1.5, cz - 1.33, 16.5, 17.5, '#22c55e');
    });
  });

  // NPC Stasiun di Peron
  q.add(cx + 9.5, cz - 2.0, () => {
    // Masinis / Kepala Stasiun Farhan
    drawPerson(c, cx + 9.5, cz - 2.0, '#0f172a', '#1e293b', { skin: '#fed7aa', seated: false, bob: Math.sin(c.t * 2) * 0.3 });
    const p = P(c, cx + 9.5, cz - 2.0, 18.5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(p.x - 3 * c.zoom, p.y - 1.5 * c.zoom, 6 * c.zoom, 2 * c.zoom);
  }, 0.05);

  q.add(cx - 0.5, cz - 2.2, () => {
    // Penumpang Rina dengan Koper Beroda
    drawPerson(c, cx - 0.5, cz - 2.2, '#db2777', '#334155', { skin: '#fed7aa', seated: false, bob: Math.sin(c.t * 1.5) * 0.4 });
    isoBox(c, cx + 0.3, cz - 2.0, 0.5, 0.4, 5, '#475569', { elev: 4.5, top: '#64748b' });
  }, 0.05);

  q.add(cx - 1.0, cz - 0.8, () => {
    // Komuter Duduk Menikmati Kopi
    drawPerson(c, cx - 1.0, cz - 0.8, '#0284c7', '#78350f', { skin: '#fed7aa', seated: true, cup: true });
  }, 0.05);

  // 4. CONCOURSE & HALL TIKET STASIUN (z in [cz + 2.8, cz + 11.5])
  // Gerbang Tiket Pintar RFID (6 Turnstiles di cz + 6.0)
  [-5.0, -3.0, -1.0, 1.0, 3.0, 5.0].forEach((gx) => {
    q.add(cx + gx, cz + 6.0, () => {
      isoBox(c, cx + gx, cz + 6.0, 0.5, 1.6, 9, '#334155', { top: '#475569' });
      glow(c, cx + gx, cz + 5.7, 9.5, 2.2, Math.sin(c.t * 2 + gx) > 0 ? 'rgba(34,197,94,0.95)' : 'rgba(56,189,248,0.95)');
    });
  });

  // Mesin Tiket Otomatis TVM di Dinding Barat
  [cz + 5.0, cz + 7.2, cz + 9.4].forEach((dz) => {
    q.add(g.x0 + 1.2, dz, () => {
      isoBox(c, g.x0 + 1.2, dz, 0.9, 1.5, 20, '#1d4ed8', { top: '#2563eb' });
      faceX(c, g.x0 + 1.66, dz - 0.5, dz + 0.5, 11, 17, '#38bdf8');
    });
  });

  // Papan Keberangkatan Utama Digital (Grand Master Departure Board)
  q.add(cx + 8.5, cz + 6.0, () => {
    line(c, P(c, cx + 6.8, cz + 6.0, 0), P(c, cx + 6.8, cz + 6.0, 22), '#374151', 1.6 * c.zoom);
    line(c, P(c, cx + 10.2, cz + 6.0, 0), P(c, cx + 10.2, cz + 6.0, 22), '#374151', 1.6 * c.zoom);
    isoBox(c, cx + 8.5, cz + 6.0, 4.2, 0.35, 11, '#0f172a', { elev: 22 });
    for (let r = 0; r < 3; r++) {
      faceZ(c, cx + 6.7, cx + 9.0, cz + 6.18, 30 - r * 3, 31.4 - r * 3, '#fbbf24');
      faceZ(c, cx + 9.3, cx + 10.4, cz + 6.18, 30 - r * 3, 31.4 - r * 3, r === 0 ? '#22c55e' : '#38bdf8');
    }
  });

  // Cafe & Kios "Whoosh Express"
  q.add(cx + 13.2, cz + 9.5, () => {
    isoBox(c, cx + 13.2, cz + 9.5, 2.8, 2.2, 12, '#5c3a21', { top: '#f8fafc' });
    isoBox(c, cx + 13.6, cz + 9.2, 0.8, 0.8, 5, '#dc2626', { elev: 12, top: '#ef4444' });
    drawPerson(c, cx + 13.2, cz + 8.8, '#1e293b', '#1e293b', { skin: '#fed7aa', seated: false });
  });

  // Tanaman Arsitektural dalam Pot Modern
  q.add(g.x0 + 1.4, cz + 10.8, () => drawPlant(c, g.x0 + 1.4, cz + 10.8, 1.3));
  q.add(cx - 7.2, cz + 7.5, () => drawPlant(c, cx - 7.2, cz + 7.5, 1.2));
  q.add(cx + 11.0, cz + 10.8, () => drawPlant(c, cx + 11.0, cz + 10.8, 1.3));

  // Komuter berjalan lewat gate
  const walkZ = cz + 10 - ((c.t * 0.9) % 11);
  if (walkZ > cz + 3.0) {
    q.add(cx - 2.0, walkZ, () => drawPerson(c, cx - 2.0, walkZ, '#7c3aed', '#111827', { bob: Math.abs(Math.sin(c.t * 7)) * 1.2 }), 0.05);
  }

  q.flush();

  // 5. KANOPI MELENGKUNG ARSITEKTURAL (VAULTED TRANSLUCENT GLASS & STEEL CANOPY)
  // Tiang-tiang busur baja di sisi platform & rel
  [-12.0, -4.0, 4.0, 12.0].forEach((dx) => {
    isoBox(c, cx + dx, cz - 4.2, 0.35, 0.35, 42, '#334155');
    isoBox(c, cx + dx, cz + 2.2, 0.35, 0.35, 42, '#334155');
    line(c, P(c, cx + dx, cz - 4.2, 42), P(c, cx + dx, cz - 1.0, 46), '#64748b', 2.0 * c.zoom);
    line(c, P(c, cx + dx, cz + 2.2, 42), P(c, cx + dx, cz - 1.0, 46), '#64748b', 2.0 * c.zoom);
  });
  // Atap kaca arsitektural transparan
  isoBox(c, cx, cz - 1.0, 31.5, 6.8, 1.8, '#bae6fd', { elev: 42, alpha: 0.35, stroke: 'rgba(2,132,199,0.75)' });
  faceZ(c, cx - 15.75, cx + 15.75, cz + 2.41, 41.5, 43.8, '#ea580c');

  // Pagar kaca pembatas depan & Monumen Nama Stasiun
  frontRails(c, g);
  monumentSign(c, cx, g.z1 + 1.1, '🚄 SENTRAL AERORAIL TERMINAL', 'TRANSIT HUB • WHOOSH EXPRESS 350 KM/H', '#ea580c', hovered);
  void ctx;
};

export const renderTrainStation = (c: IsoCtx, hovered: boolean) => {
  renderSentralTrainStation(c, DISTRICT.station.cx, DISTRICT.station.cz, hovered);
};

// =============================================================================
// PUBLIC: TAMAN KOTA (plot sudut selatan)
// =============================================================================
export const renderPark = (c: IsoCtx, cx: number, cz: number, variant: 'fountain' | 'pond') => {
  const g = makeGeo(cx, cz, DISTRICT.plotHalfW, DISTRICT.plotHalfD, '#16a34a', '#22c55e', '#15803d');
  isoRect(c, g.x0, g.z0, g.x1, g.z1, '#93cc7e', '#7fb86a');
  // jalur paving bersilang
  isoRect(c, cx - 1.2, g.z0, cx + 1.2, g.z1, '#e7dccb');
  isoRect(c, g.x0, cz - 1.2, g.x1, cz + 1.2, '#e7dccb');
  const q = new DepthQueue();
  if (variant === 'fountain') {
    isoEllipse(c, cx, cz, 4, '#e7dccb', 0, '#cbbfa9');
    q.add(cx, cz, () => {
      isoCyl(c, cx, cz, 3, 4, '#a8a29e', 0, '#7dd3fc');
      isoCyl(c, cx, cz, 0.5, 14, '#d6d3d1', 4);
      isoCyl(c, cx, cz, 1.4, 2, '#d6d3d1', 18, '#7dd3fc');
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const ph = (c.t * 1.2 + i * 0.3) % 1;
        const top = P(c, cx, cz, 20);
        const end = P(c, cx + Math.cos(a) * 2.2, cz + Math.sin(a) * 2.2, 4);
        c.ctx.strokeStyle = 'rgba(186,230,253,0.85)';
        c.ctx.lineWidth = 1.2 * c.zoom;
        c.ctx.beginPath();
        c.ctx.moveTo(top.x, top.y);
        c.ctx.quadraticCurveTo((top.x + end.x) / 2, top.y - 10 * c.zoom, end.x, end.y);
        c.ctx.stroke();
        const dp = { x: top.x + (end.x - top.x) * ph, y: top.y + (end.y - top.y) * ph - Math.sin(ph * Math.PI) * 8 * c.zoom };
        c.ctx.fillStyle = '#e0f2fe';
        c.ctx.beginPath();
        c.ctx.arc(dp.x, dp.y, 1.4 * c.zoom, 0, Math.PI * 2);
        c.ctx.fill();
      }
    });
  } else {
    isoEllipse(c, cx + 6, cz + 5, 4.2, '#60a5fa', 0, '#3b82f6');
    isoEllipse(c, cx + 6, cz + 5, 3.2, '#93c5fd');
    q.add(cx + 6.5, cz + 5.5, () => {
      const p = P(c, cx + 6.5 + Math.sin(c.t * 0.4) * 1.5, cz + 5.5, 1);
      c.ctx.fillStyle = '#fafafa';
      c.ctx.beginPath();
      c.ctx.ellipse(p.x, p.y, 5 * c.zoom, 3 * c.zoom, 0, 0, Math.PI * 2);
      c.ctx.fill();
      c.ctx.beginPath();
      c.ctx.arc(p.x - 4 * c.zoom, p.y - 4 * c.zoom, 2 * c.zoom, 0, Math.PI * 2);
      c.ctx.fill();
    });
    // gazebo
    q.add(cx - 7, cz - 6, () => {
      [
        [-1.5, -1.5],
        [1.5, -1.5],
        [-1.5, 1.5],
        [1.5, 1.5],
      ].forEach(([ox, oz]) => isoBox(c, cx - 7 + ox, cz - 6 + oz, 0.25, 0.25, 22, '#92400e'));
      isoBox(c, cx - 7, cz - 6, 4, 4, 3, '#b45309', { elev: 22, top: '#9a3412' });
    });
  }
  // bangku taman
  [
    [-5, -3],
    [5, -3],
    [-5, 3],
  ].forEach(([dx, dz]) =>
    q.add(cx + dx, cz + dz, () => {
      isoBox(c, cx + dx, cz + dz, 2.2, 0.6, 1.5, '#a16207', { elev: 7 });
      isoBox(c, cx + dx, cz + dz - 0.3, 2.2, 0.1, 5, '#854d0e', { elev: 8.5 });
      isoBox(c, cx + dx - 0.9, cz + dz, 0.15, 0.5, 7, '#374151');
      isoBox(c, cx + dx + 0.9, cz + dz, 0.15, 0.5, 7, '#374151');
    })
  );
  [
    [-12, -8],
    [12, -8],
    [-12, 8],
    [12, 9],
    [-12.5, 0.5],
    [13, 0],
  ].forEach(([dx, dz], i) => q.add(cx + dx, cz + dz, () => drawTree(c, cx + dx, cz + dz, 1, i * 3 + cx)));
  // pengunjung taman
  const wx = cx + Math.sin(c.t * 0.25) * 10;
  q.add(wx, cz + 0.3, () => drawPerson(c, wx, cz + 0.3, '#0ea5e9', '#1f2937', { bob: Math.abs(Math.sin(c.t * 6)) }), 0.05);
  q.flush();
};

// =============================================================================
// PUBLIC: GROUND DISTRIK
// =============================================================================
export const renderDistrictGround = (c: IsoCtx) => {
  const { ctx } = c;
  const D = DISTRICT;
  const tl = P(c, D.minX, D.minZ);
  const tr = P(c, D.maxX, D.minZ);
  const br = P(c, D.maxX, D.maxZ);
  const bl = P(c, D.minX, D.maxZ);
  const depth = 16 * c.zoom;
  // tanah pulau (sisi depan & kanan)
  poly(c, [bl, br, { x: br.x, y: br.y + depth }, { x: bl.x, y: bl.y + depth }], '#a47551');
  poly(c, [br, tr, { x: tr.x, y: tr.y + depth }, { x: br.x, y: br.y + depth }], '#8a6141');
  poly(c, [bl, br, { x: br.x, y: br.y + 4 * c.zoom }, { x: bl.x, y: bl.y + 4 * c.zoom }], '#6fae5a');
  poly(c, [tl, tr, br, bl], '#9fd38d', '#86c072', 1.5);
  // rumput tekstur
  ctx.strokeStyle = '#86c072';
  ctx.lineWidth = Math.max(0.6, 1 * c.zoom);
  for (let i = 0; i < 260; i++) {
    const x = D.minX + 1 + hash(i * 1.37) * (D.maxX - D.minX - 2);
    const z = D.minZ + 1 + hash(i * 4.11) * (D.maxZ - D.minZ - 2);
    const p = P(c, x, z);
    ctx.beginPath();
    ctx.moveTo(p.x - 3 * c.zoom, p.y);
    ctx.lineTo(p.x, p.y - 4 * c.zoom);
    ctx.lineTo(p.x + 3 * c.zoom, p.y);
    ctx.stroke();
  }
  for (let i = 0; i < 70; i++) {
    const x = D.minX + 1 + hash(i * 9.3) * (D.maxX - D.minX - 2);
    const z = D.minZ + 1 + hash(i * 2.9) * (D.maxZ - D.minZ - 2);
    const p = P(c, x, z);
    ctx.fillStyle = ['#fef08a', '#ffffff', '#fbcfe8'][i % 3];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8 * c.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  // jalan setapak dari tiap pintu kavling ke trotoar
  [-84, -42, 0, 42, 84].forEach((x) => isoRect(c, x - 2.2, D.northRowZ + D.plotHalfD, x + 2.2, 14.2, '#e7dccb', '#d6c8b2'));
  [-84, -42, 0, 42, 84].forEach((x) => isoRect(c, x - 2.2, 24.8, x + 2.2, D.southRowZ - D.plotHalfD, '#e7dccb', '#d6c8b2'));
};

/** Baris pohon (hanya untuk area yang tidak tumpang tindih dengan kavling). */
export const renderTreeRow = (c: IsoCtx, z: number, xs: number[], size = 1.2) => {
  xs.forEach((x, i) => drawTree(c, x, z + (i % 2) * 0.8, size, i * 1.7 + z));
};

/** Pohon di celah antar kavling (gambar di antara kavling kiri & kanan). */
export const renderGapTrees = (c: IsoCtx, x: number, rowZ: number) => {
  drawTree(c, x - 0.6, rowZ - 7, 1.05, x);
  drawPlant(c, x + 1.2, rowZ - 1, 1.3, '#a8a29e', '#3f8f3a');
  drawTree(c, x + 0.6, rowZ + 6, 1.05, x + 5);
};

// =============================================================================
// PUBLIC: TEMA KANTOR UTAMA (ShadowMove / milik user)
// =============================================================================
export interface MainOfficeTheme {
  label: string;
  accent: string;
  slab: string;
  slabStroke: string;
  cafe: [string, string];
  lobby: [string, string];
  lobbyCheck: string;
  relax: [string, string];
  suite: [string, string];
  podL: [string, string];
  podR: [string, string];
  sprint: [string, string];
}

export const MAIN_OFFICE_THEMES: Record<OfficeLayoutTemplateId, MainOfficeTheme> = {
  tech_startup: {
    label: 'Tech Startup Agile',
    accent: '#c85a2b',
    slab: '#f8f2e7',
    slabStroke: '#d6c5af',
    cafe: ['#e8a882', '#c98a65'],
    lobby: ['#f5ede1', '#d4c4b0'],
    lobbyCheck: '#e0d2c0',
    relax: ['#fdfaf3', '#e8decb'],
    suite: ['#f5f0e6', '#e6decb'],
    podL: ['#c8e6ce', '#a7d3ae'],
    podR: ['#dfd5f0', '#c2b0dc'],
    sprint: ['#e6f7f6', '#b4e8e4'],
  },
  cloud_datacenter: {
    label: 'Cloud Datacenter',
    accent: '#0284c7',
    slab: '#e8eef5',
    slabStroke: '#b6c4d4',
    cafe: ['#cbd5e1', '#94a3b8'],
    lobby: ['#f1f5f9', '#cbd5e1'],
    lobbyCheck: '#dbe4ee',
    relax: ['#e0f2fe', '#bae6fd'],
    suite: ['#eef2ff', '#c7d2fe'],
    podL: ['#bae6fd', '#7dd3fc'],
    podR: ['#c7d2fe', '#a5b4fc'],
    sprint: ['#cffafe', '#67e8f9'],
  },
  cafe_agency: {
    label: 'Cafe & Agency',
    accent: '#b45309',
    slab: '#f3e3cc',
    slabStroke: '#cfae86',
    cafe: ['#c9895a', '#a86a40'],
    lobby: ['#efe2cf', '#d2b894'],
    lobbyCheck: '#3f3a36',
    relax: ['#d9eadb', '#a9c9ae'],
    suite: ['#e7cfa9', '#c8a77a'],
    podL: ['#e9d3b1', '#c9a77c'],
    podR: ['#f2c9a5', '#d9a47a'],
    sprint: ['#f5e6c8', '#dcc395'],
  },
  fintech_trading: {
    label: 'FinTech Trading Floor',
    accent: '#059669',
    slab: '#e7e5e4',
    slabStroke: '#a8a29e',
    cafe: ['#d6d3d1', '#a8a29e'],
    lobby: ['#f5f5f4', '#d6d3d1'],
    lobbyCheck: '#292524',
    relax: ['#fef3c7', '#fcd34d'],
    suite: ['#fde68a', '#d4a72c'],
    podL: ['#a7f3d0', '#34d399'],
    podR: ['#d1fae5', '#6ee7b7'],
    sprint: ['#ccfbf1', '#5eead4'],
  },
  creative_genai: {
    label: 'Creative GenAI Studio',
    accent: '#db2777',
    slab: '#fdf6f0',
    slabStroke: '#f0cfe0',
    cafe: ['#fed7aa', '#fdba74'],
    lobby: ['#fff7ed', '#fbcfe8'],
    lobbyCheck: '#fce7f3',
    relax: ['#fdf2f8', '#f9a8d4'],
    suite: ['#ede9fe', '#c4b5fd'],
    podL: ['#fbcfe8', '#f472b6'],
    podR: ['#ddd6fe', '#a78bfa'],
    sprint: ['#d9f99d', '#a3e635'],
  },
  robotics_hardware: {
    label: 'Robotics Hardware Lab',
    accent: '#ca8a04',
    slab: '#e5e7eb',
    slabStroke: '#9ca3af',
    cafe: ['#cbd5e1', '#94a3b8'],
    lobby: ['#f3f4f6', '#d1d5db'],
    lobbyCheck: '#facc15',
    relax: ['#e2e8f0', '#cbd5e1'],
    suite: ['#f1f5f9', '#cbd5e1'],
    podL: ['#d1d5db', '#9ca3af'],
    podR: ['#fde68a', '#facc15'],
    sprint: ['#fef9c3', '#fde047'],
  },
};

/**
 * Dekorasi khas tema di dinding belakang kantor utama (strip x -6.6..6.6, z ≈ -11.3),
 * area yang kosong di antara jendela kiri & kanan.
 */
export const renderMainOfficeSignature = (c: IsoCtx, template: OfficeLayoutTemplateId) => {
  const z = -11.3;
  const theme = MAIN_OFFICE_THEMES[template] ?? MAIN_OFFICE_THEMES.tech_startup;
  // papan nama tema
  faceZ(c, -4, 4, -11.79, 40, 46, theme.accent);
  const sp = P(c, 0, -11.79, 43);
  const ctx = c.ctx;
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.transform(1, 16 / 30, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(5, Math.round(7 * c.zoom))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(theme.label.toUpperCase(), 0, 0);
  ctx.restore();

  switch (template) {
    case 'cloud_datacenter':
      [-5.6, -4.6, 4.6, 5.6].forEach((x, i) => serverRack(c, x, z, 34, i));
      isoBox(c, 0, z + 0.1, 5, 0.15, 14, '#0f172a', { elev: 16 });
      faceZ(c, -2.3, 2.3, z + 0.18, 17, 29, '#0369a1');
      for (let b = 0; b < 8; b++) faceZ(c, -2 + b * 0.55, -1.7 + b * 0.55, z + 0.185, 18, 19 + Math.abs(Math.sin(c.t + b)) * 8, '#67e8f9');
      break;
    case 'cafe_agency':
      isoBox(c, -4.8, z, 2.6, 0.6, 30, '#5b3a29');
      for (let r = 0; r < 4; r++) for (let b = 0; b < 5; b++) faceZ(c, -5.9 + b * 0.45, -5.6 + b * 0.45, z + 0.31, 3 + r * 7, 8 + r * 7, ['#dc2626', '#2563eb', '#16a34a', '#f59e0b'][(b + r) % 4]);
      faceZ(c, -2.4, 2.4, -11.78, 20, 34, '#1f2937', '#5b3a29');
      for (let r = 0; r < 4; r++) faceZ(c, -2, 1.5 - r * 0.5, -11.775, 30 - r * 3, 30.8 - r * 3, 'rgba(255,255,255,0.8)');
      isoBox(c, 4.8, z, 2.6, 0.6, 12, '#78350f', { top: '#a16207' });
      for (let i = 0; i < 3; i++) isoCyl(c, 4 + i * 0.8, z, 0.3, 5, '#d6b98c', 12);
      break;
    case 'fintech_trading':
      isoBox(c, 0, z + 0.1, 11, 0.15, 16, '#020617', { elev: 14 });
      for (let k = 0; k < 4; k++) {
        const xa = -5.2 + k * 2.65;
        faceZ(c, xa, xa + 2.4, z + 0.18, 15, 29, '#0b1324');
        for (let b = 0; b < 6; b++) {
          const v = Math.sin(c.t + b + k * 2);
          faceZ(c, xa + 0.2 + b * 0.36, xa + 0.4 + b * 0.36, z + 0.185, 21 + v * 3, 23 + v * 3 + 1.5, v > 0 ? '#22c55e' : '#ef4444');
        }
      }
      break;
    case 'creative_genai':
      [-4.5, -1.5, 1.5, 4.5].forEach((x, i) => {
        faceZ(c, x - 1.2, x + 1.2, -11.78, 14, 32, '#1f2937');
        const hue = (c.t * 25 + i * 90) % 360;
        faceZ(c, x - 1.05, x + 1.05, -11.775, 15, 31, `hsl(${hue},80%,68%)`);
      });
      break;
    case 'robotics_hardware':
      faceZ(c, -6.4, 6.4, -11.78, 12, 34, '#d6d3d1', '#78716c');
      for (let i = 0; i < 14; i++) faceZ(c, -6 + i * 0.85, -5.6 + i * 0.85 + (i % 3) * 0.15, -11.775, 16 + (i % 2) * 8, 22 + (i % 2) * 8, ['#dc2626', '#2563eb', '#111827', '#f59e0b'][i % 4]);
      break;
    case 'tech_startup':
    default:
      faceZ(c, -5, 5, -11.78, 14, 32, '#ffffff', '#cbd5e1');
      for (let i = 0; i < 12; i++) faceZ(c, -4.6 + (i % 6) * 1.5, -3.6 + (i % 6) * 1.5, -11.775, 17 + Math.floor(i / 6) * 7, 22 + Math.floor(i / 6) * 7, ['#fde047', '#f9a8d4', '#86efac', '#93c5fd'][i % 4]);
      break;
  }
};
