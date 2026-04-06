// ◎ 2026-04-06 — TemplatePanel 模板面板
// 每個節點的右側模板管理面板：儲存/載入/套用模板 + 圖片上傳自動提取色彩

import React, { useRef, useCallback, useState } from 'react';
import type { NodeTemplate } from '../types/filmDNA';

// ─── Props 定義 ──────────────────────────────────────────────
interface TemplatePanelProps {
  nodeId: string;
  currentValues: Record<string, string>;
  onApplyTemplate: (values: Record<string, string>) => void;
  templates: NodeTemplate[];
  onSaveTemplate: (template: Omit<NodeTemplate, 'id' | 'createdAt'>) => NodeTemplate;
  onRemoveTemplate: (templateId: string) => void;
}

// ─── 色票常數 (Lost Maxi.Art 色彩系統) ───────────────────────
const C = {
  appBg:      '#1C1C1C',
  inputBg:    '#191919',
  cardBg:     '#242424',
  border:     '#333',
  muted:      '#4C4E56',
  label:      '#818387',
  text:       '#D9D9D6',
  purple:     '#A78BFA',
  lavender:   '#DFCEEA',
  teal:       '#00CFB4',
  darkPurple: '#2A1A4A',
  font:       "'Inter', 'Noto Sans TC', sans-serif",
} as const;

// ─── 縮圖尺寸 ────────────────────────────────────────────────
const THUMB_SIZE = 48;
const THUMB_QUALITY = 0.7;

// ─── Canvas 色彩提取：從圖片擷取主色調 hex 色票 ──────────────
function extractDominantColors(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
): string[] {
  // 縮放至合理解析度以加速取樣
  const maxDim = 128;
  const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h).data;
  const totalPixels = w * h;

  // 將像素分配到 4x4x4 色彩桶進行量化
  const BUCKET_BITS = 4;
  const BUCKET_SHIFT = 8 - BUCKET_BITS;
  const BUCKET_COUNT = 1 << BUCKET_BITS;
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 跳過近乎透明的像素
    if (data[i + 3] < 128) continue;

    const key =
      ((r >> BUCKET_SHIFT) * BUCKET_COUNT * BUCKET_COUNT) +
      ((g >> BUCKET_SHIFT) * BUCKET_COUNT) +
      (b >> BUCKET_SHIFT);

    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  // 依數量排序，取前 6 個主色調
  const sorted = [...buckets.values()]
    .filter(b => b.count > totalPixels * 0.01) // 至少佔 1% 像素
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // 計算每桶平均 RGB → hex
  return sorted.map(b => {
    const r = Math.round(b.r / b.count);
    const g = Math.round(b.g / b.count);
    const bVal = Math.round(b.b / b.count);
    return '#' + [r, g, bVal].map(v => v.toString(16).padStart(2, '0')).join('');
  });
}

// ─── 生成縮圖 base64 ─────────────────────────────────────────
function generateThumbnail(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
): string {
  canvas.width = THUMB_SIZE;
  canvas.height = THUMB_SIZE;
  // 裁切為正方形，取中央區域
  const size = Math.min(img.width, img.height);
  const sx = (img.width - size) / 2;
  const sy = (img.height - size) / 2;
  ctx.drawImage(img, sx, sy, size, size, 0, 0, THUMB_SIZE, THUMB_SIZE);
  return canvas.toDataURL('image/jpeg', THUMB_QUALITY);
}

// ─── 格式化日期為簡短顯示 ────────────────────────────────────
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  } catch {
    return iso.slice(0, 10);
  }
}

// ─── 主元件 ──────────────────────────────────────────────────
const TemplatePanel: React.FC<TemplatePanelProps> = ({
  nodeId,
  currentValues,
  onApplyTemplate,
  templates,
  onSaveTemplate,
  onRemoveTemplate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  // 過濾出屬於此節點的模板
  const nodeTemplates = templates.filter(t => t.nodeId === nodeId);

  // 儲存當前節點值為模板
  const handleSave = useCallback(() => {
    const name = window.prompt('模板名稱：');
    if (!name || !name.trim()) return;

    onSaveTemplate({
      name: name.trim(),
      nodeId,
      values: { ...currentValues },
      source: 'manual',
    });
  }, [nodeId, currentValues, onSaveTemplate]);

  // 套用模板
  const handleApply = useCallback((template: NodeTemplate) => {
    onApplyTemplate(template.values);
    setAppliedId(template.id);
    // 3 秒後清除套用狀態標記
    setTimeout(() => setAppliedId(prev => prev === template.id ? null : prev), 3000);
  }, [onApplyTemplate]);

  // 圖片上傳 → canvas 分析 → 自動建立模板
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // 提取主色調
        const colors = extractDominantColors(canvas, ctx, img);
        // 生成縮圖
        const thumbnail = generateThumbnail(canvas, ctx, img);

        // 組裝提取值：以 palette 格式存入
        const values: Record<string, string> = {
          palette: colors.join(', '),
        };
        // 個別色彩欄位供節點使用
        colors.forEach((hex, i) => {
          values[`color_${i + 1}`] = hex;
        });

        const name = file.name.replace(/\.[^.]+$/, '');
        onSaveTemplate({
          name: `[img] ${name}`,
          nodeId,
          values,
          thumbnail,
          source: 'image',
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    // 重置 input 以允許重複上傳同一檔案
    e.target.value = '';
  }, [nodeId, onSaveTemplate]);

  // ─── 樣式物件 ────────────────────────────────────────────
  const styles = {
    container: {
      fontFamily: C.font,
      fontSize: 11,
      color: C.text,
      backgroundColor: C.appBg,
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      padding: 8,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 6,
      maxHeight: 260,
      overflowY: 'auto' as const,
    },
    header: {
      fontSize: 12,
      fontWeight: 600,
      color: C.lavender,
      marginBottom: 2,
    },
    btnRow: {
      display: 'flex',
      gap: 4,
    },
    btnSave: {
      flex: 1,
      padding: '4px 6px',
      fontSize: 10,
      fontFamily: C.font,
      fontWeight: 500,
      color: C.text,
      backgroundColor: C.cardBg,
      border: `1px solid ${C.purple}`,
      borderRadius: 3,
      cursor: 'pointer',
    },
    btnUpload: {
      flex: 1,
      padding: '4px 6px',
      fontSize: 10,
      fontFamily: C.font,
      fontWeight: 500,
      color: C.text,
      backgroundColor: C.cardBg,
      border: `1px dashed ${C.muted}`,
      borderRadius: 3,
      cursor: 'pointer',
    },
    card: (isApplied: boolean) => ({
      backgroundColor: isApplied ? C.darkPurple : C.cardBg,
      border: `1px solid ${isApplied ? C.teal : C.border}`,
      borderRadius: 4,
      padding: 6,
      display: 'flex',
      gap: 6,
      alignItems: 'flex-start' as const,
      position: 'relative' as const,
    }),
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 3,
      objectFit: 'cover' as const,
      flexShrink: 0,
      backgroundColor: C.inputBg,
    },
    cardInfo: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 2,
    },
    cardName: {
      fontSize: 11,
      fontWeight: 500,
      color: C.text,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
      whiteSpace: 'nowrap' as const,
    },
    cardDate: {
      fontSize: 9,
      color: C.label,
    },
    cardSource: {
      fontSize: 9,
      color: C.muted,
      fontStyle: 'italic' as const,
    },
    btnApply: {
      padding: '2px 6px',
      fontSize: 9,
      fontFamily: C.font,
      fontWeight: 500,
      color: C.appBg,
      backgroundColor: C.purple,
      border: 'none',
      borderRadius: 2,
      cursor: 'pointer',
      marginTop: 2,
    },
    btnApplied: {
      padding: '2px 6px',
      fontSize: 9,
      fontFamily: C.font,
      fontWeight: 500,
      color: C.appBg,
      backgroundColor: C.teal,
      border: 'none',
      borderRadius: 2,
      cursor: 'default',
      marginTop: 2,
    },
    btnDelete: {
      position: 'absolute' as const,
      top: 3,
      right: 3,
      width: 14,
      height: 14,
      lineHeight: '12px',
      textAlign: 'center' as const,
      fontSize: 10,
      fontFamily: C.font,
      color: C.label,
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: 2,
      cursor: 'pointer',
      padding: 0,
    },
    empty: {
      fontSize: 10,
      color: C.muted,
      textAlign: 'center' as const,
      padding: '12px 0',
      borderTop: `1px dashed ${C.border}`,
    },
    divider: {
      height: 1,
      backgroundColor: C.border,
      margin: '2px 0',
    },
  };

  return (
    <div style={styles.container}>
      {/* 標題 */}
      <div style={styles.header}>模板</div>

      {/* 操作按鈕列 */}
      <div style={styles.btnRow}>
        <button style={styles.btnSave} onClick={handleSave}>
          儲存當前
        </button>
        <button
          style={styles.btnUpload}
          onClick={() => fileInputRef.current?.click()}
        >
          圖片提取
        </button>
      </div>

      {/* 隱藏的檔案輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      {/* 隱藏的 canvas，用於色彩分析與縮圖生成 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 分隔線 */}
      <div style={styles.divider} />

      {/* 模板列表 */}
      {nodeTemplates.length === 0 ? (
        <div style={styles.empty}>尚無模板</div>
      ) : (
        nodeTemplates.map(template => {
          const isApplied = appliedId === template.id;
          return (
            <div key={template.id} style={styles.card(isApplied)}>
              {/* 縮圖（若有） */}
              {template.thumbnail && (
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  style={styles.thumb}
                />
              )}

              {/* 資訊區 */}
              <div style={styles.cardInfo}>
                <div style={styles.cardName} title={template.name}>
                  {template.name}
                </div>
                <div style={styles.cardDate}>
                  {formatDate(template.createdAt)}
                </div>
                {template.source && (
                  <div style={styles.cardSource}>{template.source}</div>
                )}
                <button
                  style={isApplied ? styles.btnApplied : styles.btnApply}
                  onClick={() => !isApplied && handleApply(template)}
                >
                  {isApplied ? '已套用' : '套用'}
                </button>
              </div>

              {/* 刪除按鈕 */}
              <button
                style={styles.btnDelete}
                onClick={() => onRemoveTemplate(template.id)}
                title="刪除模板"
              >
                x
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TemplatePanel;
