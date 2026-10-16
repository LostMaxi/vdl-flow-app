// ◎ 2026-04-06 — FlowCanvas: React Flow 畫布容器
// 14 節點視覺化管線圖 + MiniMap + Controls
// React.memo 防止父層 selectedNodeId 變更觸發 re-render

import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Panel,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { VDLNode } from './VDLNode';
import type { VDLNodeData } from './VDLNode';
import { PreflightNode } from './PreflightNode';
import { getInitialNodes, LAYER_COLORS } from '../../constants/nodePositions';
import { getInitialEdges } from '../../constants/nodeEdges';
import type { NodeDef } from '../../types/vdl';

// ─── 色票 ────────────────────────────────────────────────────

const C = {
  bg:       '#111111',
  grid:     '#1a1a1a',
  minimap:  '#1C1C1C',
  purple:   '#A78BFA',
  muted:    '#4C4E56',
} as const;

// ─── 自訂節點類型 ────────────────────────────────────────────

const nodeTypes = { vdlNode: VDLNode, preflightNode: PreflightNode };

// ─── Props ───────────────────────────────────────────────────

// ─── Viewport 持久化 key ─────────────────────────────────────
const VIEWPORT_KEY = 'vdl-flow-viewport';

export interface FlowCanvasProps {
  nodeDefs: NodeDef[];
  activeIndex: number;
  completedNodes: Set<string>;
  nodeValues: Record<string, Record<string, string | number>>;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  /** 新專案時 fitView 到前 3 節點；舊專案則還原上次 viewport */
  isNewProject?: boolean;
  /** 供外部呼叫 pan-to-node（如 progress bar） */
  panToNodeRef?: React.MutableRefObject<((nodeId: string) => void) | null>;
}

// ─── 內部元件（在 ReactFlowProvider 內）─────────────────────

function FlowCanvasInner({
  nodeDefs,
  activeIndex,
  completedNodes,
  nodeValues,
  selectedNodeId,
  onNodeSelect,
  isNewProject = false,
  panToNodeRef,
}: FlowCanvasProps) {
  const initialNodes = useMemo(() => getInitialNodes(), []);
  const initialEdges = useMemo(() => getInitialEdges(), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { fitView, setViewport, zoomIn, zoomOut } = useReactFlow();
  const [viewportRestored, setViewportRestored] = useState(false);

  // 使用 ref 追蹤 selectedNodeId，避免 useEffect 依賴它
  const selectedRef = useRef(selectedNodeId);
  selectedRef.current = selectedNodeId;

  // ─── 初始視窗：新專案 → fitView 到 NODE 01-03；舊專案 → 還原 viewport ──
  useEffect(() => {
    if (viewportRestored) return;
    // 等一個 frame 讓 React Flow 完成 layout
    const timer = setTimeout(() => {
      if (isNewProject) {
        // 新專案：只聚焦前 3 個節點
        fitView({
          nodes: [{ id: 'node_01' }, { id: 'node_02' }, { id: 'node_03' }],
          padding: 0.4,
          duration: 400,
        });
      } else {
        // 舊專案：嘗試還原上次 viewport
        try {
          const saved = localStorage.getItem(VIEWPORT_KEY);
          if (saved) {
            const vp = JSON.parse(saved) as Viewport;
            setViewport(vp, { duration: 300 });
          } else {
            // 無儲存 viewport → fitView 到已完成 + 當前 active 節點
            const visibleIds = nodeDefs
              .filter((_, i) => i <= activeIndex || completedNodes.has(nodeDefs[i]?.id))
              .map(n => ({ id: n.id }));
            fitView({
              nodes: visibleIds.length > 0 ? visibleIds.slice(0, 5) : [{ id: 'node_01' }, { id: 'node_02' }, { id: 'node_03' }],
              padding: 0.3,
              duration: 400,
            });
          }
        } catch {
          fitView({ padding: 0.2 });
        }
      }
      setViewportRestored(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [viewportRestored, isNewProject, fitView, setViewport, nodeDefs, activeIndex, completedNodes]);

  // ─── 暴露 panToNode 給外部（progress bar preflight dots）───────
  useEffect(() => {
    if (panToNodeRef) {
      panToNodeRef.current = (nodeId: string) => {
        fitView({ nodes: [{ id: nodeId }], padding: 1.5, duration: 400 });
      };
    }
    return () => { if (panToNodeRef) panToNodeRef.current = null; };
  }, [panToNodeRef, fitView]);

  // ─── Viewport 變更時儲存到 localStorage ────────────────────────
  const handleMoveEnd = useCallback((_event: unknown, viewport: Viewport) => {
    try {
      localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport));
    } catch { /* quota */ }
  }, []);

  // 同步 VDL 狀態到 React Flow 節點 data（不依賴 selectedNodeId）
  useEffect(() => {
    setNodes(prev => prev.map(node => {
      // Preflight 節點：只更新 parentCompleted 狀態
      if (node.type === 'preflightNode') {
        const parentId = node.id === 'preflight_img' ? 'node_11' : 'node_12';
        return {
          ...node,
          data: {
            ...node.data,
            parentCompleted: completedNodes.has(parentId),
          },
        };
      }
      const nodeDef = nodeDefs.find(nd => nd.id === node.id);
      const idx = nodeDefs.findIndex(nd => nd.id === node.id);
      return {
        ...node,
        data: {
          ...node.data,
          nodeId: node.id,
          nodeDef,
          isActive: idx === activeIndex,
          isCompleted: completedNodes.has(node.id),
          values: nodeValues[node.id],
        } satisfies VDLNodeData,
      };
    }));
  }, [nodeDefs, activeIndex, completedNodes, nodeValues, setNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const minimapNodeColor = useCallback((node: Node) => {
    // Preflight 節點：紫羅蘭色
    if (node.type === 'preflightNode') return '#DFCEEA';
    const d = node.data as VDLNodeData;
    if (d.isCompleted) return '#DFCEEA';
    if (d.isActive) return '#A78BFA';
    const layer = d.nodeDef?.layer;
    return layer ? (LAYER_COLORS[layer] ?? '#333') : '#333';
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      onMoveEnd={handleMoveEnd}
      nodeTypes={nodeTypes}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: C.bg }}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      panOnScroll={true}
      zoomOnScroll={true}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color={C.grid}
      />
      <MiniMap
        nodeColor={minimapNodeColor}
        maskColor="rgba(0,0,0,0.7)"
        style={{
          background: C.minimap,
          borderRadius: 4,
          border: `1px solid ${C.muted}`,
        }}
        pannable
        zoomable
      />
      <Panel position="top-left">
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 2,
          background: '#1C1C1Ccc', backdropFilter: 'blur(8px)',
          border: `1px solid ${C.muted}`, borderRadius: 6,
          padding: 3,
        }}>
          {[
            { label: '+', action: () => zoomIn({ duration: 200 }),  title: 'Zoom In' },
            { label: '−', action: () => zoomOut({ duration: 200 }), title: 'Zoom Out' },
            { label: '◎', action: () => fitView({ padding: 0.3, duration: 300 }), title: 'Fit All' },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              title={btn.title}
              style={{
                width: 30, height: 30,
                background: 'transparent', border: 'none',
                color: '#818387', fontSize: 16, fontWeight: 500,
                cursor: 'pointer', borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Inter', sans-serif",
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#D9D9D6'; e.currentTarget.style.background = '#333'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#818387'; e.currentTarget.style.background = 'transparent'; }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </Panel>
    </ReactFlow>
  );
}

// ─── 外層：ReactFlowProvider + React.memo ────────────────────
// memo 比較忽略 selectedNodeId，避免選取節點時整個 Flow 重建

export const FlowCanvas = React.memo(function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}, (prev, next) => {
  // 只在這些 prop 變更時 re-render；selectedNodeId 變更不觸發
  return (
    prev.nodeDefs === next.nodeDefs &&
    prev.activeIndex === next.activeIndex &&
    prev.completedNodes === next.completedNodes &&
    prev.nodeValues === next.nodeValues &&
    prev.onNodeSelect === next.onNodeSelect
  );
});
