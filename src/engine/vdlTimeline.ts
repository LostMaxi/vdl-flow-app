// ◎ 2026-03-29 — vdlTimeline.ts
// VDL-FLOW Anime.js Prompt Value Engine (Phase 2 完整實作)
// 源碼提取自: evo_20260327_150000_VDL_FLOW_閉環動畫系統.md PART 2 (lines 93-349)
// 核心: 時間軸驅動的提示詞參數生成器 — 操作純數值物件，非 DOM 渲染

import anime from 'animejs/lib/anime.es.js';

// ─── 型別定義 ─────────────────────────────────────────────────

export interface VDLState {
  // NDF 四變數（敘事物理層）
  tension:        number;   // T(x) 張力 0-1
  emotion:        number;   // E(x) 情緒密度 0-1
  information:    number;   // I(x) 知識量體 0-1
  characterFocus: number;   // C(x) 角色焦點 0-1
  // VDL Photometric（攝影測量層）
  kelvin:         number;   // 色溫 2800-7500K
  ev:             number;   // 曝光值 -2.0–+2.0
  contrast:       number;   // Michelson 對比 0-1
  saturation:     number;   // 飽和度 0-1
  shadowLift:     number;   // 暗部提升 0-0.1
  // Camera（攝影機層）
  focalLength:    number;   // 焦距 mm
  aperture:       number;   // 光圈 f-stop
  dollyZ:         number;   // 推軌距離
  panX:           number;   // 水平搖攝角度
  tiltY:          number;   // 垂直俯仰角度
  // Composition（構圖層）
  ruleOfThirds:   number;   // 三分法偏移 0=中央 1=極端
  depthLayers:    number;   // 景深層數 1-5
  negativeSpace:  number;   // 留白比例 0-1
  // Style Lock（風格鎖定層）
  styleVector:    number[]; // 5 維風格向量
  filterHue:      number;   // 濾鏡色相偏移
  filterGrain:    number;   // 膠片顆粒感 0-1
  filterVignette: number;   // 暗角強度 0-1
}

export interface SceneNDFConfig {
  tensionStart:        number;
  tensionEnd:          number;
  emotionStart:        number;
  emotionEnd:          number;
  informationStart:    number;
  informationEnd:      number;
  characterFocusStart: number;
  characterFocusEnd:   number;
  easing?:             string;
}

export interface ScenePhotometricConfig {
  kelvinStart:    number;
  kelvinEnd:      number;
  evStart:        number;
  evEnd:          number;
  contrastStart:  number;
  contrastEnd:    number;
  saturationStart:number;
  saturationEnd:  number;
}

export interface SceneCameraConfig {
  focalLengthEnd: number;
  dollyZEnd:      number;
  panXEnd:        number;
  tiltYEnd:       number;
  easing?:        string;
}

export interface SceneConfig {
  id:          string;
  duration:    number;               // seconds
  ndf:         SceneNDFConfig;
  photometric: ScenePhotometricConfig;
  camera:      SceneCameraConfig;
}

export interface PromptSnapshot {
  timestamp:       string;
  prompt_visual:   string;
  prompt_camera:   string;
  prompt_mood:     string;
  prompt_filter:   string;
  raw_ndf: {
    T: number; E: number; I: number; C: number;
  };
  raw_photometric: {
    kelvin: number; ev: number; contrast: number; saturation: number;
  };
}

export interface StitchResult {
  valid: boolean;
  timeline: PromptSnapshot[];
  gaps: Array<{ between: [string, string]; field: string; delta: number }>;
}

// ─── 預設狀態物件 ─────────────────────────────────────────────

export const DEFAULT_VDL_STATE: VDLState = {
  tension: 0.3, emotion: 0.2, information: 0.1, characterFocus: 0.4,
  kelvin: 5500, ev: 0, contrast: 0.5, saturation: 0.6, shadowLift: 0.02,
  focalLength: 50, aperture: 2.8, dollyZ: 0, panX: 0, tiltY: 0,
  ruleOfThirds: 0.5, depthLayers: 3, negativeSpace: 0.3,
  styleVector: [0, 0, 0, 0, 0], filterHue: 0, filterGrain: 0.02, filterVignette: 0.1
};

// ─── 工具函式 ─────────────────────────────────────────────────

function round4(n: number): number { return Math.round(n * 10000) / 10000; }

// ─── 提示詞建構函式 ───────────────────────────────────────────

function buildVisualPrompt(s: VDLState): string {
  const warmth =
    s.kelvin < 4000 ? 'warm golden' :
    s.kelvin < 5500 ? 'neutral daylight' :
    s.kelvin < 7000 ? 'cool blue' : 'cold arctic blue';

  const contrast_desc =
    s.contrast > 0.75 ? 'high contrast, deep shadows' :
    s.contrast > 0.5  ? 'moderate contrast' :
    'low contrast, soft flat lighting';

  const exposure =
    s.ev >  0.3 ? 'slightly overexposed, bright' :
    s.ev < -0.3 ? 'underexposed, dark moody' :
    'balanced exposure';

  return `${warmth} lighting, ${contrast_desc}, ${exposure}, ` +
         `color temperature ${Math.round(s.kelvin)}K, ` +
         `saturation ${Math.round(s.saturation * 100)}%`;
}

function buildCameraPrompt(s: VDLState): string {
  const lens =
    s.focalLength <= 24 ? 'ultra wide angle lens' :
    s.focalLength <= 35 ? 'wide angle lens' :
    s.focalLength <= 50 ? 'standard 50mm lens' :
    s.focalLength <= 85 ? 'portrait 85mm lens' :
    'telephoto lens';

  const dof =
    s.aperture <= 2.0 ? 'shallow depth of field, bokeh' :
    s.aperture <= 5.6 ? 'moderate depth of field' :
    'deep focus, everything sharp';

  const movement: string[] = [];
  if (Math.abs(s.dollyZ) > 0.5)
    movement.push(s.dollyZ > 0 ? 'dolly in' : 'dolly out');
  if (Math.abs(s.panX) > 5)
    movement.push(s.panX > 0 ? 'pan right' : 'pan left');
  if (Math.abs(s.tiltY) > 5)
    movement.push(s.tiltY > 0 ? 'tilt up' : 'tilt down');

  return `${lens}, f/${s.aperture}, ${dof}, ${movement.length ? movement.join(', ') : 'static camera'}`;
}

function buildMoodPrompt(s: VDLState): string {
  const tension_desc =
    s.tension > 0.8 ? 'intense, high stakes, visceral tension' :
    s.tension > 0.6 ? 'building suspense, uneasy' :
    s.tension > 0.4 ? 'moderate tension, anticipation' :
    'calm, peaceful, serene';

  const emotion_desc =
    s.emotion > 0.7 ? 'deeply emotional, overwhelming feeling' :
    s.emotion > 0.5 ? 'emotionally charged, poignant' :
    s.emotion > 0.3 ? 'subtle emotional undertone' :
    'emotionally neutral, detached';

  const focus_desc =
    s.characterFocus > 0.8 ? 'intimate close-up, character dominant' :
    s.characterFocus > 0.5 ? 'character-focused composition' :
    'environment-focused, character secondary';

  return `${tension_desc}, ${emotion_desc}, ${focus_desc}`;
}

function buildFilterPrompt(s: VDLState): string {
  const grain    = s.filterGrain    > 0.05 ? 'film grain texture, '        : '';
  const vignette = s.filterVignette > 0.15 ? 'vignette darkened edges, '  : '';
  const hue      = s.filterHue !== 0
    ? `color grading shifted ${s.filterHue > 0 ? 'warm' : 'cool'} ${Math.abs(Math.round(s.filterHue))} degrees, `
    : '';
  return `${grain}${vignette}${hue}consistent color grading throughout`;
}

function stateToSnapshot(timestamp: number, state: VDLState): PromptSnapshot {
  return {
    timestamp:     timestamp.toFixed(2),
    prompt_visual: buildVisualPrompt(state),
    prompt_camera: buildCameraPrompt(state),
    prompt_mood:   buildMoodPrompt(state),
    prompt_filter: buildFilterPrompt(state),
    raw_ndf: {
      T: round4(state.tension),
      E: round4(state.emotion),
      I: round4(state.information),
      C: round4(state.characterFocus),
    },
    raw_photometric: {
      kelvin:     Math.round(state.kelvin),
      ev:         round4(state.ev),
      contrast:   round4(state.contrast),
      saturation: round4(state.saturation),
    },
  };
}

// ─── createSceneTimeline ─────────────────────────────────────
// 為單場景建立 Anime.js 時間軸，回傳快照陣列（同步，seek 取樣）

export function createSceneTimeline(
  sceneConfig: SceneConfig,
  samplingIntervalSec = 1
): PromptSnapshot[] {
  // 建立可變動的純數值狀態物件（Anime.js target）
  const state: VDLState = { ...DEFAULT_VDL_STATE };

  // 設定本場景起始值
  Object.assign(state, {
    tension:        sceneConfig.ndf.tensionStart,
    emotion:        sceneConfig.ndf.emotionStart,
    information:    sceneConfig.ndf.informationStart,
    characterFocus: sceneConfig.ndf.characterFocusStart,
    kelvin:         sceneConfig.photometric.kelvinStart,
    ev:             sceneConfig.photometric.evStart,
    contrast:       sceneConfig.photometric.contrastStart,
    saturation:     sceneConfig.photometric.saturationStart,
  });

  const durationMs = sceneConfig.duration * 1000;

  const tl = anime.timeline({
    autoplay: false,
    easing: 'easeInOutQuad',
  });

  // NDF 張力曲線
  tl.add({
    targets:        state,
    tension:        sceneConfig.ndf.tensionEnd,
    emotion:        sceneConfig.ndf.emotionEnd,
    information:    sceneConfig.ndf.informationEnd,
    characterFocus: sceneConfig.ndf.characterFocusEnd,
    duration:       durationMs,
    easing:         sceneConfig.ndf.easing || 'easeInOutSine',
  }, 0);

  // 攝影測量曲線
  tl.add({
    targets:    state,
    kelvin:     sceneConfig.photometric.kelvinEnd,
    ev:         sceneConfig.photometric.evEnd,
    contrast:   sceneConfig.photometric.contrastEnd,
    saturation: sceneConfig.photometric.saturationEnd,
    duration:   durationMs,
    easing:     'easeInOutCubic',
  }, 0);

  // 攝影機運動曲線
  tl.add({
    targets:     state,
    focalLength: sceneConfig.camera.focalLengthEnd,
    dollyZ:      sceneConfig.camera.dollyZEnd,
    panX:        sceneConfig.camera.panXEnd,
    tiltY:       sceneConfig.camera.tiltYEnd,
    duration:    durationMs,
    easing:      sceneConfig.camera.easing || 'easeInOutQuad',
  }, 0);

  // 同步取樣：每 samplingIntervalSec 秒 seek 一次，記錄快照
  const snapshots: PromptSnapshot[] = [];
  for (let t = 0; t <= sceneConfig.duration; t += samplingIntervalSec) {
    const progress = Math.min(t / sceneConfig.duration, 1);
    tl.seek(progress * tl.duration);
    snapshots.push(stateToSnapshot(t, { ...state }));
  }

  return snapshots;
}

// ─── stitchScenes ─────────────────────────────────────────────
// 公理 A2: Scene N end-state === Scene N+1 start-state
// 自動繼承前場景終點值，確保熱力學連續性

export function stitchScenes(scenes: SceneConfig[]): StitchResult {
  const masterTimeline: PromptSnapshot[] = [];
  const gaps: StitchResult['gaps'] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = { ...scenes[i] };

    // 自動繼承前場景的結束狀態（熱力學連續性）
    if (i > 0) {
      const prevLast = masterTimeline[masterTimeline.length - 1];
      const prevNDF  = prevLast.raw_ndf;
      const prevPhot = prevLast.raw_photometric;

      // 驗證：檢查起始值與前場景終止值的差異
      const checks: Array<[string, number, number]> = [
        ['tension',    scene.ndf.tensionStart,     prevNDF.T],
        ['emotion',    scene.ndf.emotionStart,      prevNDF.E],
        ['kelvin',     scene.photometric.kelvinStart, prevPhot.kelvin],
        ['contrast',   scene.photometric.contrastStart, prevPhot.contrast],
        ['saturation', scene.photometric.saturationStart, prevPhot.saturation],
      ];

      checks.forEach(([field, sceneVal, prevVal]) => {
        const delta = Math.abs(sceneVal - prevVal);
        if (delta > 0.10) {
          gaps.push({ between: [scenes[i - 1].id, scene.id], field, delta });
        }
      });

      // 強制繼承（覆蓋使用者設定的起始值）
      scene.ndf.tensionStart        = prevNDF.T;
      scene.ndf.emotionStart        = prevNDF.E;
      scene.ndf.informationStart    = prevNDF.I;
      scene.ndf.characterFocusStart = prevNDF.C;
      scene.photometric.kelvinStart    = prevPhot.kelvin;
      scene.photometric.evStart        = prevPhot.ev;
      scene.photometric.contrastStart  = prevPhot.contrast;
      scene.photometric.saturationStart = prevPhot.saturation;
    }

    const snapshots = createSceneTimeline(scene);
    masterTimeline.push(...snapshots);
  }

  return { valid: gaps.length === 0, timeline: masterTimeline, gaps };
}

// ─── emitPromptSnapshot (公開 API) ───────────────────────────
// 在任意 VDLState 上輸出完整快照（用於 QA 驗證）

export function emitPromptSnapshot(timestamp: number, state: VDLState): PromptSnapshot {
  return stateToSnapshot(timestamp, state);
}

// ─── QA 閾值驗證 ─────────────────────────────────────────────

export interface QAThresholds {
  deltaKelvin:  number;  // ≤ 800
  deltaEColor:  number;  // ≤ 3.0
  clipSim:      number;  // ≥ 0.85
  objRecall:    number;  // ≥ 0.80
  depthCorr:    number;  // ≥ 0.75
  ndfDelta:     number;  // ≤ 0.10
}

export function validateQA(measured: QAThresholds): {
  pass: boolean;
  report: Record<keyof QAThresholds, boolean>;
} {
  const report = {
    deltaKelvin: measured.deltaKelvin <= 800,
    deltaEColor: measured.deltaEColor <= 3.0,
    clipSim:     measured.clipSim     >= 0.85,
    objRecall:   measured.objRecall   >= 0.80,
    depthCorr:   measured.depthCorr   >= 0.75,
    ndfDelta:    measured.ndfDelta    <= 0.10,
  };
  return { pass: Object.values(report).every(Boolean), report };
}
