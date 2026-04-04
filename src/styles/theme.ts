// ◎ VDL-FLOW 內聯樣式系統
// ─── PMS 個人色彩規範 (FGSC/FGSU) ────────────────────────────
// Black 6 C  #101820 → 頁面底色
// Black 6 U  #4C4E56 → 邊框強調
// CoolGray10 #63666A → 次要文字
// CoolGray10U#818387 → 輔助文字
// 淺灰 424   #707372 → 靜止邊框
// 啞白 Blk1  #D9D9D6 → 主要文字 / 主要動作

import type { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
  app:          { maxWidth: 860, margin: '0 auto', padding: '0 20px 80px', background: '#1C1C1C', color: '#D9D9D6', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh' },
  header:       { padding: '32px 0 24px', borderBottom: '1px solid #333', marginBottom: 24 },
  appTitle:     { fontSize: 28, fontWeight: 600, color: '#D9D9D6', margin: 0, letterSpacing: 3 },
  appSub:       { fontSize: 12, color: '#63666A', margin: '6px 0 20px', fontWeight: 300 },
  progressBar:  { display: 'flex', gap: 6, flexWrap: 'wrap' },
  progressDot:  { width: 16, height: 16, borderRadius: 2, cursor: 'pointer' },
  progressText: { fontSize: 11, color: '#63666A', margin: '8px 0 0' },
  main:         { display: 'flex', flexDirection: 'column', gap: 12 },
  cardActive:   { background: '#242424', border: '1px solid #4C4E56', borderRadius: 6, padding: 24 },
  cardDone:     { background: '#1E1E1E', border: '1px solid #333', borderRadius: 6, padding: 24, opacity: 0.8 },
  cardLocked:   { background: '#191919', border: '1px solid #282828', borderRadius: 4, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'not-allowed' },
  lockIcon:     { fontSize: 14, opacity: 0.3 },
  lockedTitle:  { fontSize: 12, color: '#4C4E56' },
  cardHeader:   { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 },
  stepBadge:    { fontSize: 10, background: '#2a2a2a', color: '#818387', padding: '2px 8px', borderRadius: 2, fontWeight: 500, letterSpacing: 1 },
  cardTitle:    { fontSize: 15, fontWeight: 500, color: '#D9D9D6', margin: 0, flex: 1 },
  doneBadge:    { fontSize: 10, color: '#D9D9D6', letterSpacing: 1 },
  cardDesc:     { fontSize: 12, color: '#63666A', margin: '0 0 16px', lineHeight: 1.6, fontWeight: 300 },
  lockBar:      { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  lockChip:     { fontSize: 10, background: '#242424', color: '#818387', border: '1px solid #3a3a3a', padding: '2px 8px', borderRadius: 10 },
  fieldGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 12, marginBottom: 20 },
  fieldWrap:    { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel:   { fontSize: 11, color: '#818387', letterSpacing: 0.5, fontWeight: 400 },
  input:        { background: '#191919', border: '1px solid #333', color: '#D9D9D6', padding: '8px 10px', borderRadius: 3, fontSize: 12, fontFamily: 'inherit', outline: 'none' },
  textarea:     { background: '#191919', border: '1px solid #333', color: '#D9D9D6', padding: '8px 10px', borderRadius: 3, fontSize: 12, fontFamily: 'inherit', outline: 'none', resize: 'vertical' },
  promptBox:    { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 4, padding: 16, marginBottom: 16 },
  promptLabel:  { fontSize: 10, color: '#63666A', marginBottom: 8, letterSpacing: 2, fontWeight: 500 },
  promptText:   { fontSize: 11, color: '#818387', margin: '0 0 12px', whiteSpace: 'pre-wrap', lineHeight: 1.7 },
  copyBtn:      { fontSize: 11, background: '#242424', color: '#D9D9D6', border: '1px solid #4C4E56', padding: '6px 16px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1, fontWeight: 400 },
  nextBtn:      { width: '100%', padding: '12px', background: '#D9D9D6', color: '#1C1C1C', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 13, letterSpacing: 1, fontFamily: 'inherit', fontWeight: 600 },
  footer:       { marginTop: 40, padding: '32px 0' },
  footerBox:    { border: '1px solid #4C4E56', borderRadius: 6, padding: 24, textAlign: 'center' },
  footerMsg:    { color: '#D9D9D6', fontSize: 12, marginBottom: 16, letterSpacing: 2, fontWeight: 500 },
  copyAllBtn:   { fontSize: 13, background: '#D9D9D6', color: '#1C1C1C', border: 'none', padding: '14px 32px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 600 }
};
