// ◎ 2026-04-06 — Camera Analyzer (NODE 07)
// 從影像估算焦距 / 光圈 / 景深 — MiDaS 深度 + 模糊分析

export interface CameraAnalysisResult {
  estimatedFocalLength: number;    // mm
  estimatedAperture: number;       // f-stop
  depthOfField: 'shallow' | 'moderate' | 'deep';
  blurVariance: number;            // 模糊度指標
  dominantMotion: string;          // 推估運動類型
}

// ─── Laplacian 模糊度計算 ────────────────────────────────────
// 高 variance → 影像銳利 (深景深)
// 低 variance → 影像模糊 (淺景深 or 運動模糊)

function laplacianVariance(data: Uint8ClampedArray, width: number, height: number): number {
  // 轉灰階
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // 3×3 Laplacian kernel: [0,-1,0,-1,4,-1,0,-1,0]
  let sum = 0, sumSq = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = 4 * gray[idx]
        - gray[idx - 1] - gray[idx + 1]
        - gray[idx - width] - gray[idx + width];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

// ─── 分區模糊度 (前景/背景) ─────────────────────────────────
// 前景模糊 + 背景模糊 + 中央銳利 → 淺景深
// 全部銳利 → 深景深

function regionalBlurAnalysis(data: Uint8ClampedArray, width: number, height: number): {
  centerVar: number;
  edgeVar: number;
  ratio: number;
} {
  const cx = Math.floor(width * 0.25);
  const cy = Math.floor(height * 0.25);
  const cw = Math.floor(width * 0.5);
  const ch = Math.floor(height * 0.5);

  // 中央區域
  const centerData = extractRegion(data, width, cx, cy, cw, ch);
  const centerVar = laplacianVariance(centerData, cw, ch);

  // 邊緣區域 (取上方 strip)
  const edgeData = extractRegion(data, width, 0, 0, width, Math.floor(height * 0.2));
  const edgeVar = laplacianVariance(edgeData, width, Math.floor(height * 0.2));

  const ratio = centerVar > 0 ? edgeVar / centerVar : 1;
  return { centerVar, edgeVar, ratio };
}

function extractRegion(
  data: Uint8ClampedArray, srcWidth: number,
  rx: number, ry: number, rw: number, rh: number,
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(rw * rh * 4);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const srcIdx = ((ry + y) * srcWidth + (rx + x)) * 4;
      const dstIdx = (y * rw + x) * 4;
      result[dstIdx]     = data[srcIdx] ?? 0;
      result[dstIdx + 1] = data[srcIdx + 1] ?? 0;
      result[dstIdx + 2] = data[srcIdx + 2] ?? 0;
      result[dstIdx + 3] = data[srcIdx + 3] ?? 255;
    }
  }
  return result;
}

// ─── 焦距估算 ────────────────────────────────────────────────
// 基於透視變形程度：
// 寬角 (短焦距) → 邊緣變形大，線條向外發散
// 長焦 → 壓縮感，前後物件大小差異小

function estimateFocalLength(
  blurRatio: number,
  width: number,
  height: number,
): number {
  // 簡化估算：主要基於景深特徵
  // 淺景深通常暗示長焦 (50-135mm)
  // 深景深可能是廣角 (18-35mm) 或小光圈
  const aspect = width / height;

  if (blurRatio < 0.3) {
    // 中央銳利邊緣模糊 → 長焦淺景深
    return Math.round(70 + (1 - blurRatio) * 40);
  } else if (blurRatio < 0.7) {
    // 中等景深
    return Math.round(35 + blurRatio * 30);
  } else {
    // 全畫面銳利 → 廣角 or 小光圈
    return Math.round(24 + (1 - blurRatio) * 15);
  }
}

// ─── 光圈估算 ────────────────────��───────────────────────────

function estimateAperture(blurRatio: number): number {
  if (blurRatio < 0.3) return 1.8;       // 明顯散景
  if (blurRatio < 0.5) return 2.8;       // 中等散景
  if (blurRatio < 0.7) return 5.6;       // 輕微散景
  return 8.0;                             // 深景深
}

// ─── 主分析函式 ──────────────────────────────────────���───────

export function analyzeCamera(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): CameraAnalysisResult {
  const overall = laplacianVariance(data, width, height);
  const regional = regionalBlurAnalysis(data, width, height);

  const blurRatio = regional.ratio;
  const focalLength = estimateFocalLength(blurRatio, width, height);
  const aperture = estimateAperture(blurRatio);

  const depthOfField: CameraAnalysisResult['depthOfField'] =
    blurRatio < 0.3 ? 'shallow' :
    blurRatio < 0.7 ? 'moderate' : 'deep';

  // 運動推估 (單幀只能做簡易推測)
  const dominantMotion = overall < 50 ? 'static or slow' : 'dynamic movement detected';

  return {
    estimatedFocalLength: focalLength,
    estimatedAperture: aperture,
    depthOfField,
    blurVariance: Math.round(overall * 100) / 100,
    dominantMotion,
  };
}

// ─── 多幀批量分析 ────────────────────────────────────────────

export function analyzeCameraBatch(
  frames: { data: Uint8ClampedArray; width: number; height: number }[],
): {
  focalLength: { min: number; max: number; mean: number };
  aperture: { min: number; max: number; mean: number };
  preferredMoves: string[];
} {
  const results = frames.map(f => analyzeCamera(f.data, f.width, f.height));
  if (results.length === 0) {
    return {
      focalLength: { min: 35, max: 50, mean: 42 },
      aperture: { min: 2.8, max: 5.6, mean: 4.0 },
      preferredMoves: ['static'],
    };
  }

  const fls = results.map(r => r.estimatedFocalLength);
  const aps = results.map(r => r.estimatedAperture);
  const moves = [...new Set(results.map(r => r.dominantMotion))];

  return {
    focalLength: {
      min: Math.min(...fls),
      max: Math.max(...fls),
      mean: Math.round(fls.reduce((s, v) => s + v, 0) / fls.length),
    },
    aperture: {
      min: Math.min(...aps),
      max: Math.max(...aps),
      mean: Math.round(aps.reduce((s, v) => s + v, 0) / aps.length * 10) / 10,
    },
    preferredMoves: moves,
  };
}
