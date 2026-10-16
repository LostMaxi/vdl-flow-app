// ◎ 2026-04-07 — OnboardingOverlay: 首次開啟導覽
// Wave 1 C1: 3-step 快速上手指南

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/context';

const ONBOARDING_KEY = 'vdl-flow-onboarding-done';
const FONT = "'Inter', 'Noto Sans TC', sans-serif";

const C = {
  overlay:    'rgba(0,0,0,0.7)',
  bg:         '#242424',
  border:     '#4C4E56',
  muted:      '#818387',
  text:       '#D9D9D6',
  white:      '#FFFFFF',
  purple:     '#A78BFA',
  lavender:   '#DFCEEA',
  darkPurple: '#2A1A4A',
} as const;

interface Step {
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  icon: string;
}

const STEPS: Step[] = [
  {
    titleZh: '14 節點工作流',
    titleEn: '14-Node Pipeline',
    descZh: 'VDL-FLOW 將動畫製作拆解為 14 個步驟。從主題發想 (NODE 01) 到品質驗證 (NODE 14)，每個節點會自動鎖定前序決策並生成 AI 提示詞。',
    descEn: 'VDL-FLOW breaks animation production into 14 sequential steps. From Theme Genesis (NODE 01) to Final Export (NODE 14), each node auto-locks upstream decisions and generates AI prompts.',
    icon: '01→14',
  },
  {
    titleZh: '點擊節點 → 右側編輯',
    titleEn: 'Click Node → Edit on Right',
    descZh: '在畫布上點擊任何節點，右側會展開完整編輯面板。填寫欄位後按下 CONFIRM 完成該步驟，系統將自動推進到下一節點。',
    descEn: 'Click any node on the canvas to open the full editor panel on the right. Fill in the fields and press CONFIRM to complete the step — the system advances to the next node automatically.',
    icon: '◎→',
  },
  {
    titleZh: '多鏡頭 + QA 閉環',
    titleEn: 'Multi-Shot + QA Loop',
    descZh: '完成一輪 14 節點後可繼續下一鏡頭。NODE 13 會自動驗證色差、CLIP 相似度等品質指標。QA 通過後系統自動封存鏡頭並生成全片報告。',
    descEn: 'After completing all 14 nodes, start the next shot. NODE 13 auto-validates color delta, CLIP similarity, and more. Once QA passes, the system archives the shot and generates a film report.',
    icon: '∞',
  },
];

export function OnboardingOverlay() {
  const { lang } = useI18n();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setVisible(false);
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // ESC to dismiss
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, dismiss]);

  if (!visible) return null;

  const isZh = lang === 'zh-TW';
  const current = STEPS[step];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.overlay, backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div style={{
        width: 440, maxWidth: 'calc(100vw - 32px)',
        background: C.bg, border: `1px solid ${C.purple}`,
        borderRadius: 12, padding: '32px 28px 24px',
        fontFamily: FONT, boxShadow: `0 12px 48px ${C.darkPurple}`,
      }}>
        {/* Step icon */}
        <div style={{
          fontSize: 32, fontWeight: 700, color: C.purple,
          textAlign: 'center', marginBottom: 8,
          fontFamily: "'Inter', monospace",
          letterSpacing: 2,
        }}>
          {current.icon}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 18, fontWeight: 600, color: C.white,
          textAlign: 'center', marginBottom: 16, letterSpacing: 0.5,
        }}>
          {isZh ? current.titleZh : current.titleEn}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13, color: C.muted, lineHeight: 1.8,
          textAlign: 'center', marginBottom: 28,
          padding: '0 8px',
        }}>
          {isZh ? current.descZh : current.descEn}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === step ? C.purple : '#333',
                transition: 'background 0.2s',
                cursor: 'pointer',
              }}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button
            onClick={dismiss}
            style={{
              fontSize: 11, padding: '8px 16px',
              background: 'transparent', border: `1px solid #333`,
              color: C.muted, borderRadius: 3, cursor: 'pointer',
              fontFamily: FONT, minHeight: 38,
            }}
          >
            {isZh ? '跳過' : 'Skip'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={prev}
                style={{
                  fontSize: 11, padding: '8px 16px',
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.text, borderRadius: 3, cursor: 'pointer',
                  fontFamily: FONT, minHeight: 38,
                }}
              >
                {isZh ? '上一步' : 'Back'}
              </button>
            )}
            <button
              onClick={next}
              style={{
                fontSize: 11, padding: '8px 20px',
                background: C.purple, border: 'none',
                color: '#1C1C1C', borderRadius: 3, cursor: 'pointer',
                fontFamily: FONT, fontWeight: 600, letterSpacing: 0.5, minHeight: 38,
              }}
            >
              {step < STEPS.length - 1
                ? (isZh ? '下一步' : 'Next')
                : (isZh ? '開始使用' : 'Get Started')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
