// ◎ 2026-04-06 — VDLNode: React Flow 自訂節點
// 畫布上的縮圖卡片 — 顯示節點狀態、核心欄位預覽、層色彩

import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { LAYER_COLORS, NODE_WIDTH } from '../../constants/nodePositions';
import type { NodeDef } from '../../types/vdl';

// ─── 色票常數 ────────────────────────────────────────────────

const C = {
  bg:         '#1C1C1C',
  bgActive:   '#242424',
  border:     '#333',
  muted:      '#4C4E56',
  label:      '#818387',
  text:       '#D9D9D6',
  white:      '#FFFFFF',
  purple:     '#A78BFA',
  lavender:   '#DFCEEA',
  yellow:     '#FDDA25',
  darkPurple: '#2A1A4A',
} as const;

const FONT = "'Inter', 'Noto Sans TC', sans-serif";

// ─── 狀態色彩 ────────────────────────────────────────────────

function getNodeStyle(
  isActive: boolean,
  isCompleted: boolean,
  isSelected: boolean,
  layerColor: string,
): React.CSSProperties {
  if (isSelected) {
    return {
      borderColor: C.purple,
      borderWidth: 2,
      boxShadow: `0 0 16px ${C.purple}44`,
      background: C.bgActive,
    };
  }
  if (isCompleted) {
    return {
      borderColor: C.lavender,
      borderWidth: 1,
      boxShadow: 'none',
      background: C.bg,
    };
  }
  if (isActive) {
    return {
      borderColor: layerColor,
      borderWidth: 2,
      boxShadow: `0 0 12px ${layerColor}33`,
      background: C.bgActive,
    };
  }
  return {
    borderColor: C.border,
    borderWidth: 1,
    boxShadow: 'none',
    background: C.bg,
  };
}

// ─── 欄位預覽：取前 3 個有值的欄位 ──────────────────────────

function getFieldPreviews(
  nodeDef: NodeDef,
  values: Record<string, string | number> | undefined,
): { label: string; value: string }[] {
  if (!values) return [];
  const previews: { label: string; value: string }[] = [];
  for (const field of nodeDef.fields) {
    const v = values[field.key];
    if (v !== undefined && v !== '' && previews.length < 3) {
      const display = String(v).length > 20 ? String(v).slice(0, 18) + '...' : String(v);
      previews.push({ label: field.label, value: display });
    }
  }
  return previews;
}

// ─── 節點狀態圖示 ────────────────────────────────────────────

function StatusIcon({ isCompleted, isActive }: { isCompleted: boolean; isActive: boolean }) {
  if (isCompleted) {
    return <span style={{ color: C.lavender, fontSize: 12, lineHeight: 1 }}>&#10003;</span>;
  }
  if (isActive) {
    return (
      <span style={{
        display: 'inline-block',
        width: 8, height: 8, borderRadius: '50%',
        background: C.purple,
        animation: 'pulse 2s ease-in-out infinite',
      }} />
    );
  }
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8, borderRadius: '50%',
      background: C.border,
    }} />
  );
}

// ─── VDLNode 元件 ──────────────────────────────────────���─────

export interface VDLNodeData {
  nodeId: string;
  nodeDef?: NodeDef;
  isActive?: boolean;
  isCompleted?: boolean;
  values?: Record<string, string | number>;
  [key: string]: unknown;
}

function VDLNodeComponent({ data, selected }: NodeProps) {
  const {
    nodeDef,
    isActive = false,
    isCompleted = false,
    values,
  } = data as unknown as VDLNodeData;

  const layerColor = nodeDef ? LAYER_COLORS[nodeDef.layer] ?? C.muted : C.muted;
  const stateStyle = getNodeStyle(isActive, isCompleted, !!selected, layerColor);

  const previews = useMemo(() => {
    if (!nodeDef) return [];
    return getFieldPreviews(nodeDef, values);
  }, [nodeDef, values]);

  if (!nodeDef) {
    return <div style={{ width: NODE_WIDTH, height: 60, background: '#111', borderRadius: 6 }} />;
  }

  return (
    <div
      style={{
        width: NODE_WIDTH,
        fontFamily: FONT,
        borderRadius: 8,
        border: `${stateStyle.borderWidth}px solid ${stateStyle.borderColor}`,
        background: stateStyle.background,
        boxShadow: stateStyle.boxShadow,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* 層色彩頂部條 */}
      <div style={{
        height: 3,
        background: layerColor,
        opacity: isCompleted ? 0.6 : 1,
      }} />

      {/* 標題列 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px 4px',
      }}>
        <StatusIcon isCompleted={isCompleted} isActive={isActive} />
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.label,
          letterSpacing: 0.3,
        }}>
          {String(nodeDef.step).padStart(2, '0')}
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: isCompleted ? C.text : isActive ? C.white : C.label,
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {nodeDef.title}
        </span>
      </div>

      {/* 欄位預覽 */}
      {previews.length > 0 && (
        <div style={{ padding: '2px 10px 8px' }}>
          {previews.map(p => (
            <div key={p.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9,
              lineHeight: 1.5,
              color: C.label,
            }}>
              <span style={{ color: C.muted }}>{p.label}</span>
              <span style={{ color: C.text, maxWidth: '55%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 無預覽時的最小高度佔位 */}
      {previews.length === 0 && (
        <div style={{ padding: '2px 10px 8px' }}>
          <div style={{ fontSize: 9, color: C.muted, fontStyle: 'italic' }}>
            {isCompleted ? 'completed' : isActive ? 'editing...' : 'waiting'}
          </div>
        </div>
      )}

      {/* React Flow Handles (連接點) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 8, height: 8, background: layerColor, border: `2px solid ${C.bg}` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 8, height: 8, background: layerColor, border: `2px solid ${C.bg}` }}
      />
    </div>
  );
}

export const VDLNode = memo(VDLNodeComponent);
