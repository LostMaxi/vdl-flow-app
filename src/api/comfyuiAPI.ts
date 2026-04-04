// ◎ 2026-04-01 — comfyuiAPI.ts
// ComfyUI 本地 REST API 橋接 (RTX 2070 8GB — SDXL 支援)
// ComfyUI 預設: http://127.0.0.1:8188
// 啟動: python main.py --listen 0.0.0.0

const COMFY_BASE = import.meta.env.VITE_COMFYUI_URL ?? 'http://127.0.0.1:8188';

// ─── ComfyUI 工作流模板 (SDXL txt2img) ───────────────────────
// 極簡工作流：KSampler → VAEDecode → SaveImage
// 對應 VDL 光度學參數：kelvin → clip skip / steps 微調

function buildSDXLWorkflow(
  prompt:   string,
  negative: string,
  seed:     number,
  steps:    number,
  cfg:      number,
  width:    number,
  height:   number
): object {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed, steps, cfg,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1,
        model:    ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      }
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: import.meta.env.VITE_COMFYUI_MODEL ?? "sd_xl_base_1.0.safetensors" }
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt,   clip: ["4", 1] }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: negative, clip: ["4", 1] }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] }
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "vdl-flow", images: ["8", 0] }
    }
  };
}

// ─── 輪詢工具 ─────────────────────────────────────────────────

async function pollComfyJob(promptId: string): Promise<string> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const res  = await fetch(`${COMFY_BASE}/history/${promptId}`);
    if (!res.ok) continue;
    const hist = await res.json();
    const job  = hist[promptId];
    if (!job) continue;
    // 取得第一張輸出圖片
    const outputs = Object.values(job.outputs ?? {}) as Array<{ images?: Array<{ filename: string; subfolder: string; type: string }> }>;
    for (const out of outputs) {
      if (out.images?.[0]) {
        const { filename, subfolder, type } = out.images[0];
        const params = new URLSearchParams({ filename, subfolder, type });
        return `${COMFY_BASE}/view?${params}`;
      }
    }
  }
  throw new Error('ComfyUI: 輪詢逾時（90秒）');
}

// ─── 主生成函式 ───────────────────────────────────────────────

export interface ComfyGenParams {
  prompt:   string;
  negative?: string;
  seed?:    number;
  steps?:   number;
  cfg?:     number;
  width?:   number;
  height?:  number;
}

export interface ComfyGenResult {
  ok:        boolean;
  url?:      string;
  error?:    string;
  generator: string;
  elapsed:   number;
}

export async function generateComfyUI(params: ComfyGenParams): Promise<ComfyGenResult> {
  const t0 = Date.now();
  const workflow = buildSDXLWorkflow(
    params.prompt,
    params.negative ?? 'blurry, low quality, distorted, watermark',
    params.seed     ?? Math.floor(Math.random() * 999999999),
    params.steps    ?? 25,
    params.cfg      ?? 7,
    params.width    ?? 1024,
    params.height   ?? 576,
  );

  try {
    const queueRes = await fetch(`${COMFY_BASE}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!queueRes.ok) {
      const err = await queueRes.text();
      return { ok: false, error: `ComfyUI queue: ${err}`, generator: 'comfyui', elapsed: Date.now() - t0 };
    }

    const { prompt_id } = await queueRes.json();
    const url = await pollComfyJob(prompt_id);
    return { ok: true, url, generator: 'comfyui', elapsed: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: String(e), generator: 'comfyui', elapsed: Date.now() - t0 };
  }
}

// ─── 連線健康檢查 ─────────────────────────────────────────────

export async function checkComfyUIHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFY_BASE}/system_stats`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
