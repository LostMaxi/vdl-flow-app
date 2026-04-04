# VDL-FLOW

**Visual Narrative Closed-Loop Animation Pipeline**
AI 動畫導演的提示詞編排及視覺辨識工作站

## 架構

```
src/
├── api/               # 生成端 API（Pollinations / SDXL / VEO / Runway / ComfyUI）
├── bridge/            # NDF → VDL 光度學映射橋
├── components/        # UI 元件（NodeCard / RadarChart / StoryboardWall / ErrorBoundary）
├── constants/         # 12 節點定義表
├── engine/            # Anime.js 時間軸引擎 + 跨場景 stitching
├── hooks/             # 狀態管理（usePersistentFlow / useProjectManager / useGenHistory）
├── styles/            # PMS 色彩規範樣式系統
├── types/             # 共用型別定義
└── utils/             # 色彩科學（CIE2000 ΔE）/ Vision QA / VDL 匯出
```

### 12 節點工作流

| NODE | 名稱 | 用途 |
|------|------|------|
| 01 | Theme Genesis | 核心命題、情緒弧線、風格基調 |
| 02 | World Building | 時空設定、色彩 DNA、材質 |
| 03 | Character Design | 角色視覺 DNA、一致性鎖定 |
| 04 | Screenplay | 場景劇本、NDF 目標值 |
| 05 | Tension Mapping | T/E/I/C 時間軸曲線 |
| 06 | Scene Visual | 光度學參數、三層景深、光源 |
| 07 | Storyboard | 鏡頭構圖、攝影機運動 |
| 08 | 3D Blockout | 白模物件佈置 |
| 09 | Style Lock | 全片風格前綴鎖定 |
| 10 | Image Generation | 靜態關鍵幀生成 |
| 11 | Video Generation | 影片段落生成 |
| 12 | QA Validation | 閉環驗證（6 軸 QA） |

## 快速開始

```bash
# 安裝依賴
npm install

# 複製環境變數範本
cp .env.example .env.local

# 啟動開發伺服器
npm run dev
```

開發伺服器預設在 `http://localhost:3000`。

## 環境變數

| 變數 | 必要 | 說明 |
|------|------|------|
| `VITE_GEMINI_API_KEY` | 選填 | Google AI（Gemini Imagen + VEO） |
| `VITE_RUNWAY_API_KEY` | 選填 | Runway Gen-3 影片生成 |
| `VITE_KLING_ACCESS_KEY` | 選填 | Kling v2 影片生成 |
| `VITE_KLING_SECRET_KEY` | 選填 | Kling v2 影片生成 |
| `VITE_STABILITY_API_KEY` | 選填 | Stable Diffusion XL |
| `VITE_COMFYUI_URL` | 選填 | 本地 ComfyUI（預設 `http://127.0.0.1:8188`） |
| `VITE_COMFYUI_MODEL` | 選填 | ComfyUI 模型檔名 |
| `VITE_DEFAULT_IMAGE_GENERATOR` | 選填 | 預設圖片生成端 |
| `VITE_DEFAULT_VIDEO_GENERATOR` | 選填 | 預設影片生成端 |

不設定任何 API key 也可以使用 **Pollinations**（零金鑰免費圖片生成）。

## 多平台建構

```bash
# Web / PWA
npm run build

# Tauri 桌面應用（需安裝 Rust）
npm run tauri:build

# Chrome 擴充功能
npm run ext:build
```

## 開發指令

```bash
npm run dev          # Vite 開發伺服器
npm run build        # 生產建構
npm run test         # 執行單元測試
npm run test:watch   # 監聽模式測試
npm run lint         # ESLint 檢查
npm run format       # Prettier 格式化
```

## 技術棧

- **前端**: React 18 + TypeScript + Vite
- **動畫引擎**: anime.js（NDF 時間軸取樣）
- **瀏覽器端 AI**: @xenova/transformers（CLIP / YOLO / Depth）
- **色彩科學**: CIE2000 ΔE（sRGB → XYZ → Lab）
- **桌面**: Tauri 1.x（Rust backend）
- **測試**: Vitest
- **程式碼品質**: ESLint + Prettier + TypeScript strict mode
