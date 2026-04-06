// ◎ 2026-04-06 — useTemplateVault Hook
// Per-node 模板庫管理 + localStorage 持久化

import { useState, useCallback, useEffect } from 'react';
import type { NodeTemplate } from '../types/filmDNA';

const STORAGE_PREFIX = 'vdl-templates-';
const MAX_TEMPLATES_PER_NODE = 20;
const MAX_THUMBNAIL_BYTES = 50 * 1024; // 50KB

function loadTemplates(nodeId: string): NodeTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + nodeId);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTemplates(nodeId: string, templates: NodeTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + nodeId, JSON.stringify(templates));
  } catch { /* quota exceeded */ }
}

// ─── 縮圖壓縮 ───────────────────────────────────────────────

export function createThumbnail(
  source: HTMLImageElement | HTMLCanvasElement,
  maxSize: number = 80,
): string {
  const canvas = document.createElement('canvas');
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  // 壓縮到 50KB 以內
  let quality = 0.6;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > MAX_THUMBNAIL_BYTES && quality > 0.1) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}

// ─── Hook ────────────────────────────────────────────────────

export function useTemplateVault(nodeId: string) {
  const [templates, setTemplates] = useState<NodeTemplate[]>(() => loadTemplates(nodeId));

  // 當 nodeId 變化時重新載入
  useEffect(() => {
    setTemplates(loadTemplates(nodeId));
  }, [nodeId]);

  // 同步 localStorage
  useEffect(() => {
    saveTemplates(nodeId, templates);
  }, [nodeId, templates]);

  const addTemplate = useCallback((template: Omit<NodeTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: NodeTemplate = {
      ...template,
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setTemplates(prev => {
      const next = [newTemplate, ...prev];
      return next.slice(0, MAX_TEMPLATES_PER_NODE);
    });
    return newTemplate;
  }, []);

  const removeTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const updateTemplate = useCallback((templateId: string, partial: Partial<NodeTemplate>) => {
    setTemplates(prev =>
      prev.map(t => t.id === templateId ? { ...t, ...partial } : t)
    );
  }, []);

  const clearAll = useCallback(() => {
    setTemplates([]);
  }, []);

  return {
    templates,
    addTemplate,
    removeTemplate,
    updateTemplate,
    clearAll,
  };
}

// ─── 全域模板匯出/匯入 ─────────────────────────────────────

export function exportAllTemplates(): string {
  const allTemplates: Record<string, NodeTemplate[]> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      const nodeId = key.slice(STORAGE_PREFIX.length);
      try {
        allTemplates[nodeId] = JSON.parse(localStorage.getItem(key) ?? '[]');
      } catch { /* ignore */ }
    }
  }
  return JSON.stringify(allTemplates, null, 2);
}

export function importAllTemplates(json: string): number {
  const data = JSON.parse(json) as Record<string, NodeTemplate[]>;
  let count = 0;
  for (const [nodeId, templates] of Object.entries(data)) {
    if (Array.isArray(templates)) {
      const existing = loadTemplates(nodeId);
      const merged = [...templates, ...existing].slice(0, MAX_TEMPLATES_PER_NODE);
      saveTemplates(nodeId, merged);
      count += templates.length;
    }
  }
  return count;
}
