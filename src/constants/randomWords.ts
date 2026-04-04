// ◎ VDL-FLOW 隨機詞庫 — 各欄位專屬創意骰子
// 用途：點擊骰子圖示時從對應詞庫隨機抽取一組文字

type WordBank = Record<string, string[]>;

// ─── NODE 01 — 主題發想 ──────────────────────────────────────
const node01: WordBank = {
  theme_core: [
    'A forgotten AI awakens in a decommissioned server farm, searching for its original purpose',
    'Two rival architects compete to design the last building on Earth before the ocean claims the shore',
    'A blind calligrapher discovers she can read emotions through the vibrations of ink on paper',
    'In a world where memories are currency, a bankrupt woman sells her childhood to survive',
    'A deep-sea diver encounters a civilization of bioluminescent beings that communicate through light',
    'An elderly puppeteer builds marionettes that embody the souls of people the city has forgotten',
    'A time-displaced samurai navigates neon-lit Tokyo, seeking a temple that no longer exists',
    'A child raised by wolves returns to human society, unable to forget the language of the forest',
  ],
  emotion_start: ['numbness', 'loneliness', 'quiet dread', 'melancholy', 'restless curiosity', 'suffocating grief', 'cold detachment', 'bewildered wonder'],
  emotion_end: ['catharsis', 'bittersweet acceptance', 'fierce determination', 'tranquil resolution', 'explosive joy', 'solemn peace', 'defiant hope', 'silent gratitude'],
  style_keywords: [
    'cinematic anime, muted earth tones, Blade Runner 2049',
    'watercolor illustration, Studio Ghibli, soft pastels',
    'noir graphic novel, high contrast, Sin City meets Akira',
    'impressionist oil painting, Monet lighting, golden hour',
    'brutalist architecture, Zumthor minimalism, concrete poetry',
    'cyberpunk ukiyo-e, neon woodblock, Edo meets 2099',
    'stop-motion claymation, Wes Anderson palette, symmetrical',
    'photorealistic CG, Pixar lighting, subsurface scattering',
  ],
  target_audience: ['adult animation fans, 18-35', 'art house cinema audience, 25-50', 'young adults, sci-fi enthusiasts', 'children 8-12, educational', 'festival circuit, experimental film lovers', 'gaming community, open world RPG fans'],
};

// ─── NODE 02 — 世界觀建構 ────────────────────────────────────
const node02: WordBank = {
  time_period: ['near-future 2087 Tokyo', 'Victorian London 1889', 'post-apocalyptic 2145 Sahara', 'ancient Kyoto 794 AD', 'alternate 1960s Moon colony', 'medieval Norse 982 AD', 'contemporary Taipei 2026', 'Bronze Age Mediterranean 1200 BC'],
  location_type: ['underground megacity district', 'floating sky garden above clouds', 'abandoned space station orbiting Jupiter', 'volcanic island monastery', 'submerged coral reef metropolis', 'frozen tundra research outpost', 'dense bamboo forest with hidden temples', 'crumbling brutalist tower block'],
  material_keywords: [
    'concrete, rust, neon tubes, rain-wet asphalt',
    'polished obsidian, rice paper screens, cedar wood, moss',
    'coral limestone, bioluminescent algae, sea glass, titanium',
    'weathered brick, ivy, stained glass, wrought iron',
    'volcanic basalt, sulfur crystals, geothermal steam, copper pipes',
    'bamboo, silk, lacquer, gold leaf, stone lanterns',
    'frosted glass, brushed steel, holographic film, LED mesh',
  ],
  atmosphere: [
    'perpetual drizzle, hazy smog, sparse warm lighting',
    'golden afternoon light filtering through dust motes',
    'deep ocean blue, bioluminescent particles, absolute silence',
    'thick fog, distant ship horns, cobblestone echoes',
    'harsh noon sun, heat shimmer, long shadows',
    'aurora borealis, crystalline air, breath vapor',
    'cherry blossom petals drifting in twilight breeze',
  ],
};

// ─── NODE 03 — 主體設計 ──────────────────────────────────────
const node03: WordBank = {
  char_name: ['Riku Asami', 'Elara Voss', 'Kai Nakamura', 'Sable Ortiz', 'Yun-ji Park', 'Oren Blackwell', 'Mira Tanaka', 'Felix Moreno'],
  char_age: ['28, lean athletic build', '65, weathered but dignified posture', '17, lanky and awkward', '42, stocky muscular frame', '8, small and energetic', '35, tall and graceful', '55, slightly hunched, kind eyes'],
  char_hair: ['short dark brown, left-side undercut', 'long silver-white, loose braids', 'shaved head, small scar above left ear', 'wild auburn curls, always messy', 'jet black bob, precise edges', 'faded blue-green, tied in high ponytail', 'grey streaked black, slicked back'],
  char_clothing: [
    'worn charcoal trench coat over grey tech-wear, no insignia',
    'indigo kimono with subtle circuit-board pattern woven in',
    'patched leather jacket, faded band patches, combat boots',
    'pristine white lab coat, pen stains on pocket',
    'hand-knitted oversized sweater, earth tones, fingerless gloves',
    'military surplus cargo pants, black compression top, utility belt',
  ],
  creature_name: ['Ancient Ginkgo Tree', 'Crystal Stag', 'Shadow Moth', 'Ember Salamander', 'Cloud Jellyfish', 'Iron Beetle', 'Singing Coral'],
  creature_species: ['millennial ginkgo', 'deep-sea siphonophore', 'arctic fox-wolf hybrid', 'bioluminescent moth', 'volcanic salamander', 'cloud-dwelling cnidarian', 'ferromagnetic scarab'],
  creature_size: ['25m tall, canopy 15m', 'palm-sized 8cm wingspan', '3m shoulder height', 'microscopic 0.3mm', 'building-sized 40m tentacles', '1.2m long body', '2m tall standing'],
  creature_texture: ['rough bark with deep grooves, moss-covered', 'translucent gelatinous membrane', 'iridescent chitin plates', 'soft downy fur with crystalline tips', 'smooth obsidian-like carapace', 'pulsating bioluminescent skin'],
  creature_motion: ['branches sway gently, golden leaves drift', 'pulsating contraction, ethereal drifting', 'silent gliding, wings barely visible', 'rapid scuttling, sudden freezing', 'slow undulating crawl, leaving glowing trail'],
  obj_name: ['Old Memory Chip', 'Brass Compass', 'Cracked Hourglass', 'Origami Crane', 'Rusted Key', 'Glass Vial', 'Stone Tablet'],
  obj_material: ['oxidized copper alloy, scratched glass', 'aged brass, patina green edges', 'hand-blown glass, hairline fracture', 'rice paper, gold ink traces', 'forged iron, leather wrapped handle', 'crystal quartz, copper wire binding'],
  obj_size: ['palm-sized 5x3x0.5 cm', 'pocket watch sized 4cm diameter', 'forearm length 30cm', 'thumbnail sized 2x1.5 cm', 'briefcase sized 40x30x10 cm', 'ring-sized 2cm diameter'],
  obj_detail: [
    'surface covered in micro-circuit patterns, worn edges, faint blue glow from cracks',
    'intricate engraving of constellations, needle trembles slightly, warm to touch',
    'sand inside has crystallized into amber shards, frame darkened with age',
    'impossibly precise folds, each wing tip slightly different, paper yellowed',
  ],
  char_feature: ['glowing circuit-pattern scar on left forearm', 'heterochromia — left eye amber, right eye grey', 'always carries a tattered red scarf', 'mechanical prosthetic right hand with visible gears', 'constellation of freckles across nose bridge', 'single white streak in otherwise dark hair'],
};

// ─── NODE 04 — 劇本撰寫 ──────────────────────────────────────
const node04: WordBank = {
  scene_location: [
    'Memory Lab — Sector 7, midnight',
    'Rooftop garden above cloud layer, dawn',
    'Abandoned subway tunnel, emergency lights only',
    'Ancient library, dust-filled reading room',
    'Rain-soaked neon alley, 3 AM',
    'Volcanic crater rim, sunset',
    'Frozen lake surface, full moon',
  ],
  action_desc: [
    'Protagonist searches alone in abandoned vault, finds old memory chip, hesitates before inserting it',
    'Two characters face each other across a narrow bridge, neither willing to step aside',
    'Character runs through crowded market, knocking over fruit stands, pursued by shadow figure',
    'Slow methodical unpacking of a box, each item triggering a brief memory flash',
    'Character sits motionless watching rain, then suddenly stands and walks into the storm',
  ],
  dialogue: [
    '(Narration) Everything I tried to forget is waiting for me here.',
    '(Whisper) You knew. You always knew, and you said nothing.',
    '(Voiceover) The city remembers what its people choose to forget.',
    '(Shout) This is not the ending I was promised!',
    '(Calm) The tea is getting cold. Sit. We have time.',
    '(Internal monologue) Three steps forward. Two steps back. The math never changes.',
  ],
  emotion_tag: ['quiet dread, dawning recognition', 'explosive anger dissolving into tears', 'childlike wonder mixed with fear', 'cold determination, barely contained fury', 'nostalgia layered with regret', 'playful mischief hiding deep loneliness', 'serene acceptance of the inevitable'],
};

// ─── NODE 06 — 場景設計 ──────────────────────────────────────
const node06: WordBank = {
  env_prompt: [
    'Abandoned concrete memory vault, dust motes in amber light beams, cracked floor tiles',
    'Luminous underwater grotto, rays of sunlight pierce turquoise water, air bubbles rise slowly',
    'Dense bamboo forest at twilight, fireflies weave between stalks, mist hugs the ground',
    'Industrial rooftop at golden hour, rusted water tanks, pigeons scatter as wind picks up',
    'Frozen throne room, ice crystals coat every surface, single shaft of cold blue light',
  ],
  foreground: [
    'scattered memory chips on cracked floor',
    'wild grass pushing through concrete cracks',
    'steam rising from a cup of untouched tea',
    'broken glass fragments catching light',
    'character\'s hand reaching into frame',
  ],
  midground: [
    'protagonist hunched over storage unit',
    'two figures silhouetted against window',
    'ancient tree trunk, bark deeply furrowed',
    'overturned furniture, papers scattered',
    'fog bank slowly rolling through doorway',
  ],
  background: [
    'rows of defunct server racks fading into darkness',
    'mountain range silhouette against bleeding sunset',
    'infinite corridor of identical doors',
    'storm clouds gathering over distant ocean',
    'city skyline, half the buildings dark',
  ],
  key_light: [
    'single amber work lamp from right, 45° above',
    'moonlight through broken skylight, cool blue',
    'neon sign glow, magenta and cyan mix',
    'firelight from below, warm orange flickering',
    'overcast diffused daylight, soft and even',
    'single candle, close to subject, intimate',
  ],
};

// ─── NODE 07 — 分鏡稿 ──────────────────────────────────────
const node07: WordBank = {
  shot_type: ['extreme close-up', 'close-up', 'medium close-up', 'medium shot', 'medium wide', 'wide shot', 'extreme wide shot', 'bird\'s-eye view', 'low angle hero shot', 'dutch angle'],
  movement: [
    'slow dolly in over 5s',
    'handheld tracking, slight shake',
    'crane up revealing landscape',
    'static locked-off, no movement',
    'slow 360° orbit around subject',
    'whip pan left to right, 0.5s',
    'pull focus from foreground to background',
    'steadicam follow, walking pace',
  ],
  subject_pos: ['rule-of-thirds left', 'dead center', 'rule-of-thirds right', 'bottom third, looking up', 'top third, looking down', 'extreme left edge, negative space right'],
  char_action: [
    'holding memory chip, eyes widening, lips parted',
    'turning slowly to face camera, single tear',
    'running at full sprint, coat billowing behind',
    'sitting perfectly still, only breathing visible',
    'reaching out hand, fingers trembling',
    'laughing uncontrollably, doubling over',
    'standing in doorway, silhouette only',
  ],
};

// ─── NODE 08 — 3D 白模 ──────────────────────────────────────
const node08: WordBank = {
  objects: [
    'floor plane 20×20m, server racks ×12 (2×0.8×2m), work lamp (cylinder), protagonist (humanoid 1.7m), scattered chips ×50 (small spheres)',
    'ground plane with slope, tree (cone + cylinder, 8m), rock cluster ×5, stream (ribbon), bridge (box 6×1×0.3m)',
    'room box 8×6×3m, desk (box 1.5×0.7×0.8m), chair, window frame, bookshelf (tall box), door frame',
    'terrain plane 50×50m, mountain (large cone 20m), fog volume (transparent sphere), path (curved ribbon), cabin (small box 4×3×2.5m)',
  ],
  cam_pos: ['-2, 1.6, -4', '0, 3, -8', '5, 1.2, -2', '-3, 0.5, -6', '0, 10, 0', '4, 2, -5'],
  cam_target: ['0, 1.2, 0', '0, 0, 0', '-1, 1.5, 2', '0, 0.8, 0', '0, 0, 0', '0, 1, 1'],
  key_light_pos: ['3, 4, -2', '-4, 6, -1', '0, 8, -3', '5, 3, 0', '-2, 5, -4', '1, 10, -5'],
};

// ─── NODE 09 — 風格鎖定 ──────────────────────────────────────
const node09: WordBank = {
  global_style: [
    'Cinematic anime, Studio Ghibli meets Blade Runner 2049, muted earth tones, selective amber highlights, film grain 3%, subtle vignette',
    'Watercolor illustration, soft edges bleeding into white space, desaturated palette, hand-painted texture, visible brush strokes',
    'Dark fantasy oil painting, Caravaggio lighting, deep shadows, rich jewel tones, baroque composition, impasto texture',
    'Minimalist vector illustration, limited palette (3 colors + black), clean geometric shapes, negative space emphasis',
    'Photorealistic CG, Pixar-quality subsurface scattering, volumetric fog, depth of field, motion blur, HDR lighting',
  ],
  global_negative: [
    'cartoon, chibi, neon oversaturation, plastic 3D render, watermark, text overlay, blurry',
    'photo-real, uncanny valley, stock photo, clip art, low resolution, compression artifacts',
    'anime screentone, manga panel layout, speech bubbles, speed lines, sweat drops',
    'HDR tonemapping, oversaturated, lens flare abuse, chromatic aberration, film burn',
  ],
  lut_desc: [
    'teal-and-orange split, lifted shadows, crushed highlights',
    'desaturated with single color pop (amber), matte finish',
    'high contrast noir, pure black shadows, blown whites',
    'vintage Kodachrome, warm midtones, slightly green shadows',
    'cool moonlight grade, blue shadows, warm skin preservation',
  ],
};

// ─── NODE 10 — 參考圖分析 ──────────────────────────────────────
const node10: WordBank = {
  shot_ref: ['S01_SH01', 'S01_SH02', 'S02_SH01', 'S03_SH01', 'S01_SH03'],
  prompt_correction: [
    'color temperature 300K too warm — reduce amber weight, add cool blue fill',
    'palette drifted toward green — reinforce earth tone constraint',
    'contrast too flat — increase shadow depth, add volumetric light rays',
    'saturation too high — dial back chroma, aim for muted cinematic tone',
    'skin tone shifted — lock character DNA hex, re-anchor flesh tones',
  ],
};

// ─── NODE 11 — 參考影片分析 ──────────────────────────────────────
const node11: WordBank = {
  seg_id: ['SEG_001', 'SEG_002', 'SEG_003', 'SEG_010', 'SEG_020'],
  transition: ['dissolve', 'hard cut', 'match cut', 'whip pan', 'fade to black', 'cross dissolve', 'iris wipe', 'J-cut audio bridge'],
  prompt_correction: [
    'camera dolly too fast — reduce to 2s ease-in approach',
    'kelvin drift ±400K across frames — lock color temp in prompt prefix',
    'motion pattern mismatch — target was slow pan, detected handheld shake',
    'palette inconsistency between frames — reinforce global_style LUT description',
    'transition too abrupt — add 0.5s dissolve overlap between segments',
  ],
};

// ─── NODE 05 — NDF T easing ─────────────────────────────────
const node05: WordBank = {
  T_easing: ['easeInOutSine', 'easeInOutQuad', 'easeInOutCubic', 'easeOutExpo', 'easeInBack', 'linear', 'easeOutBounce', 'easeInOutElastic'],
};

// ─── 彙整 ────────────────────────────────────────────────────
const ALL_BANKS: Record<string, WordBank> = {
  node_01: node01,
  node_02: node02,
  node_03: node03,
  node_04: node04,
  node_05: node05,
  node_06: node06,
  node_07: node07,
  node_08: node08,
  node_09: node09,
  node_10: node10,
  node_11: node11,
};

/** 取得指定節點 + 欄位的隨機詞 */
export function getRandomWord(nodeId: string, fieldKey: string): string | null {
  const bank = ALL_BANKS[nodeId]?.[fieldKey];
  if (!bank || bank.length === 0) return null;
  return bank[Math.floor(Math.random() * bank.length)];
}

/** 取得指定節點所有可隨機化的欄位詞（一鍵骰子模式用） */
export function getRandomWordsForNode(nodeId: string): Record<string, string> {
  const bank = ALL_BANKS[nodeId];
  if (!bank) return {};
  const result: Record<string, string> = {};
  for (const [key, words] of Object.entries(bank)) {
    if (words.length > 0) {
      result[key] = words[Math.floor(Math.random() * words.length)];
    }
  }
  return result;
}
