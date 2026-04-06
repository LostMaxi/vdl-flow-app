// ◎ 2026-04-06 — ExportPayload 型別定義
// VDL-FLOW V2: Remotion 三階段渲染 + 全片輸出載荷
// Phase 13 預留 — Phase 14-15 擴充

import type { SceneConfig, StitchResult } from '../engine/vdlTimeline';
import type { ShotRecord } from '../hooks/usePersistentFlow';
import type { LockEntry } from '../types/vdl';

// ─── Remotion 三階段渲染層級 ────────────────────────────────

export type RenderLevel =
  | 'preview'   // Level 1: 本地預覽 (iframe / canvas)
  | 'local'     // Level 2: Remotion 本地渲染
  | 'vps';      // Level 3: Remotion VPS 遠端渲染

// ─── ExportPayload: 全片輸出載荷 ────────────────────────────

export interface ExportPayload {
  // ─── Visual Layer (完整管線狀態)
  version: '2.0';
  exportedAt: string;          // ISO 8601
  nodeValues: Record<string, Record<string, string | number>>;
  locks: Record<string, LockEntry>;
  allPrompts: Record<string, string>;
  sceneHistory: SceneConfig[];
  shotHistory: ShotRecord[];
  filmDNAId?: string;          // 關聯的 Film DNA ID
  driftHistory?: Array<{       // 漂移校正歷史
    shotIndex: number;
    kelvin: number;
    ev: number;
    contrast: number;
    saturation: number;
    correctionApplied: boolean;
  }>;

  // ─── Downstream Anchors (Phase 14-15 擴充預留)
  anchors: {
    ndfCurve: unknown[];               // NDF T/E/I/C 曲線數據
    sceneCutPoints: number[];          // 場景切割點 (秒)
    cameraMovementLog: unknown[];      // 攝影機運動紀錄
    photometricCurve: unknown[];       // 光度學曲線數據
  };

  // ─── Render Config (Remotion 預留)
  renderConfig: {
    level: RenderLevel;
    fps: number;
    width: number;
    height: number;
    codec: 'h264' | 'h265' | 'vp8' | 'vp9';
    audioBitrate?: string;
  };
}

// ─── 組裝 ExportPayload ─────────────────────────────────────

export function assembleExportPayload(
  nodeValues: Record<string, Record<string, string | number>>,
  locks: Record<string, LockEntry>,
  allPrompts: Record<string, string>,
  sceneHistory: SceneConfig[],
  shotHistory: ShotRecord[],
): ExportPayload {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    nodeValues,
    locks,
    allPrompts,
    sceneHistory,
    shotHistory,
    anchors: {
      ndfCurve: [],
      sceneCutPoints: [],
      cameraMovementLog: [],
      photometricCurve: [],
    },
    renderConfig: {
      level: 'preview',
      fps: 24,
      width: 1920,
      height: 1080,
      codec: 'h264',
    },
  };
}
