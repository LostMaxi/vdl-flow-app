// ◎ 2026-04-06 — Photometric Analyzer (NODE 06)
// 從影像萃取 Kelvin / EV / Contrast / Saturation / ShadowLift
// 重構自 NodeCard.tsx 的 extractKelvinFromCanvas + extractContrastSaturation

import { rgbToLab } from '../utils/colorScience';

export interface PhotometricResult {
  kelvin: number;
  ev: number;
  contrast: number;
  saturation: number;
  shadowLift: number;
  avgL: number;
  avgChroma: number;
}

export function analyzePhotometric(data: Uint8ClampedArray): PhotometricResult {
  let rSum = 0, gSum = 0, bSum = 0;
  let lSum = 0, lSqSum = 0, chromaSum = 0;
  let darkPixels = 0;
  let count = 0;
  const step = 16;  // sample every 16th pixel (RGBA stride = 4)

  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rSum += r; gSum += g; bSum += b;

    const [L, a, bVal] = rgbToLab(r, g, b);
    lSum += L;
    lSqSum += L * L;
    chromaSum += Math.sqrt(a * a + bVal * bVal);
    if (L < 15) darkPixels++;
    count++;
  }

  if (count === 0) {
    return { kelvin: 5500, ev: 0, contrast: 0.5, saturation: 0.5, shadowLift: 0.03, avgL: 50, avgChroma: 30 };
  }

  const avgR = rSum / count, avgG = gSum / count, avgB = bSum / count;
  const [avgL, avgA, avgB2] = rgbToLab(avgR, avgG, avgB);
  const avgChroma = chromaSum / count;

  // ── Kelvin ─────────────────────────────────────────────────
  const hueRad = Math.atan2(avgB2, avgA);
  const kelvin = Math.round(
    Math.max(2800, Math.min(7500, 5500 - Math.cos(hueRad) * 2200))
  );

  // ── EV ─────────────────────────────────────────────────────
  // L*=50 → EV=0, L*=80 → EV≈+1.0, L*=20 → EV≈-1.0
  const ev = Math.round(((avgL - 50) / 30) * 100) / 100;

  // ── Contrast ──────────────────────────────────────────────
  const meanL = lSum / count;
  const stdL = Math.sqrt(lSqSum / count - meanL * meanL);
  const contrast = parseFloat(Math.min(1, stdL / 50).toFixed(2));

  // ── Saturation ────────────────────────────────────────────
  const saturation = parseFloat(Math.min(1, avgChroma / 80).toFixed(2));

  // ── ShadowLift ────────────────────────────────────────────
  // 暗部比例低 → 暗部被提升; 暗部比例高 → 暗部未提升
  const darkRatio = darkPixels / count;
  const shadowLift = parseFloat(Math.max(0, Math.min(0.08, 0.08 - darkRatio * 0.16)).toFixed(3));

  return { kelvin, ev, contrast, saturation, shadowLift, avgL, avgChroma };
}

// ─── 多幀批量分析 (Film DNA 用) ─────────────────────────────

export function analyzePhotometricBatch(frames: Uint8ClampedArray[]): {
  results: PhotometricResult[];
  envelope: {
    kelvin:     { min: number; max: number; mean: number; std: number };
    ev:         { min: number; max: number; mean: number; std: number };
    contrast:   { min: number; max: number; mean: number; std: number };
    saturation: { min: number; max: number; mean: number; std: number };
    shadowLift: { min: number; max: number; mean: number; std: number };
  };
} {
  const results = frames.map(f => analyzePhotometric(f));
  if (results.length === 0) {
    const z = { min: 0, max: 0, mean: 0, std: 0 };
    return { results, envelope: { kelvin: z, ev: z, contrast: z, saturation: z, shadowLift: z } };
  }

  function calcEnvelope(getter: (r: PhotometricResult) => number) {
    const vals = results.map(getter);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    return {
      min:  Math.round(min * 100) / 100,
      max:  Math.round(max * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      std:  Math.round(std * 100) / 100,
    };
  }

  return {
    results,
    envelope: {
      kelvin:     calcEnvelope(r => r.kelvin),
      ev:         calcEnvelope(r => r.ev),
      contrast:   calcEnvelope(r => r.contrast),
      saturation: calcEnvelope(r => r.saturation),
      shadowLift: calcEnvelope(r => r.shadowLift),
    },
  };
}
