// ◎ 2026-04-06 — NDF Estimator (NODE 05)
// 從影像反推 T/E/I/C 四維張力值
// T (Tension) ← 亮度對比 + 暗部比例
// E (Emotion) ← ���和度 + 色彩飽和集中度
// I (Information) ← 邊緣密度 + 銳利度
// C (CharFocus) ← 景深 (前景/背景模糊比) + 主體面積佔比

import { rgbToLab } from '../utils/colorScience';

export interface NDFEstimation {
  T: number;  // Tension 0-1
  E: number;  // Emotion 0-1
  I: number;  // Information 0-1
  C: number;  // CharFocus 0-1
  confidence: number;  // 估算可信度 0-1
}

// ─── 工具函式 ────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ─── T (Tension) 估算 ───────────────────────────────────────
// 高張力 = 低亮度 + 高對比 + 大暗部比例

function estimateTension(data: Uint8ClampedArray): number {
  let lSum = 0, lSqSum = 0, darkCount = 0, count = 0;
  const step = 16;
  for (let i = 0; i < data.length; i += step * 4) {
    const L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lSum += L; lSqSum += L * L;
    if (L < 60) darkCount++;
    count++;
  }
  if (count === 0) return 0.5;

  const meanL = lSum / count;
  const stdL = Math.sqrt(lSqSum / count - meanL * meanL);

  // 低亮度 → 高張力 (暗 = 壓迫)
  const darkScore = clamp01((128 - meanL) / 100);
  // 高對比 → 高張力 (衝突)
  const contrastScore = clamp01(stdL / 60);
  // 暗部比例
  const darkRatio = darkCount / count;

  return Math.round(
    clamp01(darkScore * 0.35 + contrastScore * 0.35 + darkRatio * 0.30) * 100
  ) / 100;
}

// ─── E (Emotion) 估算 ───────────────────────────────────────
// 高情緒 = 高飽和 + 高色彩集中度 (非灰色)

function estimateEmotion(data: Uint8ClampedArray): number {
  let chromaSum = 0, highChromaCount = 0, count = 0;
  const step = 16;
  for (let i = 0; i < data.length; i += step * 4) {
    const [, a, b] = rgbToLab(data[i], data[i + 1], data[i + 2]);
    const chroma = Math.sqrt(a * a + b * b);
    chromaSum += chroma;
    if (chroma > 25) highChromaCount++;
    count++;
  }
  if (count === 0) return 0.5;

  const avgChroma = chromaSum / count;
  const highChromaRatio = highChromaCount / count;

  // 高平均彩度 → 高情緒
  const chromaScore = clamp01(avgChroma / 50);
  // 高彩度像素比例 → 情緒集中度
  const concentrationScore = clamp01(highChromaRatio * 1.5);

  return Math.round(
    clamp01(chromaScore * 0.6 + concentrationScore * 0.4) * 100
  ) / 100;
}

// ─── I (Information) 估算 ────────────────────────────────────
// 高資訊量 = 高銳利度 + 高邊緣���度 + 亮度充足

function estimateInformation(
  data: Uint8ClampedArray, width: number, height: number,
): number {
  // 簡化 Laplacian 銳利度
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  let lapSum = 0, lapSqSum = 0, lapCount = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const lap = 4 * gray[idx]
        - gray[idx - 1] - gray[idx + 1]
        - gray[idx - width] - gray[idx + width];
      lapSum += Math.abs(lap);
      lapSqSum += lap * lap;
      lapCount++;
    }
  }
  if (lapCount === 0) return 0.3;

  const sharpness = lapSum / lapCount;
  const avgBrightness = gray.reduce((s, v) => s + v, 0) / gray.length;

  // 高銳利度 → 高資訊量
  const sharpScore = clamp01(sharpness / 30);
  // 適當亮度 → 可見度高 → 高資訊
  const brightScore = clamp01(1 - Math.abs(avgBrightness - 140) / 120);

  return Math.round(
    clamp01(sharpScore * 0.65 + brightScore * 0.35) * 100
  ) / 100;
}

// ─── C (CharFocus) 估算 ─────────────────────────────────────
// 高角色焦點 = 淺景深 (前/背景模糊) + 主體面積大

function estimateCharFocus(
  data: Uint8ClampedArray, width: number, height: number,
): number {
  // 分區銳利度比較
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  function regionSharpness(rx: number, ry: number, rw: number, rh: number): number {
    let sum = 0, count = 0;
    for (let y = Math.max(1, ry); y < Math.min(height - 1, ry + rh); y += 2) {
      for (let x = Math.max(1, rx); x < Math.min(width - 1, rx + rw); x += 2) {
        const idx = y * width + x;
        const lap = Math.abs(
          4 * gray[idx] - gray[idx - 1] - gray[idx + 1]
          - gray[idx - width] - gray[idx + width]
        );
        sum += lap;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  const centerW = Math.floor(width * 0.4);
  const centerH = Math.floor(height * 0.4);
  const centerSharp = regionSharpness(
    Math.floor(width * 0.3), Math.floor(height * 0.3), centerW, centerH,
  );
  const edgeSharp = regionSharpness(0, 0, width, Math.floor(height * 0.15));

  // 中央比邊緣銳利 → 主體聚焦
  const focusRatio = edgeSharp > 0 ? centerSharp / edgeSharp : 1.5;
  const focusScore = clamp01((focusRatio - 0.5) / 2);

  // 中央面積銳利度 → 主體面積
  const areaScore = clamp01(centerSharp / 20);

  return Math.round(
    clamp01(focusScore * 0.6 + areaScore * 0.4) * 100
  ) / 100;
}

// ─── 主估算函式 ──────────────────────────────────────────────

export function estimateNDF(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): NDFEstimation {
  const T = estimateTension(data);
  const E = estimateEmotion(data);
  const I = estimateInformation(data, width, height);
  const C = estimateCharFocus(data, width, height);

  // 可信度：基於影像解析度
  const resolution = width * height;
  const confidence = Math.min(1, resolution / (640 * 480));

  return { T, E, I, C, confidence: Math.round(confidence * 100) / 100 };
}

// ─── ��幀批量估算 ────────────────────────────────────────────

export function estimateNDFBatch(
  frames: { data: Uint8ClampedArray; width: number; height: number }[],
): {
  T: { min: number; max: number; mean: number };
  E: { min: number; max: number; mean: number };
  I: { min: number; max: number; mean: number };
  C: { min: number; max: number; mean: number };
} {
  const results = frames.map(f => estimateNDF(f.data, f.width, f.height));
  if (results.length === 0) {
    return {
      T: { min: 0.3, max: 0.7, mean: 0.5 },
      E: { min: 0.3, max: 0.7, mean: 0.5 },
      I: { min: 0.2, max: 0.5, mean: 0.3 },
      C: { min: 0.3, max: 0.8, mean: 0.5 },
    };
  }

  function envOf(getter: (r: NDFEstimation) => number) {
    const vals = results.map(getter);
    return {
      min:  Math.round(Math.min(...vals) * 100) / 100,
      max:  Math.round(Math.max(...vals) * 100) / 100,
      mean: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100,
    };
  }

  return {
    T: envOf(r => r.T),
    E: envOf(r => r.E),
    I: envOf(r => r.I),
    C: envOf(r => r.C),
  };
}
