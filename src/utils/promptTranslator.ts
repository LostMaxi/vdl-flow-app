// ◎ 2026-04-06 — 提示詞翻譯工具
// 英文提示詞 → 繁體中文一鍵翻譯（純前端映射 + Gemini API fallback）

// ─── 常用攝影/動畫術語映射 ─────────────────────────────────────

const TERM_MAP: Record<string, string> = {
  // 鏡頭類型
  'extreme close-up': '大特寫', 'close-up': '特寫', 'medium close-up': '中特寫',
  'medium shot': '中景', 'wide shot': '全景', 'extreme wide shot': '大遠景',
  'ECU': '大特寫', 'CU': '特寫', 'MCU': '中特寫', 'MS': '中景', 'WS': '全景', 'EWS': '大遠景',
  // 運動
  'static': '靜止', 'dolly in': '推軌前進', 'dolly out': '推軌後退',
  'pan left': '左搖', 'pan right': '右搖', 'tilt up': '上仰', 'tilt down': '下俯',
  'crane up': '升降上', 'crane down': '升降下', 'tracking': '跟蹤',
  'orbit': '環繞', 'vertigo': '暈眩推拉', 'whip pan': '甩搖',
  'steadicam': '穩定器', 'handheld': '手持', 'drone': '空拍', 'rack focus': '移焦',
  // 光度學
  'color temperature': '色溫', 'exposure value': '曝光值', 'contrast': '對比度',
  'saturation': '飽和度', 'shadow lift': '陰影提亮', 'key light': '主光源',
  'fill light': '補光', 'rim light': '輪廓光', 'ambient': '環境光',
  // 構圖
  'rule of thirds': '三分法', 'depth layers': '景深層次', 'negative space': '負空間',
  'leading lines': '引導線', 'golden ratio': '黃金分割',
  'frame-within-frame': '畫中畫', 'foreground': '前景', 'midground': '中景', 'background': '背景',
  // 風格
  'film grain': '膠片顆粒', 'vignette': '暗角', 'hue shift': '色相偏移',
  'cinematic': '電影感', 'vintage': '復古', 'warm': '暖調', 'cool': '冷調',
  'color grading': '調色', 'LUT': '色彩查找表',
  // NDF
  'tension': '張力', 'information': '資訊密度', 'char focus': '角色聚焦',
  // 完整句型（優先匹配）
  'emotional journey': '情緒弧線', 'visual style': '視覺風格',
  'target audience': '目標觀眾', 'animated film': '動畫影片',
  'negative prompt': '負面提示詞',
  // 通用
  'emotion': '情緒', 'emotional': '情緒性的',
  'duration': '長度', 'scene': '場景', 'shot': '鏡頭', 'character': '角色',
  'creature': '生物', 'object': '物品', 'subject': '主體',
  'style': '風格', 'prompt': '提示詞',
  'animation': '動畫', 'render': '渲染', 'composition': '構圖',
  'palette': '調色板', 'aperture': '光圈', 'focal length': '焦距',
  'dutch angle': 'Dutch 傾斜', 'bullet time': '子彈時間',
  // 句型模板
  'Create a': '製作一部', 'moves from': '從', 'about': '關於',
};

// ─── 快速術語替換（不需 API）──────────────────────────────────

export function quickTermTranslate(text: string): string {
  // 先清除 undefined / null 殘留
  let result = text
    .replace(/\bundefined\b/g, '（未填）')
    .replace(/\bnull\b/g, '（未填）');
  // 按長度降序排列，確保長詞優先匹配
  const sortedTerms = Object.entries(TERM_MAP)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [en, zh] of sortedTerms) {
    // 使用 word boundary 防止 "emotion" 匹配 "emotional" 的前綴
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(regex, zh);
  }
  return result;
}

// ─── Gemini API 全文翻譯（需 API Key）─────────────────────────

export async function translateWithGemini(text: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    // 無 API Key → fallback 純術語替換
    return quickTermTranslate(text);
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `你是專業的影視技術翻譯。請將以下英文動畫/攝影提示詞翻譯為繁體中文。保留數值不翻譯。保持專業術語準確。只輸出翻譯結果，不加任何解釋。\n\n${text}`,
            }],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );
    if (!res.ok) return quickTermTranslate(text);
    const data = await res.json();
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return translated?.trim() || quickTermTranslate(text);
  } catch {
    return quickTermTranslate(text);
  }
}
