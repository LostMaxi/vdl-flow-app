// ◎ 2026-04-06 — Style & Filter Analyzer (NODE 09)
// 從影像萃取 filterHue / filterGrain / filterVignette
// 使用直方圖分析 + 邊緣亮度 + 高頻噪聲偵測

export interface StyleAnalysisResult {
  filterHue: number;           // 色相偏移 (度) -30~+30
  filterGrain: number;         // 顆粒感 0-1
  filterVignette: number;      // 暗角強度 0-1
  warmCool: number;            // -1(冷) ~ +1(暖)
  contrastStyle: number;       // 0(柔和) ~ 1(硬)
  vintageScore: number;        // 復古感 0-1
  cinematicScore: number;      // 電影感 0-1
}

// ─── 色相偏移估算 ────────────────────────────────────────────
// 基於 RGB 通道的整體平衡

function estimateHueShift(data: Uint8ClampedArray): number {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const step = 16;
  for (let i = 0; i < data.length; i += step * 4) {
    rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
    count++;
  }
  if (count === 0) return 0;
  const avgR = rSum / count, avgG = gSum / count, avgB = bSum / count;
  const avgGray = (avgR + avgG + avgB) / 3;
  if (avgGray === 0) return 0;

  // R 偏多 → 暖偏移 (+), B 偏多 → 冷偏移 (-)
  const rBias = (avgR - avgGray) / avgGray;
  const bBias = (avgB - avgGray) / avgGray;
  const hueShift = (rBias - bBias) * 30;  // 放大到 ±30°
  return Math.round(Math.max(-30, Math.min(30, hueShift)));
}

// ─── 暖冷度 ─────────────────────────────────────────────────

function warmCoolScore(data: Uint8ClampedArray): number {
  let rSum = 0, bSum = 0, count = 0;
  const step = 32;
  for (let i = 0; i < data.length; i += step * 4) {
    rSum += data[i]; bSum += data[i + 2]; count++;
  }
  if (count === 0) return 0;
  const avgR = rSum / count, avgB = bSum / count;
  const total = avgR + avgB;
  if (total === 0) return 0;
  return Math.round(((avgR - avgB) / total) * 100) / 100;  // -1~+1
}

// ─── 膠片顆粒偵測 ────────────────────────────────────────────
// 高頻噪聲方差：計算相鄰像素的差異

function estimateGrain(data: Uint8ClampedArray, width: number, height: number): number {
  let diffSum = 0, count = 0;
  const step = 4;  // RGBA stride
  for (let y = 0; y < height - 1; y += 2) {
    for (let x = 0; x < width - 1; x += 2) {
      const idx1 = (y * width + x) * 4;
      const idx2 = (y * width + x + 1) * 4;
      // 灰階差異
      const g1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
      const g2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
      diffSum += Math.abs(g1 - g2);
      count++;
    }
  }
  if (count === 0) return 0;
  const avgDiff = diffSum / count;
  // 歸一化：avgDiff 2-3 = 數位乾淨, 8+ = 明顯膠片顆粒
  return parseFloat(Math.min(1, Math.max(0, (avgDiff - 2) / 12)).toFixed(2));
}

// ─── 暗角偵測 ────────────────────────────────────────────────
// 比較中央和四角的平均亮度

function estimateVignette(data: Uint8ClampedArray, width: number, height: number): number {
  const cornerSize = Math.floor(Math.min(width, height) * 0.15);
  const centerSize = Math.floor(Math.min(width, height) * 0.2);

  function avgBrightness(rx: number, ry: number, rw: number, rh: number): number {
    let sum = 0, count = 0;
    for (let y = ry; y < ry + rh && y < height; y += 2) {
      for (let x = rx; x < rx + rw && x < width; x += 2) {
        const idx = (y * width + x) * 4;
        sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        count++;
      }
    }
    return count > 0 ? sum / count : 128;
  }

  const centerBrightness = avgBrightness(
    Math.floor(width / 2 - centerSize / 2),
    Math.floor(height / 2 - centerSize / 2),
    centerSize, centerSize,
  );

  const corners = [
    avgBrightness(0, 0, cornerSize, cornerSize),
    avgBrightness(width - cornerSize, 0, cornerSize, cornerSize),
    avgBrightness(0, height - cornerSize, cornerSize, cornerSize),
    avgBrightness(width - cornerSize, height - cornerSize, cornerSize, cornerSize),
  ];
  const avgCorner = corners.reduce((s, v) => s + v, 0) / 4;

  if (centerBrightness === 0) return 0;
  const darkening = (centerBrightness - avgCorner) / centerBrightness;
  return parseFloat(Math.min(1, Math.max(0, darkening * 2)).toFixed(2));
}

// ─── 電影感評分 ──────────────────────────────────────────────

function cinematicScore(
  grain: number, vignette: number, hue: number, warmCool: number,
): number {
  // 電影感 = 有顆粒 + 有暗角 + 有色彩偏移 + 稍暖
  const grainScore = Math.min(1, grain * 5);
  const vigScore = Math.min(1, vignette * 3);
  const hueScore = Math.min(1, Math.abs(hue) / 15);
  const warmScore = warmCool > 0 ? Math.min(1, warmCool * 2) : 0;
  return parseFloat(((grainScore * 0.25 + vigScore * 0.25 + hueScore * 0.25 + warmScore * 0.25)).toFixed(2));
}

// ─── 復古感評分 ──────────────────────────────────────────────

function vintageScore(grain: number, saturation: number, warmCool: number): number {
  // 復古 = 高顆粒 + 低飽和 + 暖色調
  const grainScore = Math.min(1, grain * 4);
  const desatScore = Math.max(0, 1 - saturation * 2);
  const warmScore = warmCool > 0 ? Math.min(1, warmCool * 3) : 0;
  return parseFloat((grainScore * 0.4 + desatScore * 0.3 + warmScore * 0.3).toFixed(2));
}

// ─── 主分析函式 ──────────────────────────────────────────────

export function analyzeStyle(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): StyleAnalysisResult {
  const filterHue = estimateHueShift(data);
  const filterGrain = estimateGrain(data, width, height);
  const filterVignette = estimateVignette(data, width, height);
  const wc = warmCoolScore(data);

  // 飽和度 (用於 vintage 評分)
  let chromaSum = 0, count = 0;
  for (let i = 0; i < data.length; i += 64) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max > 0) chromaSum += (max - min) / max;
    count++;
  }
  const avgSat = count > 0 ? chromaSum / count : 0.5;

  const cinematic = cinematicScore(filterGrain, filterVignette, filterHue, wc);
  const vintage = vintageScore(filterGrain, avgSat, wc);

  // 對比風格
  let bSum = 0, bSqSum = 0, bCount = 0;
  for (let i = 0; i < data.length; i += 64) {
    const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    bSum += v; bSqSum += v * v; bCount++;
  }
  const meanB = bSum / (bCount || 1);
  const stdB = Math.sqrt(bSqSum / (bCount || 1) - meanB * meanB);
  const contrastStyle = parseFloat(Math.min(1, stdB / 70).toFixed(2));

  return {
    filterHue,
    filterGrain,
    filterVignette,
    warmCool: wc,
    contrastStyle,
    vintageScore: vintage,
    cinematicScore: cinematic,
  };
}

// ─── 多幀批量分析 ────────────────────────────────────────────

export function analyzeStyleBatch(
  frames: { data: Uint8ClampedArray; width: number; height: number }[],
): {
  filterHue:      { min: number; max: number; mean: number };
  filterGrain:    { min: number; max: number; mean: number };
  filterVignette: { min: number; max: number; mean: number };
} {
  const results = frames.map(f => analyzeStyle(f.data, f.width, f.height));
  if (results.length === 0) {
    return {
      filterHue:      { min: -5, max: 5, mean: 0 },
      filterGrain:    { min: 0, max: 0.05, mean: 0.02 },
      filterVignette: { min: 0, max: 0.15, mean: 0.08 },
    };
  }

  function envOf(getter: (r: StyleAnalysisResult) => number) {
    const vals = results.map(getter);
    return {
      min:  Math.round(Math.min(...vals) * 100) / 100,
      max:  Math.round(Math.max(...vals) * 100) / 100,
      mean: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 100) / 100,
    };
  }

  return {
    filterHue:      envOf(r => r.filterHue),
    filterGrain:    envOf(r => r.filterGrain),
    filterVignette: envOf(r => r.filterVignette),
  };
}
