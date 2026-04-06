// ◎ 2026-04-06 — SideView (立面圖) SVG 元件
// 顯示攝影機高度、tilt 角度、crane 軌跡、燈光高度

import { useState, useCallback, useRef } from 'react';
import type { CameraSetup, LightSource } from '../../types/filmDNA';

interface SideViewProps {
  camera: CameraSetup;
  lights: LightSource[];
  subjectHeight: number;  // 主體高度 (m)
  onHeightChange: (height: number) => void;
  onTiltChange: (tiltY: number) => void;
  width?: number;
  height?: number;
}

const WORLD_HEIGHT = 8;   // 8m 垂直範圍
const WORLD_DEPTH = 20;   // 20m 深度

function worldToSVG(
  wDepth: number, wHeight: number,
  svgW: number, svgH: number,
): [number, number] {
  return [
    (wDepth / WORLD_DEPTH + 0.5) * svgW,
    svgH - (wHeight / WORLD_HEIGHT) * svgH,
  ];
}

function svgToWorldHeight(sy: number, svgH: number): number {
  return ((svgH - sy) / svgH) * WORLD_HEIGHT;
}

export function SideView({
  camera, lights, subjectHeight,
  onHeightChange, onTiltChange,
  width = 280, height = 200,
}: SideViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const camDepth = camera.position[2];
  const camHeight = camera.height;
  const [camSX, camSY] = worldToSVG(camDepth, camHeight, width, height);

  // 主體位置 (深度=0, 高度=subjectHeight/2)
  const [subSX, subSY] = worldToSVG(0, subjectHeight / 2, width, height);
  const [subTopSX, subTopSY] = worldToSVG(0, subjectHeight, width, height);
  const [subBotSX, subBotSY] = worldToSVG(0, 0, width, height);

  // 地板線
  const [, floorY] = worldToSVG(0, 0, width, height);

  // Tilt 方向線
  const tiltRad = ((camera.target[1] - camHeight) / 5); // 簡化 tilt
  const tiltEndX = camSX + 40;
  const tiltEndY = camSY - tiltRad * 30;

  const handleMouseDown = useCallback(() => setDragging(true), []);
  const handleMouseUp = useCallback(() => setDragging(false), []);
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sy = e.clientY - rect.top;
    const wh = svgToWorldHeight(sy, height);
    onHeightChange(Math.round(Math.max(0.3, Math.min(6, wh)) * 10) / 10);
  }, [dragging, height, onHeightChange]);

  return (
    <svg
      ref={svgRef}
      width={width} height={height}
      style={{ background: '#191919', borderRadius: 4, border: '1px solid #333' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 地板 */}
      <line x1={0} y1={floorY} x2={width} y2={floorY} stroke="#4C4E56" strokeWidth={1} />
      <text x={width - 4} y={floorY - 3} fontSize={7} fill="#4C4E56" textAnchor="end">floor</text>

      {/* 高度刻度 */}
      {[1, 2, 3, 4, 5].map(h => {
        const [, hy] = worldToSVG(0, h, width, height);
        return (
          <g key={h}>
            <line x1={0} y1={hy} x2={width} y2={hy} stroke="#222" strokeWidth={0.5} strokeDasharray="2,4" />
            <text x={4} y={hy + 3} fontSize={6} fill="#333">{h}m</text>
          </g>
        );
      })}

      {/* 燈光 */}
      {lights.map((light, i) => {
        const [lx, ly] = worldToSVG(light.position[2], light.position[1], width, height);
        const color = light.kelvin < 4000 ? '#FDDA25' : '#D9D9D6';
        return (
          <g key={light.id || i}>
            {/* 光線方向 */}
            <line x1={lx} y1={ly} x2={subSX} y2={subSY}
              stroke={color} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.3} />
            <circle cx={lx} cy={ly} r={4} fill={color} opacity={0.6} />
            <text x={lx + 6} y={ly + 3} fontSize={6} fill="#818387">{light.name}</text>
          </g>
        );
      })}

      {/* 主體 (長方形) */}
      <rect
        x={subSX - 4} y={subTopSY}
        width={8} height={subBotSY - subTopSY}
        fill="#D9D9D6" opacity={0.6}
      />

      {/* 攝影機 → 主體連線 (tilt 方向) */}
      <line x1={camSX} y1={camSY} x2={subSX} y2={subSY}
        stroke="#A78BFA" strokeWidth={0.5} strokeDasharray="2,3" opacity={0.4} />

      {/* 攝影機 */}
      <circle cx={camSX} cy={camSY} r={6}
        fill="#A78BFA" stroke="#DFCEEA" strokeWidth={1.5}
        cursor="ns-resize"
        onMouseDown={handleMouseDown}
      />
      <text x={camSX} y={camSY - 10} fontSize={7} fill="#A78BFA" textAnchor="middle">
        {camHeight.toFixed(1)}m
      </text>

      {/* 標註 */}
      <text x={4} y={height - 4} fontSize={7} fill="#4C4E56">SIDE VIEW</text>
    </svg>
  );
}
