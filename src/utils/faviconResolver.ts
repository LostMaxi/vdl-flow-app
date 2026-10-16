// ◎ 2026-04-08 — Favicon 自動解析器
// 嘗試從 URL origin 載入 /favicon.ico，失敗回傳 null

const cache = new Map<string, string | null>();

export function resolveFavicon(url: string): Promise<string | null> {
  try {
    const origin = new URL(url).origin;
    const faviconUrl = `${origin}/favicon.ico`;

    if (cache.has(origin)) return Promise.resolve(cache.get(origin)!);

    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        cache.set(origin, faviconUrl);
        resolve(faviconUrl);
      };
      img.onerror = () => {
        cache.set(origin, null);
        resolve(null);
      };
      img.src = faviconUrl;
      // 3s timeout
      setTimeout(() => {
        if (!cache.has(origin)) {
          cache.set(origin, null);
          resolve(null);
        }
      }, 3000);
    });
  } catch {
    return Promise.resolve(null);
  }
}

export function clearFaviconCache(): void {
  cache.clear();
}
