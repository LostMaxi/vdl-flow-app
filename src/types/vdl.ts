// ◎ VDL-FLOW 核心型別定義

export interface Field {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  placeholder: string;
  options?: string[];   // type='select' 時使用
  showWhen?: { key: string; values: string[] };  // 僅當指定欄位值匹配時顯示
  fieldVariant?: 'color' | 'palette';  // 色票欄位標記（single hex / multi hex）
  noDice?: boolean;  // 排除骰子隨機（數值、色票、色溫等）
}

export interface LockEntry {
  value: string | number;
  source: string;
}

export interface NodeDef {
  id: string;
  step: number;
  title: string;
  description: string;
  fields: Field[];
  locks: string[];
  promptTemplate: (v: Record<string, string | number>, locks?: Record<string, LockEntry>) => string;
}

export interface NodeCardProps {
  nodeDef: NodeDef;
  isActive: boolean;
  isCompleted: boolean;
  locks: Record<string, LockEntry>;
  initialValues?: Record<string, string | number>;
  onComplete: (nodeDef: NodeDef, values: Record<string, string | number>) => void;
  onLockFields?: (fields: Record<string, { value: string | number; source: string }>) => void;
  onRemoveLock?: (key: string) => void;
  savedPalettes?: string[][];
  onSavePalette?: (palette: string[]) => void;
  onDeletePalette?: (index: number) => void;
  shotQAHistory?: number[][];
}
