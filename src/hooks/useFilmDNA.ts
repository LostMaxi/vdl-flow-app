// ◎ 2026-04-06 — useFilmDNA Hook
// Film DNA 狀態管理 + localStorage 持久化

import { useState, useCallback, useEffect } from 'react';
import type { FilmDNA, EvolutionEntry, DriftVector } from '../types/filmDNA';
import { createEmptyFilmDNA } from '../types/filmDNA';

const STORAGE_KEY = 'vdl-flow-film-dna';
const DNA_LIST_KEY = 'vdl-flow-film-dna-list';

interface FilmDNAListEntry {
  id: string;
  name: string;
  updated: string;
}

function loadActiveDNA(): FilmDNA | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveDNA(dna: FilmDNA): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dna));
    // 更新列表
    const list = loadDNAList();
    const idx = list.findIndex(e => e.id === dna.id);
    const entry = { id: dna.id, name: dna.name, updated: dna.updated };
    if (idx >= 0) list[idx] = entry;
    else list.push(entry);
    localStorage.setItem(DNA_LIST_KEY, JSON.stringify(list));
  } catch { /* quota exceeded */ }
}

function loadDNAList(): FilmDNAListEntry[] {
  try {
    const raw = localStorage.getItem(DNA_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useFilmDNA() {
  const [activeDNA, setActiveDNA] = useState<FilmDNA | null>(loadActiveDNA);
  const [dnaList, setDnaList] = useState<FilmDNAListEntry[]>(loadDNAList);
  const [driftHistory, setDriftHistory] = useState<DriftVector[]>([]);

  // 同步 localStorage
  useEffect(() => {
    if (activeDNA) saveDNA(activeDNA);
  }, [activeDNA]);

  // 載入指定 DNA
  const loadDNA = useCallback((dna: FilmDNA) => {
    setActiveDNA(dna);
    setDriftHistory([]);
  }, []);

  // 建立空白 DNA
  const createDNA = useCallback((name: string) => {
    const dna = createEmptyFilmDNA(name);
    setActiveDNA(dna);
    setDriftHistory([]);
    return dna;
  }, []);

  // 更新 DNA 欄位
  const updateDNA = useCallback((partial: Partial<FilmDNA>, changeDesc?: string) => {
    setActiveDNA(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial, updated: new Date().toISOString() };
      if (changeDesc) {
        updated.evolutionLog = [
          ...prev.evolutionLog,
          { date: updated.updated, author: 'user' as const, change: changeDesc },
        ];
      }
      return updated;
    });
  }, []);

  // 追加演化日誌
  const addEvolutionEntry = useCallback((entry: EvolutionEntry) => {
    setActiveDNA(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        updated: new Date().toISOString(),
        evolutionLog: [...prev.evolutionLog, entry],
      };
    });
  }, []);

  // 追加漂移校正向量
  const addDriftCorrection = useCallback((vector: DriftVector) => {
    setDriftHistory(prev => [...prev, vector]);
    setActiveDNA(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        updated: new Date().toISOString(),
        evolutionLog: [
          ...prev.evolutionLog,
          {
            date: new Date().toISOString(),
            author: 'drift-corrector' as const,
            change: `Drift correction applied: ΔK=${Math.round(vector.kelvin)}, ΔC=${vector.contrast.toFixed(3)}`,
          },
        ],
      };
    });
  }, []);

  // 刪除 DNA
  const deleteDNA = useCallback((id: string) => {
    const newList = dnaList.filter(e => e.id !== id);
    setDnaList(newList);
    localStorage.setItem(DNA_LIST_KEY, JSON.stringify(newList));
    try {
      localStorage.removeItem(`vdl-dna-${id}`);
    } catch { /* ignore */ }
    if (activeDNA?.id === id) {
      setActiveDNA(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [dnaList, activeDNA]);

  // 卸載 DNA (不刪除)
  const unloadDNA = useCallback(() => {
    setActiveDNA(null);
    setDriftHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    activeDNA,
    dnaList,
    driftHistory,
    loadDNA,
    createDNA,
    updateDNA,
    addEvolutionEntry,
    addDriftCorrection,
    deleteDNA,
    unloadDNA,
  };
}
