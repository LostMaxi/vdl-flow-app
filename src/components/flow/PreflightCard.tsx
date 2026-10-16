// ◎ 2026-04-08 — PreflightCard: 浮動預檢卡片
// 聚合上游節點設定，一鍵複製 prompt + 外部工具連結

import React, { useMemo, useState, useCallback } from 'react';
import type { ExternalToolSlot, LockEntry } from '../../types/vdl';
import { assemblePreflightPrompt } from '../../utils/assemblePreflightPrompt';
import { ExternalToolManager } from '../ExternalToolManager';
import { useI18n } from '../../i18n/context';

const C = {
  bg:       '#191919ee',
  border:   '#DFCEEA',
  text:     '#D9D9D6',
  muted:    '#818387',
  label:    '#63666A',
  purple:   '#A78BFA',
  lavender: '#DFCEEA',
  dark:     '#111',
  swatch:   '#2A1A4A',
} as const;

const FONT = "'Inter', 'Noto Sans TC', sans-serif";

interface Props {
  preflightType: 'image' | 'video';
  nodeValues: Record<string, Record<string, string | number>>;
  locks: Record<string, LockEntry>;
  allPrompts: Record<string, string>;
  externalTools: ExternalToolSlot[];
  onUpdateTools: (tools: ExternalToolSlot[]) => void;
  onClose: () => void;
}

export function PreflightCard({
  preflightType,
  nodeValues,
  locks,
  allPrompts,
  externalTools,
  onUpdateTools,
  onClose,
}: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showToolMgr, setShowToolMgr] = useState(false);

  const result = useMemo(
    () => assemblePreflightPrompt(preflightType, nodeValues, locks, allPrompts),
    [preflightType, nodeValues, locks, allPrompts],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.assembled);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  }, [result.assembled]);

  const handleCopyAndOpen = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(result.assembled);
    } catch { /* ignore */ }
    window.open(url, '_blank', 'noopener');
  }, [result.assembled]);

  const handleOpen = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener');
  }, []);

  // 解析 palette hex 色塊
  const paletteHexes = useMemo(() => {
    const paletteSection = result.sections.find(s => s.label === 'PALETTE');
    if (!paletteSection) return [];
    const match = paletteSection.content.match(/#[0-9a-fA-F]{6}/g);
    return match ?? [];
  }, [result.sections]);

  const title = preflightType === 'image'
    ? t('preflight.img.title')
    : t('preflight.vid.title');

  return (
    <>
      <div style={{
        position: 'absolute', left: 12, top: 60, zIndex: 50,
        width: 380, maxHeight: '70vh', overflowY: 'auto',
        background: C.bg, backdropFilter: 'blur(8px)',
        border: `1px solid ${C.border}`, borderRadius: 8,
        fontFamily: FONT, color: C.text,
        scrollbarWidth: 'thin',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px 8px', borderBottom: `1px solid #333`,
          position: 'sticky', top: 0, background: C.bg, backdropFilter: 'blur(8px)', zIndex: 1,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, color: C.lavender }}>
            {title}
          </span>
          <button onClick={onClose} style={{
            width: 28, height: 28, background: 'transparent', border: `1px solid #333`,
            borderRadius: 4, color: C.muted, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Sections */}
        <div style={{ padding: '8px 16px 12px' }}>
          {result.sections.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 11, padding: '16px 0', textAlign: 'center' }}>
              {t('preflight.empty')}
            </div>
          ) : (
            result.sections.map(section => (
              <div key={section.label} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 10, fontWeight: 500, color: C.label,
                  letterSpacing: 2, marginBottom: 4,
                }}>
                  [{section.label}]
                </div>

                {/* 特殊: PALETTE 顯示色塊 */}
                {section.label === 'PALETTE' && paletteHexes.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {paletteHexes.map((hex, i) => (
                      <div key={i} style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: hex, border: `1px solid #444`,
                      }} title={hex} />
                    ))}
                  </div>
                )}

                <pre style={{
                  fontSize: 11, color: C.text, margin: 0,
                  whiteSpace: 'pre-wrap', lineHeight: 1.6,
                  fontFamily: 'inherit',
                }}>
                  {section.content}
                </pre>
              </div>
            ))
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#333', margin: '0 16px' }} />

        {/* Actions */}
        <div style={{ padding: '12px 16px' }}>
          {/* Copy Prompt */}
          <button onClick={handleCopy} style={{
            width: '100%', padding: 8, marginBottom: 8,
            background: copied ? '#2A1A4A' : 'transparent',
            border: `1px solid ${C.purple}`, borderRadius: 4,
            color: copied ? C.lavender : C.purple,
            fontSize: 11, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: 1,
            transition: 'all 0.2s',
          }}>
            {copied ? t('preflight.copied') : t('preflight.copy')}
          </button>

          {/* External Tool Links */}
          {externalTools.filter(t => t.url && t.locked).map(tool => (
            <div key={tool.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0',
            }}>
              {/* Favicon */}
              <div style={{ width: 16, height: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {tool.favicon ? (
                  <img src={tool.favicon} alt="" width={14} height={14} style={{ borderRadius: 2 }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span style={{ flex: 1, fontSize: 11, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tool.label || new URL(tool.url).hostname}
              </span>

              {/* Open */}
              <button onClick={() => handleOpen(tool.url)} style={{
                background: 'transparent', border: `1px solid #333`, borderRadius: 3,
                color: C.muted, fontSize: 10, padding: '3px 8px', cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                {t('tools.open')}
              </button>

              {/* Copy & Open */}
              <button onClick={() => handleCopyAndOpen(tool.url)} style={{
                background: 'transparent', border: `1px solid ${C.purple}`, borderRadius: 3,
                color: C.purple, fontSize: 10, padding: '3px 8px', cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                {t('tools.copyAndOpen')}
              </button>
            </div>
          ))}

          {/* Gear: manage tools */}
          <button onClick={() => setShowToolMgr(true)} style={{
            width: '100%', marginTop: 8, padding: 6,
            background: 'transparent', border: `1px dashed #333`, borderRadius: 4,
            color: C.muted, fontSize: 10, cursor: 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818387" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {t('tools.manage')}
          </button>
        </div>
      </div>

      {/* Tool Manager Modal */}
      {showToolMgr && (
        <ExternalToolManager
          tools={externalTools}
          onUpdate={onUpdateTools}
          onClose={() => setShowToolMgr(false)}
        />
      )}
    </>
  );
}
