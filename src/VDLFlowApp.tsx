// ◎ VDL-FLOW React 主編排元件
// 拆分自原始 1238 行單體元件，保留核心流程邏輯

import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { usePersistentFlow } from './hooks/usePersistentFlow';
import { useProjectManager } from './hooks/useProjectManager';
import { useGenHistory } from './hooks/useGenHistory';
import { node05ToNode06Prefill, palette02ToPhotometric } from './bridge/ndfToVdl';
import { createSceneTimeline, stitchScenes, type SceneConfig, type StitchResult } from './engine/vdlTimeline';
const StoryboardWall = lazy(() => import('./components/StoryboardWall').then(m => ({ default: m.StoryboardWall })));
const ScriptPanel    = lazy(() => import('./components/ScriptPanel').then(m => ({ default: m.ScriptPanel })));
import { EnvWarning } from './components/EnvWarning';
import { getNodeDefs, NODE_DEFS as STATIC_NODE_DEFS } from './constants/nodeDefs';
import { styles } from './styles/theme';
import { anime } from './hooks/useAnime';
import { useI18n } from './i18n/context';
import { useGoogleDrive } from './hooks/useGoogleDrive';
import { SplashScreen } from './components/SplashScreen';
import { FlowCanvas } from './components/flow/FlowCanvas';
import { EditorPanel } from './components/flow/EditorPanel';
import { PreflightCard } from './components/flow/PreflightCard';
import { ConfirmModal, useConfirmModal } from './components/ConfirmModal';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { LoadingSpinner } from './components/LoadingSpinner';
import type { NodeDef } from './types/vdl';
import type { NodeTemplate } from './types/filmDNA';
import { assembleExportPayload } from './types/exportPayload';
import { assemblePreflightPrompt } from './utils/assemblePreflightPrompt';
import { FilmTemplateGallery } from './components/FilmTemplateGallery';
import type { FilmTemplate } from './constants/filmTemplates';

const SPLASH_SESSION_KEY = 'vdl-flow-splash-dismissed';

export default function VDLFlowApp() {
  const { t, lang, setLang } = useI18n();
  const NODE_DEFS = getNodeDefs(t);
  const {
    activeIndex, completedNodes, locks, nodeValues, allPrompts, sceneHistory, shotHistory,
    setActiveIndex, addCompletedNode, writeLocks, setNodeValues, setPrompt,
    addSceneToHistory, addQARecord, resetShot, resetFlow,
    removeLock, undoComplete, savedPalettes, savePalette, deletePalette,
    flowMode, setFlowMode,
    externalTools, setExternalTools,
  } = usePersistentFlow();

  const [copiedAll, setCopiedAll] = useState(false);
  const { projects, activeId, switchProject, createProject, deleteProject, renameProject, saveCurrentProject } = useProjectManager();
  const { history: genHistory } = useGenHistory();
  const drive = useGoogleDrive();
  const [driveSaveStatus, setDriveSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showDriveList, setShowDriveList] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem(SPLASH_SESSION_KEY));
  const lastSceneConfigRef = useRef<SceneConfig | null>(null);
  const [stitchReport, setStitchReport] = useState<StitchResult | null>(null);
  const [filmReport, setFilmReport] = useState<{ valid: boolean; snapshotCount: number; gaps: StitchResult['gaps'] } | null>(null);
  const [qaRetryCount, setQaRetryCount] = useState(0);
  const [qaHumanReview, setQaHumanReview] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [preflightCardId, setPreflightCardId] = useState<'preflight_img' | 'preflight_vid' | null>(null);
  const panToNodeRef = useRef<((nodeId: string) => void) | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const copiedAllRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const modal = useConfirmModal();
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [templateAppliedMsg, setTemplateAppliedMsg] = useState<string | null>(null);

  const allDone = completedNodes.size === NODE_DEFS.length;

  // ─── P0 模板：reload 後接手套用 ─────────────────────────────────
  useEffect(() => {
    const pending = sessionStorage.getItem('vdl-pending-template');
    if (!pending) return;
    sessionStorage.removeItem('vdl-pending-template');
    try {
      const nodes = JSON.parse(pending) as Record<string, Record<string, string>>;
      Object.entries(nodes).forEach(([nodeId, values]) => {
        setNodeValues(nodeId, values);
      });
      setTemplateAppliedMsg(t('template.gallery.applied'));
      setTimeout(() => setTemplateAppliedMsg(null), 3000);
    } catch { /* silent */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 鍵盤快捷鍵 ─────────────────────────────────────────────────
  useEffect(() => {
    if (showSplash) return;
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S → 儲存專案
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentProject();
        setLastSavedAt(Date.now());
      }
      // ESC → 關閉 Gallery / preflight / 編輯面板
      if (e.key === 'Escape') {
        if (showTemplateGallery) setShowTemplateGallery(false);
        else if (preflightCardId) setPreflightCardId(null);
        else if (selectedNodeId) setSelectedNodeId(null);
      }
      // 方向鍵 → 導航節點（僅在無 input focus 時）
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(activeIndex + 1, NODE_DEFS.length - 1);
        setSelectedNodeId(NODE_DEFS[next]?.id ?? null);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(activeIndex - 1, 0);
        setSelectedNodeId(NODE_DEFS[prev]?.id ?? null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSplash, selectedNodeId, activeIndex, saveCurrentProject, NODE_DEFS, showTemplateGallery]);

  // ─── 自動儲存提示（每 60 秒） ─────────────────────────────────
  useEffect(() => {
    if (showSplash) return;
    const timer = setInterval(() => {
      saveCurrentProject();
      setLastSavedAt(Date.now());
    }, 60_000);
    return () => clearInterval(timer);
  }, [showSplash, saveCurrentProject]);

  // ─── Anime.js: Header 進場動畫 ─────────────────────────────────
  useEffect(() => {
    if (showSplash) return;          // Splash 階段 header 不存在，跳過
    if (!headerRef.current) return;
    anime({
      targets: headerRef.current,
      opacity: [0, 1],
      translateY: [-18, 0],
      duration: 700,
      easing: 'easeOutCubic',
    });
  }, [showSplash]);

  // ─── Anime.js: 進度條 dot stagger 動畫 ────────────────────────
  useEffect(() => {
    if (showSplash) return;
    if (!progressBarRef.current) return;
    const dots = progressBarRef.current.querySelectorAll('[data-dot]');
    if (dots.length === 0) return;
    anime({
      targets: dots,
      scale: [0, 1],
      opacity: [0, 1],
      delay: anime.stagger(60),
      duration: 400,
      easing: 'easeOutBack',
    });
  }, [showSplash]);

  // ─── Anime.js: 節點完成時脈衝進度 dot ────────────────────────
  useEffect(() => {
    if (!progressBarRef.current) return;
    const dots = progressBarRef.current.querySelectorAll('[data-dot]');
    completedNodes.forEach(id => {
      const idx = STATIC_NODE_DEFS.findIndex(n => n.id === id);
      if (idx >= 0 && dots[idx]) {
        anime({
          targets: dots[idx],
          scale: [1, 1.4, 1],
          duration: 500,
          easing: 'easeInOutSine',
        });
      }
    });
  }, [completedNodes]);

  // ─── Anime.js: Footer 進場 ──────────────────────────────────
  useEffect(() => {
    if (!allDone || !footerRef.current) return;
    anime({
      targets: footerRef.current,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      easing: 'easeOutQuart',
    });
  }, [allDone]);

  // C2: filmReport auto-export 已移除 — NODE 14 auto-export 為唯一出口

  // ─── 匯出 / 匯入 ─────────────────────────────────────────────

  const handleExport = async () => {
    const summary = `${completedNodes.size}/${NODE_DEFS.length} nodes, ${sceneHistory.length} scenes, ${shotHistory.length} shots`;
    const ok = await modal.confirm({
      title: t('toolbar.exportTitle') ?? 'Export Project',
      message: (t('toolbar.exportDesc') ?? 'Export includes:') + '\n' + summary,
      confirmLabel: t('toolbar.exportJSON'),
    });
    if (!ok) return;
    const imgPf = assemblePreflightPrompt('image', nodeValues, locks, allPrompts);
    const vidPf = assemblePreflightPrompt('video', nodeValues, locks, allPrompts);
    const payload = assembleExportPayload(
      nodeValues, locks, allPrompts, sceneHistory, shotHistory,
      externalTools, { image: imgPf.assembled, video: vidPf.assembled },
    );
    const projName = projects.find(p => p.id === activeId)?.name ?? 'vdl';
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `VDL_${projName}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        localStorage.setItem('vdl-flow-state', JSON.stringify(parsed));
        window.location.reload();
      } catch {
        modal.confirm({ title: t('toolbar.invalidFile'), message: t('toolbar.invalidFileDesc') ?? 'The selected file is not a valid VDL-FLOW JSON export.', confirmLabel: 'OK' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ─── 存檔到本機檔案 ────────────────────────────────────────────

  const handleSaveFile = () => {
    saveCurrentProject();
    const projName = projects.find(p => p.id === activeId)?.name ?? 'vdl-project';
    const raw = localStorage.getItem('vdl-flow-state') ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vdl-save-${projName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── 從本機檔案開啟（建立新專案） ─────────────────────────────

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const name = file.name.replace(/\.json$/, '');
        // 建立新專案並載入資料
        const newId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        localStorage.setItem(`vdl-project-${newId}`, JSON.stringify(parsed));
        localStorage.setItem('vdl-flow-state', JSON.stringify(parsed));
        // 更新專案索引
        const idx = JSON.parse(localStorage.getItem('vdl-project-index') ?? '[]');
        idx.push({ id: newId, name, createdAt: Date.now(), updatedAt: Date.now() });
        localStorage.setItem('vdl-project-index', JSON.stringify(idx));
        localStorage.setItem('vdl-active-project', newId);
        window.location.reload();
      } catch {
        modal.confirm({ title: t('project.openFileInvalid'), confirmLabel: 'OK' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ─── Google Drive 存檔 ────────────────────────────────────────

  const handleDriveSave = async () => {
    if (!drive.isSignedIn) return;
    setDriveSaveStatus('saving');
    saveCurrentProject();
    const projName = projects.find(p => p.id === activeId)?.name ?? 'vdl-project';
    const raw = localStorage.getItem('vdl-flow-state') ?? '{}';
    // 檢查是否已有同名檔案，有的話覆蓋更新
    const existing = drive.driveFiles.find(f => f.name === projName);
    await drive.saveToDrive(projName, raw, existing?.fileId);
    setDriveSaveStatus('saved');
    setTimeout(() => setDriveSaveStatus('idle'), 3000);
  };

  // ─── Google Drive 開啟 ────────────────────────────────────────

  const handleDriveOpen = async (fileId: string, fileName: string) => {
    const ok = await modal.confirm({ title: t('drive.loadConfirm', { name: fileName }), message: t('drive.loadDesc') ?? 'Current unsaved changes will be lost.', confirmLabel: t('drive.open') });
    if (!ok) return;
    const content = await drive.loadFromDrive(fileId);
    if (!content) return;
    try {
      const parsed = JSON.parse(content);
      const newId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem(`vdl-project-${newId}`, JSON.stringify(parsed));
      localStorage.setItem('vdl-flow-state', JSON.stringify(parsed));
      const idx = JSON.parse(localStorage.getItem('vdl-project-index') ?? '[]');
      idx.push({ id: newId, name: fileName, createdAt: Date.now(), updatedAt: Date.now() });
      localStorage.setItem('vdl-project-index', JSON.stringify(idx));
      localStorage.setItem('vdl-active-project', newId);
      window.location.reload();
    } catch {
      modal.confirm({ title: t('project.openFileInvalid'), confirmLabel: 'OK' });
    }
  };

  const handleShowDriveList = async () => {
    if (showDriveList) { setShowDriveList(false); return; }
    await drive.listProjects();
    setShowDriveList(true);
  };

  // ─── Splash 啟動畫面回呼 ──────────────────────────────────────

  const dismissSplash = useCallback(() => {
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    setShowSplash(false);
  }, []);

  const handleSplashNewProject = useCallback((name?: string) => {
    createProject(name ?? t('project.defaultName'));
  }, [createProject, t]);

  const handleSplashOpenFile = useCallback((data: string, fileName: string) => {
    try {
      const parsed = JSON.parse(data);
      const newId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem(`vdl-project-${newId}`, JSON.stringify(parsed));
      localStorage.setItem('vdl-flow-state', JSON.stringify(parsed));
      const idx = JSON.parse(localStorage.getItem('vdl-project-index') ?? '[]');
      idx.push({ id: newId, name: fileName, createdAt: Date.now(), updatedAt: Date.now() });
      localStorage.setItem('vdl-project-index', JSON.stringify(idx));
      localStorage.setItem('vdl-active-project', newId);
      window.location.reload();
    } catch {
      modal.confirm({ title: t('splash.invalidFile'), confirmLabel: 'OK' });
    }
  }, [t, modal]);

  const handleSplashContinue = useCallback((projectId: string) => {
    if (projectId === activeId) {
      dismissSplash();
    } else {
      saveCurrentProject();
      switchProject(projectId);
    }
  }, [activeId, dismissSplash, saveCurrentProject, switchProject]);

  const handleSplashDriveOpen = useCallback(async (fileId: string, fileName: string) => {
    const content = await drive.loadFromDrive(fileId);
    if (!content) return;
    handleSplashOpenFile(content, fileName);
  }, [drive, handleSplashOpenFile]);

  const handleSplashDriveList = useCallback(async () => {
    await drive.listProjects();
  }, [drive]);

  // ─── P0 電影模板套用 ─────────────────────────────────────────────
  const handleApplyFilmTemplate = useCallback((tmpl: FilmTemplate) => {
    if (showSplash) {
      // createProject() 會 removeItem + reload，模板值必須透過 sessionStorage 傳遞
      sessionStorage.setItem('vdl-pending-template', JSON.stringify(tmpl.nodes));
      createProject(t(tmpl.nameKey));
      // reload 後由下方 useEffect 接手套用
    } else {
      // 工具列模式：直接寫入 React state
      Object.entries(tmpl.nodes).forEach(([nodeId, values]) => {
        setNodeValues(nodeId, values);
      });
      setShowTemplateGallery(false);
      setTemplateAppliedMsg(t('template.gallery.applied'));
      setTimeout(() => setTemplateAppliedMsg(null), 3000);
    }
  }, [setNodeValues, t, showSplash, createProject]);

  // ─── 模板管理（跨節點存取，與 useTemplateVault 共享 localStorage 格式）──

  const getTemplatesForNode = useCallback((nodeId: string): NodeTemplate[] => {
    try {
      const raw = localStorage.getItem(`vdl-templates-${nodeId}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const handleSaveTemplate = useCallback((template: Omit<NodeTemplate, 'id' | 'createdAt'>): NodeTemplate => {
    const newTpl: NodeTemplate = {
      ...template,
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    try {
      const existing = getTemplatesForNode(template.nodeId);
      const next = [newTpl, ...existing].slice(0, 20);
      localStorage.setItem(`vdl-templates-${template.nodeId}`, JSON.stringify(next));
    } catch (e) { console.warn('[VDL] saveTemplate quota:', e); }
    return newTpl;
  }, [getTemplatesForNode]);

  const handleRemoveTemplate = useCallback((templateId: string) => {
    // 需要遍歷所有節點的模板來找到並刪除
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('vdl-templates-')) {
        try {
          const templates: NodeTemplate[] = JSON.parse(localStorage.getItem(key) ?? '[]');
          const filtered = templates.filter(t => t.id !== templateId);
          if (filtered.length < templates.length) {
            localStorage.setItem(key, JSON.stringify(filtered));
            break;
          }
        } catch { /* ignore */ }
      }
    }
  }, []);

  // ─── 節點完成處理（必須在條件式 return 之前，遵守 Rules of Hooks）───

  const handleNodeComplete = useCallback((nodeDef: NodeDef, values: Record<string, string | number>) => {
    // C3: 前置節點驗證 — 確保前序節點已完成
    const nodeIdx = NODE_DEFS.findIndex(n => n.id === nodeDef.id);
    if (nodeIdx < 0) { console.warn('[VDL] handleNodeComplete: unknown node', nodeDef.id); return; }
    if (nodeIdx > 0) {
      const prevNode = NODE_DEFS[nodeIdx - 1];
      if (prevNode && !completedNodes.has(prevNode.id)) {
        console.warn('[VDL] handleNodeComplete: prerequisite not met', prevNode.id);
        return;
      }
    }

    const incoming: Record<string, { value: string | number; source: string }> = {};
    (nodeDef.locks || []).forEach(key => {
      if (values[key] !== undefined && values[key] !== '') {
        incoming[key] = { value: values[key], source: nodeDef.id };
      }
    });

    // NODE 02 → 從 dominant_palette 推算 NODE 06 光度學預填值
    if (nodeDef.id === 'node_02') {
      const palette = String(values.dominant_palette ?? '');
      if (palette) {
        const photometric = palette02ToPhotometric(
          palette,
          Number(values.kelvin_min) || 2800,
          Number(values.kelvin_max) || 7500
        );
        setNodeValues('node_06', photometric as Record<string, string | number>);
        setNodeValues('node_12', { target_palette: palette });
      }
    }

    // NODE 05 → 自動預填 NODE 06 光度學參數
    if (nodeDef.id === 'node_05') {
      const prefill = node05ToNode06Prefill(
        Number(values.T_end), Number(values.E_end),
        Number(values.I_end), Number(values.C_end)
      );
      setNodeValues('node_06', prefill);
    }

    // NODE 06 → createSceneTimeline → prefill NODE 07
    if (nodeDef.id === 'node_06') {
      try {
        const n05 = nodeValues['node_05'] ?? {};
        const sceneConfig: SceneConfig = {
          id: 'scene_auto',
          duration: Number(n05.duration ?? 10),
          ndf: {
            tensionStart:        Number(n05.T_start ?? 0.3),
            tensionEnd:          Number(n05.T_end   ?? 0.5),
            emotionStart:        Number(n05.E_start ?? 0.2),
            emotionEnd:          Number(n05.E_end   ?? 0.6),
            informationStart:    Number(n05.I_start ?? 0.1),
            informationEnd:      Number(n05.I_end   ?? 0.4),
            characterFocusStart: Number(n05.C_start ?? 0.4),
            characterFocusEnd:   Number(n05.C_end   ?? 0.7),
            easing: 'easeInOutQuad',
          },
          photometric: {
            kelvinStart:     3200,
            kelvinEnd:       Number(values.kelvin     ?? 5500),
            evStart:         -0.5,
            evEnd:           Number(values.ev         ?? 0),
            contrastStart:   0.5,
            contrastEnd:     Number(values.contrast   ?? 0.65),
            saturationStart: 0.5,
            saturationEnd:   Number(values.saturation ?? 0.7),
          },
          camera: {
            focalLengthEnd: 50,
            dollyZEnd:      0,
            panXEnd:        0,
            tiltYEnd:       0,
          },
        };
        lastSceneConfigRef.current = sceneConfig;
        addSceneToHistory(sceneConfig);
        const snapshots = createSceneTimeline(sceneConfig, 1);
        if (snapshots.length > 0) {
          const snap = snapshots[0];
          setNodeValues('node_07', {
            shot_type:  snap.prompt_camera.split(',')[0]?.trim() ?? '',
            focal_mm:   sceneConfig.camera.focalLengthEnd,
            aperture:   sceneConfig.photometric.evStart < -0.5 ? 1.4 : 2.8,
            movement:   snap.prompt_camera,
            subject_pos:'rule-of-thirds-left',
            char_action: snap.prompt_mood,
          });
        }
      } catch (e) { console.warn('[VDL] node_06 timeline failed:', e); }
    }

    // NODE 07 → stitchScenes 跨場景 A2 連續性驗證
    const historyForStitch = sceneHistory.length > 0
      ? sceneHistory
      : (lastSceneConfigRef.current ? [lastSceneConfigRef.current] : []);
    if (nodeDef.id === 'node_07' && historyForStitch.length > 0) {
      try {
        const n05 = nodeValues['node_05'] ?? {};
        const n06 = nodeValues['node_06'] ?? {};
        const sceneCurr: SceneConfig = {
          id: `scene_${historyForStitch.length + 1}`,
          duration: Number(n05.duration ?? 10),
          ndf: {
            tensionStart:        Number(n05.T_start ?? 0.3),
            tensionEnd:          Number(n05.T_end   ?? 0.5),
            emotionStart:        Number(n05.E_start ?? 0.2),
            emotionEnd:          Number(n05.E_end   ?? 0.6),
            informationStart:    Number(n05.I_start ?? 0.1),
            informationEnd:      Number(n05.I_end   ?? 0.4),
            characterFocusStart: Number(n05.C_start ?? 0.4),
            characterFocusEnd:   Number(n05.C_end   ?? 0.7),
          },
          photometric: {
            kelvinStart:     Number(n06.kelvin     ?? 3200),
            kelvinEnd:       Number(n06.kelvin     ?? 5500),
            evStart:         Number(n06.ev         ?? -0.5),
            evEnd:           Number(n06.ev         ?? 0),
            contrastStart:   Number(n06.contrast   ?? 0.5),
            contrastEnd:     Number(n06.contrast   ?? 0.65),
            saturationStart: Number(n06.saturation ?? 0.5),
            saturationEnd:   Number(n06.saturation ?? 0.7),
          },
          camera: { focalLengthEnd: 50, dollyZEnd: 0, panXEnd: 0, tiltYEnd: 0 },
        };
        const result = stitchScenes([...historyForStitch, sceneCurr]);
        setStitchReport(result);
      } catch (e) { console.warn('[VDL] node_07 stitch failed:', e); }
    }

    // NODE 12 → QA 驗證 + 全片報告
    const lastConfig = sceneHistory.length > 0
      ? sceneHistory[sceneHistory.length - 1]
      : lastSceneConfigRef.current;
    if (nodeDef.id === 'node_12' && lastConfig) {
      try {
        const dkRaw = Number(values.delta_kelvin  ?? 0);
        const deRaw = Number(values.delta_e_color ?? 0);
        const csRaw = Number(values.clip_sim      ?? 0);
        const orRaw = Number(values.obj_recall    ?? 0);
        const dcRaw = Number(values.depth_corr    ?? 0);
        const ndRaw = Number(values.ndf_delta     ?? 0);
        const scores = [
          Math.min(1, Math.max(0, 1 - dkRaw / 1600)),
          Math.min(1, Math.max(0, 1 - deRaw / 6.0)),
          Math.min(1, Math.max(0, csRaw)),
          Math.min(1, Math.max(0, orRaw)),
          Math.min(1, Math.max(0, dcRaw)),
          Math.min(1, Math.max(0, 1 - ndRaw / 0.20)),
        ];
        const BASE_THRESH = [0.5, 0.5, 0.85, 0.80, 0.75, 0.5];
        const DECAY_RATE  = 0.13;
        const decayFactor = Math.max(0.5, 1 - qaRetryCount * DECAY_RATE);
        const THRESH      = BASE_THRESH.map(th => th * decayFactor);
        const qaPass      = scores.every((s, i) => s >= THRESH[i]);
        if (qaPass) {
          setQaRetryCount(0);
          setQaHumanReview(false);
          addQARecord(scores);
          const snapshots  = createSceneTimeline(lastConfig, 1);
          const allScenes  = sceneHistory.length > 0 ? sceneHistory : [lastConfig];
          const filmResult = stitchScenes(allScenes);
          setFilmReport({ valid: filmResult.valid, snapshotCount: snapshots.length, gaps: filmResult.gaps });
        } else {
          const nextRetry = qaRetryCount + 1;
          setQaRetryCount(nextRetry);        // 永遠遞增，確保 decay 累積
          if (nextRetry >= 3) {              // M1: ≥3 觸發人工審核，decay 持續遞減至硬底 0.5
            setQaHumanReview(true);
          }
        }
      } catch (e) { console.warn('[VDL] node_12 QA report failed:', e); }
    }

    // NODE 09 → 全局風格鎖定
    if (nodeDef.id === 'node_09') {
      const styleKeys = ['global_style', 'global_negative', 'lut_desc'];
      styleKeys.forEach(key => {
        if (values[key] !== undefined && values[key] !== '') {
          incoming[key] = { value: values[key], source: 'node_09' };
        }
      });
    }

    // NODE 14 → exportPayload 組裝 + 自動下載
    if (nodeDef.id === 'node_14') {
      try {
        const imgPf2 = assemblePreflightPrompt('image', nodeValues, locks, allPrompts);
        const vidPf2 = assemblePreflightPrompt('video', nodeValues, locks, allPrompts);
        const payload = assembleExportPayload(
          nodeValues, locks, allPrompts, sceneHistory, shotHistory,
          externalTools, { image: imgPf2.assembled, video: vidPf2.assembled },
        );
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `vdl-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) { console.warn('[VDL] node_14 export failed:', e); }
    }

    writeLocks(incoming);
    setNodeValues(nodeDef.id, values);
    setPrompt(nodeDef.id, nodeDef.promptTemplate(values, locks));
    addCompletedNode(nodeDef.id);
    // M4: findIndex -1 guard
    const curIdx = NODE_DEFS.findIndex(n => n.id === nodeDef.id);
    const nextIdx = curIdx >= 0 ? Math.min(curIdx + 1, NODE_DEFS.length - 1) : NODE_DEFS.length - 1;
    setActiveIndex(nextIdx);
    // 自動跳到下一個 ACTIVE 節點
    setSelectedNodeId(NODE_DEFS[nextIdx]?.id ?? null);
  }, [writeLocks, addCompletedNode, setActiveIndex, setNodeValues, setPrompt, nodeValues, locks, allPrompts, sceneHistory, shotHistory, addSceneToHistory, addQARecord, setStitchReport, setFilmReport, qaRetryCount, completedNodes]);

  const handleCopyAll = () => {
    const assembled = NODE_DEFS
      .filter(n => allPrompts[n.id])
      .map(n => `${'═'.repeat(60)}\n${n.title}\n${'─'.repeat(60)}\n${allPrompts[n.id]}`)
      .join('\n\n');
    navigator.clipboard.writeText(assembled).then(() => {
      setCopiedAll(true);
      if (copiedAllRef.current) {
        anime({
          targets: copiedAllRef.current,
          scale: [1, 1.05, 1],
          duration: 400,
          easing: 'easeInOutQuad',
          complete: () => {
            anime({
              targets: copiedAllRef.current,
              opacity: [1, 0.6, 1],
              duration: 2600,
              easing: 'easeInOutSine',
              complete: () => setCopiedAll(false),
            });
          },
        });
      } else {
        setTimeout(() => setCopiedAll(false), 3000);
      }
    });
  };

  // ─── Splash 渲染（所有 hooks 已定義完畢，條件式 return 安全）──

  if (showSplash) {
    if (showTemplateGallery) {
      return (
        <FilmTemplateGallery
          fullPage
          onSelect={handleApplyFilmTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      );
    }
    return (
      <SplashScreen
        recentProjects={projects}
        drive={drive}
        onNewProject={handleSplashNewProject}
        onOpenFile={handleSplashOpenFile}
        onContinueProject={handleSplashContinue}
        onDeleteProjects={deleteProject}
        onDriveOpen={handleSplashDriveOpen}
        onDriveListRequest={handleSplashDriveList}
        onOpenTemplateGallery={() => setShowTemplateGallery(true)}
      />
    );
  }

  // ─── 渲染 ─────────────────────────────────────────────────────

  return (
    <div style={styles.app}>
      <OnboardingOverlay />
      {/* P0 電影模板 Gallery overlay */}
      {showTemplateGallery && (
        <FilmTemplateGallery
          onSelect={handleApplyFilmTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}
      {/* 模板套用成功 toast */}
      {templateAppliedMsg && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          background: '#101820', border: '1px solid #A78BFA', borderRadius: 4,
          padding: '8px 20px', color: '#DFCEEA', fontSize: 11,
          fontFamily: "'Inter', 'Noto Sans TC', sans-serif", letterSpacing: 1,
        }}>
          {templateAppliedMsg}
        </div>
      )}
      {modal.config && (
        <ConfirmModal
          open={!!modal.config}
          {...modal.config}
          onConfirm={modal.handleConfirm}
          onCancel={modal.handleCancel}
        />
      )}
      {/* ─── Header ─── */}
      <header ref={headerRef} style={{ ...styles.header, opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={styles.appTitle}>{t('app.title')}</h1>
            <p style={styles.appSub}>{t('app.subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
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
        </div>
        <div ref={progressBarRef} style={styles.progressBar}>
          {NODE_DEFS.map((n, i) => {
            const done = completedNodes.has(n.id);
            const active = i === activeIndex;
            // 在 NODE 11 (step 11) 後插入 preflight_img 圓點
            // 在 NODE 12 (step 12) 後插入 preflight_vid 圓點
            const pfId = n.step === 11 ? 'preflight_img' : n.step === 12 ? 'preflight_vid' : null;
            return (
              <React.Fragment key={n.id}>
                <div
                  data-dot
                  title={`${String(n.step).padStart(2, '0')} ${n.title}`}
                  onClick={() => setSelectedNodeId(n.id)}
                  style={{
                    ...styles.progressDot,
                    background: done ? '#DFCEEA' : active ? '#A78BFA' : '#333',
                    color: done ? '#1C1C1C' : active ? '#1C1C1C' : '#63666A',
                    border: active ? '1px solid #A78BFA' : '1px solid transparent',
                  }}
                >
                  {n.step}
                </div>
                {pfId && (
                  <div
                    title={pfId === 'preflight_img' ? t('preflight.img.title') : t('preflight.vid.title')}
                    onClick={() => {
                      setPreflightCardId(pfId as 'preflight_img' | 'preflight_vid');
                      setSelectedNodeId(null);
                      panToNodeRef.current?.(pfId);
                    }}
                    style={{
                      width: 12, height: 12, borderRadius: '50%',
                      cursor: 'pointer', flexShrink: 0,
                      background: done ? '#DFCEEA' : '#4C4E56',
                      border: preflightCardId === pfId ? '1px solid #DFCEEA' : '1px solid transparent',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <p style={styles.progressText}>{t('app.nodesCompleted', { done: String(completedNodes.size), total: String(NODE_DEFS.length) })}</p>
          {lastSavedAt && (
            <span style={{ fontSize: 9, color: '#555' }}>
              {t('app.lastSaved') ?? 'Saved'} {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* 多專案管理列 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, color: '#555' }}>{t('project.label')}</span>
          <select
            value={activeId}
            onChange={e => { saveCurrentProject(); switchProject(e.target.value); }}
            style={{ fontSize: 9, background: '#111', color: '#ccc', border: '1px solid #333', padding: '2px 6px', borderRadius: 2, cursor: 'pointer' }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={async () => {
            const result = await modal.confirm({ title: t('project.new'), inputLabel: t('project.namePrompt'), inputDefault: t('project.defaultName'), confirmLabel: t('project.new') });
            if (result && typeof result === 'string') createProject(result);
          }}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #333', color: '#888', cursor: 'pointer', borderRadius: 2, minHeight: 28 }}>{t('project.new')}</button>
          <button onClick={async () => {
            const result = await modal.confirm({ title: t('project.rename'), inputLabel: t('project.renamePrompt'), inputDefault: projects.find(p => p.id === activeId)?.name ?? '', confirmLabel: t('project.rename') });
            if (result && typeof result === 'string') renameProject(activeId, result);
          }}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #333', color: '#888', cursor: 'pointer', borderRadius: 2, minHeight: 28 }}>{t('project.rename')}</button>
          <button onClick={async () => {
            const ok = await modal.confirm({ title: t('project.deleteConfirm'), message: t('project.deleteDesc') ?? 'This will permanently delete this project.', danger: true, confirmLabel: t('project.delete') });
            if (ok) deleteProject(activeId);
          }}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #333', color: '#666', cursor: 'pointer', borderRadius: 2, minHeight: 28 }}>{t('project.delete')}</button>
          <button onClick={saveCurrentProject}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #A78BFA', color: '#D9D9D6', cursor: 'pointer', borderRadius: 2 }}>{t('project.save')}</button>

          {/* 分隔線 */}
          <span style={{ color: '#333', fontSize: 9 }}>│</span>

          {/* 存檔到本機 */}
          <button onClick={handleSaveFile}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #4C4E56', color: '#818387', cursor: 'pointer', borderRadius: 2 }}>{t('project.saveFile')}</button>

          {/* 從本機開啟 */}
          <label style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #4C4E56', color: '#818387', cursor: 'pointer', borderRadius: 2, display: 'inline-block' }}>
            {t('project.openFile')}
            <input type="file" accept=".json" onChange={handleOpenFile} style={{ display: 'none' }} />
          </label>

          {/* 分隔線 */}
          <span style={{ color: '#333', fontSize: 9 }}>│</span>

          {/* Google Drive */}
          {drive.isReady ? (
            drive.isSignedIn ? (
              <>
                <span style={{ fontSize: 9, color: '#818387', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {drive.user?.picture && <img src={drive.user.picture} alt="" style={{ width: 14, height: 14, borderRadius: '50%' }} />}
                  <span style={{ color: '#D9D9D6' }}>{drive.user?.name}</span>
                </span>
                <button
                  onClick={handleDriveSave}
                  disabled={drive.loading}
                  style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #A78BFA', color: driveSaveStatus === 'saved' ? '#A78BFA' : '#D9D9D6', cursor: 'pointer', borderRadius: 2, opacity: drive.loading ? 0.5 : 1 }}
                >
                  {driveSaveStatus === 'saving' ? <><LoadingSpinner size={10} color="#D9D9D6" /> {t('drive.saving')}</> : driveSaveStatus === 'saved' ? t('drive.saved') : t('drive.save')}
                </button>
                <button
                  onClick={handleShowDriveList}
                  disabled={drive.loading}
                  style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #4C4E56', color: '#818387', cursor: 'pointer', borderRadius: 2, opacity: drive.loading ? 0.5 : 1 }}
                >
                  {drive.loading ? t('drive.loading') : t('drive.open')}
                </button>
                <button onClick={drive.signOut}
                  style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #333', color: '#555', cursor: 'pointer', borderRadius: 2 }}>{t('drive.signOut')}</button>
              </>
            ) : (
              <button onClick={drive.signIn}
                style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #A78BFA', color: '#A78BFA', cursor: 'pointer', borderRadius: 2 }}>{t('drive.signIn')}</button>
            )
          ) : null}
        </div>

        {/* Google Drive 錯誤 */}
        {drive.error && (
          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 6, padding: '6px 10px', background: '#1a0808', border: '1px solid #3a1a1a', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{t('drive.errorFriendly') ?? 'Google Drive sync failed.'}</span>
            <button onClick={() => drive.signOut()} style={{ fontSize: 9, color: '#818387', background: 'none', border: '1px solid #333', padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('drive.retry') ?? 'Re-sign in'}
            </button>
            <details style={{ fontSize: 8, color: '#555', width: '100%' }}>
              <summary style={{ cursor: 'pointer' }}>Details</summary>
              <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{drive.error}</pre>
            </details>
          </div>
        )}

        {/* Google Drive 專案列表 */}
        {showDriveList && drive.isSignedIn && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#111', border: '1px solid #2A1A4A', borderRadius: 2 }}>
            <div style={{ fontSize: 9, color: '#A78BFA', letterSpacing: 1, marginBottom: 6 }}>
              {t('drive.fileList')}
            </div>
            {drive.driveFiles.length === 0 ? (
              <div style={{ fontSize: 9, color: '#555' }}>{t('drive.noFiles')}</div>
            ) : (
              drive.driveFiles.map(f => (
                <div key={f.fileId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <button
                    onClick={() => handleDriveOpen(f.fileId, f.name)}
                    style={{ fontSize: 9, color: '#D9D9D6', background: 'transparent', border: '1px solid #4C4E56', padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {f.name}
                  </button>
                  <span style={{ fontSize: 8, color: '#555' }}>
                    {new Date(f.modifiedTime).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 場景歷史列表 */}
        {sceneHistory.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 9, color: '#555', fontFamily: 'inherit' }}>
            <span style={{ color: '#D9D9D6', marginRight: 8 }}>{t('scene.history', { count: String(sceneHistory.length) })}</span>
            {sceneHistory.map((sc, i) => (
              <span key={sc.id} style={{ color: '#6B5A8A', marginRight: 6 }}>
                [{i + 1}] {sc.id} {sc.duration}s K{sc.photometric.kelvinEnd}
              </span>
            ))}
          </div>
        )}
      </header>

      <EnvWarning />

      {/* ─── V7: 隱藏滾軸 + 圓點導航 ─── */}
      <div
        ref={scrollContainerRef}
        className="vdl-scroll-hide"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* 畫布區 — 填滿捲動容器可視高度 */}
        <div
          data-section="canvas"
          style={{
            height: 'calc(100vh - 160px)',
            minHeight: 400,
            position: 'relative',
          }}
        >
          <FlowCanvas
            nodeDefs={NODE_DEFS}
            activeIndex={activeIndex}
            completedNodes={completedNodes}
            nodeValues={nodeValues}
            selectedNodeId={selectedNodeId}
            onNodeSelect={(nodeId) => {
              if (nodeId?.startsWith('preflight_')) {
                setPreflightCardId(nodeId as 'preflight_img' | 'preflight_vid');
                setSelectedNodeId(null);
              } else {
                setSelectedNodeId(nodeId);
                setPreflightCardId(null);
              }
            }}
            isNewProject={completedNodes.size === 0 && activeIndex === 0}
            panToNodeRef={panToNodeRef}
          />

          {/* 畫布內浮動編輯面板（右側 overlay） */}
          {selectedNodeId && (
            <div
              className="vdl-scroll-hide"
              style={{
                position: 'absolute', top: 8, right: 8, bottom: 8,
                width: 440, maxWidth: 'calc(55% - 16px)',
                zIndex: 20,
                background: '#191919ee',
                backdropFilter: 'blur(16px)',
                border: '1px solid #4C4E56',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              <EditorPanel
                selectedNodeId={selectedNodeId}
                nodeDefs={NODE_DEFS}
                activeIndex={activeIndex}
                completedNodes={completedNodes}
                locks={locks}
                nodeValues={nodeValues}
                flowMode={flowMode}
                onFlowModeChange={setFlowMode}
                onClose={() => setSelectedNodeId(null)}
                onComplete={handleNodeComplete}
                onUndoComplete={undoComplete}
                onLockFields={writeLocks}
                onRemoveLock={removeLock}
                savedPalettes={savedPalettes}
                onSavePalette={savePalette}
                onDeletePalette={deletePalette}
                shotHistory={shotHistory}
                getTemplatesForNode={getTemplatesForNode}
                onSaveTemplate={handleSaveTemplate}
                onRemoveTemplate={handleRemoveTemplate}
                onApplyTemplateValues={setNodeValues}
                projectName={projects.find(p => p.id === activeId)?.name ?? 'VDL-FLOW'}
                sceneCount={sceneHistory.length}
                shotCount={shotHistory.length}
              />
            </div>
          )}

          {/* 畫布內浮動 Preflight 卡片（左側 overlay） */}
          {preflightCardId && (
            <PreflightCard
              preflightType={preflightCardId === 'preflight_img' ? 'image' : 'video'}
              nodeValues={nodeValues}
              locks={locks}
              allPrompts={allPrompts}
              externalTools={externalTools}
              onUpdateTools={setExternalTools}
              onClose={() => setPreflightCardId(null)}
            />
          )}

          {/* 畫布內疊加：A2 跨場景報告 */}
          {stitchReport && (
            <div style={{
              position: 'absolute', bottom: 12, left: 12, zIndex: 10, maxWidth: 400,
              background: '#110B20ee', border: `1px solid ${stitchReport.valid ? '#4C4E56' : '#3a1a1a'}`, borderRadius: 6, padding: '10px 14px', fontSize: 9, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: stitchReport.valid ? '#D9D9D6' : '#707372', letterSpacing: 1, marginBottom: 4 }}>
                {stitchReport.valid ? t('report.a2.continuous') : t('report.a2.gaps', { count: String(stitchReport.gaps.length) })}
                {sceneHistory.length > 1 && <span style={{ color: '#888', marginLeft: 8 }}>{t('report.a2.accumulated', { count: String(sceneHistory.length) })}</span>}
              </div>
              {stitchReport.gaps.length > 0 && stitchReport.gaps.map((g, i) => (
                <div key={i} style={{ color: '#f59e0b', marginBottom: 3, lineHeight: 1.6 }}>
                  <span style={{ color: '#D9D9D6' }}>{g.field}</span>
                  {' '}{t('report.gap.between') ?? 'differs between'}{' '}
                  <span style={{ color: '#818387' }}>{g.between[0]}</span> → <span style={{ color: '#818387' }}>{g.between[1]}</span>
                  {' '}({t('report.gap.delta') ?? 'by'} {g.delta.toFixed(2)})
                </div>
              ))}
              {stitchReport.valid && (
                <div style={{ color: '#D9D9D6' }}>{t('report.a2.pass')}</div>
              )}
            </div>
          )}

          {/* 畫布內疊加：全片驗證報告 */}
          {filmReport && (
            <div style={{
              position: 'absolute', bottom: stitchReport ? 100 : 12, left: 12, zIndex: 10, maxWidth: 400,
              background: '#0a1020ee', border: `1px solid ${filmReport.valid ? '#1a2a4a' : '#3a1a1a'}`, borderRadius: 6, padding: '10px 14px', fontSize: 9, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: filmReport.valid ? '#60a5fa' : '#707372', letterSpacing: 1, marginBottom: 4 }}>
                {filmReport.valid ? t('report.film.pass') : t('report.film.fail')} {t('report.film.snapshots', { count: String(filmReport.snapshotCount) })}
              </div>
              {filmReport.gaps.length === 0
                ? <div style={{ color: '#D9D9D6' }}>{t('report.film.allPass')}</div>
                : filmReport.gaps.map((g, i) => (
                  <div key={i} style={{ color: '#f59e0b', marginBottom: 3, lineHeight: 1.6 }}>
                    <span style={{ color: '#D9D9D6' }}>{g.field}</span>
                    {' '}{t('report.gap.between') ?? 'differs between'}{' '}
                    <span style={{ color: '#818387' }}>{g.between[0]}</span> → <span style={{ color: '#818387' }}>{g.between[1]}</span>
                    {' '}({t('report.gap.delta') ?? 'by'} {g.delta.toFixed(2)})
                  </div>
                ))
              }
              {filmReport.valid && (
                <button
                  onClick={async () => {
                    const ok = await modal.confirm({ title: t('report.film.nextShotConfirm'), message: t('report.film.nextShotDesc') ?? 'NODE 04-14 will be reset for the next shot. Global settings (NODE 01-03) are preserved.', confirmLabel: t('report.film.nextShot') });
                    if (ok) { resetShot(); setStitchReport(null); setFilmReport(null); setQaRetryCount(0); setQaHumanReview(false); }
                  }}
                  style={{ marginTop: 6, fontSize: 9, color: '#60a5fa', background: 'none', border: '1px solid #1a2a4a', padding: '3px 10px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1, minHeight: 28 }}
                >
                  {t('report.film.nextShot')}
                </button>
              )}
            </div>
          )}

          {/* 畫布內疊加：QA 衰減重試 */}
          {qaRetryCount > 0 && !filmReport && !qaHumanReview && (
            <div style={{
              position: 'absolute', bottom: 12, left: 12, zIndex: 10, maxWidth: 360,
              background: '#1C1C1Cee', border: '1px solid #4C4E56', borderRadius: 6, padding: '10px 14px', fontSize: 9, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: '#D9D9D6', letterSpacing: 1, marginBottom: 4 }}>
                {t('qa.decay.title', { count: String(qaRetryCount) })}
              </div>
              <div style={{ color: '#818387' }}>
                {t('qa.decay.relaxed', { pct: String(Math.round(qaRetryCount * 13)) })}
              </div>
              <div style={{ color: '#555', marginTop: 3 }}>
                {t('qa.decay.warning')}
              </div>
            </div>
          )}

          {/* 畫布內疊加：人類仲裁 */}
          {qaHumanReview && (
            <div style={{
              position: 'absolute', bottom: 12, left: 12, zIndex: 10, maxWidth: 400,
              background: '#1C1C1Cee', border: '1px solid #818387', borderRadius: 6, padding: '12px 16px', fontSize: 9, fontFamily: "'Inter', 'Noto Sans TC', sans-serif", backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: '#D9D9D6', letterSpacing: 2, marginBottom: 6 }}>{t('qa.human.title')}</div>
              <div style={{ color: '#818387', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {t('qa.human.desc')}
              </div>
              <button
                onClick={() => { setQaRetryCount(0); setQaHumanReview(false); }}
                style={{ marginTop: 8, fontSize: 9, color: '#D9D9D6', background: 'none', border: '1px solid #4C4E56', padding: '3px 10px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 }}
              >
                {t('qa.human.reset')}
              </button>
            </div>
          )}
        </div>

      {/* ─── 底部面板區 ─── */}
      <div data-section="tools" style={{ flexShrink: 0, borderTop: '1px solid #333', padding: '0 16px 40px' }}>
        {/* ─── 分鏡板 ─── */}
        <Suspense fallback={null}>
          <StoryboardWall shots={shotHistory} genHistory={genHistory} />
        </Suspense>

        {/* ─── 腳本串接 + 批次匯出 ─── */}
        <Suspense fallback={null}>
          <ScriptPanel
            shots={shotHistory}
            nodeValues={nodeValues}
            locks={locks}
            projectName={projects.find(p => p.id === activeId)?.name ?? 'vdl-project'}
          />
        </Suspense>

        {/* ─── 多鏡頭提示詞彙整 ─── */}
        {shotHistory.length > 0 && (
          <div style={{ background: '#080c10', border: '1px solid #1a2030', borderRadius: 2, padding: '12px 16px', marginTop: 16, fontSize: 9, fontFamily: 'inherit' }}>
            <div style={{ color: '#60a5fa', letterSpacing: 1, marginBottom: 8 }}>
              {t('shots.title', { count: String(shotHistory.length) })}
            </div>
            {shotHistory.map(shot => (
              <details key={shot.shotIndex} style={{ marginBottom: 8 }}>
                <summary style={{ color: '#888', cursor: 'pointer', marginBottom: 4 }}>
                  {t('shots.shot', { index: String(shot.shotIndex + 1) })}
                  {shot.qaScores.length > 0 && (
                    <span style={{ marginLeft: 8, color: '#555' }}>
                      QA [{shot.qaScores.map(s => Math.round(s * 100) + '%').join(' · ')}]
                    </span>
                  )}
                </summary>
                <pre style={{ margin: '4px 0 0 12px', color: '#5A4A6A', fontSize: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {Object.entries(shot.prompts)
                    .filter(([, v]) => v)
                    .map(([id, p]) => `[${id}]\n${p}`)
                    .join('\n\n')}
                </pre>
              </details>
            ))}
            <button
              onClick={() => {
                const text = shotHistory.map(s =>
                  `SHOT ${s.shotIndex + 1} — QA [${s.qaScores.map(x => Math.round(x * 100) + '%').join(' · ')}]\n${'═'.repeat(60)}\n` +
                  Object.entries(s.prompts).filter(([, v]) => v).map(([id, p]) => `[${id}]\n${p}`).join('\n\n')
                ).join('\n\n');
                navigator.clipboard.writeText(text);
              }}
              style={{ fontSize: 9, color: '#60a5fa', background: 'none', border: '1px solid #1a2a4a', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {t('shots.copyAll')}
            </button>
          </div>
        )}

      {/* ─── 工具列 ─── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
        <button onClick={() => setShowTemplateGallery(true)}
          style={{ fontSize: 10, color: '#DFCEEA', background: 'none', border: '1px solid #2A1A4A', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('splash.fromTemplate')}
        </button>
        <button onClick={handleExport}
          style={{ fontSize: 10, color: '#D9D9D6', background: 'none', border: '1px solid #2A1A4A', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('toolbar.exportJSON')}
        </button>
        <label style={{ fontSize: 10, color: '#60a5fa', background: 'none', border: '1px solid #1a2a3a', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('toolbar.importJSON')}
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>
        <button
          onClick={async () => {
            const ok = await modal.confirm({ title: t('toolbar.resetConfirm'), message: t('toolbar.resetDesc') ?? 'All node data, locks, and prompts will be cleared.', danger: true, confirmLabel: t('toolbar.resetAll') });
            if (ok) resetFlow();
          }}
          style={{ fontSize: 10, color: '#444', background: 'none', border: '1px solid #222', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', minHeight: 32 }}
        >
          {t('toolbar.resetAll')}
        </button>
      </div>

      {/* ─── Footer：全部完成 ─── */}
      {allDone && (
        <footer ref={footerRef} style={{ ...styles.footer, opacity: 0 }}>
          <div style={styles.footerBox}>
            <p style={styles.footerMsg}>{t('footer.complete')}</p>

            <div style={{ fontSize: 9, color: '#555', marginBottom: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span>{t('footer.shotsCompleted')} <span style={{ color: '#D9D9D6' }}>{shotHistory.length}</span></span>
              <span>{t('footer.scenesAccumulated')} <span style={{ color: '#D9D9D6' }}>{sceneHistory.length}</span></span>
              {shotHistory.length > 0 && (
                <span>{t('footer.avgQA')} <span style={{ color: '#60a5fa' }}>
                  {Math.round(
                    shotHistory.reduce((sum, s) =>
                      sum + s.qaScores.reduce((a: number, b: number) => a + b, 0) / (s.qaScores.length || 1), 0
                    ) / shotHistory.length * 100
                  )}%
                </span></span>
              )}
            </div>

            {shotHistory.length > 0 && (
              <div style={{ marginBottom: 12, fontSize: 8, textAlign: 'left' }}>
                {shotHistory.map(s => {
                  const QA_THRESH = [0.5, 0.5, 0.85, 0.80, 0.75, 0.5];
                  const pass = s.qaScores.every((x: number, i: number) => x >= QA_THRESH[i]);
                  return (
                    <div key={s.shotIndex} style={{ marginBottom: 3, color: '#444' }}>
                      <span style={{ color: pass ? '#D9D9D6' : '#707372', marginRight: 8 }}>
                        {pass ? '✓' : '✗'} Shot {s.shotIndex + 1}
                      </span>
                      <span style={{ color: '#333' }}>
                        [{s.qaScores.map((x: number) => Math.round(x * 100) + '%').join(' · ')}]
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button ref={copiedAllRef} onClick={handleCopyAll} style={styles.copyAllBtn}>
              {copiedAll ? t('footer.copied') : t('footer.copyAll')}
            </button>
          </div>
        </footer>
      )}
      </div>{/* 底部面板區關閉 */}
      </div>{/* scroll container 關閉 */}

    </div>
  );
}
