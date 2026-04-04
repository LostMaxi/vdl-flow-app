import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';

export function OfflineBanner() {
  const { t } = useI18n();
  const online = useOnlineStatus();
  const bannerRef = useRef<HTMLDivElement>(null);

  // ─── Anime.js: 離線橫幅滑入 / 滑出 ──────────────────────────
  useEffect(() => {
    if (!bannerRef.current) return;
    if (!online) {
      anime({
        targets: bannerRef.current,
        translateY: [-40, 0],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutCubic',
      });
    } else {
      anime({
        targets: bannerRef.current,
        translateY: [0, -40],
        opacity: [1, 0],
        duration: 350,
        easing: 'easeInCubic',
      });
    }
  }, [online]);

  return (
    <div ref={bannerRef} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#4C4E56', color: '#D9D9D6', textAlign: 'center',
      padding: '6px 12px', fontSize: 11, letterSpacing: 1,
      fontFamily: "'Inter', system-ui, sans-serif",
      opacity: 0,
      pointerEvents: online ? 'none' : 'auto',
    }}>
      {t('offline.message')}
    </div>
  );
}
