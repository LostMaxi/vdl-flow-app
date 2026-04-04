// ◎ 2026-04-01 — useProjectManager.ts (P8)
// 多專案管理：新建 / 切換 / 刪除 / 重命名
// 每個專案獨立 localStorage key: vdl-project-{id}

import { useState, useCallback } from 'react';

const INDEX_KEY = 'vdl-project-index';
const ACTIVE_KEY = 'vdl-active-project';

export interface ProjectMeta {
  id:        string;
  name:      string;
  createdAt: number;
  updatedAt: number;
}

function loadIndex(): ProjectMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]');
  } catch { return []; }
}

function saveIndex(index: ProjectMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function projectKey(id: string): string {
  return `vdl-project-${id}`;
}

function genId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useProjectManager() {
  const [projects, setProjects] = useState<ProjectMeta[]>(() => {
    const idx = loadIndex();
    // 若無任何專案，自動建立預設專案
    if (idx.length === 0) {
      const def: ProjectMeta = { id: genId(), name: '未命名專案', createdAt: Date.now(), updatedAt: Date.now() };
      saveIndex([def]);
      // 將舊的 vdl-flow-state 遷移到預設專案
      const legacy = localStorage.getItem('vdl-flow-state');
      if (legacy) localStorage.setItem(projectKey(def.id), legacy);
      localStorage.setItem(ACTIVE_KEY, def.id);
      return [def];
    }
    return idx;
  });

  const [activeId, setActiveIdState] = useState<string>(() => {
    const stored = localStorage.getItem(ACTIVE_KEY);
    const idx    = loadIndex();
    return stored && idx.find(p => p.id === stored) ? stored : idx[0]?.id ?? '';
  });

  // 切換專案（同步 usePersistentFlow 的 STORAGE_KEY）
  const switchProject = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    // 將 vdl-flow-state 指向新專案的資料
    const data = localStorage.getItem(projectKey(id));
    if (data) localStorage.setItem('vdl-flow-state', data);
    else       localStorage.removeItem('vdl-flow-state');
    setActiveIdState(id);
    // 重新載入頁面讓 usePersistentFlow 讀取新專案
    window.location.reload();
  }, []);

  // 儲存目前狀態到當前專案
  const saveCurrentProject = useCallback(() => {
    const data = localStorage.getItem('vdl-flow-state');
    if (data && activeId) {
      localStorage.setItem(projectKey(activeId), data);
      setProjects(prev => {
        const next = prev.map(p => p.id === activeId ? { ...p, updatedAt: Date.now() } : p);
        saveIndex(next);
        return next;
      });
    }
  }, [activeId]);

  // 新建專案
  const createProject = useCallback((name = '未命名專案') => {
    saveCurrentProject();
    const newProj: ProjectMeta = { id: genId(), name, createdAt: Date.now(), updatedAt: Date.now() };
    setProjects(prev => {
      const next = [...prev, newProj];
      saveIndex(next);
      return next;
    });
    localStorage.removeItem('vdl-flow-state');
    localStorage.setItem(ACTIVE_KEY, newProj.id);
    setActiveIdState(newProj.id);
    sessionStorage.setItem('vdl-flow-splash-dismissed', '1');
    window.location.reload();
  }, [saveCurrentProject]);

  // 刪除專案
  const deleteProject = useCallback((id: string) => {
    if (projects.length <= 1) return; // 至少保留一個
    localStorage.removeItem(projectKey(id));
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      saveIndex(next);
      return next;
    });
    if (id === activeId) switchProject(projects.find(p => p.id !== id)!.id);
  }, [projects, activeId, switchProject]);

  // 重命名
  const renameProject = useCallback((id: string, name: string) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, name, updatedAt: Date.now() } : p);
      saveIndex(next);
      return next;
    });
  }, []);

  return { projects, activeId, switchProject, createProject, deleteProject, renameProject, saveCurrentProject };
}
