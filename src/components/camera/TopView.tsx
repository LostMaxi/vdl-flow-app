// ◎ 2026-04-06 — TopView (俯視圖) SVG 元件
// 顯示攝影機位置、FOV 扇形、軌道路徑、主體位置、燈光

import { useState, useCallback, useRef } from 'react';
import type { CameraSetup, LightSource } from '../../types/filmDNA';

interface TopViewProps {
  camera: CameraSetup;
  lights: LightSource[];
  subjectPosition: [number, number];  // x, z in world coords
  onCameraMove: (x: number, z: number) => void;
  onCameraRotate: (angle: number) => void;
  width?: number;
  height?: number;
}

// ─── 座標轉換 ────────────────────────────────────────────────

const WORLD_SIZE = 20;  // 20m × 20m

function worldToSVG(wx: number, wz: number, svgW: number, svgH: number): [number, number] {
  return [
    (wx / WORLD_SIZE + 0.5) * svgW,
    (wz / WORLD_SIZE + 0.5) * svgH,
  ];
}

function svgToWorld(sx: number, sz: number, svgW: number, svgH: number): [number, number] {
  return [
    (sx / svgW - 0.5) * WORLD_SIZE,
    (sz / svgH - 0.5) * WORLD_SIZE,
  ];
}

// ─── FOV 計算 ────────────────────────────────────────────────

function fovFromFocalLength(focalMm: number): number {
  // 35mm 等效 FOV (水平)
  return 2 * Math.atan(18 / focalMm) * (180 / Math.PI);
}

export function TopView({
  camera, lights, subjectPosition,
  onCameraMove, onCameraRotate,
  width = 280, height = 280,
}: TopViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const [camSX, camSY] = worldToSVG(camera.position[0], camera.position[2], width, height);
  const [subSX, subSY] = worldToSVG(subjectPosition[0], subjectPosition[1], width, height);

  // 攝影機朝向角度 (指向 target)
  const dx = camera.target[0] - camera.position[0];
  const dz = camera.target[2] - camera.position[2];
  const camAngle = Math.atan2(dz, dx);
  const fov = fovFromFocalLength(camera.focalLength);
  const fovRad = (fov / 2) * (Math.PI / 180);
  const fovLen = 60;  // SVG 像素

  // FOV 扇形端點
  const fovLeft = {
    x: camSX + Math.cos(camAngle - fovRad) * fovLen,
    y: camSY + Math.sin(camAngle - fovRad) * fovLen,
  };
  const fovRight = {
    x: camSX + Math.cos(camAngle + fovRad) * fovLen,
    y: camSY + Math.sin(camAngle + fovRad) * fovLen,
  };

  // Orbit 軌道
  const orbitPath = camera.orbit ? (() => {
    const [cx, cy] = worldToSVG(camera.orbit.centerX, camera.orbit.centerZ, width, height);
    const r = (camera.orbit.radius / WORLD_SIZE) * width;
    const startRad = (camera.orbit.startAngle * Math.PI) / 180;
    const endRad = (camera.orbit.endAngle * Math.PI) / 180;
    const largeArc = Math.abs(camera.orbit.endAngle - camera.orbit.startAngle) > 180 ? 1 : 0;
    const sx = cx + r * Math.cos(startRad);
    const sy = cy + r * Math.sin(startRad);
    const ex = cx + r * Math.cos(endRad);
    const ey = cy + r * Math.sin(endRad);
    return { cx, cy, r, sx, sy, ex, ey, largeArc };
  })() : null;

  // 拖拽
  const handleMouseDown = useCallback(() => setDragging(true), []);
  const handleMouseUp = useCallback(() => setDragging(false), []);
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [wx, wz] = svgToWorld(sx, sy, width, height);
    onCameraMove(Math.round(wx * 10) / 10, Math.round(wz * 10) / 10);
  }, [dragging, width, height, onCameraMove]);

  return (
    <svg
      ref={svgRef}
      width={width} height={height}
      style={{ background: '#191919', borderRadius: 4, border: '1px solid #333', cursor: dragging ? 'grabbing' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 網格 */}
      {Array.from({ length: 5 }).map((_, i) => {
        const pos = ((i + 1) / 6) * width;
        return (
          <g key={i}>
            <line x1={pos} y1={0} x2={pos} y2={height} stroke="#282828" strokeWidth={0.5} />
            <line x1={0} y1={pos} x2={width} y2={pos} stroke="#282828" strokeWidth={0.5} />
          </g>
        );
      })}

      {/* 原點十字 */}
      <line x1={width / 2 - 5} y1={height / 2} x2={width / 2 + 5} y2={height / 2} stroke="#333" strokeWidth={0.5} />
      <line x1={width / 2} y1={height / 2 - 5} x2={width / 2} y2={height / 2 + 5} stroke="#333" strokeWidth={0.5} />

      {/* Orbit 軌道 */}
      {orbitPath && (
        <g>
          <circle cx={orbitPath.cx} cy={orbitPath.cy} r={orbitPath.r}
            fill="none" stroke="#A78BFA" strokeWidth={1} strokeDasharray="4,4" opacity={0.4} />
          <circle cx={orbitPath.sx} cy={orbitPath.sy} r={3}
            fill="#A78BFA" opacity={0.8} />
          <circle cx={orbitPath.ex} cy={orbitPath.ey} r={3}
            fill="#DFCEEA" opacity={0.8} />
        </g>
      )}

      {/* 燈光 */}
      {lights.map((light, i) => {
        const [lx, ly] = worldToSVG(light.position[0], light.position[2], width, height);
        const color = light.kelvin < 4000 ? '#FDDA25' : light.kelvin < 5500 ? '#D9D9D6' : '#88CCFF';
        return (
          <g key={light.id || i}>
            <circle cx={lx} cy={ly} r={5} fill={color} opacity={0.6} />
            <text x={lx + 7} y={ly + 3} fontSize={7} fill="#818387">{light.name}</text>
          </g>
        );
      })}

      {/* 主體 */}
      <rect x={subSX - 5} y={subSY - 5} width={10} height={10}
        fill="#D9D9D6" opacity={0.8} />
      <text x={subSX} y={subSY - 8} fontSize={7} fill="#818387" textAnchor="middle">Subject</text>

      {/* FOV 扇形 */}
      <polygon
        points={`${camSX},${camSY} ${fovLeft.x},${fovLeft.y} ${fovRight.x},${fovRight.y}`}
        fill="#A78BFA" opacity={0.12}
        stroke="#A78BFA" strokeWidth={0.5}
      />

      {/* 攝影機 */}
      <circle cx={camSX} cy={camSY} r={6}
        fill="#A78BFA" stroke="#DFCEEA" strokeWidth={1.5}
        cursor="grab"
        onMouseDown={handleMouseDown}
      />
      {/* 方向線 */}
      <line
        x1={camSX} y1={camSY}
        x2={camSX + Math.cos(camAngle) * 15}
        y2={camSY + Math.sin(camAngle) * 15}
        stroke="#A78BFA" strokeWidth={1.5}
      />
      <text x={camSX} y={camSY - 10} fontSize={7} fill="#A78BFA" textAnchor="middle">CAM</text>

      {/* 標註 */}
      <text x={4} y={height - 4} fontSize={7} fill="#4C4E56">TOP VIEW</text>
      <text x={width - 4} y={height - 4} fontSize={7} fill="#4C4E56" textAnchor="end">
        {Math.round(fov)}° FOV
      </text>
    </svg>
  );
}
