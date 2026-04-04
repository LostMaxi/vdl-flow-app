// ◎ 2026-03-29 — RadarChart.tsx
// NODE 12 QA 六指標雷達圖 (SVG + Anime.js 動畫)
// 指標: ΔKelvin | ΔE Color | CLIP Sim | Obj Recall | Depth Corr | NDF Delta

import { useEffect, useRef } from 'react';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';

const CX = 150, CY = 155, R = 95;
const N = 6;
const ANGLES = Array.from({ length: N }, (_, i) => (i * 2 * Math.PI) / N - Math.PI / 2);

const LABELS  = ['ΔKelvin', 'ΔE Color', 'CLIP Sim', 'ObjRecall', 'DepthCorr', 'NDFDelta'];

// 各指標閾值的正規化分數 (0–1 軸，達到此分數才算通過)
// 正規化策略: 低越好 → inverted；高越好 → direct
// ΔKelvin ≤800: max=1600, thresh=800 → thresh_norm=0.5
// ΔE      ≤3.0: max=6.0,  thresh=3.0 → thresh_norm=0.5
// CLIP    ≥.85: direct → thresh_norm=0.85
// ObjRec  ≥.80: direct → thresh_norm=0.80
// DepthCo ≥.75: direct → thresh_norm=0.75
// NDFDelt ≤.10: max=0.20, thresh=.10 → thresh_norm=0.5
const THRESH_NORMS = [0.5, 0.5, 0.85, 0.80, 0.75, 0.5];

function normalizeAll(raw: number[]): number[] {
  const [dk, de, cs, or_, dc, nd] = raw;
  return [
    Math.min(1, Math.max(0, 1 - dk / 1600)),
    Math.min(1, Math.max(0, 1 - de / 6.0)),
    Math.min(1, Math.max(0, cs)),
    Math.min(1, Math.max(0, or_)),
    Math.min(1, Math.max(0, dc)),
    Math.min(1, Math.max(0, 1 - nd / 0.20)),
  ];
}

function toXY(angle: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function toPoints(scores: number[]): string {
  return scores.map((s, i) => toXY(ANGLES[i], s * R).join(',')).join(' ');
}

// Phase 11 P4: 每鏡頭歷史軌跡顏色
const HISTORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

interface RadarChartProps {
  values:   Record<string, string | number>;
  history?: number[][];   // Phase 11 P4: 過去鏡頭正規化 QA 分數陣列
}

export function RadarChart({ values, history = [] }: RadarChartProps) {
  const { t } = useI18n();
  const raw = [
    Number(values.delta_kelvin  ?? 0),
    Number(values.delta_e_color ?? 0),
    Number(values.clip_sim      ?? 0),
    Number(values.obj_recall    ?? 0),
    Number(values.depth_corr    ?? 0),
    Number(values.ndf_delta     ?? 0),
  ];

  const scores    = normalizeAll(raw);
  const threshPts = toPoints(THRESH_NORMS);
  const valuePts  = toPoints(scores);
  const allPass   = scores.every((s, i) => s >= THRESH_NORMS[i]);

  const statusColor = allPass ? '#D9D9D6' : '#707372';

  const valuePolyRef = useRef<SVGPolygonElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ─── Anime.js: 數值多邊形從中心擴展動畫 ──────────────────────
  useEffect(() => {
    if (!svgRef.current) return;

    // 動畫化多邊形 — 從中心點展開到實際位置
    const animState = { progress: 0 };
    const centerPts = toPoints(scores.map(() => 0));

    if (valuePolyRef.current) {
      valuePolyRef.current.setAttribute('points', centerPts);
    }

    anime({
      targets: animState,
      progress: 1,
      duration: 800,
      easing: 'easeOutCubic',
      update: () => {
        const p = animState.progress;
        const interpolated = scores.map(s => s * p);
        const pts = toPoints(interpolated);
        if (valuePolyRef.current) {
          valuePolyRef.current.setAttribute('points', pts);
        }
      },
    });

    // 動畫化頂點圓點 — stagger 淡入
    if (dotsRef.current) {
      const circles = dotsRef.current.querySelectorAll('circle');
      anime({
        targets: circles,
        opacity: [0, 1],
        scale: [0, 1],
        delay: anime.stagger(80),
        duration: 400,
        easing: 'easeOutBack',
      });
    }
  }, [scores.join(',')]);

  return (
    <div style={{ textAlign: 'center', margin: '16px 0', fontFamily: 'Space Mono, monospace' }}>
      <div style={{ fontSize: 10, color: statusColor, marginBottom: 4, letterSpacing: 1 }}>
        {allPass ? t('radar.pass') : t('radar.fail')}
      </div>
      <svg ref={svgRef} width={300} height={310} style={{ display: 'inline-block', overflow: 'visible' }}>
        {/* Grid rings at 25 / 50 / 75 / 100% */}
        {[0.25, 0.5, 0.75, 1.0].map(level => (
          <polygon
            key={level}
            points={ANGLES.map(a => toXY(a, level * R).join(',')).join(' ')}
            fill="none"
            stroke={level === 1.0 ? '#333' : '#222'}
            strokeWidth={level === 1.0 ? 1 : 0.5}
          />
        ))}
        {/* Axis spokes */}
        {ANGLES.map((a, i) => {
          const [x, y] = toXY(a, R);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#2a2a2a" strokeWidth={0.5} />;
        })}
        {/* Phase 11 P4: 過去鏡頭歷史軌跡 (低透明度彩色虛線) */}
        {history.map((pastScores, i) => (
          <polygon
            key={`hist-${i}`}
            points={toPoints(pastScores)}
            fill="none"
            stroke={HISTORY_COLORS[i % HISTORY_COLORS.length]}
            strokeWidth={0.8}
            strokeDasharray="2 3"
            opacity={0.45}
          />
        ))}
        {/* Threshold polygon (amber dashed) */}
        <polygon
          points={threshPts}
          fill="rgba(245,158,11,0.05)"
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="4 2"
        />
        {/* Value polygon (Anime.js animated) */}
        <polygon
          ref={valuePolyRef}
          points={valuePts}
          fill={allPass ? 'rgba(167,139,250,0.18)' : 'rgba(239,68,68,0.18)'}
          stroke={statusColor}
          strokeWidth={1.5}
        />
        {/* Dot at each axis (Anime.js stagger animated) */}
        <g ref={dotsRef}>
          {scores.map((s, i) => {
            const [x, y] = toXY(ANGLES[i], s * R);
            const pass = s >= THRESH_NORMS[i];
            return <circle key={i} cx={x} cy={y} r={3} fill={pass ? '#D9D9D6' : '#707372'} opacity={0} />;
          })}
        </g>
        {/* Axis labels */}
        {ANGLES.map((a, i) => {
          const [x, y] = toXY(a, R + 20);
          const pass = scores[i] >= THRESH_NORMS[i];
          return (
            <text
              key={i}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill={pass ? '#D9D9D6' : '#707372'}
              fontFamily="Space Mono, monospace"
            >
              {LABELS[i]}
            </text>
          );
        })}
        {/* Center */}
        <circle cx={CX} cy={CY} r={2} fill="#555" />
      </svg>
      <div style={{ fontSize: 8, color: '#555', letterSpacing: 0.5 }}>
        {t('radar.legend')}
      </div>
    </div>
  );
}
