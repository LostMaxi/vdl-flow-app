// ◎ 2026-04-01 — GenHistoryPanel.tsx (P10)
// NODE 10 同節點多次生成並排比較面板 + Anime.js 進場 / 選取動畫

import { useEffect, useRef, useCallback } from 'react';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';
import { type GenRecord } from '../hooks/useGenHistory';

interface Props {
  records:  GenRecord[];
  onSelect: (timestamp: number) => void;
  onClear:  () => void;
}

export function GenHistoryPanel({ records, onSelect, onClear }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Anime.js: 面板進場 ─────────────────────────────────────
  useEffect(() => {
    if (!panelRef.current || records.length === 0) return;
    anime({
      targets: panelRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 400,
      easing: 'easeOutCubic',
    });
  }, [records.length > 0]);

  // ─── Anime.js: 新圖片加入時的 stagger ────────────────────────
  useEffect(() => {
    if (!scrollRef.current || records.length === 0) return;
    const items = scrollRef.current.querySelectorAll('[data-gen-item]');
    if (items.length === 0) return;
    anime({
      targets: items,
      opacity: [0, 1],
      scale: [0.9, 1],
      delay: anime.stagger(70),
      duration: 350,
      easing: 'easeOutCubic',
    });
  }, [records.length]);

  // ─── Anime.js: 選取脈衝 ──────────────────────────────────────
  const handleSelect = useCallback((ts: number, el: HTMLDivElement | null) => {
    if (el) {
      anime({
        targets: el,
        scale: [1, 1.06, 1],
        duration: 300,
        easing: 'easeInOutQuad',
      });
    }
    onSelect(ts);
  }, [onSelect]);

  if (records.length === 0) return null;

  return (
    <div ref={panelRef} style={{ marginTop: 8, padding: 8, background: '#1E1E1E', border: '1px solid #333', borderRadius: 2, opacity: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: '#818387', letterSpacing: 1 }}>{t('genHistory.title', { count: String(records.length) })}</span>
        <button onClick={onClear}
          style={{ fontSize: 8, color: '#444', background: 'none', border: '1px solid #222', padding: '1px 6px', borderRadius: 2, cursor: 'pointer' }}>
          {t('genHistory.clear')}
        </button>
      </div>
      <div ref={scrollRef} style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {records.map(r => (
          <div
            key={r.timestamp}
            data-gen-item
            onClick={(e) => handleSelect(r.timestamp, e.currentTarget)}
            style={{
              flexShrink: 0,
              cursor: 'pointer',
              border: r.selected ? '2px solid #818cf8' : '2px solid transparent',
              borderRadius: 2,
              position: 'relative',
            }}
          >
            <img
              src={r.url}
              alt={`gen-${r.timestamp}`}
              style={{ width: 120, height: 68, objectFit: 'cover', display: 'block', borderRadius: 1 }}
            />
            <div style={{ fontSize: 7, color: '#555', textAlign: 'center', marginTop: 2 }}>
              {r.generator} · {new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            {r.selected && (
              <div style={{ position: 'absolute', top: 2, right: 2, fontSize: 8, color: '#818387', background: '#1C1C1C', padding: '0 2px', borderRadius: 1 }}>
                {t('genHistory.selected')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
