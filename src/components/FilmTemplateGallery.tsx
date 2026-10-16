// ◎ 2026-04-08 — P0 電影模板 Gallery
// 6 組風格卡片，一鍵載入 NODE 01-09

import { useState, useRef, useEffect } from 'react';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';
import { FILM_TEMPLATES, type FilmTemplate } from '../constants/filmTemplates';

interface FilmTemplateGalleryProps {
  onSelect: (template: FilmTemplate) => void;
  onClose: () => void;
  /** true = full-page mode (splash), false = overlay mode (toolbar) */
  fullPage?: boolean;
}

export function FilmTemplateGallery({ onSelect, onClose, fullPage = false }: FilmTemplateGalleryProps) {
  const { t } = useI18n();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  // ─── 進場動畫 ────────────────────────────────────────────────
  useEffect(() => {
    if (titleRef.current) {
      anime({
        targets: titleRef.current,
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 500,
        easing: 'easeOutCubic',
      });
    }
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll('[data-template-card]');
      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [30, 0],
        scale: [0.96, 1],
        delay: anime.stagger(80, { start: 200 }),
        duration: 500,
        easing: 'easeOutCubic',
      });
    }
  }, []);

  const handleSelect = (tmpl: FilmTemplate) => {
    setSelectedId(tmpl.id);
    // brief pulse then callback
    setTimeout(() => onSelect(tmpl), 250);
  };

  const containerStyle: React.CSSProperties = fullPage
    ? {
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
        background: '#1C1C1C', fontFamily: "'Inter', 'Noto Sans TC', sans-serif",
      }
    : {
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(28,28,28,0.92)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 20px',
        fontFamily: "'Inter', 'Noto Sans TC', sans-serif",
      };

  return (
    <div style={containerStyle} onClick={!fullPage ? onClose : undefined}>
      {/* Close button (overlay mode only) */}
      {!fullPage && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 24,
            background: 'transparent', border: '1px solid #4C4E56',
            color: '#818387', fontSize: 10, padding: '4px 12px',
            borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: 1,
          }}
        >
          ESC
        </button>
      )}

      {/* Inner content (stopPropagation prevents click-outside from closing) */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 700 }}>

      {/* Title */}
      <div ref={titleRef} style={{ textAlign: 'center', marginBottom: 36, opacity: 0 }}>
        <h2 style={{
          fontSize: 20, fontWeight: 300, color: '#D9D9D6',
          letterSpacing: 6, margin: 0,
        }}>
          {t('template.gallery.title')}
        </h2>
        <p style={{
          fontSize: 10, color: '#63666A', letterSpacing: 2, marginTop: 6,
        }}>
          {t('template.gallery.subtitle')}
        </p>
      </div>

      {/* Template Grid */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16, maxWidth: 700, width: '100%',
        }}
      >
        {FILM_TEMPLATES.map(tmpl => {
          const isHovered = hoveredId === tmpl.id;
          const isSelected = selectedId === tmpl.id;
          return (
            <div
              key={tmpl.id}
              data-template-card
              onClick={() => handleSelect(tmpl)}
              onMouseEnter={() => setHoveredId(tmpl.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                padding: '20px 16px',
                background: `linear-gradient(135deg, ${tmpl.gradient[0]}, ${tmpl.gradient[1]}20)`,
                border: `1px solid ${isSelected ? '#A78BFA' : isHovered ? '#DFCEEA' : '#2A1A4A'}`,
                borderRadius: 3,
                cursor: 'pointer',
                opacity: 0,
                transition: 'border-color 0.2s, transform 0.2s',
                transform: isSelected ? 'scale(0.97)' : isHovered ? 'translateY(-2px)' : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Icon */}
              <svg
                width="28" height="28" viewBox="0 0 24 24"
                fill="none" stroke={isHovered ? '#DFCEEA' : '#818387'}
                strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ marginBottom: 10, transition: 'stroke 0.2s' }}
              >
                <path d={tmpl.icon} />
              </svg>

              {/* Name */}
              <div style={{
                fontSize: 13, fontWeight: 500, color: '#D9D9D6',
                letterSpacing: 1, marginBottom: 4,
              }}>
                {t(tmpl.nameKey)}
              </div>

              {/* Tagline */}
              <div style={{
                fontSize: 9, color: '#818387', letterSpacing: 0.5,
                lineHeight: 1.4, marginBottom: 8,
              }}>
                {t(tmpl.taglineKey)}
              </div>

              {/* Palette preview */}
              <div style={{ display: 'flex', gap: 3 }}>
                {tmpl.nodes.node_02?.dominant_palette?.split(',').slice(0, 5).map((hex, i) => (
                  <div
                    key={i}
                    style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: hex.trim(),
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>

              {/* Description on hover */}
              {isHovered && (
                <div style={{
                  fontSize: 9, color: '#A78BFA', marginTop: 8,
                  letterSpacing: 0.3, lineHeight: 1.4,
                }}>
                  {t(tmpl.descKey)}
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#A78BFA', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Back button (full-page mode) */}
      {fullPage && (
        <button
          onClick={onClose}
          style={{
            marginTop: 28, fontSize: 10, color: '#63666A',
            background: 'transparent', border: '1px solid #4C4E56',
            padding: '6px 20px', borderRadius: 2, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: 2,
          }}
        >
          {t('template.gallery.back')}
        </button>
      )}

      </div>{/* close inner content wrapper */}
    </div>
  );
}
