// ◎ 2026-04-01 — useGenHistory.ts (P10)
// 同節點多次生成結果歷史記錄

import { useState, useCallback } from 'react';

export interface GenRecord {
  nodeId:    string;
  url:       string;
  generator: string;
  prompt:    string;
  timestamp: number;
  selected:  boolean;
}

export function useGenHistory() {
  const [history, setHistory] = useState<GenRecord[]>([]);

  const addRecord = useCallback((record: Omit<GenRecord, 'selected'>) => {
    setHistory(prev => [...prev, { ...record, selected: false }]);
  }, []);

  const selectRecord = useCallback((nodeId: string, timestamp: number) => {
    setHistory(prev => prev.map(r =>
      r.nodeId === nodeId
        ? { ...r, selected: r.timestamp === timestamp }
        : r
    ));
  }, []);

  const getNodeHistory = useCallback((nodeId: string) => {
    return history.filter(r => r.nodeId === nodeId);
  }, [history]);

  const clearNodeHistory = useCallback((nodeId: string) => {
    setHistory(prev => prev.filter(r => r.nodeId !== nodeId));
  }, []);

  return { history, addRecord, selectRecord, getNodeHistory, clearNodeHistory };
}
