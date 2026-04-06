// ◎ 2026-04-06 — Composition Analyzer (NODE 08)
// 從影像萃取三分法偏移 / 景深層數 / 留白比例
// 使用 Sobel 邊緣偵測 + 質心分析

export interface CompositionResult {
  ruleOfThirds: number;       // 0=中央, 1=極端偏移
  depthLayers: number;        // 1-5
  negativeSpace: number;      // 0-1 (留白比例)
  subjectPosition: string;    // 'center' | 'thirds_left' | 'thirds_right'
  leadingLines: boolean;      // 是否偵測到引導線
  symmetry: number;           // 0-1 對稱度
}

// ─── 灰階轉換 ───────────────────────────────────────────────

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return gray;
}

// ─── Sobel 邊緣偵測 ─────────────────────────────────────────

function sobelEdge(gray: Float32Array, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Gx
      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1]
        - 2 * gray[idx - 1]     + 2 * gray[idx + 1]
        - gray[idx + width - 1] + gray[idx + width + 1];
      // Gy
      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1]
        + gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];
      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

// ─── 質心計算 (從邊緣強度加權) ──────────────────────────────

function edgeCentroid(
  edges: Float32Array, width: number, height: number,
): { cx: number; cy: number; totalWeight: number } {
  let wxSum = 0, wySum = 0, wSum = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const w = edges[y * width + x];
      wxSum += x * w;
      wySum += y * w;
      wSum += w;
    }
  }
  if (wSum === 0) return { cx: 0.5, cy: 0.5, totalWeight: 0 };
  return {
    cx: wxSum / wSum / width,
    cy: wySum / wSum / height,
    totalWeight: wSum,
  };
}

// ─── 三分法偏移 ─��───────────────────────────────────────────

function ruleOfThirdsOffset(cx: number, cy: number): number {
  // 三分法交叉點: (1/3, 1/3), (2/3, 1/3), (1/3, 2/3), (2/3, 2/3)
  const points = [
    [1 / 3, 1 / 3], [2 / 3, 1 / 3],
    [1 / 3, 2 / 3], [2 / 3, 2 / 3],
  ];
  let minDist = Infinity;
  for (const [px, py] of points) {
    const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
    minDist = Math.min(minDist, dist);
  }
  // 歸一化：0 = 恰好在三分法點上, 1 = 最遠 (在角落)
  const maxDist = Math.sqrt(0.5 ** 2 + 0.5 ** 2); // ~0.707
  return Math.min(1, minDist / maxDist);
}

// ─── 主體位置判定 ────────────────────────────────────────────

function subjectPositionFromCentroid(cx: number): string {
  if (cx < 0.38) return 'thirds_left';
  if (cx > 0.62) return 'thirds_right';
  return 'center';
}

// ─── 留白比例 ────────────────────────────────────────────────

function negativeSpaceRatio(
  edges: Float32Array, width: number, height: number,
  threshold: number = 15,
): number {
  let emptyPixels = 0;
  const total = width * height;
  for (let i = 0; i < total; i++) {
    if (edges[i] < threshold) emptyPixels++;
  }
  return Math.round(emptyPixels / total * 100) / 100;
}

// ─── 景深層數估算 ────────────────────────────────────────────
// 將影像垂直分為 5 帶，計算每帶的平均亮度 + 邊緣密度
// 差異大 → 多景深層

function estimateDepthLayers(
  gray: Float32Array, edges: Float32Array,
  width: number, height: number,
): number {
  const bands = 5;
  const bandH = Math.floor(height / bands);
  const bandStats: { avgBrightness: number; avgEdge: number }[] = [];

  for (let b = 0; b < bands; b++) {
    let bSum = 0, eSum = 0, count = 0;
    for (let y = b * bandH; y < (b + 1) * bandH && y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        bSum += gray[idx];
        eSum += edges[idx];
        count++;
      }
    }
    bandStats.push({
      avgBrightness: count > 0 ? bSum / count : 0,
      avgEdge: count > 0 ? eSum / count : 0,
    });
  }

  // 計算帶間差異
  let transitions = 0;
  for (let i = 1; i < bandStats.length; i++) {
    const bDiff = Math.abs(bandStats[i].avgBrightness - bandStats[i - 1].avgBrightness);
    const eDiff = Math.abs(bandStats[i].avgEdge - bandStats[i - 1].avgEdge);
    if (bDiff > 15 || eDiff > 10) transitions++;
  }

  return Math.max(1, Math.min(5, transitions + 1));
}

// ─── 引導線偵測 (簡化) ──────────────────────────────────────

function detectLeadingLines(
  edges: Float32Array, width: number, height: number,
): boolean {
  // 檢查是否有從邊緣延伸到中心的高邊緣密度帶
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const radius = Math.floor(Math.min(width, height) * 0.15);

  // 中心附近邊緣密度
  let centerEdge = 0, centerCount = 0;
  for (let y = centerY - radius; y < centerY + radius; y++) {
    for (let x = centerX - radius; x < centerX + radius; x++) {
      if (y >= 0 && y < height && x >= 0 && x < width) {
        centerEdge += edges[y * width + x];
        centerCount++;
      }
    }
  }
  const centerAvg = centerCount > 0 ? centerEdge / centerCount : 0;

  // 邊緣邊緣密度
  let edgeEdge = 0, edgeCount = 0;
  for (let x = 0; x < width; x++) {
    edgeEdge += edges[x]; // 上邊
    edgeEdge += edges[(height - 1) * width + x]; // 下邊
    edgeCount += 2;
  }
  const edgeAvg = edgeCount > 0 ? edgeEdge / edgeCount : 0;

  // 如果邊緣和中心都有高邊緣密度，可能有引導線
  return centerAvg > 20 && edgeAvg > 15;
}

// ─── 對稱度 ─────────────────────────────────────────────────

function computeSymmetry(
  gray: Float32Array, width: number, height: number,
): number {
  let diff = 0, count = 0;
  const halfW = Math.floor(width / 2);
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < halfW; x += 4) {
      const leftIdx = y * width + x;
      const rightIdx = y * width + (width - 1 - x);
      diff += Math.abs(gray[leftIdx] - gray[rightIdx]);
      count++;
    }
  }
  if (count === 0) return 0.5;
  const avgDiff = diff / count;
  // 歸一化: 0差異=完全對稱=1, 127.5差異=完全不對稱=0
  return Math.round(Math.max(0, 1 - avgDiff / 80) * 100) / 100;
}

// ��── 主分析函式 ──────────────────────────────────────────────

export function analyzeComposition(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): CompositionResult {
  const gray = toGrayscale(data, width, height);
  const edges = sobelEdge(gray, width, height);

  const centroid = edgeCentroid(edges, width, height);
  const rot = ruleOfThirdsOffset(centroid.cx, centroid.cy);
  const subPos = subjectPositionFromCentroid(centroid.cx);
  const negSpace = negativeSpaceRatio(edges, width, height);
  const layers = estimateDepthLayers(gray, edges, width, height);
  const hasLeadingLines = detectLeadingLines(edges, width, height);
  const sym = computeSymmetry(gray, width, height);

  return {
    ruleOfThirds: Math.round(rot * 100) / 100,
    depthLayers: layers,
    negativeSpace: negSpace,
    subjectPosition: subPos,
    leadingLines: hasLeadingLines,
    symmetry: sym,
  };
}

// ─── 多幀批量分析 ────────────────────────────────────────────

export function analyzeCompositionBatch(
  frames: { data: Uint8ClampedArray; width: number; height: number }[],
): {
  ruleOfThirds: { min: number; max: number; mean: number };
  depthLayers:  { min: number; max: number; mean: number };
  negativeSpace:{ min: number; max: number; mean: number };
} {
  const results = frames.map(f => analyzeComposition(f.data, f.width, f.height));
  if (results.length === 0) {
    return {
      ruleOfThirds: { min: 0.3, max: 0.7, mean: 0.5 },
      depthLayers:  { min: 2, max: 4, mean: 3 },
      negativeSpace:{ min: 0.2, max: 0.6, mean: 0.4 },
    };
  }

  function envOf(getter: (r: CompositionResult) => number) {
    const vals = results.map(getter);
    return {
      min:  Math.round(Math.min(...vals) * 100) / 100,
      max:  Math.round(Math.max(...vals) * 100) / 100,
      mean: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100,
    };
  }

  return {
    ruleOfThirds: envOf(r => r.ruleOfThirds),
    depthLayers:  envOf(r => r.depthLayers),
    negativeSpace:envOf(r => r.negativeSpace),
  };
}
