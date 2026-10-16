// ◎ 2026-04-06 — EditorPanel: 右側編輯面板
// 選中節點時顯示完整 NodeCard + 子面板（CameraHUD / LightingRig / Template）
// 未選中時顯示專案總覽

import { lazy, Suspense, useMemo, useState, useCallback } from 'react';
import { NodeCard } from '../NodeCard';
import { LoadingSpinner } from '../LoadingSpinner';
import TemplatePanel from '../TemplatePanel';
import type { NodeDef, LockEntry } from '../../types/vdl';
import type { NodeTemplate } from '../../types/filmDNA';
import type { ShotRecord } from '../../hooks/usePersistentFlow';

const CameraHUD = lazy(() => import('../camera/CameraHUD').then(m => ({ default: m.CameraHUD })));
const LightingRigPanel = lazy(() => import('../lighting/LightingRigPanel').then(m => ({ default: m.LightingRigPanel })));

// ─── 色票常數 ────────────────────────────────────────────────

const C = {
  bg:         '#1C1C1C',
  panelBg:    '#191919',
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

// ─── GAS 圖片→情緒/風格推斷（NODE 01 專用）─────────────────

async function enrichNode01FromPalette(
  palette: string,
): Promise<Record<string, string> | null> {
  const gasUrl = import.meta.env.VITE_GAS_URL;
  if (!gasUrl) return null;

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        mode: 'translate',
        message:
          `以下是一組從參考圖片提取的色票：[${palette}]\n\n` +
          '請根據這組色彩推斷以下四項，直接輸出 JSON，不加其他文字：\n' +
          '{\n' +
          '  "emotion_start": "起始情緒（如：孤寂、溫暖、迷茫、躁動）",\n' +
          '  "emotion_end": "終點情緒（如：希望、平靜、釋懷、激昂）",\n' +
          '  "style_keywords": "3-5個風格關鍵字，逗號分隔（如：warm vintage, golden hour, soft glow）",\n' +
          '  "theme_hint": "一句話主題暗示（如：失去與重逢的記憶旅程）"\n' +
          '}',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;

    const text = data.translated?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      emotion_start: parsed.emotion_start || '',
      emotion_end: parsed.emotion_end || '',
      style_keywords: parsed.style_keywords || '',
    };
  } catch {
    return null;
  }
}

// ─── Props ───────────────────────────────────────────────────

export interface EditorPanelProps {
  // 選中的節點
  selectedNodeId: string | null;
  nodeDefs: NodeDef[];
  activeIndex: number;
  completedNodes: Set<string>;
  locks: Record<string, LockEntry>;
  nodeValues: Record<string, Record<string, string | number>>;
  flowMode: 'basic' | 'advanced';
  onFlowModeChange: (mode: 'basic' | 'advanced') => void;
  onClose: () => void;

  // NodeCard 回呼
  onComplete: (nodeDef: NodeDef, values: Record<string, string | number>) => void;
  onUndoComplete: (nodeId: string, nodeIndex: number) => void;
  onLockFields: (fields: Record<string, { value: string | number; source: string }>) => void;
  onRemoveLock: (key: string) => void;

  // Palette
  savedPalettes: string[][];
  onSavePalette: (palette: string[]) => void;
  onDeletePalette: (index: number) => void;

  // QA history
  shotHistory: ShotRecord[];

  // Template
  getTemplatesForNode: (nodeId: string) => NodeTemplate[];
  onSaveTemplate: (template: Omit<NodeTemplate, 'id' | 'createdAt'>) => NodeTemplate;
  onRemoveTemplate: (templateId: string) => void;

  // 模板套用 → 寫入 nodeValues
  onApplyTemplateValues: (nodeId: string, values: Record<string, string | number>) => void;

  // 專案資訊
  projectName: string;
  sceneCount: number;
  shotCount: number;
}

// ─── 元件本體 ────────────────────────────────────────────────

export function EditorPanel({
  selectedNodeId,
  nodeDefs,
  activeIndex,
  completedNodes,
  locks,
  nodeValues,
  flowMode,
  onFlowModeChange,
  onClose,
  onComplete,
  onUndoComplete,
  onLockFields,
  onRemoveLock,
  savedPalettes,
  onSavePalette,
  onDeletePalette,
  shotHistory,
  getTemplatesForNode,
  onSaveTemplate,
  onRemoveTemplate,
  onApplyTemplateValues,
  projectName,
  sceneCount,
  shotCount,
}: EditorPanelProps) {

  const [showTemplates, setShowTemplates] = useState(false);
  const [templateVersion, setTemplateVersion] = useState(0);

  const selectedDef = useMemo(() =>
    nodeDefs.find(n => n.id === selectedNodeId) ?? null,
    [nodeDefs, selectedNodeId],
  );

  const selectedIndex = useMemo(() =>
    selectedDef ? nodeDefs.findIndex(n => n.id === selectedDef.id) : -1,
    [nodeDefs, selectedDef],
  );

  // 模板套用：寫入 nodeValues → 透過 key 強制 NodeCard 重新掛載
  // ⚠ 必須在 early return 之前，遵守 Rules of Hooks
  const [enriching, setEnriching] = useState(false);

  const handleApplyTemplate = useCallback((templateValues: Record<string, string>) => {
    if (!selectedNodeId) return;
    const merged: Record<string, string | number> = {
      ...(nodeValues[selectedNodeId] ?? {}),
    };
    Object.entries(templateValues).forEach(([k, v]) => { merged[k] = v; });

    // NODE 01 + 圖片模板：呼叫 GAS 推斷情緒/風格
    const palette = templateValues.palette || templateValues.dominant_palette;
    if (selectedNodeId === 'node_01' && palette) {
      setEnriching(true);
      enrichNode01FromPalette(palette).then(enriched => {
        if (enriched) {
          Object.entries(enriched).forEach(([k, v]) => {
            if (v && !merged[k]) merged[k] = v;   // 不覆蓋已填欄位
          });
        }
        onApplyTemplateValues(selectedNodeId, merged);
        setTemplateVersion(v => v + 1);
        setEnriching(false);
      });
    } else {
      onApplyTemplateValues(selectedNodeId, merged);
      setTemplateVersion(v => v + 1);
    }
    setShowTemplates(false);
  }, [selectedNodeId, nodeValues, onApplyTemplateValues]);

  // 當前值（供模板儲存用）
  // ⚠ 必須在 early return 之前，遵守 Rules of Hooks
  const currentValuesForTemplate = useMemo(() => {
    if (!selectedNodeId) return {};
    const vals = nodeValues[selectedNodeId] ?? {};
    return Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, String(v)]));
  }, [nodeValues, selectedNodeId]);

  // ─── 無選中節點：顯示專案總覽 ──────────────────────────────
  if (!selectedDef || !selectedNodeId) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        color: C.label,
        gap: 16,
        padding: 24,
      }}>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: C.text,
          letterSpacing: 1,
        }}>
          {projectName}
        </div>
        <div style={{
          fontSize: 11,
          color: C.muted,
          textAlign: 'center',
          lineHeight: 1.8,
        }}>
          <div>{completedNodes.size} / {nodeDefs.length} nodes completed</div>
          <div>{sceneCount} scenes | {shotCount} shots</div>
        </div>
        <div style={{
          fontSize: 10,
          color: C.muted,
          padding: '12px 16px',
          border: `1px dashed ${C.border}`,
          borderRadius: 6,
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          click a node on the canvas to edit
        </div>
        <div style={{
          display: 'flex',
          gap: 8,
          fontSize: 9,
          color: C.muted,
        }}>
          <span style={{
            padding: '3px 8px',
            borderRadius: 3,
            background: flowMode === 'basic' ? C.darkPurple : 'transparent',
            color: flowMode === 'basic' ? C.lavender : C.muted,
            border: `1px solid ${C.border}`,
          }}>
            {flowMode === 'basic' ? 'BASIC' : 'ADVANCED'}
          </span>
        </div>
      </div>
    );
  }

  // ─── 選中節點：顯示完整編輯器 ──────────────────────────────

  const hasCameraHUD    = selectedDef.fields.some(f => f.hudControl === 'camera');
  const hasLightingHUD  = selectedDef.fields.some(f => f.hudControl === 'lighting');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nodeTemplates   = useMemo(() => getTemplatesForNode(selectedNodeId), [selectedNodeId, templateVersion, getTemplatesForNode]);
  const isNodeActive    = selectedIndex === activeIndex;
  const isNodeCompleted = completedNodes.has(selectedNodeId);
  const showTemplateTrigger = !!onSaveTemplate;

  return (
    <div style={{
      fontFamily: FONT,
    }}>
      {/* 節點標題列 */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#191919ee',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '10px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 3,
              border: `1px solid ${C.border}`, background: 'transparent',
              color: C.label, fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT, flexShrink: 0,
            }}
            title="Close (ESC)"
          >
            ×
          </button>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.purple,
            letterSpacing: 0.5,
          }}>
            {String(selectedDef.step).padStart(2, '0')}
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: C.white,
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {selectedDef.title}
          </span>
          {/* 模板切換按鈕 */}
          {showTemplateTrigger && (
            <button
              onClick={() => setShowTemplates(s => !s)}
              style={{
                fontSize: 9, padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
                fontFamily: FONT, fontWeight: 600, letterSpacing: 0.3, minHeight: 26,
                border: `1px solid ${showTemplates ? C.purple : C.border}`,
                background: showTemplates ? C.darkPurple : 'transparent',
                color: showTemplates ? C.lavender : C.label,
              }}
            >
              Templates{nodeTemplates.length > 0 ? ` (${nodeTemplates.length})` : ''}
            </button>
          )}
          {/* BASIC / ADVANCED 切換 */}
          <div style={{ display: 'flex', gap: 0 }}>
            <button
              onClick={() => onFlowModeChange('basic')}
              style={{
                fontSize: 8, padding: '2px 6px', borderRadius: '3px 0 0 3px', cursor: 'pointer',
                fontFamily: FONT, fontWeight: 600, letterSpacing: 0.3,
                border: `1px solid ${C.border}`,
                background: flowMode === 'basic' ? C.darkPurple : 'transparent',
                color: flowMode === 'basic' ? C.lavender : C.label,
              }}
            >
              BASIC
            </button>
            <button
              onClick={() => onFlowModeChange('advanced')}
              style={{
                fontSize: 8, padding: '2px 6px', borderRadius: '0 3px 3px 0', cursor: 'pointer',
                fontFamily: FONT, fontWeight: 600, letterSpacing: 0.3,
                border: `1px solid ${C.border}`, borderLeft: 'none',
                background: flowMode === 'advanced' ? C.darkPurple : 'transparent',
                color: flowMode === 'advanced' ? C.lavender : C.label,
              }}
            >
              ADV
            </button>
          </div>
        </div>

        {/* GAS 推斷中提示 */}
        {enriching && (
          <div style={{ padding: '6px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <LoadingSpinner size={14} color={C.purple} label="色彩情緒推斷中..." />
          </div>
        )}

        {/* 動作列：CONFIRM 或 撤回 */}
        {isNodeActive && !isNodeCompleted && (
          <div style={{ padding: '0 16px 8px' }}>
            <button
              onClick={() => {
                const btn = document.querySelector<HTMLButtonElement>('[data-vdl-confirm]');
                if (btn) btn.click();
              }}
              style={{
                width: '100%', fontSize: 11, padding: '8px 0',
                background: C.purple, color: C.bg,
                border: 'none', borderRadius: 3,
                cursor: 'pointer', fontFamily: FONT,
                fontWeight: 600, letterSpacing: 1,
              }}
            >
              CONFIRM →
            </button>
          </div>
        )}
        {isNodeCompleted && (
          <div style={{ padding: '0 16px 8px' }}>
            <button
              onClick={() => onUndoComplete(selectedNodeId, selectedIndex)}
              style={{
                width: '100%', fontSize: 10, padding: '6px 0',
                background: 'transparent', color: C.label,
                border: `1px solid ${C.border}`, borderRadius: 3,
                cursor: 'pointer', fontFamily: FONT,
                fontWeight: 500, letterSpacing: 0.5,
              }}
            >
              ← UNDO CONFIRM
            </button>
          </div>
        )}

        {/* 模板面板（可摺疊，在標題列下方展開） */}
        {showTemplates && showTemplateTrigger && (
          <div style={{ marginTop: 8 }}>
            <TemplatePanel
              nodeId={selectedNodeId}
              currentValues={currentValuesForTemplate}
              onApplyTemplate={handleApplyTemplate}
              templates={nodeTemplates}
              onSaveTemplate={(tpl) => { const r = onSaveTemplate!(tpl); setTemplateVersion(v => v + 1); return r; }}
              onRemoveTemplate={(id) => { onRemoveTemplate!(id); setTemplateVersion(v => v + 1); }}
            />
          </div>
        )}
      </div>

      {/* NodeCard 完整編輯器 */}
      <div style={{ padding: '0 4px' }}>
        <NodeCard
          key={`${selectedNodeId}-${templateVersion}`}
          nodeDef={selectedDef}
          isActive={isNodeActive}
          isCompleted={isNodeCompleted}
          locks={locks}
          initialValues={nodeValues[selectedNodeId]}
          onComplete={onComplete}
          onLockFields={onLockFields}
          onRemoveLock={onRemoveLock}
          savedPalettes={savedPalettes}
          onSavePalette={onSavePalette}
          onDeletePalette={onDeletePalette}
          shotQAHistory={selectedNodeId === 'node_13' ? shotHistory.map(s => s.qaScores) : undefined}
          flowMode={flowMode}
        />
      </div>

      {/* Camera HUD (NODE 07) */}
      {hasCameraHUD && flowMode === 'advanced' && (
        <Suspense fallback={null}>
          <div style={{
            margin: '8px 4px',
            padding: 12,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            background: C.bg,
          }}>
            <div style={{
              fontSize: 10,
              color: C.purple,
              letterSpacing: 1,
              marginBottom: 8,
              fontWeight: 600,
            }}>
              CAMERA HUD
            </div>
            <CameraHUD
              cameras={[]}
              lights={[]}
              onCamerasChange={() => {}}
            />
          </div>
        </Suspense>
      )}

      {/* Lighting Rig (NODE 10) */}
      {hasLightingHUD && flowMode === 'advanced' && (
        <Suspense fallback={null}>
          <div style={{ margin: '8px 4px' }}>
            <LightingRigPanel
              rig={{ lights: [], presetName: '', keyFillRatio: 0 }}
              onChange={() => {}}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
