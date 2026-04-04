// ◎ 2026-03-29 — ndfToVdl.ts
// NDF (T/E/I/C) → VDL Photometric 自動映射橋
// 讓 NODE 05 的輸出自動預填 NODE 06 的欄位
// Phase 10 P1: palette02ToPhotometric — NODE 02 色盤 hex → 光度學參數推算橋

import { hexToLab } from '../utils/colorScience';

// ─── 型別定義 ─────────────────────────────────────────────────

export interface NDFValues {
  T: number;   // Tension 0-1
  E: number;   // Emotion 0-1
  I: number;   // Information 0-1
  C: number;   // CharFocus 0-1
}

export interface VDLPhotometric {
  kelvin:     number;   // 色溫 K
  ev:         number;   // 曝光值
  contrast:   number;   // 對比度 0-1
  saturation: number;   // 飽和度 0-1
  shadowLift: number;   // 暗部提升 0-0.1
}

export interface VDLCamera {
  focalLength:   number;  // 焦距 mm
  aperture:      number;  // f-stop
  negativeSpace: number;  // 留白比例 0-1
  // I(x) 知識量體物理對應 (Gemini Gap 3)
  depthLayers: 'shallow' | 'moderate' | 'deep_focus';  // 景深層次
  objDensity:  'minimal' | 'moderate' | 'dense';        // 物件密度
}

export interface VDLMapped {
  photometric: VDLPhotometric;
  camera:      VDLCamera;
  promptHint:  string;   // 語意摘要，可附加至生成提示詞
}

// ─── 線性插值工具 ─────────────────────────────────────────────

function lerp(t: number, min: number, max: number): number {
  return min + t * (max - min);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── 核心映射規則 ─────────────────────────────────────────────
//
// 設計原則（物質本真）：
//   T (Tension)   → 低色溫(戲劇)、低EV(陰暗)、高對比(視覺衝突)
//   E (Emotion)   → 高飽和(情感濃度)、高對比(情緒強化)
//   I (Information)→ 高EV(可見度/清晰度)、低對比(細節保留)
//   C (CharFocus)  → 短焦距(壓縮空間)、大光圈(主體突出)、小留白

export function ndfToVdl(ndf: NDFValues): VDLMapped {
  const { T, E, I, C } = ndf;

  // ── 色溫 (Kelvin) ──────────────────────────────────────────
  // 高張力 → 低色溫(暗橙/紅，戲劇感)
  // 高知識量 → 高色溫(冷藍/白，清晰科技感)
  // 基準: 5500K，T 下拉至 2800K，I 上推至 7000K
  const kelvin = clamp(
    lerp(1 - T, 3200, 5500) + lerp(I, 0, 1500),
    2800, 7500
  );

  // ── 曝光值 (EV) ────────────────────────────────────────────
  // 高張力 → 低曝光(壓抑/陰暗)
  // 高知識量 → 高曝光(明亮/清晰)
  // 範圍: -1.5 ~ +1.0
  const ev = clamp(
    lerp(I, -0.5, 1.0) + lerp(1 - T, -1.0, 0),
    -2.0, 2.0
  );

  // ── 對比度 (Contrast) ──────────────────────────────────────
  // 高張力 → 高對比(視覺衝突) T 貢獻 60%
  // 高情緒 → 高對比(情感強化) E 貢獻 40%
  // 高知識量 → 低對比(細節保留) I 反向影響
  const contrast = clamp(
    lerp(T, 0.3, 0.9) * 0.6 +
    lerp(E, 0.3, 0.85) * 0.4 -
    lerp(I, 0, 0.15),
    0.0, 1.0
  );

  // ── 飽和度 (Saturation) ────────────────────────────────────
  // 高情緒 → 高飽和(情感強度)
  // 高張力 → 略降飽和(去色 = 壓迫感) T 輕微反向
  // 知識量中性(資訊呈現不需特別色彩)
  const saturation = clamp(
    lerp(E, 0.3, 0.9) - lerp(T, 0, 0.15),
    0.1, 1.0
  );

  // ── 暗部提升 (ShadowLift) ──────────────────────────────────
  // 高知識量 → 提升暗部(細節可見)
  // 高張力 → 壓暗暗部(深邃陰影)
  const shadowLift = clamp(
    lerp(I, 0.0, 0.08) - lerp(T, 0, 0.04),
    0.0, 0.1
  );

  // ── 焦距 (FocalLength) ─────────────────────────────────────
  // 高角色焦點 → 短焦(廣角壓縮，角色與環境接近)
  // 低角色焦點 → 長焦(壓縮背景，環境主導)
  const focalLength = clamp(lerp(1 - C, 24, 100), 18, 135);

  // ── 光圈 (Aperture) ────────────────────────────────────────
  // 高角色焦點 → 大光圈(淺景深，角色突出)
  // 低角色焦點 → 小光圈(深景深，環境展示)
  const aperture = clamp(lerp(1 - C, 1.4, 11.0), 1.4, 16.0);

  // ── 留白比例 (NegativeSpace) ───────────────────────────────
  // 高角色焦點 → 少留白(主體佔滿)
  // 低角色焦點 → 多留白(環境呼吸空間)
  // 高張力 → 少留白(緊張窒息感)
  const negativeSpace = clamp(
    lerp(1 - C, 0.1, 0.6) - lerp(T, 0, 0.15),
    0.05, 0.7
  );

  // ── 景深層次 (DepthLayers) — I(x) 知識量體物理錨定 ──────────
  // I > 0.8 → deep_focus：高資訊密度需清晰多層景深
  // I > 0.45 → moderate：標準景深
  // I ≤ 0.45 → shallow：簡化環境，淺景深降低畫面複雜度
  const depthLayers: VDLCamera['depthLayers'] =
    I > 0.8 ? 'deep_focus' : I > 0.45 ? 'moderate' : 'shallow';

  // ── 物件密度 (ObjDensity) — I(x) 景框資訊量 ─────────────────
  // I > 0.8 → dense：高物件數量、高細節密度
  // I > 0.45 → moderate
  // I ≤ 0.45 → minimal：留白主導，極簡場景
  const objDensity: VDLCamera['objDensity'] =
    I > 0.8 ? 'dense' : I > 0.45 ? 'moderate' : 'minimal';

  // ── 語意摘要 ────────────────────────────────────────────────
  const promptHint = buildPromptHint({ T, E, I, C }, { kelvin, ev, contrast, saturation });

  return {
    photometric: { kelvin: Math.round(kelvin), ev: Math.round(ev * 100) / 100, contrast: Math.round(contrast * 100) / 100, saturation: Math.round(saturation * 100) / 100, shadowLift: Math.round(shadowLift * 1000) / 1000 },
    camera:      { focalLength: Math.round(focalLength), aperture: Math.round(aperture * 10) / 10, negativeSpace: Math.round(negativeSpace * 100) / 100, depthLayers, objDensity },
    promptHint,
  };
}

// ─── 語意摘要建構器 ───────────────────────────────────────────

function buildPromptHint(ndf: NDFValues, vdl: { kelvin: number; ev: number; contrast: number; saturation: number }): string {
  const parts: string[] = [];

  if (ndf.T > 0.7)      parts.push('high-tension dramatic lighting');
  else if (ndf.T > 0.4) parts.push('moderate suspense atmosphere');
  else                   parts.push('calm serene lighting');

  if (ndf.E > 0.6) parts.push('emotionally saturated palette');
  // I(x) 景深 / 物件密度 語意錨定
  if (ndf.I > 0.8)       parts.push('deep focus, dense objects, high detail density');
  else if (ndf.I > 0.45) parts.push('moderate depth of field, balanced scene density');
  else                    parts.push('shallow depth of field, minimal objects, wide negative space');
  if (ndf.C > 0.7) parts.push('character-dominant frame');

  parts.push(`${Math.round(vdl.kelvin)}K`);
  parts.push(`EV${vdl.ev > 0 ? '+' : ''}${vdl.ev}`);
  parts.push(`contrast ${Math.round(vdl.contrast * 100)}%`);
  parts.push(`saturation ${Math.round(vdl.saturation * 100)}%`);

  return parts.join(', ');
}

// ─── NODE 05 → NODE 06 自動填充輔助 ──────────────────────────
// 將 NODE 05 鎖定的 T/E/I/C 終點值轉換為 NODE 06 的建議預填值

export function node05ToNode06Prefill(
  T_end: number,
  E_end: number,
  I_end: number,
  C_end: number
): Record<string, string> {
  const mapped = ndfToVdl({ T: T_end, E: E_end, I: I_end, C: C_end });
  const p = mapped.photometric;

  return {
    kelvin:     String(p.kelvin),
    ev:         String(p.ev),
    contrast:   String(p.contrast),
    saturation: String(p.saturation),
    // env_prompt 提示詞語意前綴
    env_prompt: mapped.promptHint,
  };
}

// ─── Phase 10 P1: NODE 02 主色板 → NODE 06 光度學參數 ────────
//
// 演算法（物質本真，基於 CIE Lab 色彩物理）：
//   L* 平均值         → EV：L*=50 中性曝光，L*>50 亮 → EV+，L*<50 暗 → EV-
//   hue 色相角(a*,b*) → Kelvin：暖橘色(hue~30°) → 低K，冷藍色(hue~210°) → 高K
//   Chroma 平均彩度   → Saturation：C*=0 無彩色 → 低飽和，C*=60 高彩 → 高飽和
//   L* 標準差         → Contrast：亮度差大 → 高對比，色調均勻 → 低對比

export function palette02ToPhotometric(
  paletteStr: string,
  kelvinMin = 2800,
  kelvinMax = 7500
): Partial<VDLPhotometric> {
  const hexes = paletteStr
    .split(',')
    .map(s => s.trim())
    .filter(s => /^#[0-9a-fA-F]{6}$/i.test(s));

  if (hexes.length === 0) return {};

  const labs = hexes.map(h => hexToLab(h));

  // ── 平均 Lab ──────────────────────────────────────────────
  const avgL = labs.reduce((s, [l])     => s + l, 0) / labs.length;
  const avgA = labs.reduce((s, [, a])   => s + a, 0) / labs.length;
  const avgB = labs.reduce((s, [,, b])  => s + b, 0) / labs.length;

  // ── L* 標準差 → Contrast ──────────────────────────────────
  const varL = labs.reduce((s, [l]) => s + (l - avgL) ** 2, 0) / labs.length;
  const stdL = Math.sqrt(varL);
  const contrast = clamp(Math.round(stdL / 45 * 100) / 100, 0.2, 0.9);

  // ── L* 平均 → EV ──────────────────────────────────────────
  // L*=50 → EV=0, L*=80 → EV≈+1.0, L*=20 → EV≈-1.0
  const ev = clamp(Math.round((avgL - 50) / 30 * 100) / 100, -2.0, 2.0);

  // ── 色相角 → Kelvin ───────────────────────────────────────
  // atan2(b*, a*)：暖色 hue ≈ 0°~60° → 低K；冷色 hue ≈ 180°~240° → 高K
  const hueRad = Math.atan2(avgB, avgA);
  const rawKelvin = Math.round(5500 - Math.cos(hueRad) * 2200);
  const kelvin = clamp(rawKelvin, kelvinMin, kelvinMax);

  // ── Chroma 平均 → Saturation ─────────────────────────────
  const avgChroma = labs.reduce((s, [, a, b]) => s + Math.sqrt(a * a + b * b), 0) / labs.length;
  const saturation = clamp(Math.round(avgChroma / 55 * 100) / 100, 0.1, 1.0);

  return {
    kelvin,
    ev,
    contrast,
    saturation,
    shadowLift: Math.round(clamp(0.08 - stdL / 800, 0, 0.08) * 1000) / 1000,
  };
}

// ─── QA 驗證閾值常數 (公理 A2 對應數值) ─────────────────────

export const QA_THRESHOLDS = {
  deltaKelvin:  800,   // ΔKelvin ≤ 800K
  deltaEColor:  3.0,   // ΔE CIE2000 ≤ 3.0
  clipSim:      0.85,  // CLIP 相似度 ≥ 0.85
  objRecall:    0.80,  // YOLO 物件召回率 ≥ 0.80
  depthCorr:    0.75,  // 深度 Pearson r ≥ 0.75
  ndfDelta:     0.10,  // NDF T 偏差 ≤ 0.10
  teActivation: 0.35,  // T×E 活躍閾值 ≥ 0.35
} as const;
