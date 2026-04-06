// ◎ 2026-04-03 — SplashScreen.tsx
// 啟動畫面：新建專案 / 開啟舊檔（含拖拉）/ 最近專案列表 / Google Drive
// Anime.js 進場動畫

import { useState, useRef, useCallback, useEffect } from 'react';
import { anime } from '../hooks/useAnime';
import { useI18n } from '../i18n/context';
import type { ProjectMeta } from '../hooks/useProjectManager';
import type { useGoogleDrive } from '../hooks/useGoogleDrive';

interface SplashScreenProps {
  recentProjects: ProjectMeta[];
  drive: ReturnType<typeof useGoogleDrive>;
  onNewProject: (name?: string) => void;
  onOpenFile: (data: string, fileName: string) => void;
  onContinueProject: (projectId: string) => void;
  onDeleteProjects: (id: string) => void;
  onDriveOpen: (fileId: string, fileName: string) => void;
  onDriveListRequest: () => Promise<void>;
}

export function SplashScreen({
  recentProjects,
  drive,
  onNewProject,
  onOpenFile,
  onContinueProject,
  onDeleteProjects,
  onDriveOpen,
  onDriveListRequest,
}: SplashScreenProps) {
  const { t, lang, setLang } = useI18n();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(recentProjects.map(p => p.id)));
  }, [recentProjects]);

  const handleDeleteSelected = useCallback(() => {
    if (selected.size === 0) return;
    selected.forEach(id => onDeleteProjects(id));
    setSelected(new Set());
    setSelectMode(false);
  }, [selected, onDeleteProjects]);
  const [dragOver, setDragOver] = useState(false);
  const [showDriveFiles, setShowDriveFiles] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);

  // ─── Anime.js 進場動畫 ────────────────────────────────────────
  useEffect(() => {
    if (titleRef.current) {
      anime({
        targets: titleRef.current,
        opacity: [0, 1],
        translateY: [-30, 0],
        duration: 800,
        easing: 'easeOutCubic',
      });
    }
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('[data-splash-card]');
      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [40, 0],
        scale: [0.95, 1],
        delay: anime.stagger(120, { start: 300 }),
        duration: 600,
        easing: 'easeOutCubic',
      });
    }
    if (recentRef.current) {
      anime({
        targets: recentRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 600,
        delay: 700,
        easing: 'easeOutCubic',
      });
    }
  }, []);

  // ─── 拖拉處理 ─────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.json')) {
      alert(t('splash.invalidFile'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text); // 驗證 JSON 格式
        onOpenFile(text, file.name.replace(/\.json$/, ''));
      } catch {
        alert(t('splash.invalidFile'));
      }
    };
    reader.readAsText(file);
  }, [t, onOpenFile]);

  // ─── 檔案選擇 ─────────────────────────────────────────────────
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text);
        onOpenFile(text, file.name.replace(/\.json$/, ''));
      } catch {
        alert(t('splash.invalidFile'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [t, onOpenFile]);

  // ─── Drive 列表切換 ───────────────────────────────────────────
  const handleToggleDrive = async () => {
    if (showDriveFiles) { setShowDriveFiles(false); return; }
    await onDriveListRequest();
    setShowDriveFiles(true);
  };

  // 排序：最近編輯優先
  const sorted = [...recentProjects].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#1C1C1C',
        position: 'relative',
      }}
    >
      {/* 全螢幕拖拉 overlay */}
      {dragOver && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(167,139,250,0.08)',
          border: '3px dashed #A78BFA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 18, color: '#A78BFA', letterSpacing: 4 }}>
            {t('splash.dropzoneActive')}
          </div>
        </div>
      )}

      {/* 語言切換 — 右上角 */}
      <div style={{ position: 'absolute', top: 20, right: 24, display: 'flex', gap: 2 }}>
        <button
          onClick={() => setLang('zh-TW')}
          style={{
            fontSize: 9, padding: '3px 8px', borderRadius: '2px 0 0 2px', cursor: 'pointer',
            border: '1px solid #4C4E56', fontFamily: 'inherit', letterSpacing: 0.5,
            background: lang === 'zh-TW' ? '#D9D9D6' : 'transparent',
            color: lang === 'zh-TW' ? '#1C1C1C' : '#818387',
          }}
        >
          {t('lang.zhTW')}
        </button>
        <button
          onClick={() => setLang('en')}
          style={{
            fontSize: 9, padding: '3px 8px', borderRadius: '0 2px 2px 0', cursor: 'pointer',
            border: '1px solid #4C4E56', borderLeft: 'none', fontFamily: 'inherit', letterSpacing: 0.5,
            background: lang === 'en' ? '#D9D9D6' : 'transparent',
            color: lang === 'en' ? '#1C1C1C' : '#818387',
          }}
        >
          {t('lang.en')}
        </button>
      </div>

      {/* 標題 */}
      <div ref={titleRef} style={{ textAlign: 'center', marginBottom: 48, opacity: 0 }}>
        <h1 style={{
          fontSize: 36, fontWeight: 300, color: '#D9D9D6',
          letterSpacing: 12, margin: 0,
        }}>
          {t('splash.title')}
        </h1>
        <p style={{
          fontSize: 10, color: '#63666A', letterSpacing: 3,
          marginTop: 8,
        }}>
          {t('splash.subtitle')}
        </p>
      </div>

      {/* 動作卡片 */}
      <div ref={cardsRef} style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 700 }}>

        {/* 新建專案 */}
        <div
          data-splash-card
          onClick={() => onNewProject()}
          style={{
            width: 200, padding: '28px 20px', cursor: 'pointer',
            background: '#111', border: '1px solid #2A1A4A', borderRadius: 3,
            textAlign: 'center', opacity: 0,
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#A78BFA')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A1A4A')}
        >
          <div style={{ fontSize: 28, color: '#A78BFA', marginBottom: 12 }}>+</div>
          <div style={{ fontSize: 13, color: '#D9D9D6', letterSpacing: 1, marginBottom: 6 }}>
            {t('splash.newProject')}
          </div>
          <div style={{ fontSize: 9, color: '#63666A', lineHeight: 1.5 }}>
            {t('splash.newProjectDesc')}
          </div>
        </div>

        {/* 開啟舊檔 */}
        <label
          data-splash-card
          style={{
            width: 200, padding: '28px 20px', cursor: 'pointer',
            background: '#111', border: '1px solid #4C4E56', borderRadius: 3,
            textAlign: 'center', opacity: 0,
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#818387')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#4C4E56')}
        >
          <div style={{ fontSize: 28, color: '#818387', marginBottom: 12 }}>↑</div>
          <div style={{ fontSize: 13, color: '#D9D9D6', letterSpacing: 1, marginBottom: 6 }}>
            {t('splash.openFile')}
          </div>
          <div style={{ fontSize: 9, color: '#63666A', lineHeight: 1.5 }}>
            {t('splash.openFileDesc')}
          </div>
          <input type="file" accept=".json" onChange={handleFileInput} style={{ display: 'none' }} />
        </label>

        {/* Google Drive（僅在可用時顯示） */}
        {drive.isReady && (
          <div
            data-splash-card
            onClick={() => {
              if (!drive.isSignedIn) { drive.signIn(); return; }
              handleToggleDrive();
            }}
            style={{
              width: 200, padding: '28px 20px', cursor: 'pointer',
              background: '#111', border: '1px solid #4C4E56', borderRadius: 3,
              textAlign: 'center', opacity: 0,
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#818387')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#4C4E56')}
          >
            <div style={{ fontSize: 28, color: '#818387', marginBottom: 12 }}>☁</div>
            <div style={{ fontSize: 13, color: '#D9D9D6', letterSpacing: 1, marginBottom: 6 }}>
              {drive.isSignedIn ? t('splash.driveOpen') : t('drive.signIn')}
            </div>
            {drive.isSignedIn && drive.user && (
              <div style={{ fontSize: 9, color: '#63666A' }}>{drive.user.email}</div>
            )}
          </div>
        )}
      </div>

      {/* 拖拉提示 */}
      <div style={{
        marginTop: 28, fontSize: 9, color: '#4C4E56', letterSpacing: 2,
        textAlign: 'center',
      }}>
        {t('splash.dropzone')}
      </div>

      {/* Google Drive 檔案列表 */}
      {showDriveFiles && drive.isSignedIn && (
        <div style={{
          marginTop: 20, padding: '12px 16px', background: '#111',
          border: '1px solid #2A1A4A', borderRadius: 2, width: '100%', maxWidth: 500,
        }}>
          <div style={{ fontSize: 10, color: '#A78BFA', letterSpacing: 1, marginBottom: 8 }}>
            {t('drive.fileList')}
          </div>
          {drive.loading ? (
            <div style={{ fontSize: 9, color: '#555' }}>{t('drive.loading')}</div>
          ) : drive.driveFiles.length === 0 ? (
            <div style={{ fontSize: 9, color: '#555' }}>{t('drive.noFiles')}</div>
          ) : (
            drive.driveFiles.map(f => (
              <div key={f.fileId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid #222',
              }}>
                <button
                  onClick={() => onDriveOpen(f.fileId, f.name)}
                  style={{
                    fontSize: 10, color: '#D9D9D6', background: 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  {f.name}
                </button>
                <span style={{ fontSize: 8, color: '#555', flexShrink: 0, marginLeft: 12 }}>
                  {new Date(f.modifiedTime).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 最近專案列表 */}
      {sorted.length > 0 && (
        <div ref={recentRef} style={{
          marginTop: 36, width: '100%', maxWidth: 500, opacity: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <span style={{ fontSize: 10, color: '#63666A', letterSpacing: 2, textTransform: 'uppercase' }}>
              {t('splash.recentProjects')}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {selectMode && (
                <>
                  <button
                    onClick={selectAll}
                    style={{ fontSize: 8, color: '#818387', background: 'none', border: '1px solid #333', borderRadius: 2, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {t('splash.selectAll')}
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    style={{ fontSize: 8, color: selected.size > 0 ? '#FDDA25' : '#555', background: 'none', border: `1px solid ${selected.size > 0 ? '#FDDA25' : '#333'}`, borderRadius: 2, padding: '2px 8px', cursor: selected.size > 0 ? 'pointer' : 'default', fontFamily: 'inherit' }}
                  >
                    {t('splash.deleteSelected', { count: String(selected.size) })}
                  </button>
                </>
              )}
              <button
                onClick={() => { setSelectMode(s => !s); setSelected(new Set()); }}
                style={{ fontSize: 8, color: selectMode ? '#A78BFA' : '#63666A', background: 'none', border: `1px solid ${selectMode ? '#A78BFA' : '#333'}`, borderRadius: 2, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {selectMode ? t('splash.cancelSelect') : t('splash.manageProjects')}
              </button>
            </div>
          </div>
          {sorted.map(p => {
            const isSelected = selected.has(p.id);
            return (
              <div
                key={p.id}
                onClick={() => selectMode ? toggleSelect(p.id) : onContinueProject(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', marginBottom: 4, cursor: 'pointer',
                  background: isSelected ? '#1a1020' : '#111',
                  border: `1px solid ${isSelected ? '#A78BFA' : '#222'}`,
                  borderRadius: 2, transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => { if (!selectMode) e.currentTarget.style.borderColor = '#4C4E56'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#222'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectMode && (
                    <div style={{
                      width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                      border: `1px solid ${isSelected ? '#A78BFA' : '#4C4E56'}`,
                      background: isSelected ? '#A78BFA' : 'transparent',
                    }} />
                  )}
                  <div>
                    <div style={{ fontSize: 12, color: '#D9D9D6' }}>{p.name}</div>
                    <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>
                      {t('splash.lastEdited')} {new Date(p.updatedAt).toLocaleDateString()} {new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                {!selectMode && (
                  <div style={{
                    fontSize: 9, color: '#818387', padding: '3px 10px',
                    border: '1px solid #333', borderRadius: 2,
                  }}>
                    {t('splash.continueProject')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Drive 錯誤 */}
      {drive.error && (
        <div style={{ fontSize: 8, color: '#707372', marginTop: 12 }}>
          {t('drive.error', { msg: drive.error })}
        </div>
      )}
    </div>
  );
}
