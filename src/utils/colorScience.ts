// ◎ 2026-03-30 — colorScience.ts
// CIE2000 ΔE 色差計算 (純 TypeScript，無外部依賴)
// 標準: CIE 142-2001, Luo/Cui/Li 2001
// 用途: NODE 12 QA — 驗證 VDL 渲染結果與目標色彩的感知色差

// ─── sRGB → Lab 轉換鏈 ─────────────────────────────────────────

/** sRGB [0,255] → 線性 RGB [0,1] */
function srgbToLinear(c: number): number {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

/** 線性 RGB [0,1] → CIE XYZ (D65 白點) */
function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  return [X, Y, Z];
}

/** XYZ → CIE L*a*b* (D65: Xn=0.95047, Yn=1.00000, Zn=1.08883) */
function xyzToLab(X: number, Y: number, Z: number): [number, number, number] {
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(X / 0.95047);
  const fy = f(Y / 1.00000);
  const fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** sRGB hex string ("#RRGGBB") → [L, a, b] */
export function hexToLab(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const [rl, gl, bl] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return xyzToLab(...linearRgbToXyz(rl, gl, bl));
}

/** sRGB 三元組 [0,255] → [L, a, b] */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  return xyzToLab(...linearRgbToXyz(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)));
}

// ─── CIE2000 ΔE 核心公式 ──────────────────────────────────────

const RAD = Math.PI / 180;

/** CIE2000 ΔE 計算 (kL=kC=kH=1, 標準條件) */
export function deltaE2000(
  lab1: [number, number, number],
  lab2: [number, number, number]
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;

  // Step 1: C*ab
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cb = (C1 + C2) / 2;
  const Cb7 = Math.pow(Cb, 7);
  const G = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  // Step 2: h' (hue angle)
  const h1p = (b1 === 0 && a1p === 0) ? 0 : ((Math.atan2(b1, a1p) * 180 / Math.PI + 360) % 360);
  const h2p = (b2 === 0 && a2p === 0) ? 0 : ((Math.atan2(b2, a2p) * 180 / Math.PI + 360) % 360);

  // Step 3: ΔL', ΔC', ΔH'
  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0)      dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else                       dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2 * RAD);

  // Step 4: 加權函數
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let Hbp: number;
  if (C1p * C2p === 0)                    Hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180)    Hbp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360)               Hbp = (h1p + h2p + 360) / 2;
  else                                     Hbp = (h1p + h2p - 360) / 2;

  const T =
    1
    - 0.17 * Math.cos((Hbp - 30) * RAD)
    + 0.24 * Math.cos(2 * Hbp * RAD)
    + 0.32 * Math.cos((3 * Hbp + 6) * RAD)
    - 0.20 * Math.cos((4 * Hbp - 63) * RAD);

  const SL = 1 + 0.015 * Math.pow(Lbp - 50, 2) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;

  const Cbp7 = Math.pow(Cbp, 7);
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + Math.pow(25, 7)));
  const dTheta = 30 * Math.exp(-Math.pow((Hbp - 275) / 25, 2));
  const RT = -Math.sin(2 * dTheta * RAD) * RC;

  return Math.sqrt(
    Math.pow(dLp / SL, 2) +
    Math.pow(dCp / SC, 2) +
    Math.pow(dHp / SH, 2) +
    RT * (dCp / SC) * (dHp / SH)
  );
}

// ─── VDL QA 快捷函式 ──────────────────────────────────────────

/**
 * 比較兩個 hex 色彩的 CIE2000 ΔE
 * ΔE < 1.0  → 幾乎不可見差異
 * ΔE < 3.0  → VDL 允許閾值 (QA_THRESHOLDS.deltaEColor)
 * ΔE > 5.0  → 明顯色差，需修正
 */
export function deltaEHex(hex1: string, hex2: string): number {
  return deltaE2000(hexToLab(hex1), hexToLab(hex2));
}

/**
 * 批次比較調色板與目標調色板，回傳每對的 ΔE 與平均值
 * @param rendered  實際渲染出的 hex 色列 (最多 5 個)
 * @param target    目標 hex 色列
 */
export function paletteDeltaE(
  rendered: string[],
  target: string[]
): { pairs: number[]; mean: number; maxPair: number } {
  const n = Math.min(rendered.length, target.length);
  const pairs = Array.from({ length: n }, (_, i) => deltaEHex(rendered[i], target[i]));
  const mean = pairs.length ? pairs.reduce((a, b) => a + b, 0) / pairs.length : 0;
  const maxPair = pairs.length ? Math.max(...pairs) : 0;
  return { pairs, mean, maxPair };
}
