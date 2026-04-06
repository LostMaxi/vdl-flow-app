// ◎ 2026-04-06 — React Flow 連線定義
// pipeline = 固定管線順序 | dataflow = 跨節點資料傳遞 | constraint = Film DNA 包絡

import type { Edge } from '@xyflow/react';

// ─── 連線類型色彩 ────────────────────────────────────────────

export const EDGE_STYLES = {
  pipeline:   { stroke: '#4C4E56', strokeWidth: 2 },
  dataflow:   { stroke: '#A78BFA', strokeWidth: 1.5 },
  constraint: { stroke: '#DFCEEA', strokeWidth: 1, strokeDasharray: '6 3' },
} as const;

// ─── 管線連線（結構順序，不可斷開）─────────────────────────────

const pipelineEdges: Edge[] = [
  // creative layer
  { id: 'p-01-02', source: 'node_01', target: 'node_02' },
  { id: 'p-02-03', source: 'node_02', target: 'node_03' },
  // creative → narrative
  { id: 'p-03-04', source: 'node_03', target: 'node_04' },
  // narrative layer
  { id: 'p-04-05', source: 'node_04', target: 'node_05' },
  // narrative → flow
  { id: 'p-05-06', source: 'node_05', target: 'node_06' },
  // flow layer
  { id: 'p-06-07', source: 'node_06', target: 'node_07' },
  { id: 'p-07-08', source: 'node_07', target: 'node_08' },
  { id: 'p-08-09', source: 'node_08', target: 'node_09' },
  // flow → spatial
  { id: 'p-09-10', source: 'node_09', target: 'node_10' },
  // spatial → generation
  { id: 'p-10-11', source: 'node_10', target: 'node_11' },
  // generation layer
  { id: 'p-11-12', source: 'node_11', target: 'node_12' },
  // generation → validation
  { id: 'p-12-13', source: 'node_12', target: 'node_13' },
  // validation layer
  { id: 'p-13-14', source: 'node_13', target: 'node_14' },
].map(e => ({
  ...e,
  type: 'smoothstep',
  style: EDGE_STYLES.pipeline,
  deletable: false,
  selectable: false,
}));

// ─── 資料流連線（跨節點自動傳遞，紫色動畫）──────────────────

const dataflowEdges: Edge[] = [
  // NODE 02 palette → NODE 06 photometric
  { id: 'd-02-06', source: 'node_02', target: 'node_06',
    label: 'palette → photometric', animated: true },
  // NODE 02 palette → NODE 13 target_palette
  { id: 'd-02-13', source: 'node_02', target: 'node_13',
    label: 'palette → QA target' },
  // NODE 05 NDF → NODE 06 photometric prefill
  { id: 'd-05-06', source: 'node_05', target: 'node_06',
    label: 'NDF → photometric', animated: true },
  // NODE 06 timeline → NODE 07 camera prefill
  { id: 'd-06-07', source: 'node_06', target: 'node_07',
    label: 'timeline → camera', animated: true },
  // NODE 09 style lock → NODE 11 generation
  { id: 'd-09-11', source: 'node_09', target: 'node_11',
    label: 'style lock' },
  // NODE 09 style lock → NODE 12 video gen
  { id: 'd-09-12', source: 'node_09', target: 'node_12',
    label: 'style lock' },
  // NODE 07 stitch → NODE 13 QA continuity
  { id: 'd-07-13', source: 'node_07', target: 'node_13',
    label: 'stitch continuity' },
  // NODE 13 QA → NODE 14 drift
  { id: 'd-13-14', source: 'node_13', target: 'node_14',
    label: 'QA → drift correction', animated: true },
].map(e => ({
  ...e,
  type: 'smoothstep',
  style: EDGE_STYLES.dataflow,
  labelStyle: { fontSize: 9, fill: '#818387', fontFamily: "'Inter', sans-serif" },
  labelBgStyle: { fill: '#111', fillOpacity: 0.85, rx: 3 },
  labelBgPadding: [4, 6] as [number, number],
  deletable: false,
}));

// ─── 匯出全部連線 ───────────────────────────────────────────

export function getInitialEdges(): Edge[] {
  return [...pipelineEdges, ...dataflowEdges];
}

// ─── Film DNA 約束連線（動態生成，當 DNA 啟用時）──────────────

export function getDNAConstraintEdges(dnaActive: boolean): Edge[] {
  if (!dnaActive) return [];
  return [
    { id: 'dna-06', source: 'filmDNA', target: 'node_06', label: 'envelope' },
    { id: 'dna-07', source: 'filmDNA', target: 'node_07', label: 'envelope' },
    { id: 'dna-08', source: 'filmDNA', target: 'node_08', label: 'envelope' },
    { id: 'dna-09', source: 'filmDNA', target: 'node_09', label: 'envelope' },
    { id: 'dna-14', source: 'filmDNA', target: 'node_14', label: 'drift ref' },
  ].map(e => ({
    ...e,
    type: 'smoothstep',
    style: EDGE_STYLES.constraint,
    deletable: false,
    selectable: false,
  }));
}
