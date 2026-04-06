// ◎ 2026-04-06 — Film DNA Markdown Parser
// 將 .md 檔案解析為 FilmDNA 物件 — 純正則，零外部依賴

import type {
  FilmDNA, ActTemplate, NumericEnvelope, NumericRange,
  EvolutionEntry, DriftConfig,
} from '../types/filmDNA';
import { createEmptyFilmDNA, DEFAULT_DRIFT_CONFIG } from '../types/filmDNA';

// ─── 正則常數 ────────────────────────────────────────────────

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;
const SECTION_RE = /^## (.+)$/gm;
const TABLE_ROW_RE = /^\|(.+)\|$/;
const ACT_HEADING_RE = /^### Act (\d+)[^(]*\(Shot (\d+)[–-](\d+)\)/;
const BLOCKQUOTE_RE = /^>\s*(.+)$/;

// ─── 工具函式 ────────────────────────────────────────────────

function parseFrontmatter(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // 去除引號
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function parseYAMLArray(val: string): string[] {
  // 支援 [a, b, c] 格式
  if (val.startsWith('[') && val.endsWith(']')) {
    return val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
  }
  return val.split(',').map(s => s.trim());
}

function splitSections(md: string): Map<string, string> {
  const sections = new Map<string, string>();
  const parts = md.split(/^## /gm);
  for (const part of parts) {
    if (!part.trim()) continue;
    const nlIdx = part.indexOf('\n');
    if (nlIdx < 0) continue;
    const heading = part.slice(0, nlIdx).trim();
    const body = part.slice(nlIdx + 1).trim();
    sections.set(heading, body);
  }
  return sections;
}

function parseSimpleTable(body: string): Record<string, string>[] {
  const lines = body.split('\n').filter(l => TABLE_ROW_RE.test(l.trim()));
  if (lines.length < 2) return [];

  const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean);
  // 跳過分隔行 (第二行)
  const startIdx = lines[1].includes('--') ? 2 : 1;

  const rows: Record<string, string>[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cells = lines[i].split('|').map(s => s.trim()).filter(Boolean);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function toNum(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function parseNumericEnvelope(rows: Record<string, string>[], key: string, defaults: NumericEnvelope): NumericEnvelope {
  const row = rows.find(r => r.key === key || r.key?.toLowerCase() === key.toLowerCase());
  if (!row) return defaults;
  return {
    min:  toNum(row.min, defaults.min),
    max:  toNum(row.max, defaults.max),
    mean: toNum(row.mean, defaults.mean),
    std:  toNum(row.std, defaults.std),
  };
}

function parseNumericRange(rows: Record<string, string>[], key: string, defaults: NumericRange): NumericRange {
  const row = rows.find(r => r.key === key || r.key?.toLowerCase() === key.toLowerCase());
  if (!row) return defaults;
  return {
    min:  toNum(row.min, defaults.min),
    max:  toNum(row.max, defaults.max),
    mean: toNum(row.mean, defaults.mean),
  };
}

function parseKeyValueTable(body: string): Record<string, string> {
  const rows = parseSimpleTable(body);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.key && row.value !== undefined) {
      result[row.key] = row.value;
    }
  }
  return result;
}

// ─── Act Structure 解析 ──────────────────────────────────────

function parseActStructure(body: string): ActTemplate[] {
  const acts: ActTemplate[] = [];
  const blocks = body.split(/(?=^### )/gm);

  for (const block of blocks) {
    const lines = block.split('\n');
    const headingMatch = lines[0]?.match(ACT_HEADING_RE);
    if (!headingMatch) continue;

    const actNumber = parseInt(headingMatch[1]);
    const shotStart = parseInt(headingMatch[2]);
    const shotEnd = parseInt(headingMatch[3]);

    const rows = parseSimpleTable(block);
    const ndfTarget = {
      T: { start: 0, peak: 0, end: 0 },
      E: { start: 0, peak: 0, end: 0 },
      I: { start: 0, peak: 0, end: 0 },
      C: { start: 0, peak: 0, end: 0 },
    };
    for (const row of rows) {
      const dim = row.ndf as keyof typeof ndfTarget;
      if (dim && ndfTarget[dim]) {
        ndfTarget[dim] = {
          start: toNum(row.start, 0),
          peak:  toNum(row.peak, 0),
          end:   toNum(row.end, 0),
        };
      }
    }

    // 解析 blockquote 作為 narrativeHint
    let narrativeHint = '';
    for (const line of lines) {
      const bqMatch = line.trim().match(BLOCKQUOTE_RE);
      if (bqMatch) narrativeHint += (narrativeHint ? ' ' : '') + bqMatch[1];
    }

    acts.push({ actNumber, shotRange: [shotStart, shotEnd], ndfTarget, narrativeHint });
  }

  return acts;
}

// ─── Evolution Log 解析 ──────────────────────────────────────

function parseEvolutionLog(body: string): EvolutionEntry[] {
  const rows = parseSimpleTable(body);
  return rows.map(row => ({
    date: row.date ?? '',
    author: (row.author ?? 'system') as EvolutionEntry['author'],
    change: row.change ?? '',
  })).filter(e => e.date);
}

// ─── 主解析函式 ──────────────────────────────────────────────

export function parseFilmDNA(markdown: string): FilmDNA {
  const empty = createEmptyFilmDNA('Untitled');

  // 1. Frontmatter
  const fmMatch = markdown.match(FRONTMATTER_RE);
  const fm = fmMatch ? parseFrontmatter(fmMatch[1]) : {};

  const dna: FilmDNA = {
    ...empty,
    id:      fm.id      ?? empty.id,
    name:    fm.name    ?? empty.name,
    created: fm.created ?? empty.created,
    updated: fm.updated ?? empty.updated,
    source:  (fm.source as FilmDNA['source']) ?? 'manual',
    tags:    fm.tags ? parseYAMLArray(fm.tags) : [],
  };

  // 2. Sections
  const sections = splitSections(markdown);

  // NODE 01-04 (key-value tables)
  const nodeMapping: [string, keyof Pick<FilmDNA, 'theme' | 'world' | 'subject'>][] = [
    ['NODE 01', 'theme'],
    ['NODE 02', 'world'],
    ['NODE 03', 'subject'],
  ];
  for (const [prefix, prop] of nodeMapping) {
    for (const [heading, body] of sections) {
      if (heading.includes(prefix)) {
        dna[prop] = parseKeyValueTable(body);
        break;
      }
    }
  }

  // NODE 05 NDF
  for (const [heading, body] of sections) {
    if (heading.includes('NODE 05') || heading.toLowerCase().includes('tension')) {
      const kv = parseKeyValueTable(body);
      for (const dim of ['T', 'E', 'I', 'C'] as const) {
        const rangeStr = kv[`${dim}_range`] ?? '';
        const parts = rangeStr.split('–').map(s => s.trim());
        if (parts.length === 2) {
          dna.ndf[dim] = {
            min: toNum(parts[0], dna.ndf[dim].min),
            max: toNum(parts[1], dna.ndf[dim].max),
            mean: (toNum(parts[0], 0) + toNum(parts[1], 0)) / 2,
          };
        }
      }
      break;
    }
  }

  // NODE 06 Photometric (min/max/mean/std table)
  for (const [heading, body] of sections) {
    if (heading.includes('NODE 06') || heading.toLowerCase().includes('photometric')) {
      const rows = parseSimpleTable(body);
      dna.photometric = {
        kelvin:     parseNumericEnvelope(rows, 'kelvin',     empty.photometric.kelvin),
        ev:         parseNumericEnvelope(rows, 'ev',         empty.photometric.ev),
        contrast:   parseNumericEnvelope(rows, 'contrast',   empty.photometric.contrast),
        saturation: parseNumericEnvelope(rows, 'saturation', empty.photometric.saturation),
        shadowLift: parseNumericEnvelope(rows, 'shadowLift', empty.photometric.shadowLift),
      };
      break;
    }
  }

  // NODE 07 Camera (min/max/mean table)
  for (const [heading, body] of sections) {
    if (heading.includes('NODE 07') || heading.toLowerCase().includes('camera')) {
      const rows = parseSimpleTable(body);
      dna.camera = {
        focalLength: parseNumericRange(rows, 'focalLength', empty.camera.focalLength),
        aperture:    parseNumericRange(rows, 'aperture',    empty.camera.aperture),
        preferredMoves: (() => {
          const row = rows.find(r => r.key === 'preferredMoves');
          return row?.value ? row.value.split(',').map(s => s.trim()) : empty.camera.preferredMoves;
        })(),
        dollySpeed: (() => {
          const row = rows.find(r => r.key === 'dollySpeed');
          return row?.value ?? empty.camera.dollySpeed;
        })(),
      };
      break;
    }
  }

  // NODE 08 Composition
  for (const [heading, body] of sections) {
    if (heading.includes('NODE 08') || heading.toLowerCase().includes('composition')) {
      const rows = parseSimpleTable(body);
      dna.composition = {
        ruleOfThirds: parseNumericRange(rows, 'ruleOfThirds', empty.composition.ruleOfThirds),
        depthLayers:  parseNumericRange(rows, 'depthLayers',  empty.composition.depthLayers),
        negativeSpace:parseNumericRange(rows, 'negativeSpace',empty.composition.negativeSpace),
      };
      break;
    }
  }

  // NODE 09 Style
  for (const [heading, body] of sections) {
    if (heading.includes('NODE 09') || heading.toLowerCase().includes('style')) {
      const rows = parseSimpleTable(body);
      dna.style = {
        filterHue:      parseNumericRange(rows, 'filterHue',      empty.style.filterHue),
        filterGrain:    parseNumericRange(rows, 'filterGrain',    empty.style.filterGrain),
        filterVignette: parseNumericRange(rows, 'filterVignette', empty.style.filterVignette),
      };
      break;
    }
  }

  // Act Structure
  for (const [heading, body] of sections) {
    if (heading.toLowerCase().includes('act structure')) {
      dna.actStructure = parseActStructure(body);
      break;
    }
  }

  // Drift Correction
  for (const [heading, body] of sections) {
    if (heading.toLowerCase().includes('drift')) {
      const kv = parseKeyValueTable(body);
      dna.driftConfig = {
        correctionRate:   toNum(kv.correction_rate,    DEFAULT_DRIFT_CONFIG.correctionRate),
        checkInterval:    toNum(kv.check_interval,     DEFAULT_DRIFT_CONFIG.checkInterval),
        maxDriftPercent:  toNum(kv.max_drift_percent,  DEFAULT_DRIFT_CONFIG.maxDriftPercent),
      };
      break;
    }
  }

  // Evolution Log
  for (const [heading, body] of sections) {
    if (heading.toLowerCase().includes('evolution')) {
      dna.evolutionLog = parseEvolutionLog(body);
      break;
    }
  }

  return dna;
}
