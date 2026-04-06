// ◎ 2026-04-06 — OrbitController SVG 元件
// 環形 360° 控制器 — 拖拽起/終角度、選擇方向和速度

import { useState, useCallback, useRef } from 'react';
import type { OrbitConfig } from '../../types/filmDNA';

interface OrbitControllerProps {
  orbit: OrbitConfig;
  onChange: (partial: Partial<OrbitConfig>) => void;
  size?: number;
}

const PRESETS = [
  { label: '90°', start: 0, end: 90 },
  { label: '180°', start: 0, end: 180 },
  { label: '270°', start: 0, end: 270 },
  { label: '360°', start: 0, end: 360 },
];

export function OrbitController({ orbit, onChange, size = 180 }: OrbitControllerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTarget, setDragTarget] = useState<'start' | 'end' | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;

  const startRad = (orbit.startAngle * Math.PI) / 180;
  const endRad = (orbit.endAngle * Math.PI) / 180;
  const startX = cx + r * Math.cos(startRad);
  const startY = cy + r * Math.sin(startRad);
  const endX = cx + r * Math.cos(endRad);
  const endY = cy + r * Math.sin(endRad);

  // 弧線 path
  const arcDeg = orbit.endAngle - orbit.startAngle;
  const largeArc = Math.abs(arcDeg) > 180 ? 1 : 0;
  const sweep = orbit.direction === 'cw' ? 1 : 0;
  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} ${sweep} ${endX} ${endY}`;

  const handleDrag = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragTarget || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left - cx;
    const my = e.clientY - rect.top - cy;
    let angle = Math.atan2(my, mx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    angle = Math.round(angle / 5) * 5;  // snap to 5°

    if (dragTarget === 'start') onChange({ startAngle: angle });
    else onChange({ endAngle: angle });
  }, [dragTarget, cx, cy, onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <svg
        ref={svgRef}
        width={size} height={size}
        style={{ background: '#191919', borderRadius: 4, border: '1px solid #333' }}
        onMouseMove={handleDrag}
        onMouseUp={() => setDragTarget(null)}
        onMouseLeave={() => setDragTarget(null)}
      >
        {/* 參考圓 */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#282828" strokeWidth={1} />

        {/* 角度刻度 */}
        {[0, 90, 180, 270].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const tx = cx + (r + 12) * Math.cos(rad);
          const ty = cy + (r + 12) * Math.sin(rad);
          return (
            <text key={deg} x={tx} y={ty + 3} fontSize={7} fill="#4C4E56" textAnchor="middle">
              {deg}°
            </text>
          );
        })}

        {/* 弧線 */}
        <path d={arcPath} fill="none" stroke="#A78BFA" strokeWidth={2.5} opacity={0.7} />

        {/* 主體中心 */}
        <rect x={cx - 4} y={cy - 4} width={8} height={8} fill="#D9D9D6" opacity={0.8} />

        {/* 起點 (拖拽) */}
        <circle cx={startX} cy={startY} r={6}
          fill="#A78BFA" stroke="#DFCEEA" strokeWidth={1.5}
          cursor="pointer"
          onMouseDown={() => setDragTarget('start')}
        />
        <text x={startX} y={startY - 9} fontSize={7} fill="#A78BFA" textAnchor="middle">
          {orbit.startAngle}°
        </text>

        {/* 終點 (拖拽) */}
        <circle cx={endX} cy={endY} r={6}
          fill="#DFCEEA" stroke="#A78BFA" strokeWidth={1.5}
          cursor="pointer"
          onMouseDown={() => setDragTarget('end')}
        />
        <text x={endX} y={endY - 9} fontSize={7} fill="#DFCEEA" textAnchor="middle">
          {orbit.endAngle}°
        </text>

        {/* 方向箭頭 */}
        <text x={cx} y={size - 6} fontSize={7} fill="#818387" textAnchor="middle">
          {orbit.direction === 'cw' ? '↻ CW' : '↺ CCW'}
        </text>
      </svg>

      {/* 預設弧度按鈕 */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.label}
            onClick={() => onChange({ startAngle: p.start, endAngle: p.end })}
            style={{
              fontSize: 9, padding: '2px 8px', background: 'transparent',
              border: `1px solid ${orbit.endAngle === p.end ? '#A78BFA' : '#333'}`,
              color: orbit.endAngle === p.end ? '#A78BFA' : '#818387',
              borderRadius: 2, cursor: 'pointer',
            }}
          >{p.label}</button>
        ))}
      </div>

      {/* Speed / Direction 控制 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 9, color: '#818387' }}>
        <span>Speed:</span>
        {(['frozen', 'slow', 'normal'] as const).map(s => (
          <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
            <input type="radio" name="orbit-speed" checked={orbit.speed === s}
              onChange={() => onChange({ speed: s })}
              style={{ accentColor: '#A78BFA', width: 10, height: 10 }}
            />
            {s}
          </label>
        ))}
        <span style={{ marginLeft: 8 }}>|</span>
        {(['cw', 'ccw'] as const).map(d => (
          <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', marginLeft: 4 }}>
            <input type="radio" name="orbit-dir" checked={orbit.direction === d}
              onChange={() => onChange({ direction: d })}
              style={{ accentColor: '#A78BFA', width: 10, height: 10 }}
            />
            {d.toUpperCase()}
          </label>
        ))}
      </div>

      {/* Time Scale (子彈時間) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 9, color: '#818387' }}>
        <span>Time Scale:</span>
        <input type="range" min={0.05} max={1} step={0.05}
          value={orbit.timeScale}
          onChange={e => onChange({ timeScale: parseFloat(e.target.value) })}
          style={{ flex: 1, accentColor: '#A78BFA', height: 4 }}
        />
        <span style={{ color: orbit.timeScale < 0.2 ? '#FDDA25' : '#D9D9D6', minWidth: 30 }}>
          {orbit.timeScale.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}
