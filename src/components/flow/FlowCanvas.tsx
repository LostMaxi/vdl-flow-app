// ◎ 2026-04-06 — FlowCanvas: React Flow 畫布容器
// 14 節點視覺化管線圖 + MiniMap + Controls
// React.memo 防止父層 selectedNodeId 變更觸發 re-render

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { VDLNode } from './VDLNode';
import type { VDLNodeData } from './VDLNode';
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

const nodeTypes = { vdlNode: VDLNode };

// ─── Props ───────────────────────────────────────────────────

export interface FlowCanvasProps {
  nodeDefs: NodeDef[];
  activeIndex: number;
  completedNodes: Set<string>;
  nodeValues: Record<string, Record<string, string | number>>;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

// ─── 內部元件（在 ReactFlowProvider 內）─────────────────────

function FlowCanvasInner({
  nodeDefs,
  activeIndex,
  completedNodes,
  nodeValues,
  selectedNodeId,
  onNodeSelect,
}: FlowCanvasProps) {
  const initialNodes = useMemo(() => getInitialNodes(), []);
  const initialEdges = useMemo(() => getInitialEdges(), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // 使用 ref 追蹤 selectedNodeId，避免 useEffect 依賴它
  const selectedRef = useRef(selectedNodeId);
  selectedRef.current = selectedNodeId;

  // 同步 VDL 狀態到 React Flow 節點 data（不依賴 selectedNodeId）
  useEffect(() => {
    setNodes(prev => prev.map(node => {
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
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
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
      <Controls
        showInteractive={false}
        style={{
          borderRadius: 4,
          border: `1px solid ${C.muted}`,
          background: '#1C1C1C',
        }}
      />
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
