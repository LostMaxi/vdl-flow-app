// ◎ VDL-FLOW React 主編排元件
// 拆分自原始 1238 行單體元件，保留核心流程邏輯

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { usePersistentFlow } from './hooks/usePersistentFlow';
import { useProjectManager } from './hooks/useProjectManager';
import { useGenHistory } from './hooks/useGenHistory';
import { node05ToNode06Prefill, palette02ToPhotometric } from './bridge/ndfToVdl';
import { buildVDLFile, downloadVDL } from './utils/vdlExport';
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
import type { NodeDef } from './types/vdl';
import type { NodeTemplate } from './types/filmDNA';
import { assembleExportPayload } from './types/exportPayload';

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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const copiedAllRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);

  const SECTION_LABELS = ['Canvas', 'Tools'];

  const handleScrollSnap = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const sections = el.querySelectorAll<HTMLElement>('[data-section]');
    let closest = 0;
    let minDist = Infinity;
    sections.forEach((sec, i) => {
      const dist = Math.abs(sec.offsetTop - el.scrollTop);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setActiveSection(closest);
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const sections = el.querySelectorAll<HTMLElement>('[data-section]');
    sections[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const allDone = completedNodes.size === NODE_DEFS.length;

  // ─── Anime.js: Header 進場動畫 ─────────────────────────────────
  useEffect(() => {
    if (!headerRef.current) return;
    anime({
      targets: headerRef.current,
      opacity: [0, 1],
      translateY: [-18, 0],
      duration: 700,
      easing: 'easeOutCubic',
    });
  }, []);

  // ─── Anime.js: 進度條 dot stagger 動畫 ────────────────────────
  useEffect(() => {
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
  }, []);

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

  // NODE 12 QA PASS → 自動封存進度 JSON
  useEffect(() => {
    if (!filmReport?.valid) return;
    const raw = localStorage.getItem('vdl-flow-state') ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vdl-flow-qa-pass-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filmReport]);

  // ─── 匯出 / 匯入 ─────────────────────────────────────────────

  const handleExport = () => {
    const raw = localStorage.getItem('vdl-flow-state') ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vdl-flow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportVDL = () => {
    const projName = projects.find(p => p.id === activeId)?.name ?? 'vdl-project';
    const vdlFile  = buildVDLFile(projName, nodeValues, locks, sceneHistory, allPrompts);
    downloadVDL(vdlFile);
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
        alert(t('toolbar.invalidFile'));
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
    a.download = `${projName}-${new Date().toISOString().slice(0, 10)}.json`;
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
        alert(t('project.openFileInvalid'));
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
    if (!confirm(t('drive.loadConfirm', { name: fileName }))) return;
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
      alert(t('project.openFileInvalid'));
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
      alert(t('splash.invalidFile'));
    }
  }, [t]);

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
    } catch { /* quota */ }
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
      } catch { /* timeline 生成失敗 → 不阻斷流程 */ }
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
      } catch { /* stitch 失敗 → 不阻斷流程 */ }
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
          if (nextRetry >= 3) {
            setQaHumanReview(true);
          } else {
            setQaRetryCount(nextRetry);
          }
        }
      } catch { /* 報告生成失敗 → 不阻斷 */ }
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
        const payload = assembleExportPayload(
          nodeValues, locks, allPrompts, sceneHistory, shotHistory,
        );
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `vdl-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* payload 組裝失敗 → 不阻斷 */ }
    }

    writeLocks(incoming);
    setNodeValues(nodeDef.id, values);
    setPrompt(nodeDef.id, nodeDef.promptTemplate(values, locks));
    addCompletedNode(nodeDef.id);
    const nextIdx = Math.min(NODE_DEFS.findIndex(n => n.id === nodeDef.id) + 1, NODE_DEFS.length - 1);
    setActiveIndex(nextIdx);
    // 自動跳到下一個 ACTIVE 節點
    setSelectedNodeId(NODE_DEFS[nextIdx]?.id ?? null);
  }, [writeLocks, addCompletedNode, setActiveIndex, setNodeValues, setPrompt, nodeValues, locks, allPrompts, sceneHistory, shotHistory, addSceneToHistory, addQARecord, setStitchReport, setFilmReport, qaRetryCount]);

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
      />
    );
  }

  // ─── 渲染 ─────────────────────────────────────────────────────

  return (
    <div style={styles.app}>
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
          {NODE_DEFS.map((n, i) => (
            <div
              key={n.id}
              data-dot
              title={n.title}
              style={{
                ...styles.progressDot,
                background: completedNodes.has(n.id) ? '#D9D9D6' : i === activeIndex ? '#818387' : '#333'
              }}
            />
          ))}
        </div>
        <p style={styles.progressText}>{t('app.nodesCompleted', { done: String(completedNodes.size), total: String(NODE_DEFS.length) })}</p>

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
          <button onClick={() => { const n = prompt(t('project.namePrompt'), t('project.defaultName')); if (n) createProject(n); }}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #333', color: '#888', cursor: 'pointer', borderRadius: 2 }}>{t('project.new')}</button>
          <button onClick={() => { const n = prompt(t('project.renamePrompt'), projects.find(p => p.id === activeId)?.name); if (n) renameProject(activeId, n); }}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #333', color: '#888', cursor: 'pointer', borderRadius: 2 }}>{t('project.rename')}</button>
          <button onClick={() => { if (confirm(t('project.deleteConfirm'))) deleteProject(activeId); }}
            style={{ fontSize: 9, padding: '2px 6px', background: 'transparent', border: '1px solid #333', color: '#666', cursor: 'pointer', borderRadius: 2 }}>{t('project.delete')}</button>
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
                  {driveSaveStatus === 'saving' ? t('drive.saving') : driveSaveStatus === 'saved' ? t('drive.saved') : t('drive.save')}
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
          <div style={{ fontSize: 8, color: '#707372', marginTop: 4 }}>
            {t('drive.error', { msg: drive.error })}
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
        onScroll={handleScrollSnap}
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
            onNodeSelect={setSelectedNodeId}
          />

          {/* 畫布內浮動編輯面板（右側 overlay） */}
          {selectedNodeId && (
            <div
              className="vdl-scroll-hide"
              style={{
                position: 'absolute', top: 8, right: 8, bottom: 8,
                width: 380, maxWidth: 'calc(50% - 16px)',
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
                <div key={i} style={{ color: '#f59e0b', marginBottom: 2 }}>
                  ◎ {g.between[0]} → {g.between[1]} | {g.field}: Δ{g.delta.toFixed(3)}
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
                  <div key={i} style={{ color: '#f59e0b', marginBottom: 2 }}>
                    ◎ {g.between[0]} → {g.between[1]} | {g.field}: Δ{g.delta.toFixed(3)}
                  </div>
                ))
              }
              {filmReport.valid && (
                <button
                  onClick={() => { if (confirm(t('report.film.nextShotConfirm'))) { resetShot(); setStitchReport(null); setFilmReport(null); setQaRetryCount(0); setQaHumanReview(false); } }}
                  style={{ marginTop: 6, fontSize: 9, color: '#60a5fa', background: 'none', border: '1px solid #1a2a4a', padding: '3px 10px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 }}
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
        <button onClick={handleExport}
          style={{ fontSize: 10, color: '#D9D9D6', background: 'none', border: '1px solid #2A1A4A', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('toolbar.exportJSON')}
        </button>
        <label style={{ fontSize: 10, color: '#60a5fa', background: 'none', border: '1px solid #1a2a3a', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('toolbar.importJSON')}
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>
        <button
          onClick={handleExportVDL}
          style={{ fontSize: 10, color: '#a78bfa', background: 'none', border: '1px solid #2a1a4a', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {t('toolbar.exportVDL')}
        </button>
        <button
          onClick={() => { if (confirm(t('toolbar.resetConfirm'))) resetFlow(); }}
          style={{ fontSize: 10, color: '#444', background: 'none', border: '1px solid #222', padding: '4px 12px', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}
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

      {/* ─── 右側圓點導航 ─── */}
      <div style={{
        position: 'fixed',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 100,
      }}>
        {SECTION_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => scrollToSection(i)}
            title={label}
            style={{
              width: activeSection === i ? 10 : 6,
              height: activeSection === i ? 10 : 6,
              borderRadius: '50%',
              border: 'none',
              background: activeSection === i ? '#A78BFA' : '#4C4E56',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
