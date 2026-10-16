// ◎ 2026-04-07 — LoadingSpinner: 非同步操作視覺回饋
// Wave 1 C4: 品牌化 loading 指示器

import type { CSSProperties } from 'react';

const C = {
  purple: '#A78BFA',
  muted:  '#818387',
} as const;

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  label?: string;
  style?: CSSProperties;
}

export function LoadingSpinner({ size = 16, color = C.purple, label, style }: LoadingSpinnerProps) {
  const id = `vdl-spin-${size}`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'vdl-spin 0.8s linear infinite' }}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
        <path d="M12 2a10 10 0 019.8 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label && <span style={{ fontSize: 11, color: C.muted, letterSpacing: 0.3 }}>{label}</span>}
      <style>{`@keyframes vdl-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

/** Inline dot-pulse for smaller contexts */
export function DotPulse({ color = C.muted }: { color?: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 4, height: 4, borderRadius: '50%',
            background: color, opacity: 0.4,
            animation: `vdl-pulse 1s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes vdl-pulse { 0%,80%,100% { opacity: 0.4; transform: scale(1); } 40% { opacity: 1; transform: scale(1.3); } }`}</style>
    </span>
  );
}
