// ◎ 2026-04-08 — PreflightNode: 圓形分支預檢節點
// 非阻斷、唯讀，點擊後開啟浮動 Preflight Card

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

// ─── 色票 ────────────────────────────────────────────────────

const C = {
  bg:        '#2A1A4A',
  border:    '#DFCEEA',
  icon:      '#DFCEEA',
  iconHover: '#FFFFFF',
  glow:      '#DFCEEA33',
} as const;

const FONT = "'Inter', 'Noto Sans TC', sans-serif";
const SIZE = 56;

// ─── SVG: 外部連結圖示 (monoline, square + arrow) ───────────

function ExternalLinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.icon} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ─── Data 介面 ───────────────────────────────────────────────

export interface PreflightNodeData {
  preflightType: 'image' | 'video';
  parentCompleted?: boolean;
  [key: string]: unknown;
}

// ─── PreflightNode 元件 ─────────────────────────────────────

function PreflightNodeComponent({ data }: NodeProps) {
  const { preflightType, parentCompleted } = data as unknown as PreflightNodeData;
  const label = preflightType === 'image' ? 'IMG' : 'VID';

  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        border: `1.5px dashed ${C.border}`,
        background: C.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontFamily: FONT,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: parentCompleted ? `0 0 12px ${C.glow}` : 'none',
        animation: parentCompleted ? 'vdl-breathe-glow 2.5s ease-in-out infinite' : 'none',
      }}
      title={preflightType === 'image' ? 'Preflight: Image Settings' : 'Preflight: Video Settings'}
    >
      <ExternalLinkIcon />
      <span style={{
        fontSize: 7,
        fontWeight: 600,
        color: C.icon,
        letterSpacing: 1,
        marginTop: 2,
      }}>
        {label}
      </span>

      {/* 只有 target handle (從父節點接收邊) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 6, height: 6,
          background: C.border,
          border: `1.5px solid ${C.bg}`,
        }}
      />
    </div>
  );
}

export const PreflightNode = memo(PreflightNodeComponent);
