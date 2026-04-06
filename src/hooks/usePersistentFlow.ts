// ◎ usePersistentFlow — localStorage 持久化 Hook
// 確保 12 節點狀態在頁面關閉後可完整恢復

import { useState, useEffect, useCallback } from 'react';
import type { SceneConfig } from '../engine/vdlTimeline';  // Phase 9 P1

const STORAGE_KEY = 'vdl-flow-state';

interface LockEntry {
  value: string | number;
  source: string;
}

// Phase 11 P3/P4: 每鏡頭完整記錄 (QA PASS 時封存)
export interface ShotRecord {
  shotIndex: number;
  prompts:   Record<string, string>;  // 該鏡頭所有節點提示詞
  qaScores:  number[];                // 6 維正規化 QA 分數 [0-1]
}

interface FlowState {
  nodeValues: Record<string, Record<string, string | number>>;
  completedNodes: string[];
  locks: Record<string, LockEntry>;
  activeIndex: number;
  allPrompts:   Record<string, string>;   // Phase 3
  sceneHistory: SceneConfig[];            // Phase 9 P1
  shotHistory:  ShotRecord[];             // Phase 11 P3/P4
  savedPalettes: string[][];              // P2: 色票儲存組（最多 10）
  flowMode: 'basic' | 'advanced';         // Phase 13: 簡易/進階模式
}

const DEFAULT_STATE: FlowState = {
  nodeValues: {},
  completedNodes: [],
  locks: {},
  activeIndex: 0,
  allPrompts: {},
  sceneHistory: [],
  shotHistory:  [],
  savedPalettes: [],
  flowMode: 'basic',
};

function loadState(): FlowState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: FlowState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage quota exceeded — silent fail
  }
}

export function usePersistentFlow() {
  const [state, setState] = useState<FlowState>(() => loadState());

  // 寫入 localStorage 當任何狀態變動
  useEffect(() => {
    saveState(state);
  }, [state]);

  const setActiveIndex = useCallback((updater: number | ((prev: number) => number)) => {
    setState(prev => ({
      ...prev,
      activeIndex: typeof updater === 'function' ? updater(prev.activeIndex) : updater,
    }));
  }, []);

  const addCompletedNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      completedNodes: prev.completedNodes.includes(nodeId)
        ? prev.completedNodes
        : [...prev.completedNodes, nodeId],
    }));
  }, []);

  const writeLocks = useCallback((newLocks: Record<string, LockEntry>) => {
    setState(prev => ({
      ...prev,
      locks: { ...prev.locks, ...newLocks },
    }));
  }, []);

  const setNodeValues = useCallback((nodeId: string, values: Record<string, string | number>) => {
    setState(prev => ({
      ...prev,
      nodeValues: { ...prev.nodeValues, [nodeId]: values },
    }));
  }, []);

  // Phase 3: allPrompts 持久化
  const setPrompt = useCallback((nodeId: string, prompt: string) => {
    setState(prev => ({
      ...prev,
      allPrompts: { ...prev.allPrompts, [nodeId]: prompt },
    }));
  }, []);

  // Phase 9 P1: 多場景累積 — 每次 NODE 06 完成後呼叫
  const addSceneToHistory = useCallback((config: SceneConfig) => {
    setState(prev => ({
      ...prev,
      sceneHistory: [...(prev.sceneHistory ?? []), config],
    }));
  }, []);

  // Phase 11 P3/P4: NODE 12 QA PASS 時封存本鏡頭提示詞 + QA 分數
  const addQARecord = useCallback((qaScores: number[]) => {
    setState(prev => ({
      ...prev,
      shotHistory: [
        ...(prev.shotHistory ?? []),
        {
          shotIndex: (prev.shotHistory ?? []).length,
          prompts:   { ...prev.allPrompts },
          qaScores,
        },
      ],
    }));
  }, []);

  // P4: 移除單一 lock（解鎖按鈕）
  const removeLock = useCallback((key: string) => {
    setState(prev => {
      const newLocks = { ...prev.locks };
      delete newLocks[key];
      return { ...prev, locks: newLocks };
    });
  }, []);

  // P2: 色票組儲存（最多 10 組）
  const savePalette = useCallback((palette: string[]) => {
    setState(prev => {
      const current = prev.savedPalettes ?? [];
      if (current.length >= 10) return prev;
      return { ...prev, savedPalettes: [...current, palette] };
    });
  }, []);

  // P2: 色票組刪除
  const deletePalette = useCallback((index: number) => {
    setState(prev => {
      const current = prev.savedPalettes ?? [];
      return { ...prev, savedPalettes: current.filter((_, i) => i !== index) };
    });
  }, []);

  // Phase 10 P2: 下一鏡頭模式 — 保留 NODE 01/02/03 locks，清空 04-12
  const SHOT_NODES = ['node_04','node_05','node_06','node_07','node_08','node_09','node_10','node_11','node_12'];
  const resetShot = useCallback(() => {
    setState(prev => {
      const newNodeValues  = { ...prev.nodeValues };
      const newAllPrompts  = { ...prev.allPrompts };
      SHOT_NODES.forEach(id => { delete newNodeValues[id]; delete newAllPrompts[id]; });
      return {
        ...prev,
        nodeValues:     newNodeValues,
        allPrompts:     newAllPrompts,   // Phase 11: 清空鏡頭提示詞（全局 01-03 保留）
        completedNodes: prev.completedNodes.filter((id: string) => !SHOT_NODES.includes(id)),
        activeIndex:    3,
        sceneHistory:   [],
      };
    });
  }, []);

  // Phase 13: 簡易/進階模式切換
  const setFlowMode = useCallback((mode: 'basic' | 'advanced') => {
    setState(prev => ({ ...prev, flowMode: mode }));
  }, []);

  const resetFlow = useCallback(() => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    activeIndex:    state.activeIndex,
    completedNodes: new Set(state.completedNodes),
    locks:          state.locks,
    nodeValues:     state.nodeValues,
    allPrompts:     state.allPrompts,
    sceneHistory:   state.sceneHistory ?? [],   // Phase 9 P1
    setActiveIndex,
    addCompletedNode,
    writeLocks,
    setNodeValues,
    setPrompt,
    addSceneToHistory,                          // Phase 9 P1
    shotHistory:  state.shotHistory  ?? [],     // Phase 11 P3/P4
    addQARecord,                                // Phase 11 P3/P4
    resetShot,                                  // Phase 10 P2
    removeLock,                                 // P4: 解鎖按鈕
    savedPalettes: state.savedPalettes ?? [],   // P2: 色票組
    savePalette,                                // P2: 儲存色票組
    deletePalette,                              // P2: 刪除色票組
    flowMode: state.flowMode ?? 'basic',        // Phase 13: 簡易/進階
    setFlowMode,                                // Phase 13
    resetFlow,
  };
}
