import { useMemo, useState, useEffect, useRef } from 'react';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';

interface EnvCheck {
  key: string;
  label: string;
  required: boolean;
}

const ENV_CHECKS: EnvCheck[] = [
  { key: 'VITE_COMFYUI_URL',           label: 'ComfyUI (本地 GPU)',     required: false },
  { key: 'VITE_STABILITY_API_KEY',      label: 'Stability AI (SDXL)',   required: false },
  { key: 'VITE_GEMINI_API_KEY',         label: 'Google AI (VEO)',       required: false },
  { key: 'VITE_RUNWAY_API_KEY',         label: 'Runway Gen-3',          required: false },
  { key: 'VITE_KLING_ACCESS_KEY',       label: 'Kling v2',             required: false },
];

export function EnvWarning() {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const warnRef = useRef<HTMLDivElement>(null);

  const missing = useMemo(() =>
    ENV_CHECKS.filter(e => !import.meta.env[e.key]),
  []);

  // Pollinations 不需要 key，所以只在所有生成端都缺失時才提示
  const allMissing = missing.length === ENV_CHECKS.length;

  // ─── Anime.js: 進場淡入 + 展開 ──────────────────────────────
  useEffect(() => {
    if (dismissed || !allMissing || !warnRef.current) return;
    anime({
      targets: warnRef.current,
      opacity: [0, 1],
      translateY: [-10, 0],
      duration: 500,
      easing: 'easeOutCubic',
    });
  }, [dismissed, allMissing]);

  const handleDismiss = () => {
    if (warnRef.current) {
      anime({
        targets: warnRef.current,
        opacity: [1, 0],
        translateY: [0, -10],
        duration: 300,
        easing: 'easeInCubic',
        complete: () => setDismissed(true),
      });
    } else {
      setDismissed(true);
    }
  };

  if (dismissed || !allMissing) return null;

  return (
    <div ref={warnRef} style={{
      background: '#1C1C1C', border: '1px solid #4C4E56', borderRadius: 4,
      padding: '10px 16px', margin: '12px 0', fontSize: 10,
      fontFamily: "'Inter', system-ui, sans-serif",
      opacity: 0,
    }}>
      <div style={{ color: '#D9D9D6', letterSpacing: 1, marginBottom: 6 }}>
        {t('env.title')}
      </div>
      <div style={{ color: '#818387', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
        {t('env.desc')}
      </div>
      <button
        onClick={handleDismiss}
        style={{
          marginTop: 8, fontSize: 9, color: '#818387', background: 'none',
          border: '1px solid #333', padding: '3px 10px', borderRadius: 2,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {t('env.dismiss')}
      </button>
    </div>
  );
}
