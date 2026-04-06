// ◎ 2026-04-06 — CameraHUD 主容器
// 整合 TopView + SideView + OrbitController + MultiCam + 運動選擇器

import { useState, useCallback } from 'react';
import type { CameraSetup, OrbitConfig, LightSource, CameraMovementType } from '../../types/filmDNA';
import { TopView } from './TopView';
import { SideView } from './SideView';
import { OrbitController } from './OrbitController';

// ─── 預設 ───────────────────────────────────────────���────────

const DEFAULT_ORBIT: OrbitConfig = {
  centerX: 0, centerY: 1.7, centerZ: 0,
  radius: 3, startAngle: 0, endAngle: 360,
  height: 1.5, heightEnd: 1.5,
  speed: 'frozen', timeScale: 0.05, direction: 'cw',
};

const DEFAULT_CAMERA: CameraSetup = {
  id: 'cam_main',
  name: 'Main',
  focalLength: 35,
  aperture: 2.8,
  position: [-3, 1.6, -4],
  target: [0, 1.2, 0],
  movementType: 'static',
  movementSpeed: 'slow',
  dutchAngle: 0,
  height: 1.6,
  isActive: true,
};

const MOVEMENT_LABELS: Record<CameraMovementType, string> = {
  static: 'Static', dolly_in: 'Dolly In', dolly_out: 'Dolly Out',
  pan_left: 'Pan Left', pan_right: 'Pan Right',
  tilt_up: 'Tilt Up', tilt_down: 'Tilt Down',
  crane_up: 'Crane Up', crane_down: 'Crane Down',
  tracking: 'Tracking',
  orbit_360: 'Orbit 360°', orbit_partial: 'Orbit Partial',
  vertigo: 'Vertigo (Dolly Zoom)', whip_pan: 'Whip Pan',
  dutch_angle: 'Dutch Angle', steadicam: 'Steadicam',
  handheld: 'Handheld', drone: 'Drone', rack_focus: 'Rack Focus',
};

interface CameraHUDProps {
  cameras: CameraSetup[];
  lights: LightSource[];
  onCamerasChange: (cameras: CameraSetup[]) => void;
  subjectPosition?: [number, number];
  subjectHeight?: number;
}

export function CameraHUD({
  cameras: propCameras,
  lights,
  onCamerasChange,
  subjectPosition = [0, 0],
  subjectHeight = 1.7,
}: CameraHUDProps) {
  const cameras = propCameras.length > 0 ? propCameras : [DEFAULT_CAMERA];
  const activeCam = cameras.find(c => c.isActive) ?? cameras[0];
  const [showOrbit, setShowOrbit] = useState(
    activeCam.movementType === 'orbit_360' || activeCam.movementType === 'orbit_partial'
  );

  const updateActiveCam = useCallback((partial: Partial<CameraSetup>) => {
    const next = cameras.map(c =>
      c.id === activeCam.id ? { ...c, ...partial } : c
    );
    onCamerasChange(next);
  }, [cameras, activeCam.id, onCamerasChange]);

  const switchCam = useCallback((id: string) => {
    const next = cameras.map(c => ({ ...c, isActive: c.id === id }));
    onCamerasChange(next);
  }, [cameras, onCamerasChange]);

  const addCam = useCallback(() => {
    const newCam: CameraSetup = {
      ...DEFAULT_CAMERA,
      id: `cam_${Date.now()}`,
      name: `CAM ${cameras.length + 1}`,
      isActive: false,
    };
    onCamerasChange([...cameras, newCam]);
  }, [cameras, onCamerasChange]);

  const removeCam = useCallback((id: string) => {
    if (cameras.length <= 1) return;
    const next = cameras.filter(c => c.id !== id);
    if (!next.some(c => c.isActive)) next[0].isActive = true;
    onCamerasChange(next);
  }, [cameras, onCamerasChange]);

  const isOrbitMode = activeCam.movementType === 'orbit_360' || activeCam.movementType === 'orbit_partial';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ── 多機位切換 ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {cameras.map(cam => (
          <div key={cam.id}
            onClick={() => switchCam(cam.id)}
            style={{
              fontSize: 9, padding: '3px 10px', borderRadius: 2, cursor: 'pointer',
              background: cam.isActive ? '#A78BFA' : 'transparent',
              color: cam.isActive ? '#1C1C1C' : '#818387',
              border: `1px solid ${cam.isActive ? '#A78BFA' : '#333'}`,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {cam.name} {cam.focalLength}mm
            {cameras.length > 1 && (
              <span onClick={e => { e.stopPropagation(); removeCam(cam.id); }}
                style={{ cursor: 'pointer', opacity: 0.6 }}>x</span>
            )}
          </div>
        ))}
        <button onClick={addCam}
          style={{
            fontSize: 9, padding: '3px 8px', background: 'transparent',
            border: '1px dashed #4C4E56', color: '#4C4E56', borderRadius: 2, cursor: 'pointer',
          }}
        >+ CAM</button>
      </div>

      {/* ── 三視圖 ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <TopView
          camera={activeCam}
          lights={lights}
          subjectPosition={subjectPosition}
          onCameraMove={(x, z) => updateActiveCam({
            position: [x, activeCam.position[1], z],
          })}
          onCameraRotate={() => {}}
          width={240} height={240}
        />
        <SideView
          camera={activeCam}
          lights={lights}
          subjectHeight={subjectHeight}
          onHeightChange={h => updateActiveCam({ height: h, position: [activeCam.position[0], h, activeCam.position[2]] })}
          onTiltChange={() => {}}
          width={240} height={180}
        />
      </div>

      {/* ── 運動類型選擇 ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 9, color: '#818387', letterSpacing: 0.5 }}>CAMERA MOVEMENT</div>
        <select
          value={activeCam.movementType}
          onChange={e => {
            const mt = e.target.value as CameraMovementType;
            const isOrb = mt === 'orbit_360' || mt === 'orbit_partial';
            setShowOrbit(isOrb);
            updateActiveCam({
              movementType: mt,
              orbit: isOrb ? (activeCam.orbit ?? DEFAULT_ORBIT) : undefined,
            });
          }}
          style={{
            background: '#191919', border: '1px solid #333', color: '#D9D9D6',
            padding: '6px 8px', borderRadius: 3, fontSize: 11, fontFamily: 'inherit',
          }}
        >
          {(Object.keys(MOVEMENT_LABELS) as CameraMovementType[]).map(key => (
            <option key={key} value={key}>{MOVEMENT_LABELS[key]}</option>
          ))}
        </select>

        {/* Speed */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#818387' }}>Speed:</span>
          {(['slow', 'normal', 'fast'] as const).map(s => (
            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 9, color: '#818387', cursor: 'pointer' }}>
              <input type="radio" name="cam-speed" checked={activeCam.movementSpeed === s}
                onChange={() => updateActiveCam({ movementSpeed: s })}
                style={{ accentColor: '#A78BFA', width: 10, height: 10 }}
              />{s}
            </label>
          ))}
        </div>

        {/* Dutch Angle */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#818387', minWidth: 60 }}>Dutch: {activeCam.dutchAngle}°</span>
          <input type="range" min={-30} max={30} step={1}
            value={activeCam.dutchAngle}
            onChange={e => updateActiveCam({ dutchAngle: parseInt(e.target.value) })}
            style={{ flex: 1, accentColor: '#A78BFA', height: 4 }}
          />
        </div>
      </div>

      {/* ── Orbit 控制器 ────────────────────────────────────── */}
      {isOrbitMode && activeCam.orbit && (
        <div style={{ border: '1px dashed #2A1A4A', borderRadius: 4, padding: 8, background: '#1a1028' }}>
          <div style={{ fontSize: 9, color: '#A78BFA', letterSpacing: 0.5, marginBottom: 6 }}>ORBIT CONTROLLER</div>
          <OrbitController
            orbit={activeCam.orbit}
            onChange={partial => updateActiveCam({
              orbit: { ...(activeCam.orbit ?? DEFAULT_ORBIT), ...partial },
            })}
            size={180}
          />
        </div>
      )}
    </div>
  );
}

export { DEFAULT_CAMERA, DEFAULT_ORBIT };
