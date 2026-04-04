// Minimal type declarations for animejs/lib/anime.es.js
// Phase 3: 可替換為 npm install @types/animejs

declare module 'animejs/lib/anime.es.js' {
  type EasingOptions =
    | 'linear'
    | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad'
    | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
    | 'easeInQuart' | 'easeOutQuart' | 'easeInOutQuart'
    | 'easeInSine' | 'easeOutSine' | 'easeInOutSine'
    | 'easeOutBack' | 'easeInOutBack'
    | string;

  type AnimeTarget = string | object | HTMLElement | SVGElement | NodeList | null;

  interface AnimeParams {
    targets?: AnimeTarget | AnimeTarget[];
    duration?: number;
    delay?: number | ReturnType<typeof anime.stagger>;
    easing?: EasingOptions;
    autoplay?: boolean;
    loop?: boolean;
    update?: (anim: AnimeInstance) => void;
    complete?: (anim: AnimeInstance) => void;
    [prop: string]: unknown;
  }

  interface AnimeInstance {
    play(): void;
    pause(): void;
    seek(time: number): void;
    restart(): void;
    reverse(): void;
    duration: number;
    progress: number;
    currentTime: number;
    add(params: AnimeParams, offset?: number | string): AnimeInstance;
  }

  interface AnimeStatic {
    (params: AnimeParams): AnimeInstance;
    timeline(params?: AnimeParams): AnimeInstance;
    stagger(value: number | string, options?: { start?: number; from?: string | number; direction?: string; easing?: EasingOptions; grid?: number[] }): number;
  }

  const anime: AnimeStatic;
  export default anime;
}
