# VDL-FLOW App

Visual Narrative Closed-Loop Animation Pipeline — 電影級 AI 動畫閉環系統

## Quick Start

```bash
npm install
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # tsc + vite build → dist/
npm run preview      # preview production build
npm run tauri:dev    # Tauri desktop app
npm test             # vitest run (42 tests)
```

## Deployment

- **GitHub**: https://github.com/LostMaxi/vdl-flow-app
- **Vercel Production**: https://vdl-flow-app.vercel.app
- **Vercel Team**: `team_ffWkrtKZvCExEhhGcEdtcM7J` (LostMaxi's projects)
- **Vercel Project ID**: `prj_aytvURniQtxca2tEyKxm9G2zH8CC`
- **部署方式**: push 到 GitHub main → Vercel CLI `vercel --prod --yes` 手動觸發
- **本地同步路徑**: `E:\N-Dimensional Bio-inspired Neural Protocol\Creative-Projects\VDL-Flow-App`
- **注意**: 本地為 `N-Dimensional-Bio-Protocol` mono-repo 的子目錄，需 clone `vdl-flow-app` repo 到暫存位置同步後 push

## Tech Stack

- **React 18** + **TypeScript** + **Vite 5**
- **Anime.js 3.2.2** — UI 動畫（多邊形展開、stagger 進場、脈衝回饋）
- **@xenova/transformers** — 瀏覽器端 AI 模型（CLIP / YOLO / Depth）用於 NODE 12 QA
- **Tauri** — 可選桌面版打包
- **vite-plugin-pwa** — PWA 離線支援

## Architecture

```
src/
├── VDLFlowApp.tsx        # 主編排元件：12 節點線性流程 + 狀態管理
├── App.tsx               # 根元件（I18nProvider + ErrorBoundary）
├── main.tsx              # Vite entry
├── components/
│   ├── SplashScreen.tsx  # 啟動畫面（新建/開啟舊檔/拖拉/Google Drive）
│   ├── NodeCard.tsx      # 單一節點卡片 UI（表單/鎖定/生成/QA/條件欄位）
│   ├── RadarChart.tsx    # NODE 12 六維 QA 雷達圖（SVG + Anime.js）
│   ├── StoryboardWall.tsx# 全片分鏡板縮略圖牆
│   ├── GenHistoryPanel.tsx# 生成歷史面板
│   ├── OfflineBanner.tsx # 離線狀態橫幅
│   ├── EnvWarning.tsx    # 生成端 API key 提示
│   └── ErrorBoundary.tsx # 全域錯誤邊界
├── hooks/
│   ├── usePersistentFlow.ts  # localStorage 持久化（節點值/鎖定/進度）
│   ├── useProjectManager.ts  # 多專案管理（新建/切換/刪除/重命名）
│   ├── useGoogleDrive.ts     # Google OAuth + Drive API v3 存取
│   ├── useGenHistory.ts      # 生成歷史紀錄
│   ├── useAnime.ts           # Anime.js React hook 封裝
│   └── useOnlineStatus.ts    # 網路狀態偵測
├── api/
│   ├── generatorAPI.ts   # 圖片/影片生成端 API 層（Pollinations/SDXL/Gemini/Runway/Kling）
│   └── comfyuiAPI.ts     # ComfyUI 本地 GPU 連接
├── engine/
│   └── vdlTimeline.ts    # 場景時間軸引擎 + 跨場景 stitch 驗證
├── bridge/
│   └── ndfToVdl.ts       # NDF → VDL 參數橋接（NODE 05→06 自動預填）
├── constants/
│   └── nodeDefs.ts       # 12 節點定義表（i18n 版 getNodeDefs(t)）
├── i18n/
│   ├── context.tsx       # I18nProvider + useI18n hook + TFunction
│   ├── zh-TW.ts          # 繁體中文翻譯（~280 keys）
│   └── en.ts             # English translations
├── styles/
│   └── theme.ts          # 全域樣式常數
├── types/
│   ├── vdl.ts            # NodeDef / Field 型別（含 showWhen 條件欄位）
│   └── anime.d.ts        # Anime.js TypeScript 型別擴充
└── utils/
    ├── vdlExport.ts      # .vdl 檔案格式匯出
    ├── colorScience.ts   # 色彩科學工具（ΔE CIE2000 / Kelvin→RGB）
    └── visionQA.ts       # 瀏覽器端 CLIP/YOLO/Depth AI 掃描
```

## 12 Node Pipeline

| Node | Purpose | Key Fields |
|------|---------|------------|
| 01 | Theme Genesis 主題發想 | theme_core, emotion arc, style keywords |
| 02 | World Building 世界觀建構 | palette, kelvin range, materials, atmosphere |
| 03 | **Subject Design 主體設計** | **subject_type 選擇器**（角色/生物/物品）→ 條件欄位 |
| 04 | Screenplay 劇本撰寫 | scene script, dialogue, NDF targets |
| 05 | NDF Tension Mapping 張力曲線 | T/E/I/C start→end curves |
| 06 | Scene Visual 場景設計 | photometric params (kelvin, EV, contrast, saturation) |
| 07 | Storyboard 分鏡稿 | shot type, focal length, camera movement |
| 08 | 3D Blockout 白模 | object list, camera/light positions |
| 09 | Style Lock 風格鎖定 | immutable global style prefix |
| 10 | Image Generation 圖片生成 | assembled prompt → Pollinations/SDXL/Gemini/DALL-E |
| 11 | Video Generation 影片生成 | VEO/Runway/Kling prompt assembly |
| 12 | QA Validation 閉環驗證 | 6-axis radar: ΔKelvin, ΔE, CLIP, ObjRecall, DepthCorr, NDFDelta |

## NODE 03 Subject Type System

NODE 03 支援三種主體類型，使用 `showWhen` 條件欄位機制：

```typescript
// Field type 擴充
interface Field {
  showWhen?: { key: string; values: string[] };  // 條件顯示
}
```

| 類型 | 選項值 | 專用欄位 |
|------|--------|----------|
| 角色（人物） | `角色（人物）` / `Character` | char_name, char_age, char_hair, char_skin, char_clothing |
| 生物（動植物） | `生物（動植物）` / `Creature` | creature_name, creature_species, creature_size, creature_color, creature_texture, creature_motion |
| 物品（道具） | `物品（道具/場景物件）` / `Object` | obj_name, obj_material, obj_size, obj_color, obj_detail |
| **共用** | 所有類型 | char_accent（主體專屬色）, char_feature（辨識特徵） |

- `promptTemplate` 根據 `subject_type` 值自動切換生成模板
- `showWhen` 比對邏輯在 `NodeCard.tsx` 的 `fields.filter()` 中處理
- `locks` 包含所有三種類型的 key，確保下游節點可引用

## Node Data Flow

- NODE 02 `dominant_palette` → auto-prefill NODE 06 photometric + NODE 12 target_palette
- NODE 03 `subject_type` → 條件欄位切換 + promptTemplate 自動選擇
- NODE 05 T/E/I/C → auto-prefill NODE 06 via `ndfToVdl` bridge
- NODE 06 → `createSceneTimeline()` → auto-prefill NODE 07
- NODE 07 → `stitchScenes()` → A2 cross-scene continuity validation
- NODE 12 QA PASS → auto-archive JSON + film report; QA FAIL → decay retry (13%/attempt, max 3) → human review

## i18n

- Languages: `zh-TW` (default), `en`
- System: `I18nProvider` context + `useI18n()` hook + `TFunction`
- `nodeDefs.ts` uses `getNodeDefs(t)` pattern — static `NODE_DEFS` export for backward compat
- **所有 placeholder 已完整 i18n 化** — 繁中提示詞幫助使用者理解各欄位用途
- `promptTemplate` functions remain in English (AI generation prompts)
- ErrorBoundary: hardcoded (class component, can't use hooks)

## Color System (PMS FGSC/FGSU)

**IMPORTANT: No green/teal colors allowed in this app.**

- Page background: `#101820` (Black 6 C) / `#1C1C1C`
- Border accent: `#4C4E56` (Black 6 U)
- Secondary text: `#63666A` (CoolGray10 C)
- Auxiliary text: `#818387` (CoolGray10 U)
- Static border: `#707372` (424 C)
- Primary text: `#D9D9D6` (Black 1 C — matte white)
- **Accent: `#A78BFA` (Mottle Purple)** — primary action color
- Dark purple variants: `#3B1D8F`, `#2A1A4A`, `#110B20`, `#0F0B1A`
- Muted purple text: `#6B5A8A`, `#5A4A6A`
- Banned: `#00CFB4` (teal), `#4ade80` (green), any green-family hue

## Environment Variables

```env
# Image generators (all optional — Pollinations works without any key)
VITE_GEMINI_API_KEY=         # Google Gemini Imagen
VITE_STABILITY_API_KEY=      # Stable Diffusion XL
VITE_DEFAULT_IMAGE_GENERATOR=pollinations

# Video generators
VITE_RUNWAY_API_KEY=         # Runway Gen-3
VITE_KLING_ACCESS_KEY=       # Kling v2
VITE_KLING_SECRET_KEY=
VITE_DEFAULT_VIDEO_GENERATOR=google_flow_veo

# Google Drive integration (optional)
VITE_GOOGLE_CLIENT_ID=       # OAuth 2.0 client ID

# ComfyUI local GPU (optional)
VITE_COMFYUI_URL=http://localhost:8188
```

## Key Patterns

- **Persistent state**: `usePersistentFlow` saves to `localStorage('vdl-flow-state')`, per-project via `useProjectManager`
- **Lock system**: Completed node fields lock and propagate downstream via `writeLocks()`
- **Multi-shot loop**: QA PASS → archive shot → reset NODE 07-12 → next shot (NODE 01-06 retained)
- **Splash screen**: Shows on each new browser tab (sessionStorage-gated); `createProject` sets splash-dismissed flag before reload
- **Conditional fields**: `Field.showWhen` + `NodeCard` filter — 根據選擇動態顯示不同欄位組
- **Google Drive**: `useGoogleDrive` hook — GIS OAuth implicit flow, Drive API v3 REST, auto-creates "VDL-FLOW Projects" folder
- **Anime.js**: Centralized via `useAnime.ts` hook library; 9/28 files use animations (32% coverage)

## Testing

```bash
npm test              # vitest run — 42 tests across 3 files
npm run test:watch    # vitest watch mode
```

Test files: `vdlTimeline.test.ts`, `colorScience.test.ts`, + component tests

## Build Targets

- **Web**: `npm run build` → `dist/` (Vite + PWA)
- **Desktop**: `npm run tauri:build` → native binary
- **Chrome Extension**: `npm run ext:build` → `dist-ext/`

## Recent Changes (2026-04-03)

- **fix**: Splash screen 新建專案後不再重新顯示（sessionStorage flag）
- **feat**: 所有 12 節點 placeholder 完整繁體中文化
- **feat**: NODE 03 主體類型選擇器（角色/生物/物品）+ `showWhen` 條件欄位機制
- **chore**: 本地程式碼同步至 GitHub `vdl-flow-app` 獨立 repo

## Brand

- **Lost Maxi.Art** © 2021-
- RGB Design and Painting
- Font: Inter (Variable, 14-32 opsz, Thin→Black)
