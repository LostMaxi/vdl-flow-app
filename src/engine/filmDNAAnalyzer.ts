// ◎ 2026-04-06 — Film DNA Analyzer
// 從多張影像/影片幀萃取 → 生成 FilmDNA 物件
// 整合 5 個 analyzers: Photometric / Camera / Composition / Style / NDF

import type { FilmDNA } from '../types/filmDNA';
import { createEmptyFilmDNA } from '../types/filmDNA';
import { analyzePhotometricBatch } from '../analyzers/photometricAnalyzer';
import { analyzeCameraBatch } from '../analyzers/cameraAnalyzer';
import { analyzeCompositionBatch } from '../analyzers/compositionAnalyzer';
import { analyzeStyleBatch } from '../analyzers/styleAnalyzer';
import { estimateNDFBatch } from '../analyzers/ndfEstimator';

// ─── 影像幀萃取 (從 HTMLImageElement / HTMLCanvasElement) ────

export interface FrameData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function extractFrameFromImage(img: HTMLImageElement, maxSize = 400): FrameData {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.floor(img.naturalWidth * scale);
  canvas.height = Math.floor(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: imageData.data, width: canvas.width, height: canvas.height };
}

export function extractFrameFromCanvas(canvas: HTMLCanvasElement): FrameData {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: imageData.data, width: canvas.width, height: canvas.height };
}

// ─── 影片多幀萃取 ────────────────────────────────────────────

export function extractVideoFrames(
  video: HTMLVideoElement,
  count: number = 10,
  maxSize: number = 300,
): Promise<FrameData[]> {
  return new Promise((resolve) => {
    const frames: FrameData[] = [];
    const duration = video.duration;
    if (!duration || duration <= 0) { resolve([]); return; }

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxSize / Math.max(video.videoWidth || 320, video.videoHeight || 180));
    canvas.width = Math.floor((video.videoWidth || 320) * scale);
    canvas.height = Math.floor((video.videoHeight || 180) * scale);
    const ctx = canvas.getContext('2d')!;

    let idx = 0;
    const times = Array.from({ length: count }, (_, i) =>
      (i / (count - 1)) * duration * 0.9 + duration * 0.05
    );

    function seekNext() {
      if (idx >= times.length) { resolve(frames); return; }
      video.currentTime = times[idx];
    }

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      frames.push({ data: imageData.data, width: canvas.width, height: canvas.height });
      idx++;
      seekNext();
    };

    video.onerror = () => resolve(frames);
    seekNext();
  });
}

// ─── 主分析函式 ──────────────────────────────────────────────

export interface AnalysisProgress {
  phase: string;
  percent: number;
}

export function analyzeFramesToFilmDNA(
  frames: FrameData[],
  name: string,
  onProgress?: (p: AnalysisProgress) => void,
): FilmDNA {
  const dna = createEmptyFilmDNA(name);
  dna.source = 'analyzed';

  if (frames.length === 0) return dna;

  // Phase 1: Photometric (NODE 06)
  onProgress?.({ phase: 'Photometric Analysis', percent: 10 });
  const photoResult = analyzePhotometricBatch(frames.map(f => f.data));
  dna.photometric = {
    kelvin:     photoResult.envelope.kelvin,
    ev:         photoResult.envelope.ev,
    contrast:   photoResult.envelope.contrast,
    saturation: photoResult.envelope.saturation,
    shadowLift: photoResult.envelope.shadowLift,
  };

  // Phase 2: Camera (NODE 07)
  onProgress?.({ phase: 'Camera Analysis (MiDaS + blur)', percent: 30 });
  const camResult = analyzeCameraBatch(frames);
  dna.camera = {
    focalLength: camResult.focalLength,
    aperture: camResult.aperture,
    preferredMoves: camResult.preferredMoves.length > 0
      ? camResult.preferredMoves
      : ['static', 'dolly_in'],
    dollySpeed: 'slow',
  };

  // Phase 3: Composition (NODE 08)
  onProgress?.({ phase: 'Composition Analysis (Sobel + centroid)', percent: 50 });
  const compResult = analyzeCompositionBatch(frames);
  dna.composition = {
    ruleOfThirds: compResult.ruleOfThirds,
    depthLayers: compResult.depthLayers,
    negativeSpace: compResult.negativeSpace,
  };

  // Phase 4: Style (NODE 09)
  onProgress?.({ phase: 'Style & Filter Analysis', percent: 70 });
  const styleResult = analyzeStyleBatch(frames);
  dna.style = {
    filterHue: styleResult.filterHue,
    filterGrain: styleResult.filterGrain,
    filterVignette: styleResult.filterVignette,
  };

  // Phase 5: NDF (NODE 05)
  onProgress?.({ phase: 'NDF Estimation (T/E/I/C)', percent: 90 });
  const ndfResult = estimateNDFBatch(frames);
  dna.ndf = {
    T: ndfResult.T,
    E: ndfResult.E,
    I: ndfResult.I,
    C: ndfResult.C,
  };

  // 設定 Kelvin 範圍 (world 模板)
  dna.world = {
    kelvin_min: String(Math.round(dna.photometric.kelvin.min)),
    kelvin_max: String(Math.round(dna.photometric.kelvin.max)),
  };

  // 更新時間戳
  dna.updated = new Date().toISOString();
  dna.evolutionLog.push({
    date: dna.updated,
    author: 'image-analyzer',
    change: `Analyzed ${frames.length} frames → Film DNA generated`,
  });

  onProgress?.({ phase: 'Complete', percent: 100 });
  return dna;
}

// ─── 從 File[] 建立 Film DNA (便捷函式) ─────────────────────

export function loadImagesAsFrames(files: File[], maxSize = 400): Promise<FrameData[]> {
  return Promise.all(
    files.map(file => new Promise<FrameData>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve(extractFrameFromImage(img, maxSize));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
      img.src = URL.createObjectURL(file);
    }))
  );
}
