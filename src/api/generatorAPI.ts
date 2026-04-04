// ◎ 2026-03-29 — generatorAPI.ts
// VDL-FLOW 生成端 API 連接層
// 支援: Google Flow VEO | Runway Gen-3 | Kling v2 | Stable Diffusion XL
// 設計: 熱插拔介面 (formatPrompt() 共用)，各生成端實作相同 GeneratorAdapter 介面

// ─── 型別定義 ─────────────────────────────────────────────────

export type ImageGenerator = 'comfyui' | 'pollinations' | 'stable_diffusion_xl' | 'google_gemini_imagen' | 'dall_e_3';
export type VideoGenerator  = 'google_flow_veo' | 'runway_gen3' | 'kling_v2';

export interface ImageGenParams {
  prompt:     string;
  negative?:  string;
  seed?:      number;
  cfg?:       number;
  steps?:     number;
  width?:     number;
  height?:    number;
  generator?: ImageGenerator;
}

export interface VideoGenParams {
  prompt:      string;
  negative?:   string;
  startFrame?: string;     // base64 or URL
  endFrame?:   string;
  duration?:   number;     // seconds (default: 10)
  generator?:  VideoGenerator;
}

export interface GenerateResult {
  ok:        boolean;
  url?:      string;       // output image/video URL or blob URL
  data?:     string;       // base64
  error?:    string;
  generator: string;
  elapsed:   number;       // ms
}

// ─── 環境變數讀取 ─────────────────────────────────────────────

const ENV = {
  geminiKey:     import.meta.env.VITE_GEMINI_API_KEY    as string | undefined,
  runwayKey:     import.meta.env.VITE_RUNWAY_API_KEY    as string | undefined,
  klingAccess:   import.meta.env.VITE_KLING_ACCESS_KEY  as string | undefined,
  klingSecret:   import.meta.env.VITE_KLING_SECRET_KEY  as string | undefined,
  stabilityKey:  import.meta.env.VITE_STABILITY_API_KEY as string | undefined,
  defaultImage:  (import.meta.env.VITE_DEFAULT_IMAGE_GENERATOR as ImageGenerator) || 'pollinations',
  defaultVideo:  (import.meta.env.VITE_DEFAULT_VIDEO_GENERATOR as VideoGenerator)  || 'google_flow_veo',
};

import { generateComfyUI, checkComfyUIHealth } from './comfyuiAPI';

// ─── 速率限制 + 重試工具 ──────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1500
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// ─── Pollinations.ai (零金鑰，開源免費) ──────────────────────
// 直接返回圖片 URL，無需 API key
// ref: https://image.pollinations.ai/prompt/{prompt}

async function generatePollinations(params: ImageGenParams): Promise<GenerateResult> {
  const t0 = Date.now();
  const encoded = encodeURIComponent(params.prompt);
  const seed    = params.seed ?? Math.floor(Math.random() * 99999);
  const w       = params.width  ?? 1344;
  const h       = params.height ?? 768;
  const url     = `https://image.pollinations.ai/prompt/${encoded}?seed=${seed}&model=flux&width=${w}&height=${h}&nologo=true`;
  // Pollinations 直接回傳圖片，URL 即可作為 <img src> 使用
  return { ok: true, url, generator: 'pollinations', elapsed: Date.now() - t0 };
}

// ─── Stable Diffusion XL (Stability AI) ──────────────────────

async function generateSDXL(params: ImageGenParams): Promise<GenerateResult> {
  const key = ENV.stabilityKey;
  if (!key) return { ok: false, error: 'VITE_STABILITY_API_KEY not set', generator: 'sdxl', elapsed: 0 };

  const t0 = Date.now();
  const body = {
    text_prompts: [
      { text: params.prompt,            weight: 1.0 },
      { text: params.negative || '',    weight: -1.0 },
    ],
    cfg_scale: params.cfg   ?? 7,
    steps:     params.steps ?? 30,
    seed:      params.seed  ?? 0,
    width:     params.width  ?? 1344,
    height:    params.height ?? 768,
    samples: 1,
  };

  const res = await withRetry(() => fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    }
  ));

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err, generator: 'sdxl', elapsed: Date.now() - t0 };
  }

  const json = await res.json();
  const b64  = json.artifacts?.[0]?.base64;
  const url  = b64 ? `data:image/png;base64,${b64}` : undefined;
  return { ok: !!url, url, data: b64, generator: 'sdxl', elapsed: Date.now() - t0 };
}

// ─── VEO LRO 輪詢工具 ─────────────────────────────────────────
// VEO 回傳 LRO (Long Running Operation)，需定期 GET 直到 done:true

const VEO_POLL_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const VEO_POLL_INTERVAL_MS = 4000;
const VEO_POLL_MAX_ATTEMPTS = 30; // 2 分鐘上限

export interface VEOPollResult {
  ok:       boolean;
  videoUrl?: string;   // 完成後的 GCS 影片 URL
  error?:   string;
  attempts: number;
}

export async function pollVEOOperation(
  operationName: string,
  apiKey: string
): Promise<VEOPollResult> {
  for (let i = 0; i < VEO_POLL_MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, VEO_POLL_INTERVAL_MS));

    const res = await fetch(`${VEO_POLL_BASE}/${operationName}?key=${apiKey}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return { ok: false, error: `Poll HTTP ${res.status}`, attempts: i + 1 };
    }

    const op = await res.json();

    if (op.error) {
      return { ok: false, error: op.error.message ?? 'LRO error', attempts: i + 1 };
    }

    if (op.done) {
      // VEO 成功回傳: response.generateVideoResponse.generatedSamples[0].video.uri
      const uri: string | undefined =
        op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      return uri
        ? { ok: true, videoUrl: uri, attempts: i + 1 }
        : { ok: false, error: 'Done but no video URI in response', attempts: i + 1 };
    }
  }

  return { ok: false, error: `Timed out after ${VEO_POLL_MAX_ATTEMPTS} attempts`, attempts: VEO_POLL_MAX_ATTEMPTS };
}

// ─── Google Flow VEO (via Gemini API) ─────────────────────────
// 注意: VEO API 目前為受限存取，此為介面占位實作
// 待 VEO 公開 API 後填充真實 endpoint

async function generateVEO(params: VideoGenParams): Promise<GenerateResult> {
  const key = ENV.geminiKey;
  if (!key) return { ok: false, error: 'VITE_GEMINI_API_KEY not set', generator: 'veo', elapsed: 0 };

  const t0 = Date.now();

  // VEO 2.0 endpoint (Google AI Studio / Vertex AI)
  // 目前透過 @google/genai SDK 的 generateVideo 介面
  // ref: https://ai.google.dev/api/generate-content (VEO section)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning`;

  const body = {
    instances: [{
      prompt: params.prompt,
      ...(params.startFrame ? { image: { bytesBase64Encoded: params.startFrame } } : {}),
    }],
    parameters: {
      aspectRatio:    '16:9',
      durationSeconds: params.duration ?? 10,
      negativePrompt:  params.negative ?? '',
    },
  };

  try {
    const res = await withRetry(() => fetch(`${endpoint}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `VEO API: ${err}`, generator: 'veo', elapsed: Date.now() - t0 };
    }

    // VEO 回傳 LRO (Long Running Operation) — 啟動輪詢
    const lro = await res.json();
    if (!lro.name) {
      return { ok: false, error: 'VEO: no operation name in response', generator: 'veo', elapsed: Date.now() - t0 };
    }
    const poll = await pollVEOOperation(lro.name, key);
    return {
      ok:      poll.ok,
      url:     poll.videoUrl,
      error:   poll.error,
      generator: 'veo',
      elapsed: Date.now() - t0,
    };
  } catch (e) {
    return { ok: false, error: String(e), generator: 'veo', elapsed: Date.now() - t0 };
  }
}

// ─── Runway Gen-3 輪詢工具 ────────────────────────────────────
// Runway 回傳 task ID，需輪詢 GET /v1/tasks/{id} 直到 status=SUCCEEDED

const RUNWAY_POLL_BASE     = 'https://api.dev.runwayml.com/v1/tasks';
const RUNWAY_POLL_INTERVAL = 3000;
const RUNWAY_POLL_MAX      = 40; // 2 分鐘上限

export interface RunwayPollResult {
  ok:        boolean;
  videoUrl?: string;
  error?:    string;
  attempts:  number;
}

export async function pollRunwayJob(
  taskId: string,
  apiKey: string
): Promise<RunwayPollResult> {
  for (let i = 0; i < RUNWAY_POLL_MAX; i++) {
    await new Promise(r => setTimeout(r, RUNWAY_POLL_INTERVAL));

    const res = await fetch(`${RUNWAY_POLL_BASE}/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!res.ok) {
      return { ok: false, error: `Runway poll HTTP ${res.status}`, attempts: i + 1 };
    }

    const task = await res.json();

    if (task.status === 'FAILED') {
      return { ok: false, error: task.failure ?? 'Runway task FAILED', attempts: i + 1 };
    }

    if (task.status === 'SUCCEEDED') {
      const url: string | undefined = task.output?.[0];
      return url
        ? { ok: true, videoUrl: url, attempts: i + 1 }
        : { ok: false, error: 'SUCCEEDED but no output URL', attempts: i + 1 };
    }
    // PENDING / RUNNING → continue polling
  }
  return { ok: false, error: `Runway timed out after ${RUNWAY_POLL_MAX} attempts`, attempts: RUNWAY_POLL_MAX };
}

// ─── Runway Gen-3 ─────────────────────────────────────────────

async function generateRunway(params: VideoGenParams): Promise<GenerateResult> {
  const key = ENV.runwayKey;
  if (!key) return { ok: false, error: 'VITE_RUNWAY_API_KEY not set', generator: 'runway', elapsed: 0 };

  const t0 = Date.now();
  const body = {
    model:          'gen3a_turbo',
    prompt_text:    params.prompt,
    duration:       params.duration ?? 10,
    ratio:          '1280:768',
    ...(params.startFrame ? { prompt_image: params.startFrame } : {}),
  };

  const res = await withRetry(() => fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Runway-Version': '2024-11-06' },
    body: JSON.stringify(body),
  }));

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err, generator: 'runway', elapsed: Date.now() - t0 };
  }

  const json = await res.json();
  if (!json.id) {
    return { ok: false, error: 'Runway: no task ID in response', generator: 'runway', elapsed: Date.now() - t0 };
  }
  const poll = await pollRunwayJob(json.id, key);
  return {
    ok:      poll.ok,
    url:     poll.videoUrl,
    error:   poll.error,
    generator: 'runway',
    elapsed: Date.now() - t0,
  };
}

// ─── 主公開 API ───────────────────────────────────────────────

export async function generateImage(params: ImageGenParams): Promise<GenerateResult> {
  const gen = params.generator ?? ENV.defaultImage;
  switch (gen) {
    case 'comfyui':              return generateComfyUI(params);
    case 'pollinations':         return generatePollinations(params);
    case 'stable_diffusion_xl':  return generateSDXL(params);
    case 'google_gemini_imagen': return { ok: false, error: 'Imagen: not yet implemented', generator: gen, elapsed: 0 };
    case 'dall_e_3':             return { ok: false, error: 'DALL-E 3: not yet implemented', generator: gen, elapsed: 0 };
    default:                     return { ok: false, error: `Unknown generator: ${gen}`, generator: gen, elapsed: 0 };
  }
}

export async function generateVideo(params: VideoGenParams): Promise<GenerateResult> {
  const gen = params.generator ?? ENV.defaultVideo;
  switch (gen) {
    case 'google_flow_veo': return generateVEO(params);
    case 'runway_gen3':     return generateRunway(params);
    case 'kling_v2':        return { ok: false, error: 'Kling v2: pending API key setup', generator: gen, elapsed: 0 };
    default:                return { ok: false, error: `Unknown generator: ${gen}`, generator: gen, elapsed: 0 };
  }
}

// ─── 提示詞格式化介面 (共用 formatPrompt) ────────────────────
// 各生成端字元限制: MJ: 1000 | VEO: 500 | Runway: 512

export function formatPrompt(
  styleLockPrefix: string,
  scenePrompt: string,
  generator: ImageGenerator | VideoGenerator
): string {
  const limits: Record<string, number> = {
    midjourney_v6:       1000,
    google_flow_veo:     500,
    runway_gen3:         512,
    kling_v2:            600,
    stable_diffusion_xl: 2000,
    google_gemini_imagen: 1000,
  };

  const limit = limits[generator] ?? 800;
  const full  = `${styleLockPrefix} ${scenePrompt}`.trim();

  if (full.length <= limit) return full;

  // 截斷策略: 保留前綴優先，截斷場景描述尾部
  const prefixLen = Math.min(styleLockPrefix.length, Math.floor(limit * 0.4));
  const sceneLen  = limit - prefixLen - 1;
  return `${styleLockPrefix.slice(0, prefixLen)} ${scenePrompt.slice(0, sceneLen)}`.trim();
}

// ─── 可用性檢查 ───────────────────────────────────────────────

export { checkComfyUIHealth } from './comfyuiAPI';

export function getAvailableGenerators(): {
  image: ImageGenerator[];
  video: VideoGenerator[];
} {
  return {
    image: [
      'pollinations' as const,        // 永遠可用，零金鑰
      // comfyui: 執行時動態健康檢查（非同步，此處先列入）
      'comfyui' as const,
      ...(ENV.stabilityKey ? ['stable_diffusion_xl' as const] : []),
      ...(ENV.geminiKey    ? ['google_gemini_imagen' as const] : []),
    ],
    video: [
      ...(ENV.geminiKey  ? ['google_flow_veo' as const] : []),
      ...(ENV.runwayKey  ? ['runway_gen3' as const]     : []),
      ...(ENV.klingAccess ? ['kling_v2' as const]       : []),
    ],
  };
}
