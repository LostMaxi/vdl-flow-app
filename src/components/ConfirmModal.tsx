// ◎ 2026-04-07 — ConfirmModal: 自訂確認/輸入 Modal (取代 browser confirm/prompt)
// Wave 1 C2: 品牌化確認對話框 + 輸入模式

import { useState, useEffect, useRef, useCallback } from 'react';

const FONT = "'Inter', 'Noto Sans TC', sans-serif";

// ─── 色票常數 ────────────────────────────────────────────────
const C = {
  overlay:    'rgba(0,0,0,0.65)',
  bg:         '#242424',
  border:     '#4C4E56',
  muted:      '#818387',
  text:       '#D9D9D6',
  white:      '#FFFFFF',
  purple:     '#A78BFA',
  danger:     '#ef4444',
  dangerDim:  '#7f1d1d',
} as const;

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message?: string;
  /** 有值時顯示輸入框 */
  inputLabel?: string;
  inputDefault?: string;
  /** 輸入框驗證：回傳 null 表示合法、字串表示錯誤訊息 */
  inputValidator?: (value: string) => string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open, title, message, inputLabel, inputDefault = '',
  inputValidator, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, onConfirm, onCancel,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState(inputDefault);
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset input when modal opens
  useEffect(() => {
    if (open) {
      setInputValue(inputDefault);
      setInputError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, inputDefault]);

  // ESC to cancel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  const handleConfirm = useCallback(() => {
    if (inputLabel) {
      const trimmed = inputValue.trim();
      if (!trimmed) { setInputError('Required'); return; }
      if (inputValidator) {
        const err = inputValidator(trimmed);
        if (err) { setInputError(err); return; }
      }
      onConfirm(trimmed);
    } else {
      onConfirm();
    }
  }, [inputValue, inputLabel, inputValidator, onConfirm]);

  // Enter to confirm
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
  }, [handleConfirm]);

  if (!open) return null;

  const accentColor = danger ? C.danger : C.purple;
  const accentDim   = danger ? C.dangerDim : '#2A1A4A';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.overlay, backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={modalRef}
        style={{
          width: 380, maxWidth: 'calc(100vw - 32px)',
          background: C.bg, border: `1px solid ${accentColor}`,
          borderRadius: 8, padding: '24px 28px',
          fontFamily: FONT, boxShadow: `0 8px 40px ${accentDim}`,
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Title */}
        <div style={{
          fontSize: 15, fontWeight: 600, color: C.white,
          letterSpacing: 0.5, marginBottom: message || inputLabel ? 12 : 20,
        }}>
          {title}
        </div>

        {/* Message */}
        {message && (
          <div style={{
            fontSize: 12, color: C.muted, lineHeight: 1.7,
            marginBottom: inputLabel ? 16 : 20,
          }}>
            {message}
          </div>
        )}

        {/* Input */}
        {inputLabel && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, color: C.muted, letterSpacing: 0.5 }}>
              {inputLabel}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setInputError(null); }}
              style={{
                width: '100%', marginTop: 6,
                background: '#191919', border: `1px solid ${inputError ? C.danger : '#333'}`,
                color: C.text, padding: '8px 10px', borderRadius: 3,
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            {inputError && (
              <div style={{ fontSize: 10, color: C.danger, marginTop: 4 }}>
                {inputError}
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              fontSize: 12, padding: '8px 20px',
              background: 'transparent', border: `1px solid #333`,
              color: C.muted, borderRadius: 3, cursor: 'pointer',
              fontFamily: FONT, fontWeight: 500, letterSpacing: 0.5,
              minHeight: 38,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              fontSize: 12, padding: '8px 20px',
              background: accentColor, border: 'none',
              color: danger ? '#fff' : '#1C1C1C', borderRadius: 3,
              cursor: 'pointer', fontFamily: FONT, fontWeight: 600,
              letterSpacing: 0.5, minHeight: 38,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hook: 簡化使用 ConfirmModal 的狀態管理 ─────────────────

export interface ModalConfig {
  title: string;
  message?: string;
  inputLabel?: string;
  inputDefault?: string;
  inputValidator?: (value: string) => string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function useConfirmModal() {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const resolveRef = useRef<((value: string | boolean) => void) | null>(null);

  const confirm = useCallback((cfg: ModalConfig): Promise<string | boolean> => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setConfig(cfg);
    });
  }, []);

  const handleConfirm = useCallback((inputValue?: string) => {
    resolveRef.current?.(inputValue ?? true);
    resolveRef.current = null;
    setConfig(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setConfig(null);
  }, []);

  return { config, confirm, handleConfirm, handleCancel };
}
