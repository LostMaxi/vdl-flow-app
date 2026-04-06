// ◎ VDL-FLOW V2 核心型別定義 — 14 節點架構

export interface Field {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  placeholder: string;
  options?: string[];   // type='select' 時使用
  showWhen?: { key: string; values: string[] };  // 僅當指定欄位值匹配時顯示
  fieldVariant?: 'color' | 'palette';  // 色票欄位標記（single hex / multi hex）
  noDice?: boolean;  // 排除骰子隨機（數值、色票、色溫等）
  hudControl?: 'camera' | 'lighting' | 'orbit';  // 此欄位由 HUD 視覺化控制
  autoCompute?: boolean;  // 自動計算欄位（不可手動編輯）
  visibility?: 'basic' | 'advanced';  // 簡易/進階模式欄位分層（未標記 = basic）
}

export interface LockEntry {
  value: string | number;
  source: string;
}

export type NodeLayer =
  | 'creative'     // NODE 01-03: 創意輸入層
  | 'narrative'    // NODE 04-05: NDF 敘事層
  | 'flow'         // NODE 06-09: FLOW 四層
  | 'spatial'      // NODE 10:    空間配置層
  | 'generation'   // NODE 11-12: 輸出層
  | 'validation';  // NODE 13-14: 驗證/串接層

export interface NodeDef {
  id: string;
  step: number;
  title: string;
  description: string;
  layer: NodeLayer;
  fields: Field[];
  locks: string[];
  promptTemplate: (v: Record<string, string | number>, locks?: Record<string, LockEntry>) => string;
}

export interface NodeCardProps {
  flowMode?: 'basic' | 'advanced';  // 簡易/進階模式
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
  // V2: 模板面板
  templates?: import('../types/filmDNA').NodeTemplate[];
  onSaveTemplate?: (template: Omit<import('../types/filmDNA').NodeTemplate, 'id' | 'createdAt'>) => import('../types/filmDNA').NodeTemplate;
  onRemoveTemplate?: (templateId: string) => void;
}
