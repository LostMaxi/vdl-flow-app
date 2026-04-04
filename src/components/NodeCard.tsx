// ◎ VDL-FLOW 節點卡片元件
// P1: 預設值一鍵套用 + 數值預填
// P2: 色票選擇器整合
// P3: 隨機骰子按鈕 + 一鍵骰子模式
// P4: 已鎖定欄位解鎖按鈕

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RadarChart } from './RadarChart';
import { ColorPicker } from './ColorPicker';
import { paletteDeltaE, rgbToLab } from '../utils/colorScience';
import { runAutoQA } from '../utils/visionQA';
import { getRandomWord, getRandomWordsForNode } from '../constants/randomWords';
import { styles } from '../styles/theme';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';
import type { NodeCardProps } from '../types/vdl';

// ─── 影像主色 → Kelvin 萃取（canvas 取樣，無需後端）────────
function extractKelvinFromCanvas(data: Uint8ClampedArray): { kelvin: number; avgL: number } {
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  const step = 16;
  for (let i = 0; i < data.length; i += step) {
    rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
    count++;
  }
  const [avgL, avgA, avgB] = rgbToLab(rSum / count, gSum / count, bSum / count);
  const hueRad = Math.atan2(avgB, avgA);
  const kelvin = Math.round(Math.max(2800, Math.min(7500, 5500 - Math.cos(hueRad) * 2200)));
  return { kelvin, avgL };
}

// ─── 影像 → 對比度 + 飽和度萃取 ────────────────────────────
function extractContrastSaturation(data: Uint8ClampedArray): { contrast: number; saturation: number } {
  let lSum = 0, lSqSum = 0, chromaSum = 0, count = 0;
  const step = 16;
  for (let i = 0; i < data.length; i += step) {
    const [L, a, b] = rgbToLab(data[i], data[i + 1], data[i + 2]);
    lSum += L; lSqSum += L * L;
    chromaSum += Math.sqrt(a * a + b * b);
    count++;
  }
  const meanL = lSum / count;
  const stdL  = Math.sqrt(lSqSum / count - meanL * meanL);
  const contrast   = parseFloat(Math.min(1, stdL / 50).toFixed(2));
  const saturation = parseFloat(Math.min(1, chromaSum / count / 80).toFixed(2));
  return { contrast, saturation };
}

// ─── 影像 → 主色板萃取（簡化中位切割）──────────────────────
function extractDominantPalette(data: Uint8ClampedArray, count: number = 5): string[] {
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  const step = 4; // sample every 4th pixel (RGBA stride)
  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // quantize to 32-level buckets
    const qr = (r >> 3) << 3, qg = (g >> 3) << 3, qb = (b >> 3) << 3;
    const key = `${qr},${qg},${qb}`;
    const entry = buckets.get(key);
    if (entry) { entry.r += r; entry.g += g; entry.b += b; entry.n++; }
    else { buckets.set(key, { r, g, b, n: 1 }); }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, count);
  return sorted.map(({ r, g, b, n }) => {
    const ar = Math.round(r / n), ag = Math.round(g / n), ab = Math.round(b / n);
    return '#' + [ar, ag, ab].map(c => c.toString(16).padStart(2, '0')).join('');
  });
}

// ─── 影片 → 取樣單幀 ────────────────────────────────────────
function sampleVideoFrame(video: HTMLVideoElement, time: number, canvas: HTMLCanvasElement): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('seek timeout')), 5000);
    video.currentTime = time;
    video.onseeked = () => {
      clearTimeout(timeout);
      canvas.width  = Math.min(video.videoWidth  || 320, 200);
      canvas.height = Math.min(video.videoHeight || 180, 200);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
  });
}

// ─── 簡易運動偵測（首尾幀差異）──────────────────────────────
function detectMotionPattern(frameA: ImageData, frameB: ImageData): { pattern: string; score: number } {
  let diffSum = 0;
  let xDiffSum = 0, yDiffSum = 0;
  const w = frameA.width, h = frameA.height;
  const step = 16;
  let count = 0;
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const idx = (y * w + x) * 4;
      const dR = Math.abs(frameA.data[idx] - frameB.data[idx]);
      const dG = Math.abs(frameA.data[idx + 1] - frameB.data[idx + 1]);
      const dB = Math.abs(frameA.data[idx + 2] - frameB.data[idx + 2]);
      const d = (dR + dG + dB) / 3;
      diffSum += d;
      // weighted position to detect directional movement
      xDiffSum += d * (x / w - 0.5);
      yDiffSum += d * (y / h - 0.5);
      count++;
    }
  }
  const avgDiff = diffSum / count;
  const xBias = Math.abs(xDiffSum / count);
  const yBias = Math.abs(yDiffSum / count);
  let pattern = 'static';
  if (avgDiff > 30) {
    if (xBias > yBias * 1.5) pattern = 'pan';
    else if (yBias > xBias * 1.5) pattern = 'tilt';
    else if (avgDiff > 60) pattern = 'handheld / fast motion';
    else pattern = 'dolly / zoom';
  } else if (avgDiff > 10) {
    pattern = 'slow dolly';
  }
  // score: 0 = static, 1 = maximum motion
  const score = parseFloat(Math.min(1, avgDiff / 80).toFixed(2));
  return { pattern, score };
}

// ─── NodeCard 元件 ───────────────────────────────────────────

export function NodeCard({
  nodeDef, isActive, isCompleted, locks, initialValues,
  onComplete, onLockFields, onRemoveLock,
  savedPalettes = [], onSavePalette, onDeletePalette,
  shotQAHistory = [],
}: NodeCardProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string | number>>(initialValues ?? {});
  const [copied, setCopied] = useState(false);
  const imgInputRef    = useRef<HTMLInputElement>(null);
  const aiImgInputRef  = useRef<HTMLInputElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const [aiStatus, setAiStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [aiProgress, setAiProgress] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // NODE 10/11 analysis refs
  const refImgInputRef   = useRef<HTMLInputElement>(null);
  const refVideoInputRef = useRef<HTMLInputElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);

  // ─── P1: 數值類欄位自動預填 placeholder 值 ────────────────
  useEffect(() => {
    if (!isActive || isCompleted) return;
    const prefilled: Record<string, string | number> = {};
    let changed = false;
    nodeDef.fields.forEach(field => {
      if (field.type === 'number' && values[field.key] === undefined && !(initialValues && initialValues[field.key] !== undefined)) {
        const num = parseFloat(field.placeholder);
        if (!isNaN(num)) {
          prefilled[field.key] = num;
          changed = true;
        }
      }
    });
    if (changed) setValues(v => ({ ...prefilled, ...v }));
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── P1: 一鍵套用預設 ─────────────────────────────────────
  const handleApplyDefaults = useCallback(() => {
    const defaults: Record<string, string | number> = {};
    nodeDef.fields.forEach(field => {
      if (!field.placeholder) return;
      // 條件欄位：如果目前不可見就跳過
      if (field.showWhen) {
        const cur = String(values[field.showWhen.key] ?? '');
        if (!field.showWhen.values.includes(cur)) return;
      }
      if (field.type === 'number') {
        const num = parseFloat(field.placeholder);
        if (!isNaN(num)) defaults[field.key] = num;
      } else if (field.type !== 'select') {
        defaults[field.key] = field.placeholder;
      }
    });
    setValues(v => ({ ...v, ...defaults }));
  }, [nodeDef.fields, values]);

  // ─── P3: 一鍵骰子模式 ─────────────────────────────────────
  const handleDiceAll = useCallback(() => {
    const randoms = getRandomWordsForNode(nodeDef.id);
    const updates: Record<string, string | number> = {};
    nodeDef.fields.forEach(field => {
      if (field.noDice || field.type === 'number' || field.type === 'select' || field.fieldVariant) return;
      // 條件欄位：不可見就跳過
      if (field.showWhen) {
        const cur = String(values[field.showWhen.key] ?? '');
        if (!field.showWhen.values.includes(cur)) return;
      }
      const word = randoms[field.key];
      if (word) updates[field.key] = word;
    });
    if (Object.keys(updates).length > 0) {
      setValues(v => ({ ...v, ...updates }));
    }
  }, [nodeDef, values]);

  // ─── P3: 單欄骰子 ─────────────────────────────────────────
  const handleDiceSingle = useCallback((fieldKey: string) => {
    const word = getRandomWord(nodeDef.id, fieldKey);
    if (word) setValues(v => ({ ...v, [fieldKey]: word }));
  }, [nodeDef.id]);

  // ─── Anime.js: 卡片進場動畫 ──────────────────────────────────
  useEffect(() => {
    if (!cardRef.current || (!isActive && !isCompleted)) return;
    anime({
      targets: cardRef.current,
      opacity: [0, isCompleted ? 0.8 : 1],
      translateY: [20, 0],
      duration: 500,
      easing: 'easeOutCubic',
    });
  }, [isActive, isCompleted]);

  // NODE 12 上傳渲染截圖 → 自動計算 ΔKelvin + NDF Delta
  const handleImageAnalysis = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || nodeDef.id !== 'node_12') return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width  = Math.min(img.naturalWidth,  200);
      canvas.height = Math.min(img.naturalHeight, 200);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { kelvin: extractedK, avgL } = extractKelvinFromCanvas(data);
      const lockedK  = Number(locks.kelvin?.value ?? extractedK);
      const deltaK   = Math.abs(extractedK - lockedK);
      const T_actual = parseFloat((1 - avgL / 100).toFixed(2));
      const T_locked = Number(locks.T_end?.value ?? T_actual);
      const ndfDelta = parseFloat(Math.abs(T_actual - T_locked).toFixed(3));
      setValues(v => ({ ...v, delta_kelvin: deltaK, ndf_delta: ndfDelta }));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [nodeDef.id, locks]);

  // AI 全掃描 — CLIP + YOLO + Depth
  const handleAIScan = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || nodeDef.id !== 'node_12') return;
    setAiStatus('loading');
    setAiProgress('準備中…');
    const imageUrl = URL.createObjectURL(file);
    try {
      const styleLabels = String(locks.style_keywords?.value ?? '').split(',').map(s => s.trim()).filter(Boolean);
      const objLabels   = String(locks.theme_core?.value ?? '').split(' ').slice(0, 5).filter(Boolean);
      const result = await runAutoQA(imageUrl, styleLabels, objLabels, (s) => setAiProgress(s));
      setValues(v => ({
        ...v,
        clip_sim:   result.clip_sim,
        obj_recall: result.obj_recall,
        depth_corr: result.depth_corr,
      }));
      setAiStatus('done');
      setAiProgress('AI 掃描完成');
    } catch (err) {
      setAiStatus('error');
      setAiProgress(String(err));
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }, [nodeDef.id, locks]);

  // NODE 12: 當兩個調色板欄位填入後，自動計算 paletteDeltaE
  useEffect(() => {
    if (nodeDef.id !== 'node_12') return;
    const rp = String(values.rendered_palette ?? '');
    const tp = String(values.target_palette   ?? '');
    if (!rp || !tp) return;
    try {
      const rendered = rp.split(',').map(s => s.trim()).filter(Boolean);
      const target   = tp.split(',').map(s => s.trim()).filter(Boolean);
      if (rendered.length < 2 || target.length < 2) return;
      const { mean } = paletteDeltaE(rendered, target);
      setValues(v => ({ ...v, delta_e_color: parseFloat(mean.toFixed(2)) }));
    } catch { /* invalid hex — silent */ }
  }, [values.rendered_palette, values.target_palette, nodeDef.id]);

  const mergedValues = useMemo(() => {
    const merged = { ...values };
    nodeDef.fields.forEach(field => {
      if ((merged[field.key] === undefined || merged[field.key] === '') && locks[field.key]) {
        merged[field.key] = locks[field.key].value;
      }
    });
    return merged;
  }, [values, locks, nodeDef.fields]);

  const generatedPrompt = useMemo(() => {
    try { return nodeDef.promptTemplate(mergedValues, locks); }
    catch { return '─── 請填寫所有必填欄位後自動生成提示詞 ───'; }
  }, [mergedValues, nodeDef, locks]);

  // ─── NODE 10: 參考圖分析 ────────────────────────────────────
  const handleRefImageAnalysis = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || nodeDef.id !== 'node_10') return;
    setAnalysisStatus('loading');
    const url = URL.createObjectURL(file);
    setRefPreviewUrl(url);
    const img = new Image();
    img.onload = () => {
      const canvas = analysisCanvasRef.current ?? document.createElement('canvas');
      canvas.width  = Math.min(img.naturalWidth,  200);
      canvas.height = Math.min(img.naturalHeight, 200);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      // extract VDL params
      const { kelvin }              = extractKelvinFromCanvas(data);
      const { contrast, saturation } = extractContrastSaturation(data);
      const palette                  = extractDominantPalette(data, 5);
      // compare with NODE 06 targets
      const targetK = Number(locks.kelvin?.value ?? kelvin);
      const deltaK  = Math.abs(kelvin - targetK);
      // compare palette with NODE 02 dominant_palette
      let deltaP = 0;
      const targetPaletteStr = String(locks.dominant_palette?.value ?? '');
      if (targetPaletteStr) {
        try {
          const targetColors = targetPaletteStr.split(',').map(s => s.trim()).filter(Boolean);
          if (targetColors.length >= 2 && palette.length >= 2) {
            deltaP = parseFloat(paletteDeltaE(palette, targetColors).mean.toFixed(2));
          }
        } catch { /* invalid hex */ }
      }
      setValues(v => ({
        ...v,
        detected_kelvin:     kelvin,
        detected_palette:    palette.join(', '),
        detected_contrast:   contrast,
        detected_saturation: saturation,
        delta_kelvin_ref:    deltaK,
        delta_palette_ref:   deltaP,
      }));
      setAnalysisStatus('done');
    };
    img.onerror = () => { setAnalysisStatus('idle'); URL.revokeObjectURL(url); };
    img.src = url;
    e.target.value = '';
  }, [nodeDef.id, locks]);

  // ─── NODE 11: 參考影片分析 ─────────────────────────────────
  const handleRefVideoAnalysis = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || nodeDef.id !== 'node_11') return;
    setAnalysisStatus('loading');
    const url = URL.createObjectURL(file);
    setRefPreviewUrl(url);
    try {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('video load failed'));
      });
      const dur = video.duration || 10;
      const canvas = analysisCanvasRef.current ?? document.createElement('canvas');
      // sample 3 frames: 10%, 50%, 90%
      const times = [dur * 0.1, dur * 0.5, dur * 0.9];
      const frames: ImageData[] = [];
      const kelvins: number[] = [];
      const palettes: string[][] = [];
      for (const t of times) {
        const frame = await sampleVideoFrame(video, t, canvas);
        frames.push(frame);
        const { kelvin } = extractKelvinFromCanvas(frame.data);
        kelvins.push(kelvin);
        palettes.push(extractDominantPalette(frame.data, 5));
      }
      // kelvin drift = max - min
      const kelvinDrift = Math.max(...kelvins) - Math.min(...kelvins);
      // palette consistency = 1 - avg ΔE between consecutive frame palettes
      let paletteConsistency = 1;
      if (palettes.length >= 2) {
        let totalDE = 0;
        let pairs = 0;
        for (let i = 0; i < palettes.length - 1; i++) {
          try {
            totalDE += paletteDeltaE(palettes[i], palettes[i + 1]).mean;
            pairs++;
          } catch { /* skip */ }
        }
        if (pairs > 0) {
          paletteConsistency = parseFloat(Math.max(0, 1 - (totalDE / pairs) / 10).toFixed(2));
        }
      }
      // motion detection between first and last frame
      const { pattern, score } = detectMotionPattern(frames[0], frames[frames.length - 1]);
      // movement match with NODE 07 target
      const targetMovement = String(locks.movement?.value ?? '').toLowerCase();
      let movementMatch = 0.5; // default: unknown
      if (targetMovement) {
        if (targetMovement.includes(pattern) || pattern.includes(targetMovement.split(' ')[0])) {
          movementMatch = 0.9;
        } else if (pattern === 'static' && targetMovement.includes('static')) {
          movementMatch = 1.0;
        } else {
          movementMatch = Math.max(0.1, 0.5 - score * 0.3);
        }
      }
      setValues(v => ({
        ...v,
        frames_sampled:      frames.length,
        kelvin_drift:        kelvinDrift,
        palette_consistency: paletteConsistency,
        motion_pattern:      pattern,
        movement_match:      parseFloat(movementMatch.toFixed(2)),
      }));
      setAnalysisStatus('done');
    } catch {
      setAnalysisStatus('idle');
    }
    e.target.value = '';
  }, [nodeDef.id, locks]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setCopied(true);
      if (copyBtnRef.current) {
        anime({
          targets: copyBtnRef.current,
          scale: [1, 1.08, 1],
          duration: 350,
          easing: 'easeInOutQuad',
          complete: () => {
            anime({
              targets: copyBtnRef.current,
              opacity: [1, 0.5, 1],
              duration: 1650,
              easing: 'easeInOutSine',
              complete: () => setCopied(false),
            });
          },
        });
      } else {
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  // ─── 判斷欄位是否可用骰子 ─────────────────────────────────
  const canDice = (field: typeof nodeDef.fields[0]) =>
    !field.noDice && field.type !== 'number' && field.type !== 'select' && !field.fieldVariant;

  // ─── 判斷文字欄位是否有隨機詞庫 ──────────────────────────
  const hasDiceBank = (fieldKey: string) => getRandomWord(nodeDef.id, fieldKey) !== null;

  // ─── 非活躍卡片：鎖定狀態 ─────────────────────────────────
  if (!isActive && !isCompleted) {
    return (
      <div ref={cardRef} style={styles.cardLocked}>
        <span style={styles.lockIcon}>○</span>
        <span style={styles.lockedTitle}>{nodeDef.title}</span>
      </div>
    );
  }

  // ─── 檢查是否有任何可骰子的欄位 ──────────────────────────
  const hasAnyDiceable = nodeDef.fields.some(f => canDice(f) && hasDiceBank(f.key));

  return (
    <div ref={cardRef} style={{ ...(isCompleted ? styles.cardDone : styles.cardActive), opacity: 0 }}>
      <div style={styles.cardHeader}>
        <span style={styles.stepBadge}>{t('card.step', { step: String(nodeDef.step) })}</span>
        <h3 style={styles.cardTitle}>{nodeDef.title}</h3>
        {isCompleted && <span style={styles.doneBadge}>{t('card.done')}</span>}
      </div>

      {/* ─── P1+P3: 預設套用 + 一鍵骰子 按鈕列 ──────────── */}
      {!isCompleted && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleApplyDefaults}
            style={{
              fontSize: 10, padding: '3px 10px',
              background: 'transparent', border: '1px solid #4C4E56',
              color: '#D9D9D6', borderRadius: 2, cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            {t('card.applyDefaults')}
          </button>
          {hasAnyDiceable && (
            <button
              onClick={handleDiceAll}
              style={{
                fontSize: 10, padding: '3px 10px',
                background: 'transparent', border: '1px solid #A78BFA',
                color: '#A78BFA', borderRadius: 2, cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              {t('card.diceAll')}
            </button>
          )}
        </div>
      )}

      <p style={styles.cardDesc}>{nodeDef.description}</p>

      {/* ─── P4: 鎖定欄位列 + 解鎖按鈕 ──────────────────── */}
      {Object.keys(locks).length > 0 && (
        <div style={styles.lockBar}>
          {Object.entries(locks)
            .filter(([key]) => nodeDef.fields.some(f => f.key === key))
            .map(([key, { source }]) => (
              <span key={key} style={{ ...styles.lockChip, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                ◎ {key} ← {source}
                {onRemoveLock && !isCompleted && (
                  <button
                    onClick={() => onRemoveLock(key)}
                    style={{
                      fontSize: 8, padding: '0 4px',
                      background: 'transparent', border: '1px solid #707372',
                      color: '#707372', borderRadius: 2, cursor: 'pointer',
                      lineHeight: '14px',
                    }}
                    title={t('card.unlock')}
                  >
                    {t('card.unlock')}
                  </button>
                )}
              </span>
            ))}
        </div>
      )}

      {/* ─── 欄位網格 ───────────────────────────────────────── */}
      <div style={styles.fieldGrid}>
        {nodeDef.fields.filter(field => {
          if (!field.showWhen) return true;
          const cur = String(mergedValues[field.showWhen.key] ?? values[field.showWhen.key] ?? '');
          return field.showWhen.values.includes(cur);
        }).map(field => (
          <div key={field.key} style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>{field.label}</label>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
              {/* ─── 主輸入區 ─────────────────────────────── */}
              <div style={{ flex: 1 }}>
                {field.type === 'textarea' ? (
                  <textarea
                    style={styles.textarea}
                    value={String(mergedValues[field.key] ?? '')}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    disabled={isCompleted}
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <select
                    style={{ ...styles.input, cursor: 'pointer' }}
                    value={String(mergedValues[field.key] ?? '')}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    disabled={isCompleted}
                  >
                    <option value="">— {field.placeholder} —</option>
                    {(field.options ?? []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={styles.input}
                    type={field.type}
                    value={String(mergedValues[field.key] ?? '')}
                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    disabled={isCompleted}
                    step={field.type === 'number' ? 'any' : undefined}
                  />
                )}
              </div>

              {/* ─── P2: 色票選擇器 ──────────────────────── */}
              {field.fieldVariant && !isCompleted && (
                <ColorPicker
                  value={String(mergedValues[field.key] ?? '')}
                  onChange={val => setValues(v => ({ ...v, [field.key]: val }))}
                  multi={field.fieldVariant === 'palette'}
                  disabled={isCompleted}
                  savedPalettes={field.fieldVariant === 'palette' ? savedPalettes : undefined}
                  onSavePalette={field.fieldVariant === 'palette' ? onSavePalette : undefined}
                  onDeletePalette={field.fieldVariant === 'palette' ? onDeletePalette : undefined}
                />
              )}

              {/* ─── P3: 單欄骰子按鈕 ───────────────────── */}
              {canDice(field) && hasDiceBank(field.key) && !isCompleted && (
                <button
                  onClick={() => handleDiceSingle(field.key)}
                  style={{
                    width: 28, height: 28,
                    background: 'transparent',
                    border: '1px solid #333',
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: '#818387',
                    padding: 0,
                    flexShrink: 0,
                    marginTop: field.type === 'textarea' ? 0 : 0,
                  }}
                  title="Random"
                >
                  ⚄
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ─── 提示詞輸出區 ───────────────────────────────────── */}
      <div style={styles.promptBox}>
        <div style={styles.promptLabel}>{t('card.promptLabel')}</div>
        <pre style={styles.promptText}>{generatedPrompt}</pre>
        <button ref={copyBtnRef} onClick={handleCopy} style={styles.copyBtn}>
          {copied ? t('card.copied') : t('card.copy')}
        </button>
      </div>

      {/* ─── NODE 10: 參考圖匯入 + VDL 逆向分析 ──────────────── */}
      {nodeDef.id === 'node_10' && !isCompleted && (
        <div style={{ margin: '8px 0', padding: '8px', background: '#222', border: '1px dashed #2A1A4A', borderRadius: 2 }}>
          <div style={{ fontSize: 9, color: '#D9D9D6', marginBottom: 6, letterSpacing: 1 }}>{t('node10.importTitle')}</div>
          <input ref={refImgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleRefImageAnalysis} />
          <canvas ref={analysisCanvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => refImgInputRef.current?.click()}
              disabled={analysisStatus === 'loading'}
              style={{
                fontSize: 9, padding: '4px 10px', background: 'transparent',
                border: '1px solid #A78BFA', color: '#D9D9D6', cursor: analysisStatus === 'loading' ? 'wait' : 'pointer',
                borderRadius: 2, letterSpacing: 0.5, opacity: analysisStatus === 'loading' ? 0.6 : 1,
              }}
            >
              {analysisStatus === 'loading' ? t('node10.analyzing') : t('node10.importBtn')}
            </button>
            {analysisStatus === 'done' && (
              <span style={{ fontSize: 8, color: '#A78BFA' }}>{t('node10.analysisDone')}</span>
            )}
            {!locks.kelvin?.value && (
              <span style={{ fontSize: 8, color: '#555' }}>{t('node10.noTarget')}</span>
            )}
          </div>
          {/* 參考圖預覽 */}
          {refPreviewUrl && (
            <div style={{ marginTop: 8 }}>
              <img
                src={refPreviewUrl}
                alt="Reference image"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 2, border: '1px solid #333', display: 'block' }}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── NODE 11: 參考影片匯入 + 逐幀 VDL 分析 ──────────── */}
      {nodeDef.id === 'node_11' && !isCompleted && (
        <div style={{ margin: '8px 0', padding: '8px', background: '#222', border: '1px dashed #2A1A4A', borderRadius: 2 }}>
          <div style={{ fontSize: 9, color: '#D9D9D6', marginBottom: 6, letterSpacing: 1 }}>{t('node11.importTitle')}</div>
          <input ref={refVideoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleRefVideoAnalysis} />
          <canvas ref={analysisCanvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => refVideoInputRef.current?.click()}
              disabled={analysisStatus === 'loading'}
              style={{
                fontSize: 9, padding: '4px 10px', background: 'transparent',
                border: '1px solid #A78BFA', color: '#D9D9D6', cursor: analysisStatus === 'loading' ? 'wait' : 'pointer',
                borderRadius: 2, letterSpacing: 0.5, opacity: analysisStatus === 'loading' ? 0.6 : 1,
              }}
            >
              {analysisStatus === 'loading' ? t('node11.analyzing') : t('node11.importBtn')}
            </button>
            {analysisStatus === 'done' && (
              <span style={{ fontSize: 8, color: '#A78BFA' }}>{t('node11.analysisDone')}</span>
            )}
            {!locks.movement?.value && (
              <span style={{ fontSize: 8, color: '#555' }}>{t('node11.noTarget')}</span>
            )}
          </div>
          {/* 參考影片預覽 */}
          {refPreviewUrl && (
            <div style={{ marginTop: 8 }}>
              <video
                src={refPreviewUrl}
                controls
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 2, border: '1px solid #333', display: 'block' }}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── NODE 12 QA 區 ──────────────────────────────────── */}
      {nodeDef.id === 'node_12' && (
        <div style={{ margin: '8px 0', padding: '8px', background: '#222', border: '1px dashed #2A1A4A', borderRadius: 2 }}>
          <div style={{ fontSize: 9, color: '#D9D9D6', marginBottom: 6, letterSpacing: 1 }}>{t('qa.uploadTitle')}</div>
          <input ref={imgInputRef}   type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageAnalysis} />
          <input ref={aiImgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAIScan} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => imgInputRef.current?.click()}
              style={{ fontSize: 9, padding: '4px 10px', background: 'transparent', border: '1px solid #A78BFA', color: '#D9D9D6', cursor: 'pointer', borderRadius: 2, letterSpacing: 0.5 }}
            >
              {t('qa.kelvinBtn')}
            </button>
            <button
              onClick={() => aiImgInputRef.current?.click()}
              disabled={aiStatus === 'loading'}
              style={{ fontSize: 9, padding: '4px 10px', background: 'transparent', border: '1px solid #818cf8', color: '#818387', cursor: aiStatus === 'loading' ? 'wait' : 'pointer', borderRadius: 2, letterSpacing: 0.5, opacity: aiStatus === 'loading' ? 0.6 : 1 }}
            >
              {t('qa.aiScanBtn')}
            </button>
          </div>
          {aiStatus !== 'idle' && (
            <div style={{ fontSize: 8, color: aiStatus === 'error' ? '#707372' : aiStatus === 'done' ? '#D9D9D6' : '#818387', marginTop: 4 }}>
              {aiProgress}
            </div>
          )}
          {aiStatus === 'idle' && <div style={{ fontSize: 8, color: '#333', marginTop: 4 }}>{t('qa.aiFirstNote')}</div>}
        </div>
      )}
      {nodeDef.id === 'node_12' && <RadarChart values={mergedValues} history={shotQAHistory} />}

      {!isCompleted && (
        <button
          ref={nextBtnRef}
          onClick={() => {
            if (nextBtnRef.current) {
              anime({
                targets: nextBtnRef.current,
                scale: [1, 0.97, 1],
                duration: 250,
                easing: 'easeInOutQuad',
                complete: () => onComplete(nodeDef, mergedValues),
              });
            } else {
              onComplete(nodeDef, mergedValues);
            }
          }}
          style={styles.nextBtn}
        >
          {t('card.confirm')}
        </button>
      )}
    </div>
  );
}
