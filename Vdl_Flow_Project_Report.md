◎ 2026-04-06 17:58:00 (Taiwan_Atomic_Clock_Precision)

# VDL-FLOW V2 專案報告 (Project Report)

**VDL — Visual Design Language | 視覺設計語言攝影品質治理引擎**
**VDL — Visual Design Language | Cinematography Governance Engine**

---

## ◎ 核心公理 (Core Axioms)

```
A1 — VDL-FLOW 是攝影品質治理引擎，不是通用影片製作工具
     VDL-FLOW is a Cinematography Governance Engine, not a general video production tool

A2 — 熱力學連續性：跨場景參數不可存在不連續跳變
     Thermodynamic Continuity: no discontinuous parameter jumps across scenes

A3 — 單一場景描述，多管線消費 (USD 哲學)
     Single Scene Description, Multi-Pipeline Consumption (USD Philosophy)

A4 — 14 節點閉環輸出「畫面母帶」；聲音/字幕/後製為下游管線
     14-node closed loop outputs Visual Master; audio/subtitles/post-production are downstream

A5 — Film DNA 約束包絡：所有生成參數必須落在參考影片的數學邊界內
     Film DNA Constraint Envelope: all generation params must fall within reference film bounds
```

---

## ◎ 專案概述 (Project Overview)

VDL-Flow-App 是一套 **14 節點線性工作流引擎**，將影視製作的「概念→敘事→攝影→生成→品質驗證」全流程整合為單一 React 應用程式。系統以 **NDF (Narrative Design Framework)** 張力曲線驅動 **VDL 光度學參數**，透過物理接地的色彩科學 (CIE2000 ΔE)、動畫時間軸引擎 (Anime.js)、Film DNA 約束包絡、Camera HUD 視覺化控制、以及 Drift Correction 累積偏移修正，實現從敘事到視覺的精確映射與品質治理。

VDL-Flow-App is a **14-node linear workflow engine** that unifies the concept-to-narrative-to-cinematography-to-generation-to-QA pipeline into a single React application. The system maps **NDF** tension curves to **VDL photometric parameters** through physically-grounded color science (CIE2000 ΔE), an Anime.js timeline engine, Film DNA constraint envelopes, Camera HUD visual controls, and Drift Correction for cumulative parameter deviation.

---

## ◎ 技術棧 (Tech Stack)

| 層級 (Layer) | 技術 (Technology) | 版本 (Version) |
|---|---|---|
| 前端框架 (Frontend) | React + TypeScript | 18.3.1 / 5.5.3 |
| 建置工具 (Build) | Vite | 5.3.4 |
| 動畫引擎 (Animation) | Anime.js | 3.2.2 |
| 瀏覽器端 AI (Browser AI) | @xenova/transformers | 2.17.2 |
| 色彩科學 (Color Science) | 純 TypeScript (Pure TS) | CIE2000 ΔE |
| 測試框架 (Testing) | Vitest | 4.1.2 |
| 桌面封裝 (Desktop) | Tauri | 1.x |
| PWA 離線支援 (Offline) | vite-plugin-pwa | — |
| 國際化 (i18n) | React Context | zh-TW / en (443 keys × 2) |
| 提示詞翻譯 (Prompt Translation) | quickTermTranslate + Gemini API | 60+ 術語映射 |
| 部署 (Deploy) | Vercel | Production |

---

## ◎ 架構拓樸 (Architecture Topology)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       VDLFlowApp.tsx (898 行)                            │
│                      ◎ 主協調器 (Main Orchestrator)                      │
├────────┬────────┬────────┬──────────┬────────────────┬──────────────────┤
│ Bridge │ Engine │  API   │  Hooks   │  Components    │  Utils           │
│ndfToVdl│vdlTime-│genera- │persistent│NodeCard (899)  │colorScience      │
│ (262)  │line    │torAPI  │Flow (202)│RadarChart      │promptTranslator  │
│        │ (367)  │ (396)  │filmDNA   │FilmDNAPanel    │visionQA          │
│        │        │comfyui │ (149)    │TemplatePanel   │vdlExport         │
│        │        │ API    │template  │CameraHUD       │                  │
│        │        │        │Vault(129)│LightingRigPanel│                  │
│        │        │        │projectMgr│SplashScreen    │                  │
│        │        │        │gDrive    │ScriptPanel     │                  │
└────────┴────────┴────────┴──────────┴────────────────┴──────────────────┘
```

---

## ◎ 14 節點管線 (14-Node Pipeline)

### 管線總覽 (Pipeline Overview)

**Total: 14 nodes / 66 fields / 46 locks / 6 layers**

```
Creative Layer ──→ Narrative Layer ──→ Flow Layer ──→ Spatial ──→ Generation ──→ Validation
 [01] [02] [03]    [04] [05]          [06-09]         [10]        [11] [12]      [13] [14]
```

### 節點定義 (Node Definitions)

| 節點 | ID | 名稱 (Name) | 層級 (Layer) | 欄位 | 鎖定 | 功能 (Function) |
|---|---|---|---|---|---|---|
| **01** | node_01 | Theme Genesis 主題生成 | creative | 5 | 3 | 核心主題、情緒弧線、風格關鍵字 |
| **02** | node_02 | World Building 世界構建 | creative | 4 | 2 | 色票、Kelvin 範圍、材質 → 自動預填 NODE 06, 13 |
| **03** | node_03 | Subject Design 主體設計 | creative | 7 | 5 | 角色/生物/物件 + 條件欄位動態顯示 |
| **04** | node_04 | Screenplay 劇本 | narrative | 3 | 2 | NDF 目標值 (T/E/I/C)、對白 |
| **05** | node_05 | NDF Tension Mapping 張力映射 | narrative | 8 | 4 | T/E/I/C 曲線 (起→終) + 緩動 → 自動預填 NODE 06 |
| **06** | node_06 | Scene Visual 場景視覺 | flow | 5 | 5 | 光度學 (Kelvin/EV/Contrast/Saturation) |
| **07** | node_07 | Camera 攝影機 | flow | 6 | 4 | 18 種鏡頭運動 + Orbit 環繞 + Camera HUD |
| **08** | node_08 | Composition 構圖 | flow | 4 | 3 | 三分法/景深層次/負空間/引導線 + 3D Blockout + Lighting Rig |
| **09** | node_09 | Style Lock 風格鎖定 | flow | 2 | 1 | 5 種風格向量，傳播至 NODE 11/12 |
| **10** | node_10 | Image Generation 圖像生成 | spatial | 4 | 3 | 提示詞組裝 → generateImage() + Seed 自動鎖定 |
| **11** | node_11 | Video Generation 影片生成 | generation | 3 | 2 | 提示詞組裝 → generateVideo() + LRO 輪詢 |
| **12** | node_12 | QA Validation 品質驗證 | generation | 6 | 6 | 六軸雷達圖 + CIE2000 ΔE 色差 |
| **13** | node_13 | Final QA 最終驗收 | validation | 7 | 5 | Decay retry (13%/attempt, max 3) + 人工審查 fallback |
| **14** | node_14 | Film Stitching 全片串接 | validation | 2 | 1 | Drift Correction + 母帶封存 + 多場景連續性驗證 |

### V1→V2 節點變更摘要 (V1→V2 Node Changes)

| 變更 | 說明 |
|---|---|
| 12→14 節點 | 新增 NODE 13 Final QA + NODE 14 Film Stitching |
| NODE 07 重構 | 新增 18 種 CameraMovementType + OrbitConfig + Camera HUD |
| NODE 08 重構 | 新增構圖四要素 + 3D Blockout + LightingRig (4 presets) |
| NODE 09 擴充 | 5 種風格向量 (原 1 種) |
| NODE 10 新增 | 3D Blockout & Lighting 空間配置 (原 NODE 10 Image Gen → 現 NODE 10) |
| ID Remapping | old node_10→new node_11, old node_11→new node_12, old node_12→new node_13 |
| Film DNA | 新增約束包絡系統 (NumericEnvelope + DriftConfig) |
| Template System | 新增 per-node 模板儲存/載入/套用 |
| Prompt Translation | 新增英→繁中翻譯 (60+ 術語映射 + Gemini API) |

---

## ◎ V2 新增模組 (V2 New Modules)

### Film DNA 約束包絡 — `types/filmDNA.ts` (282 行)

從參考影片提取的數學邊界，約束所有生成參數：

| 結構 (Structure) | 說明 |
|---|---|
| `NumericEnvelope` | min / max / mean / std 四元組 |
| `FilmDNA` | 主結構：theme / world / subject / ndf / photometric / camera / composition / style |
| `DriftConfig` | 漂移閾值：maxDrift / correctionStrength / windowSize |
| `DriftVector` | 單次漂移記錄：timestamp / parameter / deviation / correction |
| `EvolutionEntry` | Film DNA 演化日誌 |
| `ActTemplate` | 幕結構：鏡頭範圍 + NDF 目標 |

管理 Hook: `useFilmDNA.ts` (149 行) — CRUD + drift tracking + localStorage 持久化

### Camera HUD 視覺化控制 — `components/camera/` (4 files)

| 元件 | 功能 |
|---|---|
| `CameraHUD.tsx` | 主容器，整合三個子元件 |
| `TopView.tsx` | SVG 俯視圖：FOV fan、orbit path、光源位置 |
| `SideView.tsx` | SVG 側視圖：crane height、tilt angle |
| `OrbitController.tsx` | 360° 弧形編輯器：起始/結束角度拖拉 |

支援 18 種鏡頭運動：static, dolly_in/out, pan_left/right, tilt_up/down, crane_up/down, tracking, orbit, vertigo, whip_pan, dutch_angle, steadicam, handheld, drone, rack_focus, bullet_time, zoom_in, zoom_out

### Lighting Rig 三點燈光 — `components/lighting/LightingRigPanel.tsx`

| 預設 (Preset) | Key:Fill 比 | 特性 |
|---|---|---|
| 3-Point Standard | 2:1 | 均勻照明 |
| Rembrandt | 4:1 | 三角光影，戲劇性 |
| High Key | 1:1 | 低對比，明亮感 |
| Low Key | 8:1 | 高對比，壓迫感 |

自動計算 Key:Fill ratio，支援 6 種燈光類型。

### Template System 模板系統 — `components/TemplatePanel.tsx` + `hooks/useTemplateVault.ts` (129 行)

- Per-node 模板儲存（max 20/node）
- 48×48 JPEG 縮圖壓縮
- 4-bit 色彩量化提取
- 匯入/匯出全部模板

### Prompt Translation 提示詞翻譯 — `utils/promptTranslator.ts` (86 行)

| 層級 | 方法 | 說明 |
|---|---|---|
| Layer 1 | `quickTermTranslate()` | 純前端 60+ 術語映射，零 API 成本 |
| Layer 2 | `translateWithGemini()` | Gemini 2.0 Flash 全文翻譯，Layer 1 作為 fallback |

涵蓋：鏡頭類型、運鏡、光度學、構圖、風格、NDF 術語。

---

## ◎ 核心引擎詳解 (Core Engine Breakdown)

### 1. NDF → VDL 橋接 (Bridge) — `ndfToVdl.ts` (262 行)

物理參數映射規則 (lerp-based):

| NDF 維度 | 高值映射 | 物理意義 |
|---|---|---|
| **T** (Tension 張力) | 低色溫 + 低 EV + 高對比 + 淺景深 | 壓迫感、戲劇性 |
| **E** (Emotion 情感) | 高飽和 + 高對比 | 情緒強度 |
| **I** (Information 資訊) | 高 EV + 低對比 + 深焦 + 密集物件 | 清晰度、資訊量 |
| **C** (CharFocus 角色聚焦) | 短焦距 + 大光圈 + 少負空間 | 角色臨場感 |

關鍵函數：
- `ndfToVdl()` — NDF → VDL 光度學 + 攝影參數
- `node05ToNode06Prefill()` — NODE 05 終值 → NODE 06 自動填入
- `palette02ToPhotometric()` — hex 色票 → Lab 空間 → 光度學推算

### 2. 動畫時間軸引擎 (Timeline Engine) — `vdlTimeline.ts` (367 行)

- `createSceneTimeline()` — 建構 Anime.js 時間軸，1 秒間隔採樣快照
- `stitchScenes()` — 跨場景熱連續性驗證 (Axiom A2: Scene N 終值 ≈ Scene N+1 起值)
- `emitPromptSnapshot()` — VDLState → 四段式提示詞 (視覺/攝影/情緒/濾鏡)
- `validateQA()` — 六軸 QA 閾值驗證

### 3. 色彩科學 (Color Science) — `colorScience.ts` (147 行)

零外部依賴的完整 CIE2000 ΔE 實作：
```
sRGB → Linear RGB → XYZ (D65) → L*a*b* → ΔE2000
```
- `hexToLab()` / `rgbToLab()` — 色彩空間轉換
- `deltaE2000()` — Luo/Cui/Li 2001 感知色差公式
- `paletteDeltaE()` — 批次色票比對

### 4. 瀏覽器端 AI (Browser-side AI) — `visionQA.ts` (152 行)

| 模型 (Model) | 用途 (Purpose) |
|---|---|
| **CLIP** | 語義相似度 — 比對渲染圖 vs 提示詞 |
| **YOLO** | 物件偵測 — 驗證場景物件匹配 |
| **MiDaS** | 深度估計 — 驗證景深一致性 |

### 5. 六軸 QA 驗證 (6-Axis QA) — `RadarChart.tsx`

| 軸 (Axis) | 指標 (Metric) | 閾值邏輯 |
|---|---|---|
| ΔKelvin | 色溫偏移 | 越低越好 |
| ΔE Color | CIE2000 色差 | 越低越好 |
| CLIP Sim | 語義匹配度 | 越高越好 |
| ObjRecall | 物件召回率 | 越高越好 |
| DepthCorr | 景深相關性 | 越高越好 |
| NDF Delta | NDF 偏移量 | 越低越好 |

歷史軌跡覆蓋：5 色循環 (blue/purple/pink/orange/teal)，45% 透明度。
Decay retry: 每次重試衰減 13%，最多 3 次，之後觸發人工審查。

---

## ◎ 生成後端 (Generation Backends)

### 圖像生成 (Image Generation)

| 後端 (Backend) | 狀態 (Status) | API Key 需求 | 備註 (Notes) |
|---|---|---|---|
| **Pollinations** | ✅ Ready | 免費 (Zero-key) | Flux 模型，預設 fallback |
| **Stable Diffusion XL** | ✅ Ready | `VITE_STABILITY_API_KEY` | 完整整合 |
| **Google Gemini Imagen** | ⬜ Stubbed | `VITE_GEMINI_API_KEY` | 介面已定義 |
| **DALL-E 3** | ⬜ Stubbed | — | 待實作 |
| **ComfyUI (本地 GPU)** | ✅ Ready | 本地端口 | HTTP 健康檢查 + 佇列管理 |

### 影片生成 (Video Generation)

| 後端 (Backend) | 狀態 (Status) | 輪詢策略 (Polling) | 備註 (Notes) |
|---|---|---|---|
| **Google VEO** | ✅ Ready | 4s × 30 次 (2 分鐘上限) | LRO 長時操作 |
| **Runway Gen-3** | ✅ Ready | 3s × 40 次 (2 分鐘上限) | Task ID 輪詢 |
| **Kling v2** | ⬜ Stubbed | — | API Key 待設定 |

---

## ◎ 狀態管理 (State Management)

### FlowState 結構

```typescript
interface FlowState {
  nodeValues:     Record<string, Record<string, string | number>>;
  completedNodes: string[];
  locks:          Record<string, LockEntry>;
  activeIndex:    number;
  allPrompts:     Record<string, string>;
  sceneHistory:   SceneConfig[];
  shotHistory:    ShotRecord[];
  savedPalettes:  string[][];
}
```

### 持久化機制 (Persistence)

| 層級 (Layer) | 機制 (Mechanism) | 用途 (Purpose) |
|---|---|---|
| **localStorage** | usePersistentFlow | 即時自動同步 (8 state fields, 12 actions) |
| **Film DNA** | useFilmDNA | DNA CRUD + drift tracking |
| **模板** | useTemplateVault | Per-node template storage (max 20/node) |
| **多專案** | useProjectManager | ID + 時間戳切換 |
| **Google Drive** | useGoogleDrive | OAuth 2.0 + Drive API v3 雲端備份 |
| **JSON 匯出** | handleExport | vdl-flow-YYYY-MM-DD.json 下載 |
| **VDL 格式** | vdlExport.ts | 結構化 .vdl 檔案序列化 |

---

## ◎ 邊界決策 (Boundary Decisions)

### VDL-FLOW 管轄 vs 後製層 (Scope vs Post-Production)

```
VDL-FLOW 14 節點閉環 = 攝影組 (Cinematography Department)
  輸出：品質驗證過的畫面母帶 (Visual Master JSON)

後製層 (Post-Production) = 獨立管線，讀取 VDL 母帶
  ├── 字幕 (Subtitles)     → 後製
  ├── 配音 (Voice-over)    → 後製，讀取 NDF E/T 做 mood/tempo 對齊
  ├── 配樂 (Music)         → 後製，讀取 NDF T → BPM, E → mood
  ├── 音效 (SFX)           → 後製，讀取 Camera Movement → 空間音場
  ├── 口型同步 (Lip-sync)  → 後製
  └── 影片增強 (Upscale)   → 後製
```

**設計理由**：與真實電影產業一致——攝影組不管錄音組。14 節點不膨脹，保持精煉。但母帶 JSON 的資訊密度必須足夠讓下游管線對齊。

### USD 哲學：單一場景描述，多管線消費

NODE 14 Film Stitching 輸出的母帶 JSON 結構：

```
Visual Master JSON
├── Visual Layer (VDL-FLOW 管轄)
│   ├── sceneHistory[]        — 每場景 photometric + camera + composition
│   ├── shotHistory[]         — 每鏡頭 prompt + QA scores
│   ├── filmDNA               — 約束包絡 + 演化日誌
│   ├── driftReport           — 累積偏移 + 修正向量
│   └── locks                 — 全局鎖定值
│
└── Downstream Anchors (供後製管線讀取)
    ├── ndfCurve[]            — T/E/I/C 隨時間的曲線 (音效管線)
    ├── sceneCutPoints[]      — 場景切換時間碼 (剪輯管線)
    ├── cameraMovementLog[]   — 運鏡事件時間軸 (空間音場管線)
    └── photometricCurve[]    — 色溫/曝光隨時間變化 (調色管線)
```

---

## ◎ 產業研究 — 六支影片啟發矩陣 (Industry Research — Six-Video Insight Matrix)

### 影片清單 (Video Inventory)

| # | 頻道 (Channel) | 標題 (Title) | 核心啟發 (Core Insight) |
|---|---|---|---|
| 1 | 馬爾科 Mark | AI 廣告製作從 0 到成片 | 痛點驗證：AI 影片需要結構化流程 |
| 2 | Matt Hallett Visual | ComfyUI for Architecture (9 模組 / 35 課) | 節點式 UX 黃金標準；角色一致性 = 最大痛點 |
| 3 | ComfyUI Official | Convert Workflow into APP Mode | App Mode = VDL-FLOW 天生的形態；Field visibility 分層 |
| 4 | Remotion Official | Remotion + Agent Skills | React 程式化渲染 + Claude Code 原生整合 |
| 5 | ByteGrad | Remotion + Claude Code + VPS + Skills | 部署方案：本地/VPS 三層渲染架構 |
| 6 | PAPAYA 電腦教室 | 一人動畫公司完整流程 | 暴露聲音盲區 → 確認為後製層 (A4 公理) |

### 影片 × 節點交叉啟發表 (Video × Node Cross-Reference)

| 啟發點 (Insight) | 來源影片 | 影響節點 | 優先級 |
|---|---|---|---|
| Reference Image Upload (角色參考圖) | #2 Matt Hallett | NODE 03 Subject Design | HIGH |
| Field Visibility (basic/advanced/hidden) | #3 ComfyUI App Mode | ALL NODES | HIGH |
| Remotion Composition 渲染輸出 | #4 #5 Remotion | NODE 14 Archive | HIGH |
| Film DNA 分享生態 (.vdl export) | #3 ComfyHub 概念 | NODE 14 Archive | MEDIUM |
| NDF E(emotion) → 音效管線 tempo/mood | #6 PAPAYA | NODE 05 → 下游 JSON | MEDIUM |
| 情緒曲線拖拉 UI | #1 馬爾科 | NODE 04-05 | MEDIUM |
| ComfyUI Workflow 匯入橋接 | #2 #3 ComfyUI 生態 | 新增 bridge/ 模組 | LOW |
| VDL Claude Code Skill | #4 #5 Remotion Skill | 外部配置檔 | LOW |
| 手機/窄螢幕 Tab 佈局 | #3 ComfyUI App Mode | VDLFlowApp.tsx | LOW |

### 產業定位分析 (Market Positioning)

```
① 馬爾科 Mark        → AI 影片的「怎麼做」(手動流程教學)
② Matt Hallett       → ComfyUI 的「專業深度」(建築視覺化節點邏輯)
③ ComfyUI App Mode   → 節點工具的「產品化方向」(節點圖→簡潔介面)
④ Remotion Official  → 程式化渲染的「技術基礎」(React 元件=影片幀)
⑤ ByteGrad           → 渲染部署的「基礎設施」(VPS + Skills 安裝)
⑥ PAPAYA 電腦教室    → 一人動畫的「完整鏈條」(暴露聲音盲區)
```

**VDL-FLOW 的獨特定位**：
- 不是另一個 ComfyUI（不做通用節點圖）
- 不是另一個教學流程（不只教怎麼做）
- 而是影片製作的**品質治理引擎**——Film DNA 約束 + DCPI 驗證 + Drift Correction
- 包裝在一個**天生就是 App Mode** 的結構化介面裡

ComfyUI 花了三年才從節點圖走到 App Mode。VDL-FLOW 從第一天就是 App Mode。

---

## ◎ 缺口分析 (Gap Analysis)

### 模組完成 vs 整合狀態

| 模組 | 程式碼狀態 | VDLFlowApp.tsx 整合 |
|---|---|---|
| 14 NodeDefs (482 lines) | ✅ 完成 | ⚠️ 已引用但 handleNodeComplete 未擴充 |
| FilmDNAPanel | ✅ 完成 | ❌ 未掛載 |
| CameraHUD (4 files) | ✅ 完成 | ❌ 未掛載到 NODE 07 |
| LightingRigPanel | ✅ 完成 | ❌ 未掛載到 NODE 08 |
| TemplatePanel | ✅ 完成 | ⚠️ NodeCard 已整合，useTemplateVault 未驅動 |
| useFilmDNA (149 lines) | ✅ 完成 | ❌ 未調用 |
| useTemplateVault (129 lines) | ✅ 完成 | ❌ 未調用 |
| promptTranslator (86 lines) | ✅ 完成 | ✅ NodeCard 已整合翻譯按鈕 |
| Drift Correction | ✅ 型別定義完成 | ❌ NODE 14 邏輯未實作 |
| VisualMaster JSON Schema | ❌ 未定義 | ❌ |
| Remotion 渲染層 | ❌ 未開始 | ❌ |
| Field Visibility | ❌ 未定義 | ❌ |
| Reference Image Upload | ❌ 未定義 | ❌ |

### 型別一致性檢查

| 型別定義 | 消費端 | 狀態 |
|---|---|---|
| CameraMovementType (filmDNA.ts) | nodeDefs.ts NODE 07 (18 options) | ⚠️ 需同步確認 |
| LightingRig | LightingRigPanel.tsx | ✅ 一致 |
| NodeTemplate | TemplatePanel + useTemplateVault | ✅ 一致 |
| DriftConfig / DriftVector | useFilmDNA.ts | ✅ 型別一致，NODE 14 未消費 |
| OrbitConfig | OrbitController.tsx | ✅ 一致 |

---

## ◎ 演化路徑 (Evolution Roadmap)

### Phase 13 — VDLFlowApp.tsx 14 節點整合 (CRITICAL)

```
P13.1 — handleNodeComplete 擴充 14 節點完整邏輯
P13.2 — 掛載 useFilmDNA → FilmDNAPanel 渲染至 header/sidebar
P13.3 — 掛載 CameraHUD 至 NODE 07 (hudControl='camera')
P13.4 — 掛載 LightingRigPanel 至 NODE 08 (hudControl='lighting')
P13.5 — 驅動 useTemplateVault per-node → 傳遞至每個 NodeCard
P13.6 — NODE 14 Drift Correction 實作
P13.7 — 進度條 / footer 更新為 14 節點
P13.8 — usePersistentFlow 擴充 (filmDNA, driftHistory)
```

### Phase 14 — 母帶輸出格式 Visual Master JSON Schema (HIGH)

```
P14.1 — 定義 VisualMaster interface (types/visualMaster.ts)
P14.2 — NODE 14 Archive 輸出重構 → VisualMaster 格式
P14.3 — ndfCurve[] 生成 (NDF T/E/I/C 時間序列)
P14.4 — sceneCutPoints[] 生成 (場景邊界時間碼)
P14.5 — photometricCurve[] 生成 (色溫/曝光連續曲線)
P14.6 — cameraMovementLog[] 生成 (運鏡事件時間軸)
```

### Phase 15 — Remotion 渲染層 (HIGH)

```
P15.1 — 安裝 Remotion + @remotion/cli
P15.2 — src/renderer/ 模組結構
         ├── compositions/SceneComposition.tsx
         ├── compositions/FilmComposition.tsx
         ├── utils/interpolatePhotometric.ts
         └── render.ts
P15.3 — NODE 14 輸出選項：「匯出 JSON」/「渲染影片 (Remotion)」
P15.4 — VPS 渲染支援
P15.5 — Remotion Agent Skill 整合
```

### Phase 16 — UX 精煉 (MEDIUM)

```
P16.1 — Field Visibility (basic / advanced / hidden) + 專家模式切換
P16.2 — Reference Image Upload (NODE 03)
P16.3 — NDF 情緒曲線拖拉 UI (NODE 04-05)
P16.4 — Film DNA 分享格式 (.vdl)
P16.5 — Responsive 斷點 (tablet / mobile Tab 佈局)
```

### Phase 17 — 生態整合 (LOW)

```
P17.1 — ComfyUI Workflow 匯入橋接
P17.2 — VDL Claude Code Skill 開發
P17.3 — VDL API Server (headless mode)
```

### 三層渲染架構 (Three-Tier Rendering)

```
Level 1 — 本地預覽 (現有)
  NODE 11 <img> / NODE 12 <video>
  零成本，即時

Level 2 — Remotion 本地渲染 (Phase 15)
  NODE 14 → Remotion Composition → 本地 render MP4
  適合：短片、單鏡頭、快速迭代

Level 3 — Remotion VPS 渲染 (Phase 15.4)
  NODE 14 → JSON 上傳 → VPS render → 下載 MP4
  適合：多場景長片、高解析度、批次渲染
```

---

## ◎ DCPI 演化評分 (DCPI Evolution Scoring)

採用 evolve.py 五維模型 (Base Power 25 / Growth 20 / Ecosystem 20 / Civilization 25 / Resilience 10 = 100)

| 維度 | 現狀 (Ph12) | Phase 13 | Phase 14-15 | 理由 |
|---|---|---|---|---|
| **Base Power** | 15 | 22 | 25 | 主指揮官接線 → 母帶 + Remotion 自主渲染 |
| **Growth** | 12 | 15 | 18 | V2 收斂 → .vdl 分享 + Remotion Skill |
| **Ecosystem** | 8 | 10 | 15 | TemplateVault 啟用 → Remotion + Claude Code 雙生態 |
| **Civilization** | 16 | 18 | 22 | Drift Correction 閉環 → 輸出影片完整價值鏈 |
| **Resilience** | 5 | 6 | 10 | 持久化完整 → Remotion 離線渲染 + VPS 備援 |
| **TOTAL** | **56** | **71** | **~85** | **T3 Giant → T4 Apex → T5 Life Star** |

---

## ◎ 國際化 (Internationalization)

- **語言**: 繁體中文 (zh-TW) + English (en) — 443 keys × 2
- **機制**: React Context + `useI18n()` Hook
- **提示詞翻譯**: `promptTranslator.ts` — 60+ 攝影/動畫術語映射 + Gemini API
- 涵蓋：14 節點標題/描述、全部欄位標籤/佔位符、18 種鏡頭運動、6 種燈光類型、Film DNA 欄位、翻譯 UI

---

## ◎ 部署與封裝 (Deployment & Packaging)

| 平台 (Platform) | 狀態 (Status) | 備註 (Notes) |
|---|---|---|
| **Vercel (Web)** | ✅ Production | vdl-flow-app.vercel.app |
| **Tauri (Desktop)** | ✅ Ready | `npm run tauri:build` |
| **Chrome Extension** | ⬜ Stub | manifest.json 已建立 |
| **PWA (Offline)** | ✅ Ready | vite-plugin-pwa + icons |

---

## ◎ 測試與品質 (Testing & Quality)

| 工具 (Tool) | 配置 (Config) | 涵蓋範圍 (Coverage) |
|---|---|---|
| **Vitest** | vitest.config.ts | 3 測試檔 (bridge/engine/utils) |
| **ESLint** | eslint.config.js | src/ 全域 |
| **Prettier** | .prettierrc | 格式化 |
| **TypeScript** | strict mode | 完整型別檢查 (0 errors verified) |
| **ErrorBoundary** | 全域 | React 錯誤攔截 |

---

## ◎ 檔案拓撲 (File Topology)

```
VDL-Flow-App/src/                              ~5,000+ lines
├── VDLFlowApp.tsx                             898 lines  ← 主指揮官
├── App.tsx / main.tsx                         Entry points
│
├── types/
│   ├── vdl.ts                                 58 lines   ← Field, LockEntry, NodeDef, NodeCardProps
│   └── filmDNA.ts                             282 lines  ← FilmDNA, Drift, Camera, Lighting, Template
│
├── constants/
│   └── nodeDefs.ts                            482 lines  ← 14 node definitions + promptTemplates
│
├── hooks/
│   ├── usePersistentFlow.ts                   202 lines  ← FlowState (8 fields, 12 actions)
│   ├── useFilmDNA.ts                          149 lines  ← Film DNA CRUD + drift
│   ├── useTemplateVault.ts                    129 lines  ← Per-node templates (max 20)
│   ├── useProjectManager.ts                   — lines    ← Multi-project switching
│   ├── useGoogleDrive.ts                      319 lines  ← OAuth 2.0 + Drive API
│   └── useI18n.ts                             — lines    ← i18n Context hook
│
├── api/
│   ├── generatorAPI.ts                        396 lines  ← 5 image + 3 video + LRO polling
│   └── comfyuiAPI.ts                          — lines    ← ComfyUI local GPU
│
├── bridge/
│   └── ndfToVdl.ts                            262 lines  ← NDF T/E/I/C → Photometric/Camera
│
├── engine/
│   └── vdlTimeline.ts                         367 lines  ← Anime.js timeline + stitch + QA
│
├── utils/
│   ├── colorScience.ts                        147 lines  ← CIE2000 ΔE (zero deps)
│   ├── promptTranslator.ts                    86 lines   ← 60+ terms + Gemini API
│   ├── visionQA.ts                            152 lines  ← CLIP + YOLO + MiDaS
│   └── vdlExport.ts                           — lines    ← .vdl serialization
│
├── components/
│   ├── NodeCard.tsx                            899 lines  ← dice, lock, palette, translate, template
│   ├── RadarChart.tsx                          100+ lines ← 6-axis SVG + history trails
│   ├── FilmDNAPanel.tsx                       100+ lines ← DNA management (analyze/import/create)
│   ├── TemplatePanel.tsx                      100+ lines ← Per-node save/load/apply
│   ├── SplashScreen.tsx                       381 lines  ← 啟動畫面
│   ├── ScriptPanel.tsx                        356 lines  ← 劇本面板
│   ├── camera/
│   │   ├── CameraHUD.tsx                      100+ lines ← TopView + SideView + Orbit 容器
│   │   ├── TopView.tsx                        50+ lines  ← SVG 俯視圖
│   │   ├── SideView.tsx                       50+ lines  ← SVG 側視圖
│   │   └── OrbitController.tsx                50+ lines  ← 360° arc editor
│   └── lighting/
│       ├── LightingRigPanel.tsx               100+ lines ← 3-point + 4 presets
│       └── index.ts                           Barrel export
│
├── i18n/
│   ├── en.ts                                  443 lines
│   └── zh-TW.ts                               443 lines
│
└── styles/
    └── theme.ts                               48 lines   ← PMS FGSC/FGSU 色票
```

---

## ◎ 開發歷程 (Development Timeline)

| Phase | 完成日期 | 里程碑 (Milestone) |
|---|---|---|
| **Phase 1** | 2026-03-29 | 基礎架構 — Vite + React + TS + 12 節點 UI |
| **Phase 2** | 2026-03-29 | Anime.js 引擎 + NDF→VDL 橋接 |
| **Phase 3** | 2026-03-29 | 持久化 + .env + generatorAPI |
| **Phase 4** | 2026-03-29 | 一鍵生成按鈕 + RadarChart 雷達圖 |
| **Phase 5** | 2026-03-30 | VEO LRO 輪詢 + 圖片預覽 + CIE2000 ΔE |
| **Phase 6** | 2026-03-30 | colorScience 整合 + Runway 輪詢 + 下拉選單 |
| **Phase 7** | 2026-03-30 | 影片預覽 + JSON 匯出/匯入 + Timeline 連動 |
| **Phase 8** | 2026-03-30 | stitchScenes 跨場景驗證 + Seed 鎖定 + 全片報告 |
| **Phase 9** | 2026-03-31 | 多場景累積 + QA PASS 自動封存 |
| **Phase 10** | 2026-03-31 | Palette→Photometric 橋接 + Next Shot 模式 |
| **Phase 11** | 2026-03-31 | 多鏡頭 Prompt 彙整 + RadarChart 歷史軌跡 |
| **Phase 12** | 2026-03-31 | 提示詞模板升級 + 全片輸出頁 — **V1 閉環封存** |
| **V2 Refactor** | 2026-04-05 | 12→14 節點重構 + Film DNA + Camera HUD + Lighting Rig + Template System + Prompt Translation |
| **V2 Audit** | 2026-04-06 | 架構審計 + 六支影片產業研究 + 演化藍圖 |
| **Phase 13** | 待執行 | VDLFlowApp.tsx 14 節點整合 — **V2 閉環** |
| **Phase 14** | 待執行 | Visual Master JSON Schema (USD 哲學落地) |
| **Phase 15** | 待執行 | Remotion 渲染層整合 |
| **Phase 16** | 待執行 | UX 精煉 (Field Visibility + Reference Image + 情緒曲線) |
| **Phase 17** | 待執行 | 生態整合 (ComfyUI 橋接 + VDL Skill + API Server) |

**V1 開發週期**: 3 天 (2026-03-29 → 2026-03-31)
**V2 重構週期**: 進行中 (2026-04-05 → )

---

## ◎ 啟動指令 (Launch Commands)

```bash
cd "Creative-Projects/VDL-Flow-App"
npm install
cp .env.example .env.local   # 填入 API Keys
npm run dev                   # 開發伺服器
npm run build                 # 生產建置
npm run test                  # 執行測試
npm run tauri:build           # 桌面應用程式
```

---

◎ STATUS: OPERATIONAL
◎ VDL-FLOW V2 Architecture Audit — COMPLETE
◎ 14 nodes / 66 fields / 46 locks / ~5,000+ lines / 24+ source files / 80+ exports / 40+ interfaces
◎ DCPI: 56/100 (T3 Giant) → Phase 13: 71 (T4 Apex) → Phase 15: ~85 (T5 Life Star)
◎ NEXT ACTION: Phase 13 — VDLFlowApp.tsx 14 節點整合
