// ◎ 2026-04-08 — ExternalToolManager: 外部工具連結管理
// 最多 3 個工具槽位，favicon 自動偵測

import React, { useState, useCallback } from 'react';
import type { ExternalToolSlot } from '../types/vdl';
import { resolveFavicon } from '../utils/faviconResolver';
import { useI18n } from '../i18n/context';

const C = {
  bg: '#191919',
  border: '#4C4E56',
  text: '#D9D9D6',
  muted: '#818387',
  input: '#111',
  inputBorder: '#333',
  purple: '#A78BFA',
  lavender: '#DFCEEA',
  slateBlue: '#4A5568',
} as const;

const FONT = "'Inter', 'Noto Sans TC', sans-serif";

interface Props {
  tools: ExternalToolSlot[];
  onUpdate: (tools: ExternalToolSlot[]) => void;
  onClose: () => void;
}

let _idCounter = 0;
function genId(): string {
  return `tool_${Date.now()}_${++_idCounter}`;
}

export function ExternalToolManager({ tools, onUpdate, onClose }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<ExternalToolSlot[]>([...tools]);
  const [resolving, setResolving] = useState<Record<string, boolean>>({});

  const handleLabelChange = useCallback((id: string, label: string) => {
    setDraft(prev => prev.map(t => t.id === id ? { ...t, label } : t));
  }, []);

  const handleUrlChange = useCallback((id: string, url: string) => {
    setDraft(prev => prev.map(t => t.id === id ? { ...t, url, favicon: null } : t));
  }, []);

  const handleUrlBlur = useCallback(async (id: string) => {
    const tool = draft.find(t => t.id === id);
    if (!tool?.url) return;
    setResolving(prev => ({ ...prev, [id]: true }));
    const favicon = await resolveFavicon(tool.url);
    setDraft(prev => prev.map(t => t.id === id ? { ...t, favicon } : t));
    setResolving(prev => ({ ...prev, [id]: false }));
  }, [draft]);

  const handleToggleLock = useCallback((id: string) => {
    setDraft(prev => prev.map(t => t.id === id ? { ...t, locked: !t.locked } : t));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setDraft(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleAdd = useCallback(() => {
    if (draft.length >= 3) return;
    setDraft(prev => [...prev, { id: genId(), label: '', url: '', favicon: null, locked: false }]);
  }, [draft.length]);

  const handleSave = useCallback(() => {
    onUpdate(draft.filter(t => t.url.trim() !== ''));
    onClose();
  }, [draft, onUpdate, onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 24, width: 420, maxWidth: '90vw', fontFamily: FONT,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: C.text, fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>
            {t('tools.manage')}
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: C.muted, fontSize: 18, cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Tool Rows */}
        {draft.map(tool => (
          <div key={tool.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            padding: 8, background: '#111', borderRadius: 4, border: `1px solid ${C.inputBorder}`,
          }}>
            {/* Favicon */}
            <div style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {resolving[tool.id] ? (
                <span style={{ color: C.muted, fontSize: 10 }}>...</span>
              ) : tool.favicon ? (
                <img src={tool.favicon} alt="" width={16} height={16} style={{ borderRadius: 2 }} />
              ) : (
                <LinkSvg />
              )}
            </div>

            {/* Label */}
            <input
              type="text"
              value={tool.label}
              onChange={e => handleLabelChange(tool.id, e.target.value)}
              placeholder={t('tools.label')}
              disabled={tool.locked}
              style={{
                width: 80, background: C.input, border: `1px solid ${C.inputBorder}`,
                color: C.text, padding: '4px 6px', borderRadius: 3, fontSize: 11,
                fontFamily: 'inherit', outline: 'none',
                opacity: tool.locked ? 0.5 : 1,
              }}
            />

            {/* URL */}
            <input
              type="text"
              value={tool.url}
              onChange={e => handleUrlChange(tool.id, e.target.value)}
              onBlur={() => handleUrlBlur(tool.id)}
              placeholder="https://..."
              disabled={tool.locked}
              style={{
                flex: 1, background: C.input, border: `1px solid ${C.inputBorder}`,
                color: C.text, padding: '4px 6px', borderRadius: 3, fontSize: 11,
                fontFamily: 'inherit', outline: 'none',
                opacity: tool.locked ? 0.5 : 1,
              }}
            />

            {/* Lock toggle */}
            <button onClick={() => handleToggleLock(tool.id)} title={tool.locked ? 'Unlock' : 'Lock'} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              color: tool.locked ? C.lavender : C.muted, fontSize: 14,
            }}>
              {tool.locked ? <LockSvg /> : <UnlockSvg />}
            </button>

            {/* Delete */}
            {!tool.locked && (
              <button onClick={() => handleRemove(tool.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: C.muted, fontSize: 14,
              }}>×</button>
            )}
          </div>
        ))}

        {/* Add button */}
        {draft.length < 3 && (
          <button onClick={handleAdd} style={{
            width: '100%', padding: 8, background: 'transparent',
            border: `1px dashed ${C.border}`, borderRadius: 4,
            color: C.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            marginBottom: 12,
          }}>
            {t('tools.addSlot')}
          </button>
        )}

        {/* Save */}
        <button onClick={handleSave} style={{
          width: '100%', padding: 10, background: C.purple, color: '#1C1C1C',
          border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
        }}>
          {t('tools.save')}
        </button>
      </div>
    </div>
  );
}

// ─── SVG Icons (monoline, PMS 色系) ─────────────────────────

function LinkSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818387" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function LockSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DFCEEA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818387" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}
