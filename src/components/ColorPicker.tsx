// ◎ VDL-FLOW 色票選擇器元件
// 支援單色/多色選取、儲存/刪除色票組（每專案最多 10 組）

import { useState, useRef, useCallback } from 'react';
import { anime } from '../hooks/useAnime';

interface ColorPickerProps {
  value: string;                    // 當前欄位值（如 '#1a1a2e' 或 '#1a1a2e,#16213e,#e94560'）
  onChange: (value: string) => void;
  multi?: boolean;                  // true = palette 模式（多色）
  disabled?: boolean;
  savedPalettes?: string[][];       // 已儲存的色票組（最多 10 組）
  onSavePalette?: (palette: string[]) => void;
  onDeletePalette?: (index: number) => void;
}

const MAX_PALETTES = 10;

export function ColorPicker({ value, onChange, multi = false, disabled = false, savedPalettes = [], onSavePalette, onDeletePalette }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerColor, setPickerColor] = useState('#A78BFA');
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 解析當前值為色票陣列
  const currentColors = value
    ? value.split(',').map(s => s.trim()).filter(s => /^#[0-9a-fA-F]{3,8}$/.test(s))
    : [];

  const togglePanel = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      if (next && panelRef.current) {
        anime({
          targets: panelRef.current,
          opacity: [0, 1],
          translateY: [-6, 0],
          duration: 200,
          easing: 'easeOutCubic',
        });
      }
      return next;
    });
  }, []);

  const addColor = useCallback(() => {
    if (disabled) return;
    if (multi) {
      const newColors = currentColors.includes(pickerColor)
        ? currentColors
        : [...currentColors, pickerColor];
      onChange(newColors.join(', '));
    } else {
      onChange(pickerColor);
      setIsOpen(false);
    }
  }, [pickerColor, currentColors, multi, onChange, disabled]);

  const removeColor = useCallback((index: number) => {
    if (disabled) return;
    const newColors = currentColors.filter((_, i) => i !== index);
    onChange(newColors.join(', '));
  }, [currentColors, onChange, disabled]);

  const handleSavePalette = useCallback(() => {
    if (currentColors.length < 1 || !onSavePalette) return;
    if (savedPalettes.length >= MAX_PALETTES) return;
    onSavePalette(currentColors);
  }, [currentColors, savedPalettes, onSavePalette]);

  const handleLoadPalette = useCallback((palette: string[]) => {
    if (disabled) return;
    onChange(palette.join(', '));
  }, [onChange, disabled]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {/* 色票預覽 chips */}
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {currentColors.map((c, i) => (
          <span
            key={`${c}-${i}`}
            style={{
              display: 'inline-block',
              width: 16, height: 16,
              background: c,
              border: '1px solid #4C4E56',
              borderRadius: 2,
              cursor: disabled ? 'default' : 'pointer',
            }}
            title={c}
            onClick={() => !disabled && multi && removeColor(i)}
          />
        ))}
      </div>

      {/* 開啟色票面板按鈕 */}
      <button
        ref={btnRef}
        onClick={togglePanel}
        disabled={disabled}
        style={{
          width: 22, height: 22,
          background: 'transparent',
          border: '1px solid #4C4E56',
          borderRadius: 2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#A78BFA',
          padding: 0,
        }}
        title="Color picker"
      >
        ◆
      </button>

      {/* 色票面板 */}
      {isOpen && !disabled && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 100,
            background: '#1C1C1C',
            border: '1px solid #4C4E56',
            borderRadius: 4,
            padding: 10,
            minWidth: 200,
            marginTop: 4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          {/* 原生 color input */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="color"
              value={pickerColor}
              onChange={e => setPickerColor(e.target.value)}
              style={{ width: 32, height: 28, border: '1px solid #333', borderRadius: 2, cursor: 'pointer', padding: 0, background: 'transparent' }}
            />
            <input
              type="text"
              value={pickerColor}
              onChange={e => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPickerColor(v);
              }}
              style={{ flex: 1, background: '#191919', border: '1px solid #333', color: '#D9D9D6', padding: '4px 6px', borderRadius: 2, fontSize: 11, fontFamily: 'monospace' }}
              maxLength={7}
            />
            <button
              onClick={addColor}
              style={{ fontSize: 10, padding: '4px 8px', background: '#2A1A4A', color: '#D9D9D6', border: '1px solid #A78BFA', borderRadius: 2, cursor: 'pointer' }}
            >
              {multi ? '+' : 'OK'}
            </button>
          </div>

          {/* 快速色板 */}
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
            {['#1a1a2e', '#16213e', '#e94560', '#f5e6d3', '#c8b8a2', '#D4A574', '#4A7C59', '#B8860B', '#E94560', '#A78BFA', '#FFD700', '#2F4F4F', '#8B4513', '#D9D9D6', '#101820'].map(c => (
              <span
                key={c}
                onClick={() => setPickerColor(c)}
                style={{
                  width: 18, height: 18,
                  background: c,
                  border: pickerColor === c ? '2px solid #A78BFA' : '1px solid #4C4E56',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
                title={c}
              />
            ))}
          </div>

          {/* 儲存/刪除色票組 (palette 模式限定) */}
          {multi && (
            <div style={{ borderTop: '1px solid #333', paddingTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: '#818387', letterSpacing: 0.5 }}>
                  Saved ({savedPalettes.length}/{MAX_PALETTES})
                </span>
                {currentColors.length > 0 && savedPalettes.length < MAX_PALETTES && (
                  <button
                    onClick={handleSavePalette}
                    style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #4C4E56', color: '#D9D9D6', borderRadius: 2, cursor: 'pointer' }}
                  >
                    Save
                  </button>
                )}
              </div>
              {savedPalettes.map((pal, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                  <div
                    style={{ display: 'flex', gap: 1, cursor: 'pointer', flex: 1 }}
                    onClick={() => handleLoadPalette(pal)}
                    title="Click to apply"
                  >
                    {pal.map((c, ci) => (
                      <span key={ci} style={{ width: 14, height: 14, background: c, border: '1px solid #333', borderRadius: 1 }} />
                    ))}
                  </div>
                  {onDeletePalette && (
                    <button
                      onClick={() => onDeletePalette(idx)}
                      style={{ fontSize: 9, color: '#707372', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                      title="Delete palette"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 關閉 */}
          <button
            onClick={() => setIsOpen(false)}
            style={{ width: '100%', marginTop: 6, fontSize: 9, padding: '3px 0', background: '#242424', color: '#818387', border: '1px solid #333', borderRadius: 2, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
