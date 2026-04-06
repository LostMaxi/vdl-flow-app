// ◎ 2026-04-06 — Film DNA 型別定義
// VDL-FLOW V2: Film DNA 包絡約束 + 漂移校正 + 幕結構 + 燈光 + 攝影機

// ─── 數值包絡 (Envelope) ─────────────────────────────────────

export interface NumericEnvelope {
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface NumericRange {
  min: number;
  max: number;
  mean: number;
}

// ─── Film DNA 主結構 ─────────────────────────────────────────

export interface FilmDNA {
  id: string;
  name: string;
  created: string;     // ISO 8601
  updated: string;     // ISO 8601
  source: 'analyzed' | 'manual' | 'hybrid';
  tags: string[];

  // NODE 01-03 模板值
  theme: Record<string, string>;
  world: Record<string, string>;
  subject: Record<string, string>;

  // NODE 05 NDF 範圍
  ndf: {
    T: NumericRange;
    E: NumericRange;
    I: NumericRange;
    C: NumericRange;
  };

  // NODE 06 光度學包絡
  photometric: {
    kelvin: NumericEnvelope;
    ev: NumericEnvelope;
    contrast: NumericEnvelope;
    saturation: NumericEnvelope;
    shadowLift: NumericEnvelope;
  };

  // NODE 07 攝影機包絡
  camera: {
    focalLength: NumericRange;
    aperture: NumericRange;
    preferredMoves: string[];
    dollySpeed: string;
  };

  // NODE 08 構圖包絡
  composition: {
    ruleOfThirds: NumericRange;
    depthLayers: NumericRange;
    negativeSpace: NumericRange;
  };

  // NODE 09 風格/濾鏡包絡
  style: {
    filterHue: NumericRange;
    filterGrain: NumericRange;
    filterVignette: NumericRange;
  };

  // 幕結構
  actStructure: ActTemplate[];

  // 漂移校正參數
  driftConfig: DriftConfig;

  // 演化日誌
  evolutionLog: EvolutionEntry[];
}

// ─── 幕結構 (Act Template) ──────────────────────────────────

export interface ActTemplate {
  actNumber: number;
  shotRange: [number, number];
  ndfTarget: {
    T: { start: number; peak: number; end: number };
    E: { start: number; peak: number; end: number };
    I: { start: number; peak: number; end: number };
    C: { start: number; peak: number; end: number };
  };
  narrativeHint: string;
}

// ─── 漂移校正 ────────────────────────────────────────────────

export interface DriftConfig {
  correctionRate: number;     // 0.3-0.5, 拉回比例
  checkInterval: number;      // 每 N 鏡頭檢查一次
  maxDriftPercent: number;    // 觸發校正的閾值 (%)
}

export interface DriftVector {
  kelvin: number;
  ev: number;
  contrast: number;
  saturation: number;
  source: string;             // 產生此校正的 shot ID
  timestamp: string;
}

export interface DriftReport {
  shotId: string;
  shotIndex: number;
  measured: {
    kelvin: number;
    ev: number;
    contrast: number;
    saturation: number;
  };
  filmDNAMean: {
    kelvin: number;
    ev: number;
    contrast: number;
    saturation: number;
  };
  driftPercent: {
    kelvin: number;
    ev: number;
    contrast: number;
    saturation: number;
  };
  needsCorrection: boolean;
  correctionVector: DriftVector | null;
}

// ─── 演化日誌 ────────────────────────────────────────────────

export interface EvolutionEntry {
  date: string;
  author: 'image-analyzer' | 'user' | 'drift-corrector' | 'system';
  change: string;
}

// ─── 攝影機運動類型 ──────────────────────────────────────────

export type CameraMovementType =
  | 'static'
  | 'dolly_in' | 'dolly_out'
  | 'pan_left' | 'pan_right'
  | 'tilt_up' | 'tilt_down'
  | 'crane_up' | 'crane_down'
  | 'tracking'
  | 'orbit_360' | 'orbit_partial'
  | 'vertigo'
  | 'whip_pan'
  | 'dutch_angle'
  | 'steadicam'
  | 'handheld'
  | 'drone'
  | 'rack_focus';

export interface OrbitConfig {
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  height: number;
  heightEnd: number;
  speed: 'frozen' | 'slow' | 'normal';
  timeScale: number;           // 0.05 = 子彈時間
  direction: 'cw' | 'ccw';
}

export interface CameraSetup {
  id: string;
  name: string;
  focalLength: number;
  aperture: number;
  position: [number, number, number];
  target: [number, number, number];
  movementType: CameraMovementType;
  movementSpeed: 'slow' | 'normal' | 'fast';
  dutchAngle: number;
  height: number;
  orbit?: OrbitConfig;
  isActive: boolean;
}

// ─── 燈光系統 ────────────────────────────────────────────────

export type LightType = 'key' | 'fill' | 'rim' | 'ambient' | 'practical' | 'accent';

export interface LightSource {
  id: string;
  name: string;
  type: LightType;
  position: [number, number, number];
  target: [number, number, number];
  kelvin: number;
  intensity: number;          // 0-100
  softness: number;           // 0-1
  color?: string;
}

export interface LightingRig {
  lights: LightSource[];
  presetName?: string;
  keyFillRatio: number;       // 自動計算 key / fill 強度比
}

// ─── 節點模板 (per-node template) ────────────────────────────

export interface NodeTemplate {
  id: string;
  name: string;
  nodeId: string;
  values: Record<string, string>;
  thumbnail?: string;         // base64 data URL
  createdAt: string;
  source?: string;
}

// ─── 預設 Film DNA ──────────────────────────────────────────

export const DEFAULT_DRIFT_CONFIG: DriftConfig = {
  correctionRate: 0.40,
  checkInterval: 4,
  maxDriftPercent: 8,
};

export function createEmptyFilmDNA(name: string): FilmDNA {
  const now = new Date().toISOString();
  return {
    id: `dna_${Date.now()}`,
    name,
    created: now,
    updated: now,
    source: 'manual',
    tags: [],
    theme: {},
    world: {},
    subject: {},
    ndf: {
      T: { min: 0.2, max: 0.9, mean: 0.5 },
      E: { min: 0.2, max: 0.8, mean: 0.5 },
      I: { min: 0.1, max: 0.6, mean: 0.3 },
      C: { min: 0.3, max: 0.9, mean: 0.6 },
    },
    photometric: {
      kelvin:     { min: 2800, max: 7500, mean: 5000, std: 800 },
      ev:         { min: -2.0, max: 2.0,  mean: 0,    std: 0.5 },
      contrast:   { min: 0.3,  max: 0.9,  mean: 0.6,  std: 0.1 },
      saturation: { min: 0.2,  max: 0.9,  mean: 0.5,  std: 0.1 },
      shadowLift: { min: 0.0,  max: 0.08, mean: 0.03, std: 0.01 },
    },
    camera: {
      focalLength: { min: 18, max: 135, mean: 50 },
      aperture:    { min: 1.4, max: 16, mean: 4.0 },
      preferredMoves: ['static', 'dolly_in', 'pan_left'],
      dollySpeed: 'slow',
    },
    composition: {
      ruleOfThirds: { min: 0.3, max: 0.8, mean: 0.5 },
      depthLayers:  { min: 1,   max: 5,   mean: 3 },
      negativeSpace:{ min: 0.1, max: 0.7, mean: 0.4 },
    },
    style: {
      filterHue:      { min: -15, max: 15,  mean: 0 },
      filterGrain:    { min: 0,   max: 0.1, mean: 0.03 },
      filterVignette: { min: 0,   max: 0.3, mean: 0.1 },
    },
    actStructure: [],
    driftConfig: { ...DEFAULT_DRIFT_CONFIG },
    evolutionLog: [{ date: now, author: 'system', change: 'Film DNA created' }],
  };
}
