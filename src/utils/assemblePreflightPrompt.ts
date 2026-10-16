// ◎ 2026-04-08 — Preflight Prompt 聚合器
// 將 NODE 01-11 (image) 或 NODE 01-12 (video) 的所有設定聚合成結構化 prompt

import type { LockEntry } from '../types/vdl';

interface PreflightSection {
  label: string;
  content: string;
}

export interface PreflightResult {
  sections: PreflightSection[];
  assembled: string;
}

const V = (v: string | number | undefined) => (v === undefined || v === '' ? '—' : String(v));

export function assemblePreflightPrompt(
  type: 'image' | 'video',
  nodeValues: Record<string, Record<string, string | number>>,
  locks: Record<string, LockEntry>,
  allPrompts: Record<string, string>,
): PreflightResult {
  const sections: PreflightSection[] = [];

  // ── STYLE (NODE 01 + NODE 09) ──
  const n01 = nodeValues['node_01'] ?? {};
  const n09 = nodeValues['node_09'] ?? {};
  const styleParts: string[] = [];
  if (n01.theme_core) styleParts.push(`Theme: ${V(n01.theme_core)}`);
  if (n01.style_keywords || locks.style_keywords?.value) {
    styleParts.push(`Keywords: ${V(locks.style_keywords?.value ?? n01.style_keywords)}`);
  }
  if (n01.emotion_start || n01.emotion_end) {
    styleParts.push(`Emotion: ${V(n01.emotion_start)} → ${V(n01.emotion_end)}`);
  }
  if (n09.global_style || locks.global_style?.value) {
    styleParts.push(`Global Style: ${V(locks.global_style?.value ?? n09.global_style)}`);
  }
  if (n09.global_negative) styleParts.push(`Negative: ${V(n09.global_negative)}`);
  if (n09.lut_desc || locks.lut_desc?.value) {
    styleParts.push(`LUT: ${V(locks.lut_desc?.value ?? n09.lut_desc)}`);
  }
  if (styleParts.length > 0) {
    sections.push({ label: 'STYLE', content: styleParts.join('\n') });
  }

  // ── PALETTE (NODE 02) ──
  const n02 = nodeValues['node_02'] ?? {};
  const palette = locks.dominant_palette?.value ?? n02.dominant_palette;
  if (palette) {
    const paletteParts: string[] = [`Palette: ${V(palette)}`];
    const kelvinMin = locks.kelvin_min?.value ?? n02.kelvin_min;
    const kelvinMax = locks.kelvin_max?.value ?? n02.kelvin_max;
    if (kelvinMin || kelvinMax) paletteParts.push(`Kelvin Range: ${V(kelvinMin)}K – ${V(kelvinMax)}K`);
    if (n02.atmosphere) paletteParts.push(`Atmosphere: ${V(n02.atmosphere)}`);
    sections.push({ label: 'PALETTE', content: paletteParts.join('\n') });
  }

  // ── CHARACTER / SUBJECT (NODE 03) ──
  const n03 = nodeValues['node_03'] ?? {};
  if (n03.subject_type || n03.char_name || n03.creature_species || n03.obj_name) {
    const charParts: string[] = [];
    if (n03.subject_type) charParts.push(`Type: ${V(n03.subject_type)}`);
    // 角色
    if (n03.char_name) charParts.push(`Name: ${V(n03.char_name)}`);
    if (n03.char_clothing) charParts.push(`Clothing: ${V(n03.char_clothing)}`);
    if (n03.char_feature) charParts.push(`Feature: ${V(n03.char_feature)}`);
    if (n03.char_accent_color) charParts.push(`Accent: ${V(n03.char_accent_color)}`);
    // 生物
    if (n03.creature_species) charParts.push(`Species: ${V(n03.creature_species)}`);
    if (n03.creature_texture) charParts.push(`Texture: ${V(n03.creature_texture)}`);
    // 道具
    if (n03.obj_name) charParts.push(`Object: ${V(n03.obj_name)}`);
    if (n03.obj_material) charParts.push(`Material: ${V(n03.obj_material)}`);
    sections.push({ label: 'CHARACTER', content: charParts.join('\n') });
  }

  // ── SCENE (NODE 04 + NODE 06) ──
  const n04 = nodeValues['node_04'] ?? {};
  const n06 = nodeValues['node_06'] ?? {};
  const sceneParts: string[] = [];
  if (n04.scene_location) sceneParts.push(`Location: ${V(n04.scene_location)}`);
  if (n04.action_desc) sceneParts.push(`Action: ${V(n04.action_desc)}`);
  if (n06.kelvin || locks.kelvin?.value) sceneParts.push(`Kelvin: ${V(locks.kelvin?.value ?? n06.kelvin)}K`);
  if (n06.ev || locks.ev?.value) sceneParts.push(`EV: ${V(locks.ev?.value ?? n06.ev)}`);
  if (n06.contrast || locks.contrast?.value) sceneParts.push(`Contrast: ${V(locks.contrast?.value ?? n06.contrast)}`);
  if (n06.saturation || locks.saturation?.value) sceneParts.push(`Saturation: ${V(locks.saturation?.value ?? n06.saturation)}`);
  if (n06.env_prompt) sceneParts.push(`Environment: ${V(n06.env_prompt)}`);
  if (sceneParts.length > 0) {
    sections.push({ label: 'SCENE', content: sceneParts.join('\n') });
  }

  // ── CAMERA (NODE 07) ──
  const n07 = nodeValues['node_07'] ?? {};
  const camParts: string[] = [];
  if (n07.shot_type) camParts.push(`Shot: ${V(n07.shot_type)}`);
  if (n07.focal_mm || locks.focal_mm?.value) camParts.push(`Focal: ${V(locks.focal_mm?.value ?? n07.focal_mm)}mm`);
  if (n07.aperture || locks.aperture?.value) camParts.push(`Aperture: f/${V(locks.aperture?.value ?? n07.aperture)}`);
  if (n07.movement_type || locks.movement_type?.value) camParts.push(`Movement: ${V(locks.movement_type?.value ?? n07.movement_type)}`);
  if (camParts.length > 0) {
    sections.push({ label: 'CAMERA', content: camParts.join('\n') });
  }

  // ── SPATIAL (NODE 10) ──
  const n10 = nodeValues['node_10'] ?? {};
  const spatialParts: string[] = [];
  if (n10.objects) spatialParts.push(`Objects: ${V(n10.objects)}`);
  if (n10.cam_pos) spatialParts.push(`Camera Pos: ${V(n10.cam_pos)}`);
  if (n10.key_light_type) spatialParts.push(`Key Light: ${V(n10.key_light_type)} ${V(n10.key_light_kelvin)}K`);
  if (spatialParts.length > 0) {
    sections.push({ label: 'SPATIAL', content: spatialParts.join('\n') });
  }

  // ── IMAGE GEN (NODE 11) ──
  const n11 = nodeValues['node_11'] ?? {};
  if (n11.generator || n11.seed || n11.prompt_correction) {
    const imgParts: string[] = [];
    if (n11.generator) imgParts.push(`Generator: ${V(n11.generator)}`);
    if (n11.seed) imgParts.push(`Seed: ${V(n11.seed)}`);
    if (n11.prompt_correction) imgParts.push(`Correction: ${V(n11.prompt_correction)}`);
    sections.push({ label: 'IMAGE GEN', content: imgParts.join('\n') });
  }

  // ── VIDEO PARAMS (NODE 12, video only) ──
  if (type === 'video') {
    const n12 = nodeValues['node_12'] ?? {};
    const vidParts: string[] = [];
    if (n12.seg_id) vidParts.push(`Segment: ${V(n12.seg_id)}`);
    if (n12.seg_duration) vidParts.push(`Duration: ${V(n12.seg_duration)}s`);
    if (n12.transition) vidParts.push(`Transition: ${V(n12.transition)}`);
    if (n12.motion_pattern) vidParts.push(`Motion: ${V(n12.motion_pattern)}`);
    if (n12.video_gen) vidParts.push(`Generator: ${V(n12.video_gen)}`);
    if (n12.prompt_correction) vidParts.push(`Correction: ${V(n12.prompt_correction)}`);
    if (vidParts.length > 0) {
      sections.push({ label: 'VIDEO PARAMS', content: vidParts.join('\n') });
    }
  }

  // ── Assemble single copyable text ──
  const assembled = sections
    .map(s => `[${s.label}]\n${s.content}`)
    .join('\n\n');

  return { sections, assembled };
}
