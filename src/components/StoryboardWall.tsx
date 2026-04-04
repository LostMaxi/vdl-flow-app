// ◎ 2026-04-01 — StoryboardWall.tsx (P11)
// 全片分鏡板縮略圖牆 — 所有鏡頭生成結果視覺排列 + Anime.js stagger 進場

import { useEffect, useRef } from 'react';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';
import type { ShotRecord } from '../hooks/usePersistentFlow';

interface ShotFrame {
  shotIndex: number;
  imageUrl?: string;
  prompt:    string;
  qaPass:    boolean;
  qaScores:  number[];
}

interface Props {
  shots:       ShotRecord[];
  genHistory:  Array<{ nodeId: string; url: string; timestamp: number; selected: boolean }>;
}

const QA_LABELS = ['ΔK', 'ΔE', 'CLIP', 'OBJ', 'DEP', 'NDF'];
const QA_THRESH = [800, 3.0, 0.85, 0.80, 0.75, 0.10];
const QA_DIR    = [-1, -1, 1, 1, 1, -1]; // -1=低於閾值為通過, 1=高於閾值為通過

function scorePass(scores: number[]): boolean {
  return scores.length === 6 && scores.every((s, i) =>
    QA_DIR[i] === 1 ? s >= QA_THRESH[i] : s <= QA_THRESH[i]
  );
}

export function StoryboardWall({ shots, genHistory }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Anime.js: 縮圖 stagger 進場 ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current || shots.length === 0) return;
    const cards = containerRef.current.querySelectorAll('[data-shot-card]');
    if (cards.length === 0) return;
    anime({
      targets: cards,
      opacity: [0, 1],
      translateY: [24, 0],
      scale: [0.92, 1],
      delay: anime.stagger(100),
      duration: 500,
      easing: 'easeOutCubic',
    });
  }, [shots.length]);

  if (shots.length === 0) return null;

  // 為每個 shot 找對應的最新選用圖（selected 優先，否則最新）
  const frames: ShotFrame[] = shots.map(shot => {
    const nodeHistory = genHistory.filter(r => r.nodeId === 'node_10');
    const selected    = nodeHistory.find(r => r.selected);
    const latest      = nodeHistory[nodeHistory.length - 1];
    return {
      shotIndex: shot.shotIndex,
      imageUrl:  selected?.url ?? latest?.url,
      prompt:    shot.prompts['node_10'] ?? '',
      qaPass:    scorePass(shot.qaScores),
      qaScores:  shot.qaScores,
    };
  });

  return (
    <div ref={containerRef} style={{ marginTop: 24, padding: '12px 16px', background: '#1C1C1C', border: '1px solid #333', borderRadius: 2 }}>
      <div style={{ fontSize: 10, color: '#818387', letterSpacing: 2, marginBottom: 12 }}>
        {t('storyboard.title', { count: String(frames.length) })}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {frames.map(frame => (
          <div key={frame.shotIndex} data-shot-card style={{ width: 180, flexShrink: 0, opacity: 0 }}>
            {/* 縮略圖 */}
            <div style={{
              width: 180, height: 102,
              background: '#111',
              border: `1px solid ${frame.qaPass ? '#2A1A4A' : '#3a1a1a'}`,
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {frame.imageUrl
                ? <img src={frame.imageUrl} alt={`shot-${frame.shotIndex}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 9 }}>{t('storyboard.noImage')}</div>
              }
              {/* QA 狀態標籤 */}
              <div style={{
                position: 'absolute', top: 4, right: 4,
                fontSize: 8, padding: '1px 4px', borderRadius: 1,
                background: frame.qaPass ? '#0F0B1A' : '#1a0d0d',
                color: frame.qaPass ? '#D9D9D6' : '#707372',
                border: `1px solid ${frame.qaPass ? '#2A1A4A' : '#3a1a1a'}`,
              }}>
                {frame.qaPass ? t('storyboard.pass') : t('storyboard.fail')}
              </div>
              {/* 鏡頭編號 */}
              <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 8, color: '#555', background: '#000a', padding: '1px 4px', borderRadius: 1 }}>
                #{frame.shotIndex + 1}
              </div>
            </div>

            {/* QA 分數列 */}
            {frame.qaScores.length === 6 && (
              <div style={{ display: 'flex', gap: 2, marginTop: 3, flexWrap: 'wrap' }}>
                {frame.qaScores.map((s, i) => {
                  const pass = QA_DIR[i] === 1 ? s >= QA_THRESH[i] : s <= QA_THRESH[i];
                  return (
                    <span key={i} style={{ fontSize: 7, color: pass ? '#D9D9D6' : '#707372', background: '#111', padding: '0 3px', borderRadius: 1 }}>
                      {QA_LABELS[i]}:{s}
                    </span>
                  );
                })}
              </div>
            )}

            {/* 提示詞摘要 */}
            <div style={{ fontSize: 7, color: '#333', marginTop: 3, lineHeight: 1.4, overflow: 'hidden', maxHeight: 28 }}>
              {frame.prompt.slice(0, 80)}{frame.prompt.length > 80 ? '…' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
