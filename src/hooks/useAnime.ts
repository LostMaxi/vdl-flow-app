// ◎ useAnime.ts — VDL-FLOW Anime.js React Hooks
// 提供可重用的動畫 hook，統一管理 anime.js 生命週期

import { useEffect, useRef, useCallback } from 'react';
import anime from 'animejs/lib/anime.es.js';

type AnimeProps = Parameters<typeof anime>[0];
type OmitTargets = Omit<AnimeProps, 'targets'>;

// ─── useAnimeOnMount ─────────────────────────────────────────
// 元素掛載時執行一次性動畫（進場動畫）

export function useAnimeOnMount(
  params: OmitTargets,
  deps: unknown[] = [],
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const instance = anime({
      targets: ref.current,
      ...params,
    });
    return () => { instance.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

// ─── useAnimeStagger ─────────────────────────────────────────
// 對容器內的子元素執行 stagger 動畫

export function useAnimeStagger(
  childSelector: string,
  params: OmitTargets,
  deps: unknown[] = [],
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const children = ref.current.querySelectorAll(childSelector);
    if (children.length === 0) return;
    const instance = anime({
      targets: children,
      ...params,
    });
    return () => { instance.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

// ─── useAnimeCallback ───────────────────────────────────────
// 回傳一個觸發動畫的 callback（用於事件驅動動畫）

export function useAnimeCallback(
  params: OmitTargets,
) {
  const ref = useRef<HTMLElement>(null);

  const trigger = useCallback(() => {
    if (!ref.current) return;
    anime({
      targets: ref.current,
      ...params,
    });
  }, [params]);

  return [ref, trigger] as const;
}

// ─── useAnimePulse ──────────────────────────────────────────
// 脈衝效果（例如進度點完成時的閃爍）

export function useAnimePulse(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !active) return;
    const instance = anime({
      targets: ref.current,
      scale: [1, 1.3, 1],
      opacity: [0.7, 1, 0.7],
      duration: 1200,
      easing: 'easeInOutSine',
      loop: true,
    });
    return () => { instance.pause(); };
  }, [active]);

  return ref;
}

// ─── animateElement (命令式) ────────────────────────────────
// 直接對 DOM 元素執行動畫，不綁定 React ref

export function animateElement(
  target: HTMLElement | NodeList,
  params: OmitTargets,
) {
  return anime({ targets: target, ...params });
}

// ─── Re-export anime for direct usage ───────────────────────
export { anime };
