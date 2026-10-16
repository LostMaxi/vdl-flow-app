// ◎ 2026-04-12 — Eye envelope 型別
// 對應 Tools/Eye/eye/envelope.py 的 Envelope dataclass（schema v0.2.0）。
// 這份檔案是 VDL 與 Eye 之間的語言-agnostic 契約聲明。
//
// 若 Python 側升級 schema，同步更新此檔並把新版本加進 eyeBridge.EYE_SCHEMA_VERSIONS_SUPPORTED。

export type EyeTask = 'palette' | 'vectorize' | 'spark' | string;
export type EyeStatus = 'ok' | 'partial' | 'error';

/** 通用 envelope 外殼 — 任何 capability 共用。 */
export interface EyeEnvelope<D = unknown> {
  task: EyeTask;
  input: string;
  status: EyeStatus;
  data: D;
  warnings?: string[];
  errors?: string[];
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  eye_version?: string;
}

/** palette capability 的 data 載荷（對應 PaletteResult.as_dict）。 */
export interface EyePaletteData {
  input_path: string;
  colors: string[];       // ["#RRGGBB", ...] 已由 Pillow median-cut 按頻率降序
  weights: number[];      // 對應 colors 的分數占比（0–1）
  pixel_total: number;
  method: string;         // 目前為 "median-cut"
  width: number;
  height: number;
}

/** VDL 端的解析結果 — eyeBridge.parseEyeEnvelope 的回傳型別。 */
export type EyeEnvelopeParseResult =
  | {
      ok: true;
      colors: string[];
      weights?: number[];
      method?: string;
      source: string;
      warnings: string[];
      envelope: EyeEnvelope<EyePaletteData>;
    }
  | {
      ok: false;
      error: string;
      envelope?: EyeEnvelope;
    };
