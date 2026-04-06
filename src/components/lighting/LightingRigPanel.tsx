// ◎ 2026-04-06 — LightingRigPanel 燈光控制面板
import React, { useCallback, useMemo, useState } from 'react';
import type { LightType, LightSource, LightingRig } from '../../types/filmDNA';

// ─── 色票常數（遵循 Lost Maxi.Art 色彩系統）─────────────────
const C = {
  appBg:      '#1C1C1C',
  inputBg:    '#191919',
  cardBg:     '#242424',
  border:     '#333333',
  muted:      '#4C4E56',
  label:      '#818387',
  text:       '#D9D9D6',
  white:      '#FFFFFF',
  purple:     '#A78BFA',
  lavender:   '#DFCEEA',
  yellow:     '#FDDA25',
  darkPurple: '#2A1A4A',
  coolLight:  '#88CCFF',
} as const;

const FONT = "'Inter', 'Noto Sans TC', sans-serif";

// ─── 燈光類型選項 ───────────────────────────────────────────
const LIGHT_TYPES: LightType[] = ['key', 'fill', 'rim', 'ambient', 'practical', 'accent'];

// ─── 色溫指示色：暖 / 中性 / 冷 ─────────────────────────────
function kelvinColor(k: number): string {
  if (k < 4000) return C.yellow;
  if (k > 5500) return C.coolLight;
  return C.text;
}

// ─── 預設燈光配置 ───────────────────────────────────────────
function makeId(): string {
  return `light_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 建立單顆預設燈光 */
function makeLightSource(
  name: string,
  type: LightType,
  kelvin: number,
  intensity: number,
  softness: number,
  position: [number, number, number] = [0, 0, 0],
  target: [number, number, number] = [0, 0, 0],
): LightSource {
  return { id: makeId(), name, type, kelvin, intensity, softness, position, target };
}

/** 預設集：名稱 → 燈光陣列產生器 */
const PRESETS: Record<string, () => LightSource[]> = {
  '3-Point Standard': () => [
    makeLightSource('Key',  'key',  4500, 80, 0.4, [-2, 3, 2]),
    makeLightSource('Fill', 'fill', 4200, 40, 0.7, [2, 2, 1]),
    makeLightSource('Rim',  'rim',  5600, 60, 0.3, [0, 3, -3]),
  ],
  'Rembrandt': () => [
    makeLightSource('Key',  'key',  3800, 85, 0.3, [-3, 3, 1]),
    makeLightSource('Fill', 'fill', 3600, 25, 0.6, [2, 1, 2]),
  ],
  'High Key': () => [
    makeLightSource('Key',     'key',     5500, 90, 0.8, [-1, 4, 2]),
    makeLightSource('Fill',    'fill',    5500, 75, 0.9, [1, 3, 2]),
    makeLightSource('Ambient', 'ambient', 5600, 60, 1.0, [0, 5, 0]),
  ],
  'Low Key': () => [
    makeLightSource('Key',  'key',  3200, 70, 0.2, [-3, 4, 1]),
    makeLightSource('Rim',  'rim',  4000, 30, 0.2, [1, 2, -3]),
  ],
};

// ─── 自動計算 Key:Fill 比 ───────────────────────────────────
function computeKeyFillRatio(lights: LightSource[]): number {
  const keyLight  = lights.find(l => l.type === 'key');
  const fillLight = lights.find(l => l.type === 'fill');
  if (!keyLight || !fillLight || fillLight.intensity === 0) return 0;
  return Math.round((keyLight.intensity / fillLight.intensity) * 100) / 100;
}

// ─── Props ──────────────────────────────────────────────────
interface LightingRigPanelProps {
  rig: LightingRig;
  onChange: (rig: LightingRig) => void;
}

// ═══════════════════════════════════════════════════════════════
// LightSourceCard — 單顆燈光的可摺疊編輯卡片
// ═══════════════════════════════════════════════════════════════
interface LightSourceCardProps {
  light: LightSource;
  onUpdate: (updated: LightSource) => void;
  onRemove: () => void;
}

function LightSourceCard({ light, onUpdate, onRemove }: LightSourceCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  /** 通用欄位更新輔助函式 */
  const patch = useCallback(
    (partial: Partial<LightSource>) => onUpdate({ ...light, ...partial }),
    [light, onUpdate],
  );

  /** 更新三維向量中的單一分量 */
  const updateVec3 = useCallback(
    (field: 'position' | 'target', idx: 0 | 1 | 2, value: number) => {
      const vec: [number, number, number] = [...light[field]] as [number, number, number];
      vec[idx] = value;
      patch({ [field]: vec });
    },
    [light, patch],
  );

  const indicatorColor = kelvinColor(light.kelvin);

  return (
    <div style={{
      background: C.cardBg,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      marginBottom: 8,
      fontFamily: FONT,
      overflow: 'hidden',
    }}>
      {/* 標題列 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setCollapsed(prev => !prev)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 色溫指示圓點 */}
          <span style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: indicatorColor,
            boxShadow: `0 0 6px ${indicatorColor}`,
            flexShrink: 0,
          }} />
          <span style={{ color: C.white, fontWeight: 600, fontSize: 13 }}>
            {light.name}
          </span>
          <span style={{ color: C.label, fontSize: 11 }}>
            ({light.type})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.label, fontSize: 11 }}>
            {light.kelvin}K
          </span>
          {/* 摺疊 / 展開箭頭 */}
          <span style={{ color: C.muted, fontSize: 11 }}>
            {collapsed ? '▶' : '▼'}
          </span>
        </div>
      </div>

      {/* 可摺疊區塊 */}
      {!collapsed && (
        <div style={{ padding: '4px 12px 12px' }}>

          {/* 名稱 */}
          <FieldRow label="名稱">
            <input
              type="text"
              value={light.name}
              onChange={e => patch({ name: e.target.value })}
              style={inputStyle({ width: '100%' })}
            />
          </FieldRow>

          {/* 類型選擇 */}
          <FieldRow label="類型">
            <select
              value={light.type}
              onChange={e => patch({ type: e.target.value as LightType })}
              style={inputStyle({ width: '100%' })}
            >
              {LIGHT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FieldRow>

          {/* 色溫滑桿 2000-8000K */}
          <FieldRow label={`色溫 ${light.kelvin}K`}>
            <input
              type="range"
              min={2000}
              max={8000}
              step={100}
              value={light.kelvin}
              onChange={e => patch({ kelvin: Number(e.target.value) })}
              style={{ width: '100%', accentColor: C.purple }}
            />
          </FieldRow>

          {/* 強度滑桿 0-100 */}
          <FieldRow label={`強度 ${light.intensity}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={light.intensity}
              onChange={e => patch({ intensity: Number(e.target.value) })}
              style={{ width: '100%', accentColor: C.purple }}
            />
          </FieldRow>

          {/* 柔度滑桿 0-1 */}
          <FieldRow label={`柔度 ${light.softness.toFixed(2)}`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={light.softness}
              onChange={e => patch({ softness: Number(e.target.value) })}
              style={{ width: '100%', accentColor: C.purple }}
            />
          </FieldRow>

          {/* 位置 XYZ */}
          <FieldRow label="位置 (x, y, z)">
            <div style={{ display: 'flex', gap: 4 }}>
              {([0, 1, 2] as const).map(i => (
                <input
                  key={i}
                  type="number"
                  step={0.1}
                  value={light.position[i]}
                  onChange={e => updateVec3('position', i, Number(e.target.value))}
                  style={inputStyle({ width: '33%', textAlign: 'center' })}
                />
              ))}
            </div>
          </FieldRow>

          {/* 目標 XYZ */}
          <FieldRow label="目標 (x, y, z)">
            <div style={{ display: 'flex', gap: 4 }}>
              {([0, 1, 2] as const).map(i => (
                <input
                  key={i}
                  type="number"
                  step={0.1}
                  value={light.target[i]}
                  onChange={e => updateVec3('target', i, Number(e.target.value))}
                  style={inputStyle({ width: '33%', textAlign: 'center' })}
                />
              ))}
            </div>
          </FieldRow>

          {/* 刪除按鈕 */}
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button
              onClick={onRemove}
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.label,
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              移除此燈光
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 共用小元件 ─────────────────────────────────────────────
/** 表單列：左側標籤 + 右側控制項 */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ color: C.label, fontSize: 11, marginBottom: 2, fontFamily: FONT }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/** 通用 input / select 行內樣式產生器 */
function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    color: C.text,
    fontSize: 12,
    padding: '4px 6px',
    fontFamily: FONT,
    outline: 'none',
    boxSizing: 'border-box',
    ...extra,
  };
}

// ═══════════════════════════════════════════════════════════════
// LightingRigPanel — 主面板
// ═══════════════════════════════════════════════════════════════
export function LightingRigPanel({ rig, onChange }: LightingRigPanelProps) {

  // ── 燈光陣列操作 ─────────────────────────────────────────
  const updateLight = useCallback((idx: number, updated: LightSource) => {
    const next = [...rig.lights];
    next[idx] = updated;
    const ratio = computeKeyFillRatio(next);
    onChange({ ...rig, lights: next, keyFillRatio: ratio });
  }, [rig, onChange]);

  const removeLight = useCallback((idx: number) => {
    const next = rig.lights.filter((_, i) => i !== idx);
    const ratio = computeKeyFillRatio(next);
    onChange({ ...rig, lights: next, keyFillRatio: ratio });
  }, [rig, onChange]);

  /** 新增一顆預設燈光 */
  const addLight = useCallback(() => {
    const count = rig.lights.length + 1;
    const newLight = makeLightSource(
      `Light ${count}`, 'accent', 4500, 50, 0.5, [0, 2, 0],
    );
    const next = [...rig.lights, newLight];
    const ratio = computeKeyFillRatio(next);
    onChange({ ...rig, lights: next, keyFillRatio: ratio });
  }, [rig, onChange]);

  /** 載入預設集 */
  const applyPreset = useCallback((name: string) => {
    const factory = PRESETS[name];
    if (!factory) return;
    const lights = factory();
    const ratio = computeKeyFillRatio(lights);
    onChange({ lights, presetName: name, keyFillRatio: ratio });
  }, [onChange]);

  // ── Key:Fill 比顯示 ──────────────────────────────────────
  const ratioDisplay = useMemo(() => {
    const r = computeKeyFillRatio(rig.lights);
    if (r === 0) return '--';
    return `${r} : 1`;
  }, [rig.lights]);

  return (
    <div style={{
      background: C.appBg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: 16,
      fontFamily: FONT,
      color: C.text,
    }}>
      {/* 標題 + Key:Fill 比 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>
          Lighting Rig
        </span>
        <span style={{ fontSize: 11, color: C.label }}>
          Key:Fill {ratioDisplay}
        </span>
      </div>

      {/* 預設集按鈕列 */}
      <div style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 12,
      }}>
        {Object.keys(PRESETS).map(name => {
          const isActive = rig.presetName === name;
          return (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              style={{
                background: isActive ? C.darkPurple : 'transparent',
                border: `1px ${isActive ? 'solid' : 'dashed'} ${isActive ? C.purple : C.muted}`,
                borderRadius: 4,
                color: isActive ? C.lavender : C.label,
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* 燈光卡片列表 */}
      {rig.lights.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: C.muted,
          fontSize: 12,
          padding: '20px 0',
        }}>
          尚無燈光 — 請點擊下方按鈕新增，或選擇預設集
        </div>
      )}

      {rig.lights.map((light, idx) => (
        <LightSourceCard
          key={light.id}
          light={light}
          onUpdate={updated => updateLight(idx, updated)}
          onRemove={() => removeLight(idx)}
        />
      ))}

      {/* 新增燈光按鈕 */}
      <button
        onClick={addLight}
        style={{
          width: '100%',
          marginTop: 4,
          padding: '8px 0',
          background: 'transparent',
          border: `1px dashed ${C.purple}`,
          borderRadius: 6,
          color: C.purple,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: FONT,
        }}
      >
        + 新增燈光
      </button>
    </div>
  );
}
