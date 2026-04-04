// ◎ 2026-04-01 — vdlExport.ts (P9)
// .vdl JSON Schema 標準格式匯出
// 將 12節點 nodeValues + locks + sceneHistory → 結構化 .vdl 檔案

import type { SceneConfig } from '../engine/vdlTimeline';

// ─── .vdl Schema 型別定義 ─────────────────────────────────────

export interface VDLScene {
  id:          string;
  duration:    number;
  photometric: {
    kelvinStart: number; kelvinEnd: number;
    evStart: number;     evEnd: number;
    contrastStart: number; contrastEnd: number;
    saturationStart: number; saturationEnd: number;
  };
  shot: {
    type:      string;
    focal_mm:  number;
    aperture:  number;
    movement:  string;
  };
  prompts: {
    image?: string;
    video?: string;
  };
  qa: {
    delta_kelvin:  number;
    delta_e_color: number;
    clip_sim:      number;
    obj_recall:    number;
    depth_corr:    number;
    ndf_delta:     number;
    pass:          boolean;
  };
}

export interface VDLFile {
  vdl_version:  '1.0';
  created_at:   string;  // ISO 8601
  project_name: string;
  global: {
    theme:         string;
    style_keywords: string;
    total_duration: number;
    world:         string;
    palette:       string[];
  };
  scenes:  VDLScene[];
  locks:   Record<string, { value: string | number; source: string }>;
  raw_nodes: Record<string, Record<string, string | number>>;
}

// ─── 匯出函式 ──────────────────────────────────────────────────

export function buildVDLFile(
  projectName: string,
  nodeValues:  Record<string, Record<string, string | number>>,
  locks:       Record<string, { value: string | number; source: string }>,
  sceneHistory: SceneConfig[],
  allPrompts:  Record<string, string>
): VDLFile {
  const n = nodeValues;

  const paletteStr = String(n.node_02?.dominant_palette ?? '');
  const palette    = paletteStr.split(',').map(s => s.trim()).filter(Boolean);

  const scenes: VDLScene[] = sceneHistory.map(sc => ({
    id:       sc.id,
    duration: sc.duration,
    photometric: sc.photometric,
    shot: {
      type:     String(n.node_07?.shot_type     ?? ''),
      focal_mm: Number(n.node_07?.focal_mm      ?? 35),
      aperture: Number(n.node_07?.aperture       ?? 2.8),
      movement: String(n.node_07?.movement       ?? ''),
    },
    prompts: {
      image: allPrompts['node_10'],
      video: allPrompts['node_11'],
    },
    qa: {
      delta_kelvin:  Number(n.node_12?.delta_kelvin  ?? 0),
      delta_e_color: Number(n.node_12?.delta_e_color ?? 0),
      clip_sim:      Number(n.node_12?.clip_sim      ?? 0),
      obj_recall:    Number(n.node_12?.obj_recall    ?? 0),
      depth_corr:    Number(n.node_12?.depth_corr    ?? 0),
      ndf_delta:     Number(n.node_12?.ndf_delta     ?? 0),
      pass: (
        Number(n.node_12?.delta_kelvin)  <= 800  &&
        Number(n.node_12?.delta_e_color) <= 3.0  &&
        Number(n.node_12?.clip_sim)      >= 0.85 &&
        Number(n.node_12?.obj_recall)    >= 0.80 &&
        Number(n.node_12?.depth_corr)    >= 0.75 &&
        Number(n.node_12?.ndf_delta)     <= 0.10
      ),
    },
  }));

  return {
    vdl_version:  '1.0',
    created_at:   new Date().toISOString(),
    project_name: projectName,
    global: {
      theme:          String(n.node_01?.theme_core       ?? ''),
      style_keywords: String(n.node_01?.style_keywords   ?? ''),
      total_duration: Number(n.node_01?.total_duration   ?? 0),
      world:          String(n.node_02?.time_period ?? '') + ' ' + String(n.node_02?.location_type ?? ''),
      palette,
    },
    scenes,
    locks,
    raw_nodes: nodeValues,
  };
}

export function downloadVDL(vdlFile: VDLFile): void {
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = vdlFile.project_name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_');
  const blob = new Blob([JSON.stringify(vdlFile, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${name}_${ts}.vdl`;
  a.click();
  URL.revokeObjectURL(url);
}
