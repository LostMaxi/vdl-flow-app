// ◎ 2026-04-12 — eyeBridge.ts
// VDL-Flow ↔ Eye (5-Bench/Eye/) 的第一條真實水管。
//
// 因為瀏覽器不能 spawn subprocess，這條橋是「envelope 貼上」契約：
// 使用者在終端機執行  `python -m eye palette <img> --envelope`  後把 JSON
// 貼進 VDL 的對話框；本模組只負責把 envelope 解析為 VDL 可用的欄位值。
//
// 這意味著 Eye 的 envelope JSON schema 就是 VDL 與 Eye 之間的版本化契約，
// 未來若改成 dev-server middleware / 共存 Flask / Tauri sidecar，
// 只需換掉取得 raw 字串的方式，解析器不動。

import type { EyePaletteData, EyeEnvelope, EyeEnvelopeParseResult } from '../types/eye';

export const EYE_SCHEMA_VERSIONS_SUPPORTED = ['0.1.0', '0.2.0'] as const;

/**
 * 把從剪貼簿貼進來的 Eye envelope 字串解析為結構化結果。
 *
 * 容錯設計：
 * - 允許被 Markdown code fence 包起來（```json ... ```）
 * - 允許前後有 CLI 混入的 stderr 噪音（只取第一個 `{...}` 區塊）
 * - Envelope 格式錯／非 palette task / data 缺 colors → 回 { ok: false, error }
 * - status === 'error' 或 errors 非空 → 回 { ok: false }
 * - status === 'partial' / warnings 非空 → ok: true 但附上 warnings
 */
export function parseEyeEnvelope(raw: string): EyeEnvelopeParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: '輸入為空' };
  }

  // 剝除 markdown code fence
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // 尋找第一個平衡的 JSON 物件，允許 CLI stderr 前導/尾隨噪音
  const jsonSlice = extractFirstJsonObject(fenceStripped);
  if (!jsonSlice) {
    return { ok: false, error: '找不到有效的 JSON 物件' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch (e) {
    return { ok: false, error: `JSON 解析失敗: ${(e as Error).message}` };
  }

  if (!isEnvelopeShape(parsed)) {
    return { ok: false, error: '物件結構非 Eye envelope（缺 task / status / data）' };
  }

  const env = parsed as EyeEnvelope;

  // 版本相容性檢查（非硬失敗，附 warning）
  const versionWarnings: string[] = [];
  if (env.eye_version && !EYE_SCHEMA_VERSIONS_SUPPORTED.includes(env.eye_version as typeof EYE_SCHEMA_VERSIONS_SUPPORTED[number])) {
    versionWarnings.push(
      `Envelope 版本 ${env.eye_version} 未在 VDL 支援清單中（目前支援 ${EYE_SCHEMA_VERSIONS_SUPPORTED.join(', ')}），解析照常進行。`
    );
  }

  if (env.status === 'error' || (env.errors && env.errors.length > 0)) {
    return {
      ok: false,
      error: `Eye 回報錯誤: ${env.errors?.join('; ') ?? 'unknown'}`,
      envelope: env,
    };
  }

  if (env.task !== 'palette') {
    return {
      ok: false,
      error: `task 為 '${env.task}'，目前只支援 palette`,
      envelope: env,
    };
  }

  const data = env.data as Partial<EyePaletteData> | undefined;
  const colors = data?.colors;
  if (!Array.isArray(colors) || colors.length === 0) {
    return {
      ok: false,
      error: 'envelope.data.colors 缺失或為空陣列',
      envelope: env,
    };
  }

  // 驗證每個 hex 都是 #RRGGBB / #RGB 形式，非法則標示
  const hexValid = /^#[0-9A-Fa-f]{6}$/;
  const badHex = colors.filter((c) => typeof c !== 'string' || !hexValid.test(c));
  if (badHex.length > 0) {
    return {
      ok: false,
      error: `data.colors 含非法 hex：${badHex.slice(0, 3).join(', ')}${badHex.length > 3 ? '…' : ''}`,
      envelope: env,
    };
  }

  const combinedWarnings = [...versionWarnings, ...(env.warnings ?? [])];

  return {
    ok: true,
    colors: colors.map((c) => c.toUpperCase()),
    weights: Array.isArray(data?.weights) ? data!.weights : undefined,
    method: data?.method,
    source: env.input,
    warnings: combinedWarnings,
    envelope: env as EyeEnvelope<EyePaletteData>,
  };
}

/**
 * 把解析結果轉成 VDL 欄位可直接吞的字串
 *（dominant_palette / rendered_palette / target_palette 統一用 ", " 分隔）。
 */
export function paletteToFieldValue(colors: string[]): string {
  return colors.join(', ');
}

// ─── 內部輔助 ──────────────────────────────────────────────────

function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function isEnvelopeShape(x: unknown): x is EyeEnvelope {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  return (
    typeof obj.task === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.data === 'object'
  );
}
