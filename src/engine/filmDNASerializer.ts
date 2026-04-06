// ◎ 2026-04-06 — Film DNA Markdown Serializer
// 將 FilmDNA 物件序列化為 .md 檔案 — 純模板渲染，零外部依賴

import type { FilmDNA, ActTemplate, NumericEnvelope, NumericRange } from '../types/filmDNA';

// ─── 工具函式 ────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(decimals).replace(/\.?0+$/, '');
}

function kvTable(entries: [string, string][]): string {
  if (entries.length === 0) return '';
  const maxKeyLen = Math.max(...entries.map(([k]) => k.length), 3);
  const maxValLen = Math.max(...entries.map(([, v]) => v.length), 5);
  const lines = [
    `| ${'key'.padEnd(maxKeyLen)} | ${'value'.padEnd(maxValLen)} |`,
    `| ${'-'.repeat(maxKeyLen)} | ${'-'.repeat(maxValLen)} |`,
    ...entries.map(([k, v]) => `| ${k.padEnd(maxKeyLen)} | ${v.padEnd(maxValLen)} |`),
  ];
  return lines.join('\n');
}

function envelopeTable(rows: [string, NumericEnvelope][]): string {
  const lines = [
    '| key | min | max | mean | std |',
    '| --- | --- | --- | ---- | --- |',
    ...rows.map(([k, e]) =>
      `| ${k} | ${fmt(e.min)} | ${fmt(e.max)} | ${fmt(e.mean)} | ${fmt(e.std)} |`
    ),
  ];
  return lines.join('\n');
}

function rangeTable(rows: [string, NumericRange | string][]): string {
  const lines = [
    '| key | min | max | mean |',
    '| --- | --- | --- | ---- |',
    ...rows.map(([k, v]) => {
      if (typeof v === 'string') return `| ${k} | ${v} | ${v} | ${v} |`;
      return `| ${k} | ${fmt(v.min)} | ${fmt(v.max)} | ${fmt(v.mean)} |`;
    }),
  ];
  return lines.join('\n');
}

function actNDFTable(act: ActTemplate): string {
  const dims = ['T', 'E', 'I', 'C'] as const;
  const lines = [
    '| ndf | start | peak | end |',
    '| --- | ----- | ---- | --- |',
    ...dims.map(d => {
      const t = act.ndfTarget[d];
      return `| ${d} | ${fmt(t.start)} | ${fmt(t.peak)} | ${fmt(t.end)} |`;
    }),
  ];
  return lines.join('\n');
}

// ─── 主序列化函式 ────────────────────────────────────────────

export function serializeFilmDNA(dna: FilmDNA): string {
  const parts: string[] = [];

  // ── Frontmatter ────────────────────────────────────────────
  parts.push(`---
schema: vdl-film-dna
version: 1.0
id: ${dna.id}
name: "${dna.name}"
created: ${dna.created}
updated: ${new Date().toISOString()}
source: ${dna.source}
tags: [${dna.tags.join(', ')}]
---`);

  // ── Title ──────────────────────────────────────────────────
  parts.push(`\n# ${dna.name}\n`);

  // ── NODE 01 Theme ──────────────────────────────────────────
  if (Object.keys(dna.theme).length > 0) {
    parts.push(`---\n\n## NODE 01 · Theme Genesis\n`);
    parts.push(kvTable(Object.entries(dna.theme)));
  }

  // ── NODE 02 World ──────────────────────────────────────────
  if (Object.keys(dna.world).length > 0) {
    parts.push(`\n---\n\n## NODE 02 · World Building\n`);
    parts.push(kvTable(Object.entries(dna.world)));
  }

  // ── NODE 03 Subject ────────────────────────────────────────
  if (Object.keys(dna.subject).length > 0) {
    parts.push(`\n---\n\n## NODE 03 · Subject Design\n`);
    parts.push(kvTable(Object.entries(dna.subject)));
  }

  // ── NODE 04 Screenplay ─────────────────────────────────────
  parts.push(`\n---\n\n## NODE 04 · Screenplay\n`);
  parts.push(kvTable([
    ['narrative_mode', 'three-act'],
    ['total_shots', String(dna.actStructure.reduce((s, a) => Math.max(s, a.shotRange[1]), 0) || 24)],
    ['dialogue_style', 'minimal'],
  ]));

  // ── NODE 05 Tension Mapping ────────────────────────────────
  parts.push(`\n---\n\n## NODE 05 · Tension Mapping\n`);
  parts.push(kvTable([
    ['T_range', `${fmt(dna.ndf.T.min)} – ${fmt(dna.ndf.T.max)}`],
    ['E_range', `${fmt(dna.ndf.E.min)} – ${fmt(dna.ndf.E.max)}`],
    ['I_range', `${fmt(dna.ndf.I.min)} – ${fmt(dna.ndf.I.max)}`],
    ['C_range', `${fmt(dna.ndf.C.min)} – ${fmt(dna.ndf.C.max)}`],
  ]));

  // ── NODE 06 Photometric ────────────────────────────────────
  parts.push(`\n---\n\n## NODE 06 · Photometric\n`);
  parts.push(envelopeTable([
    ['kelvin',     dna.photometric.kelvin],
    ['ev',         dna.photometric.ev],
    ['contrast',   dna.photometric.contrast],
    ['saturation', dna.photometric.saturation],
    ['shadowLift', dna.photometric.shadowLift],
  ]));

  // ── NODE 07 Camera ─────────────────────────────────────────
  parts.push(`\n---\n\n## NODE 07 · Camera\n`);
  const camRows: [string, NumericRange | string][] = [
    ['focalLength', dna.camera.focalLength],
    ['aperture',    dna.camera.aperture],
  ];
  parts.push(rangeTable(camRows));
  parts.push(`\n| key | value |`);
  parts.push(`| --- | ----- |`);
  parts.push(`| dollySpeed | ${dna.camera.dollySpeed} |`);
  parts.push(`| preferredMoves | ${dna.camera.preferredMoves.join(', ')} |`);

  // ── NODE 08 Composition ────────────────────────────────────
  parts.push(`\n---\n\n## NODE 08 · Composition\n`);
  parts.push(rangeTable([
    ['ruleOfThirds', dna.composition.ruleOfThirds],
    ['depthLayers',  dna.composition.depthLayers],
    ['negativeSpace',dna.composition.negativeSpace],
  ]));

  // ── NODE 09 Style & Filter ─────────────────────────────────
  parts.push(`\n---\n\n## NODE 09 · Style & Filter\n`);
  parts.push(rangeTable([
    ['filterHue',      dna.style.filterHue],
    ['filterGrain',    dna.style.filterGrain],
    ['filterVignette', dna.style.filterVignette],
  ]));

  // ── Act Structure ──────────────────────────────────────────
  if (dna.actStructure.length > 0) {
    parts.push(`\n---\n\n## Act Structure\n`);
    for (const act of dna.actStructure) {
      parts.push(`### Act ${act.actNumber} · (Shot ${act.shotRange[0]}–${act.shotRange[1]})\n`);
      parts.push(actNDFTable(act));
      if (act.narrativeHint) {
        parts.push(`\n> ${act.narrativeHint}`);
      }
      parts.push('');
    }
  }

  // ── Drift Correction ──────────────────────────────────────
  parts.push(`\n---\n\n## Drift Correction\n`);
  parts.push(kvTable([
    ['correction_rate',    fmt(dna.driftConfig.correctionRate)],
    ['check_interval',     String(dna.driftConfig.checkInterval)],
    ['max_drift_percent',  String(dna.driftConfig.maxDriftPercent)],
  ]));

  // ── Evolution Log ─────────────────────────────────────────
  if (dna.evolutionLog.length > 0) {
    parts.push(`\n---\n\n## Evolution Log\n`);
    const logLines = [
      '| date | author | change |',
      '| ---- | ------ | ------ |',
      ...dna.evolutionLog.map(e => `| ${e.date} | ${e.author} | ${e.change} |`),
    ];
    parts.push(logLines.join('\n'));
  }

  return parts.join('\n') + '\n';
}

// ─── 檔名生成 ────────────────────────────────────────────────

export function generateFilmDNAFilename(dna: FilmDNA): string {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const slug = dna.name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  return `filmDNA_${ts}_${slug}.md`;
}

// ─── 下載輔助 ────────────────────────────────────────────────

export function downloadFilmDNA(dna: FilmDNA): void {
  const md = serializeFilmDNA(dna);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = generateFilmDNAFilename(dna);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
