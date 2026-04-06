// ◎ 2026-04-06 — React Flow 節點座標 + 層定義
// 14 節點按 layer 分群，水平展開，垂直分層

import type { Node } from '@xyflow/react';

// ─── 層色彩 (Lost Maxi.Art 色票) ────────────────────────────

export const LAYER_COLORS: Record<string, string> = {
  creative:   '#A78BFA',   // 藍紫 — 創意輸入
  narrative:  '#DFCEEA',   // 紫羅蘭 — 敘事
  flow:       '#D9D9D6',   // 啞白 — FLOW 四層
  spatial:    '#818387',   // 灰 — 空間配置
  generation: '#A78BFA',   // 藍紫 — 生成
  validation: '#FDDA25',   // 黃 — 驗證
};

// ─── 節點預設尺寸 ────────────────────────────────────────────

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 100;

// ─── 14 節點初始座標 ─────────────────────────────────────────
// x 軸 = 水平擴展（同層並列）
// y 軸 = 垂直分層（上游→下游）

const X_GAP = 260;
const Y_GAP = 160;

export function getInitialNodes(): Node[] {
  return [
    // ── Layer: creative (y=0) ────────────────────────────────
    { id: 'node_01', position: { x: 0,         y: 0 },         type: 'vdlNode', data: { nodeId: 'node_01' } },
    { id: 'node_02', position: { x: X_GAP,     y: 0 },         type: 'vdlNode', data: { nodeId: 'node_02' } },
    { id: 'node_03', position: { x: X_GAP * 2, y: 0 },         type: 'vdlNode', data: { nodeId: 'node_03' } },

    // ── Layer: narrative (y=1) ───────────────────────────────
    { id: 'node_04', position: { x: X_GAP * 0.5, y: Y_GAP },   type: 'vdlNode', data: { nodeId: 'node_04' } },
    { id: 'node_05', position: { x: X_GAP * 1.5, y: Y_GAP },   type: 'vdlNode', data: { nodeId: 'node_05' } },

    // ── Layer: flow (y=2) ────────────────────────────────────
    { id: 'node_06', position: { x: 0,         y: Y_GAP * 2 }, type: 'vdlNode', data: { nodeId: 'node_06' } },
    { id: 'node_07', position: { x: X_GAP,     y: Y_GAP * 2 }, type: 'vdlNode', data: { nodeId: 'node_07' } },
    { id: 'node_08', position: { x: X_GAP * 2, y: Y_GAP * 2 }, type: 'vdlNode', data: { nodeId: 'node_08' } },
    { id: 'node_09', position: { x: X_GAP * 3, y: Y_GAP * 2 }, type: 'vdlNode', data: { nodeId: 'node_09' } },

    // ── Layer: spatial (y=3) ─────────────────────────────────
    { id: 'node_10', position: { x: X_GAP * 0.5, y: Y_GAP * 3 }, type: 'vdlNode', data: { nodeId: 'node_10' } },

    // ── Layer: generation (y=3, right) ───────────────────────
    { id: 'node_11', position: { x: X_GAP * 2,   y: Y_GAP * 3 }, type: 'vdlNode', data: { nodeId: 'node_11' } },
    { id: 'node_12', position: { x: X_GAP * 3,   y: Y_GAP * 3 }, type: 'vdlNode', data: { nodeId: 'node_12' } },

    // ── Layer: validation (y=4) ──────────────────────────────
    { id: 'node_13', position: { x: X_GAP * 1,   y: Y_GAP * 4 }, type: 'vdlNode', data: { nodeId: 'node_13' } },
    { id: 'node_14', position: { x: X_GAP * 2,   y: Y_GAP * 4 }, type: 'vdlNode', data: { nodeId: 'node_14' } },
  ];
}
