// ◎ 2026-04-06 — Drift Corrector
// 偵測累積漂移 + 計算校正向量 + Film DNA clamp

import type { FilmDNA, DriftVector, DriftReport } from '../types/filmDNA';

// ─── 漂移偵測 ────────────────────────────────────────────────

export interface ShotEndState {
  shotId: string;
  shotIndex: number;
  kelvin: number;
  ev: number;
  contrast: number;
  saturation: number;
}

function pctDrift(measured: number, mean: number): number {
  if (mean === 0) return 0;
  return Math.abs((measured - mean) / mean) * 100;
}

export function analyzeDrift(
  shotEnd: ShotEndState,
  filmDNA: FilmDNA,
): DriftReport {
  const dnaMean = {
    kelvin:     filmDNA.photometric.kelvin.mean,
    ev:         filmDNA.photometric.ev.mean,
    contrast:   filmDNA.photometric.contrast.mean,
    saturation: filmDNA.photometric.saturation.mean,
  };

  const driftPercent = {
    kelvin:     pctDrift(shotEnd.kelvin,     dnaMean.kelvin),
    ev:         pctDrift(shotEnd.ev,         dnaMean.ev === 0 ? 1 : dnaMean.ev),
    contrast:   pctDrift(shotEnd.contrast,   dnaMean.contrast),
    saturation: pctDrift(shotEnd.saturation, dnaMean.saturation),
  };

  const maxDrift = Math.max(
    driftPercent.kelvin,
    driftPercent.contrast,
    driftPercent.saturation,
  );

  const needsCorrection = maxDrift > filmDNA.driftConfig.maxDriftPercent;

  let correctionVector: DriftVector | null = null;
  if (needsCorrection) {
    const rate = filmDNA.driftConfig.correctionRate;
    correctionVector = {
      kelvin:     (dnaMean.kelvin     - shotEnd.kelvin)     * rate,
      ev:         (dnaMean.ev         - shotEnd.ev)         * rate,
      contrast:   (dnaMean.contrast   - shotEnd.contrast)   * rate,
      saturation: (dnaMean.saturation - shotEnd.saturation) * rate,
      source: shotEnd.shotId,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    shotId: shotEnd.shotId,
    shotIndex: shotEnd.shotIndex,
    measured: {
      kelvin:     shotEnd.kelvin,
      ev:         shotEnd.ev,
      contrast:   shotEnd.contrast,
      saturation: shotEnd.saturation,
    },
    filmDNAMean: dnaMean,
    driftPercent,
    needsCorrection,
    correctionVector,
  };
}

// ─── 校正向量應用 ────────────────────────────────────────────
// 將校正向量注入下一鏡頭的起始值，並 clamp 到 Film DNA 包絡內

export interface NextShotStartValues {
  kelvin: number;
  ev: number;
  contrast: number;
  saturation: number;
}

export function applyDriftCorrection(
  prevEndState: ShotEndState,
  correction: DriftVector | null,
  filmDNA: FilmDNA,
): NextShotStartValues {
  // 基礎：繼承前鏡頭終值 (熱連續性)
  let kelvin     = prevEndState.kelvin;
  let ev         = prevEndState.ev;
  let contrast   = prevEndState.contrast;
  let saturation = prevEndState.saturation;

  // 注入校正向量
  if (correction) {
    kelvin     += correction.kelvin;
    ev         += correction.ev;
    contrast   += correction.contrast;
    saturation += correction.saturation;
  }

  // Film DNA 包絡 clamp
  const p = filmDNA.photometric;
  kelvin     = clamp(kelvin,     p.kelvin.min,     p.kelvin.max);
  ev         = clamp(ev,         p.ev.min,         p.ev.max);
  contrast   = clamp(contrast,   p.contrast.min,   p.contrast.max);
  saturation = clamp(saturation, p.saturation.min, p.saturation.max);

  return {
    kelvin:     Math.round(kelvin),
    ev:         Math.round(ev * 100) / 100,
    contrast:   Math.round(contrast * 100) / 100,
    saturation: Math.round(saturation * 100) / 100,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── 批量漂移歷史分析 ────────────────────────────────────────

export function analyzeDriftHistory(
  shotHistory: ShotEndState[],
  filmDNA: FilmDNA,
): DriftReport[] {
  return shotHistory.map(shot => analyzeDrift(shot, filmDNA));
}

// ─── 是否需要在此鏡頭後檢查漂移 ─────────────────────────────

export function shouldCheckDrift(shotIndex: number, filmDNA: FilmDNA): boolean {
  return shotIndex > 0 && shotIndex % filmDNA.driftConfig.checkInterval === 0;
}
