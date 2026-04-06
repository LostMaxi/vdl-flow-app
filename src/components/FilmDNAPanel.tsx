// ◎ 2026-04-06 — FilmDNAPanel 元件
// VDL-FLOW V2: Film DNA 管理面板 — 三種入口 (影像分析 / .md 匯入 / 空白建立)

import { useState, useCallback, useRef } from 'react';
import type { FilmDNA } from '../types/filmDNA';
import { loadImagesAsFrames, analyzeFramesToFilmDNA } from '../engine/filmDNAAnalyzer';
import type { AnalysisProgress } from '../engine/filmDNAAnalyzer';
import { parseFilmDNA } from '../engine/filmDNAParser';
import { downloadFilmDNA } from '../engine/filmDNASerializer';

// ─── Props 定義 ─────────────────────────────────────────────────

interface FilmDNAPanelProps {
  activeDNA: FilmDNA | null;
  onLoadDNA: (dna: FilmDNA) => void;
  onCreateDNA: (name: string) => FilmDNA;
  onUpdateDNA: (partial: Partial<FilmDNA>, changeDesc?: string) => void;
  onUnloadDNA: () => void;
}

// ─── 色彩常數 (遵循 Lost Maxi.Art 色票系統) ────────────────────

const C = {
  appBg:      '#1C1C1C',
  inputBg:    '#191919',
  cardBg:     '#242424',
  border:     '#333',
  mutedBorder:'#4C4E56',
  secondary:  '#63666A',
  label:      '#818387',
  primary:    '#D9D9D6',
  purple:     '#A78BFA',
  lavender:   '#DFCEEA',
  darkPurple: '#2A1A4A',
  cyan:       '#00CFB4',
  yellow:     '#FDDA25',
  white:      '#FFFFFF',
} as const;

const FONT = "'Inter', 'Noto Sans TC', sans-serif";

// ─── 共用內聯樣式 ───────────────────────────────────────────────

const baseBtn = (bg: string, hover = false): React.CSSProperties => ({
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
  color: C.white,
  background: bg,
  opacity: hover ? 0.85 : 1,
  transition: 'opacity 0.15s',
});

// ─── 元件本體 ───────────────────────────────────────────────────

export default function FilmDNAPanel({
  activeDNA,
  onLoadDNA,
  onCreateDNA,
  onUpdateDNA,
  onUnloadDNA,
}: FilmDNAPanelProps) {
  // 分析進度狀態
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 摺疊區段狀態
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    photometric: false,
    camera: false,
    composition: false,
    style: false,
    evolution: true,
  });

  // 隱藏的 file input 參照
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);

  // ── 切換摺疊區段 ─────────────────────────────────────────────
  const toggle = useCallback((key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── 影像分析入口 ─────────────────────────────────────────────
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setAnalyzing(true);
    setProgress({ phase: '載入影像...', percent: 0 });

    try {
      // 載入影像為 FrameData[]
      const frames = await loadImagesAsFrames(Array.from(files));
      if (frames.length === 0) {
        throw new Error('無法載入任何影像');
      }

      // 分析幀 → Film DNA
      const dna = analyzeFramesToFilmDNA(
        frames,
        `Analyzed (${frames.length} frames)`,
        (p: AnalysisProgress) => setProgress(p),
      );

      onLoadDNA(dna);
    } catch (err) {
      setError(err instanceof Error ? err.message : '影像分析失敗');
    } finally {
      setAnalyzing(false);
      setProgress(null);
      // 重置 input 以便重複選擇相同檔案
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }, [onLoadDNA]);

  // ── Markdown 匯入入口 ────────────────────────────────────────
  const handleMdSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const dna = parseFilmDNA(text);
        onLoadDNA(dna);
      } catch (err) {
        setError(err instanceof Error ? err.message : '.md 解析失敗');
      }
    };
    reader.onerror = () => setError('檔案讀取失敗');
    reader.readAsText(file);

    // 重置 input
    if (mdInputRef.current) mdInputRef.current.value = '';
  }, [onLoadDNA]);

  // ── 空白建立入口 ─────────────────────────────────────────────
  const handleCreateBlank = useCallback(() => {
    const name = window.prompt('Film DNA 名稱：');
    if (!name || !name.trim()) return;
    const dna = onCreateDNA(name.trim());
    onLoadDNA(dna);
  }, [onCreateDNA, onLoadDNA]);

  // ── 匯出 .md ────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!activeDNA) return;
    downloadFilmDNA(activeDNA);
  }, [activeDNA]);

  // ── 容器樣式 ─────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    fontFamily: FONT,
    background: C.appBg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: 16,
    color: C.primary,
    minWidth: 320,
  };

  // ═══════════════════════════════════════════════════════════════
  // 無活躍 DNA → 顯示三個入口按鈕
  // ═══════════════════════════════════════════════════════════════
  if (!activeDNA) {
    return (
      <div style={panelStyle}>
        {/* 標題 */}
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.lavender,
          marginBottom: 12,
          letterSpacing: 0.5,
        }}>
          FILM DNA
        </div>

        {/* 說明文字 */}
        <p style={{
          fontSize: 12,
          color: C.label,
          margin: '0 0 16px 0',
          lineHeight: 1.6,
        }}>
          尚未載入 Film DNA。選擇一種方式建立或匯入：
        </p>

        {/* 三個入口按鈕 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* 影像分析 */}
          <button
            style={baseBtn(C.purple)}
            onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; }}
            onClick={() => imageInputRef.current?.click()}
            disabled={analyzing}
          >
            Analyze Images
          </button>

          {/* .md 匯入 */}
          <button
            style={baseBtn(C.mutedBorder)}
            onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; }}
            onClick={() => mdInputRef.current?.click()}
          >
            Import .md
          </button>

          {/* 空白建立 */}
          <button
            style={{
              ...baseBtn('transparent'),
              border: `1px dashed ${C.mutedBorder}`,
              color: C.label,
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.85'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; }}
            onClick={handleCreateBlank}
          >
            New Blank
          </button>
        </div>

        {/* 分析進度條 */}
        {analyzing && progress && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 11,
              color: C.lavender,
              marginBottom: 4,
            }}>
              {progress.phase} ({progress.percent}%)
            </div>
            <div style={{
              height: 4,
              borderRadius: 2,
              background: C.border,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress.percent}%`,
                background: C.purple,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div style={{
            marginTop: 12,
            padding: '8px 10px',
            borderRadius: 4,
            background: 'rgba(253, 218, 37, 0.08)',
            border: `1px solid ${C.yellow}`,
            color: C.yellow,
            fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {/* 隱藏的 file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
        <input
          ref={mdInputRef}
          type="file"
          accept=".md"
          style={{ display: 'none' }}
          onChange={handleMdSelect}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 有活躍 DNA → 顯示詳細資訊面板
  // ═══════════════════════════════════════════════════════════════

  // 格式化日期顯示
  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    } catch {
      return iso;
    }
  };

  // 來源徽章顏色
  const sourceBadgeColor: Record<string, string> = {
    analyzed: C.cyan,
    manual: C.purple,
    hybrid: C.lavender,
  };

  // 可摺疊區段渲染輔助
  const renderSection = (
    key: string,
    title: string,
    content: React.ReactNode,
  ) => (
    <div key={key} style={{ marginBottom: 8 }}>
      <button
        onClick={() => toggle(key)}
        style={{
          fontFamily: FONT,
          background: 'none',
          border: 'none',
          color: C.lavender,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '6px 0',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{
          display: 'inline-block',
          width: 12,
          fontSize: 10,
          color: C.label,
          transform: expanded[key] ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>
          ▶
        </span>
        {title}
      </button>
      {expanded[key] && (
        <div style={{
          padding: '8px 12px',
          background: C.inputBg,
          borderRadius: 4,
          border: `1px solid ${C.border}`,
          overflowX: 'auto',
        }}>
          {content}
        </div>
      )}
    </div>
  );

  // 包絡表格渲染 (NumericEnvelope)
  const renderEnvelopeTable = (rows: [string, { min: number; max: number; mean: number; std?: number }][]) => (
    <table style={{
      width: '100%',
      fontSize: 11,
      borderCollapse: 'collapse',
      fontFamily: FONT,
    }}>
      <thead>
        <tr>
          {['key', 'min', 'max', 'mean', 'std'].map(h => (
            <th key={h} style={{
              textAlign: 'left',
              padding: '3px 6px',
              color: C.label,
              fontWeight: 500,
              borderBottom: `1px solid ${C.border}`,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: '3px 6px', color: C.lavender }}>{k}</td>
            <td style={{ padding: '3px 6px', color: C.primary }}>{fmtNum(v.min)}</td>
            <td style={{ padding: '3px 6px', color: C.primary }}>{fmtNum(v.max)}</td>
            <td style={{ padding: '3px 6px', color: C.primary }}>{fmtNum(v.mean)}</td>
            <td style={{ padding: '3px 6px', color: C.secondary }}>
              {'std' in v && v.std !== undefined ? fmtNum(v.std) : '--'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 範圍表格渲染 (NumericRange)
  const renderRangeTable = (rows: [string, { min: number; max: number; mean: number } | string][]) => (
    <table style={{
      width: '100%',
      fontSize: 11,
      borderCollapse: 'collapse',
      fontFamily: FONT,
    }}>
      <thead>
        <tr>
          {['key', 'min', 'max', 'mean'].map(h => (
            <th key={h} style={{
              textAlign: 'left',
              padding: '3px 6px',
              color: C.label,
              fontWeight: 500,
              borderBottom: `1px solid ${C.border}`,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ padding: '3px 6px', color: C.lavender }}>{k}</td>
            {typeof v === 'string' ? (
              <td colSpan={3} style={{ padding: '3px 6px', color: C.primary }}>{v}</td>
            ) : (
              <>
                <td style={{ padding: '3px 6px', color: C.primary }}>{fmtNum(v.min)}</td>
                <td style={{ padding: '3px 6px', color: C.primary }}>{fmtNum(v.max)}</td>
                <td style={{ padding: '3px 6px', color: C.primary }}>{fmtNum(v.mean)}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={panelStyle}>
      {/* ── 標頭: 名稱 + 來源徽章 ──────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.white,
        }}>
          {activeDNA.name}
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 10,
          background: sourceBadgeColor[activeDNA.source] ?? C.purple,
          color: C.appBg,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}>
          {activeDNA.source}
        </span>
      </div>

      {/* ── 時間戳記 ────────────────────────────────────────────── */}
      <div style={{
        fontSize: 11,
        color: C.secondary,
        marginBottom: 12,
        lineHeight: 1.6,
      }}>
        <div>Created: {fmtDate(activeDNA.created)}</div>
        <div>Updated: {fmtDate(activeDNA.updated)}</div>
        {activeDNA.tags.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {activeDNA.tags.map(tag => (
              <span key={tag} style={{
                display: 'inline-block',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 3,
                background: C.darkPurple,
                color: C.lavender,
                marginRight: 4,
                marginBottom: 2,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 分隔線 ──────────────────────────────────────────────── */}
      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '0 0 12px 0' }} />

      {/* ── 可摺疊區段: Photometric ─────────────────────────────── */}
      {renderSection('photometric', 'NODE 06 · Photometric Envelope', renderEnvelopeTable([
        ['kelvin',     activeDNA.photometric.kelvin],
        ['ev',         activeDNA.photometric.ev],
        ['contrast',   activeDNA.photometric.contrast],
        ['saturation', activeDNA.photometric.saturation],
        ['shadowLift', activeDNA.photometric.shadowLift],
      ]))}

      {/* ── 可摺疊區段: Camera ──────────────────────────────────── */}
      {renderSection('camera', 'NODE 07 · Camera Envelope', (
        <div>
          {renderRangeTable([
            ['focalLength', activeDNA.camera.focalLength],
            ['aperture',    activeDNA.camera.aperture],
          ])}
          <div style={{ fontSize: 11, color: C.label, marginTop: 6 }}>
            <span style={{ color: C.lavender }}>preferredMoves:</span>{' '}
            <span style={{ color: C.primary }}>{activeDNA.camera.preferredMoves.join(', ')}</span>
          </div>
          <div style={{ fontSize: 11, color: C.label }}>
            <span style={{ color: C.lavender }}>dollySpeed:</span>{' '}
            <span style={{ color: C.primary }}>{activeDNA.camera.dollySpeed}</span>
          </div>
        </div>
      ))}

      {/* ── 可摺疊區段: Composition ─────────────────────────────── */}
      {renderSection('composition', 'NODE 08 · Composition Envelope', renderRangeTable([
        ['ruleOfThirds', activeDNA.composition.ruleOfThirds],
        ['depthLayers',  activeDNA.composition.depthLayers],
        ['negativeSpace',activeDNA.composition.negativeSpace],
      ]))}

      {/* ── 可摺疊區段: Style ──────────────────────────────────── */}
      {renderSection('style', 'NODE 09 · Style & Filter', renderRangeTable([
        ['filterHue',      activeDNA.style.filterHue],
        ['filterGrain',    activeDNA.style.filterGrain],
        ['filterVignette', activeDNA.style.filterVignette],
      ]))}

      {/* ── 可摺疊區段: Evolution Log ──────────────────────────── */}
      {renderSection('evolution', `Evolution Log (${activeDNA.evolutionLog.length})`, (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {activeDNA.evolutionLog.length === 0 ? (
            <div style={{ fontSize: 11, color: C.secondary }}>
              -- 尚無演化紀錄 --
            </div>
          ) : (
            activeDNA.evolutionLog.map((entry, i) => (
              <div key={i} style={{
                fontSize: 11,
                padding: '4px 0',
                borderBottom: i < activeDNA.evolutionLog.length - 1
                  ? `1px solid ${C.border}` : 'none',
                display: 'flex',
                gap: 8,
                alignItems: 'baseline',
              }}>
                {/* 時間戳 */}
                <span style={{
                  color: C.secondary,
                  flexShrink: 0,
                  fontSize: 10,
                  minWidth: 60,
                }}>
                  {entry.date.slice(0, 10)}
                </span>
                {/* 作者徽章 */}
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: 3,
                  flexShrink: 0,
                  background: entry.author === 'image-analyzer' ? C.cyan
                    : entry.author === 'user' ? C.purple
                    : entry.author === 'drift-corrector' ? C.yellow
                    : C.mutedBorder,
                  color: C.appBg,
                }}>
                  {entry.author}
                </span>
                {/* 變更描述 */}
                <span style={{ color: C.primary }}>{entry.change}</span>
              </div>
            ))
          )}
        </div>
      ))}

      {/* ── 分隔線 ──────────────────────────────────────────────── */}
      <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '12px 0' }} />

      {/* ── 操作按鈕列 ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* 匯出 .md */}
        <button
          style={baseBtn(C.purple)}
          onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; }}
          onClick={handleExport}
        >
          Export .md
        </button>

        {/* 卸載 DNA */}
        <button
          style={{
            ...baseBtn('transparent'),
            border: `1px solid ${C.mutedBorder}`,
            color: C.label,
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; }}
          onClick={onUnloadDNA}
        >
          Unload
        </button>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div style={{
          marginTop: 12,
          padding: '8px 10px',
          borderRadius: 4,
          background: 'rgba(253, 218, 37, 0.08)',
          border: `1px solid ${C.yellow}`,
          color: C.yellow,
          fontSize: 12,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── 數值格式化輔助 ─────────────────────────────────────────────

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}
