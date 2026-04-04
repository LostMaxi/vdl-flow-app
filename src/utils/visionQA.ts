// ◎ 2026-04-01 — visionQA.ts (P3)
// Transformers.js 瀏覽器端視覺辨識 QA 工具
// 模型首次使用時自動下載並快取於 IndexedDB
// CLIP: ~100MB | YOLO: ~12MB | Depth: ~50MB

import { pipeline, env } from '@xenova/transformers';

// 讓 Transformers.js 使用 CDN 下載模型（不需本地伺服器）
env.allowLocalModels = false;

// ─── 模型 Pipeline 單例（懶載入，首次呼叫時初始化）──────────────

let clipPipeline:  ReturnType<typeof pipeline> | null = null;
let yoloPipeline:  ReturnType<typeof pipeline> | null = null;
let depthPipeline: ReturnType<typeof pipeline> | null = null;

async function getClipPipeline() {
  if (!clipPipeline) {
    clipPipeline = pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
  }
  return clipPipeline;
}

async function getYoloPipeline() {
  if (!yoloPipeline) {
    yoloPipeline = pipeline('object-detection', 'Xenova/yolov8n');
  }
  return yoloPipeline;
}

async function getDepthPipeline() {
  if (!depthPipeline) {
    depthPipeline = pipeline('depth-estimation', 'Xenova/depth-anything-small-hf');
  }
  return depthPipeline;
}

// ─── 進度回呼型別 ─────────────────────────────────────────────

export type QAProgress = (stage: string, pct: number) => void;

// ─── CLIP 相似度 ───────────────────────────────────────────────
// 以「目標風格關鍵字」作為候選標籤，回傳最高分作為相似度

export async function computeCLIPSim(
  imageUrl: string,
  styleLabels: string[],
  onProgress?: QAProgress
): Promise<number> {
  onProgress?.('CLIP 模型載入中…', 0);
  const pipe = await getClipPipeline() as Awaited<ReturnType<typeof pipeline>>;
  onProgress?.('CLIP 推理中…', 50);

  const labels = styleLabels.length > 0
    ? styleLabels
    : ['cinematic', 'dark dramatic lighting', 'bright scene', 'portrait', 'landscape'];

  // @ts-expect-error — Transformers.js pipeline 型別不完整
  const result = await pipe(imageUrl, labels);
  onProgress?.('CLIP 完成', 100);

  // result: [{ label, score }, ...] sorted desc
  const scores = (result as Array<{ score: number }>).map(r => r.score);
  return parseFloat(Math.max(...scores).toFixed(3));
}

// ─── YOLO 物件召回率 ───────────────────────────────────────────
// 計算偵測到的物件數 / 目標物件數（recall 近似值）

export async function computeObjRecall(
  imageUrl: string,
  targetLabels: string[],
  onProgress?: QAProgress
): Promise<number> {
  onProgress?.('YOLO 模型載入中…', 0);
  const pipe = await getYoloPipeline() as Awaited<ReturnType<typeof pipeline>>;
  onProgress?.('YOLO 偵測中…', 50);

  // @ts-expect-error — Transformers.js pipeline 型別不完整
  const detections = await pipe(imageUrl, { threshold: 0.3 }) as Array<{ label: string; score: number }>;
  onProgress?.('YOLO 完成', 100);

  if (targetLabels.length === 0) {
    // 無目標標籤：以偵測信心平均值作為品質分數
    if (detections.length === 0) return 0;
    const avgConf = detections.reduce((s, d) => s + d.score, 0) / detections.length;
    return parseFloat(avgConf.toFixed(3));
  }

  const detected = new Set(detections.map(d => d.label.toLowerCase()));
  const matched  = targetLabels.filter(l => detected.has(l.toLowerCase())).length;
  return parseFloat((matched / targetLabels.length).toFixed(3));
}

// ─── Depth Pearson 相關係數 ────────────────────────────────────
// 計算兩張圖的深度圖相關性（rendered vs reference）
// 若只提供一張圖，則與其均勻深度梯度比較（近似值）

export async function computeDepthCorr(
  imageUrl: string,
  onProgress?: QAProgress
): Promise<number> {
  onProgress?.('Depth 模型載入中…', 0);
  const pipe = await getDepthPipeline() as Awaited<ReturnType<typeof pipeline>>;
  onProgress?.('深度估算中…', 50);

  // @ts-expect-error — Transformers.js pipeline 型別不完整
  const result = await pipe(imageUrl);
  onProgress?.('Depth 完成', 100);

  // result.depth: Tensor — 取得 data array
  // @ts-expect-error — depth tensor data 存取需繞過型別
  const depthData: number[] = Array.from(result.depth.data as Float32Array);

  // Pearson r：實際深度 vs 理想線性梯度（模擬從左到右/近到遠）
  const n    = depthData.length;
  const ideal = Array.from({ length: n }, (_, i) => i / n);

  const meanD = depthData.reduce((a, b) => a + b, 0) / n;
  const meanI = 0.5;

  let cov = 0, sdD = 0, sdI = 0;
  for (let i = 0; i < n; i++) {
    const d = depthData[i] - meanD;
    const e = ideal[i] - meanI;
    cov += d * e;
    sdD += d * d;
    sdI += e * e;
  }
  const r = cov / (Math.sqrt(sdD) * Math.sqrt(sdI) + 1e-8);
  return parseFloat(Math.abs(r).toFixed(3));
}

// ─── 全自動 QA 掃描（三模型串接）─────────────────────────────

export interface AutoQAResult {
  clip_sim:   number;
  obj_recall: number;
  depth_corr: number;
}

export async function runAutoQA(
  imageUrl: string,
  styleLabels: string[],
  targetObjLabels: string[],
  onProgress?: QAProgress
): Promise<AutoQAResult> {
  const clip  = await computeCLIPSim(imageUrl, styleLabels, (s, p) => onProgress?.(`[CLIP] ${s}`, p * 0.33));
  const yolo  = await computeObjRecall(imageUrl, targetObjLabels, (s, p) => onProgress?.(`[YOLO] ${s}`, 33 + p * 0.33));
  const depth = await computeDepthCorr(imageUrl, (s, p) => onProgress?.(`[Depth] ${s}`, 66 + p * 0.34));
  return { clip_sim: clip, obj_recall: yolo, depth_corr: depth };
}
