// ◎ VDL-FLOW 12 節點定義表 + 生成端選項 (i18n 版)

import type { NodeDef } from '../types/vdl';
import type { TFunction } from '../i18n/context';

// ─── 靜態 NODE_DEFS（向下相容，使用預設中文）────────────────
// 注意：promptTemplate 產生 AI 提示詞，保持英文不翻譯

export function getNodeDefs(t: TFunction): NodeDef[] {
  return [
    {
      id: 'node_01', step: 1,
      title: t('node.01.title'),
      description: t('node.01.desc'),
      fields: [
        { key: 'theme_core',      label: t('field.theme_core.label'),      type: 'textarea', placeholder: t('field.theme_core.placeholder') },
        { key: 'emotion_start',   label: t('field.emotion_start.label'),   type: 'text',     placeholder: t('field.emotion_start.placeholder') },
        { key: 'emotion_end',     label: t('field.emotion_end.label'),     type: 'text',     placeholder: t('field.emotion_end.placeholder') },
        { key: 'style_keywords',  label: t('field.style_keywords.label'),  type: 'text',     placeholder: t('field.style_keywords.placeholder') },
        { key: 'target_audience', label: t('field.target_audience.label'), type: 'text',     placeholder: t('field.target_audience.placeholder') },
        { key: 'total_duration',  label: t('field.total_duration.label'),  type: 'number',   placeholder: '120' }
      ],
      locks: ['style_keywords', 'emotion_start', 'emotion_end', 'theme_core'],
      promptTemplate: (v) =>
        `Create a ${v.total_duration}s animated film about "${v.theme_core}". ` +
        `The emotional journey moves from ${v.emotion_start} to ${v.emotion_end}. ` +
        `Visual style: ${v.style_keywords}. Target audience: ${v.target_audience}.`
    },
    {
      id: 'node_02', step: 2,
      title: t('node.02.title'),
      description: t('node.02.desc'),
      fields: [
        { key: 'time_period',       label: t('field.time_period.label'),       type: 'text',   placeholder: t('field.time_period.placeholder') },
        { key: 'location_type',     label: t('field.location_type.label'),     type: 'text',   placeholder: t('field.location_type.placeholder') },
        { key: 'dominant_palette',  label: t('field.dominant_palette.label'),  type: 'text',   placeholder: '#1a1a2e, #16213e, #e94560, #f5e6d3, #c8b8a2', fieldVariant: 'palette', noDice: true },
        { key: 'kelvin_min',        label: t('field.kelvin_min.label'),        type: 'number', placeholder: '2800', noDice: true },
        { key: 'kelvin_max',        label: t('field.kelvin_max.label'),        type: 'number', placeholder: '6500', noDice: true },
        { key: 'material_keywords', label: t('field.material_keywords.label'), type: 'text',   placeholder: t('field.material_keywords.placeholder') },
        { key: 'atmosphere',        label: t('field.atmosphere.label'),        type: 'text',   placeholder: t('field.atmosphere.placeholder') }
      ],
      locks: ['dominant_palette', 'kelvin_min', 'kelvin_max', 'material_keywords'],
      promptTemplate: (v) =>
        `World setting: ${v.time_period}, ${v.location_type}. ` +
        `Environment defined by ${v.material_keywords}, color palette [${v.dominant_palette}], ` +
        `color temperature range ${v.kelvin_min}K–${v.kelvin_max}K, ${v.atmosphere}.`
    },
    {
      id: 'node_03', step: 3,
      title: t('node.03.title'),
      description: t('node.03.desc'),
      fields: [
        // ── 主體類型選擇 ──
        { key: 'subject_type', label: t('field.subject_type.label'), type: 'select', placeholder: t('field.subject_type.placeholder'), options: [t('field.subject_type.character'), t('field.subject_type.creature'), t('field.subject_type.object')] },
        // ── 角色專用欄位 ──
        { key: 'char_name',     label: t('field.char_name.label'),     type: 'text', placeholder: t('field.char_name.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] } },
        { key: 'char_age',      label: t('field.char_age.label'),      type: 'text', placeholder: t('field.char_age.placeholder'),      showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] } },
        { key: 'char_hair',     label: t('field.char_hair.label'),     type: 'text', placeholder: t('field.char_hair.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] } },
        { key: 'char_skin',     label: t('field.char_skin.label'),     type: 'text', placeholder: '#D4A574', fieldVariant: 'color', noDice: true, showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] } },
        { key: 'char_clothing', label: t('field.char_clothing.label'), type: 'text', placeholder: t('field.char_clothing.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] } },
        // ── 生物專用欄位 ──
        { key: 'creature_name',    label: t('field.creature_name.label'),    type: 'text',     placeholder: t('field.creature_name.placeholder'),    showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] } },
        { key: 'creature_species', label: t('field.creature_species.label'), type: 'text',     placeholder: t('field.creature_species.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] } },
        { key: 'creature_size',    label: t('field.creature_size.label'),    type: 'text',     placeholder: t('field.creature_size.placeholder'),    showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] } },
        { key: 'creature_color',   label: t('field.creature_color.label'),   type: 'text',     placeholder: '#4A7C59', fieldVariant: 'color', noDice: true, showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] } },
        { key: 'creature_texture', label: t('field.creature_texture.label'), type: 'text',     placeholder: t('field.creature_texture.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] } },
        { key: 'creature_motion',  label: t('field.creature_motion.label'),  type: 'textarea', placeholder: t('field.creature_motion.placeholder'),  showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] } },
        // ── 物品專用欄位 ──
        { key: 'obj_name',     label: t('field.obj_name.label'),     type: 'text',     placeholder: t('field.obj_name.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] } },
        { key: 'obj_material', label: t('field.obj_material.label'), type: 'text',     placeholder: t('field.obj_material.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] } },
        { key: 'obj_size',     label: t('field.obj_size.label'),     type: 'text',     placeholder: t('field.obj_size.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] } },
        { key: 'obj_color',    label: t('field.obj_color.label'),    type: 'text',     placeholder: '#B8860B', fieldVariant: 'color', noDice: true, showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] } },
        { key: 'obj_detail',   label: t('field.obj_detail.label'),   type: 'textarea', placeholder: t('field.obj_detail.placeholder'),   showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] } },
        // ── 共用欄位 ──
        { key: 'char_accent',  label: t('field.char_accent.label'),  type: 'text', placeholder: '#E94560', fieldVariant: 'color', noDice: true },
        { key: 'char_feature', label: t('field.char_feature.label'), type: 'text', placeholder: t('field.char_feature.placeholder') }
      ],
      locks: ['subject_type', 'char_name', 'creature_name', 'obj_name', 'char_skin', 'creature_color', 'obj_color', 'char_clothing', 'creature_texture', 'obj_material', 'char_accent', 'char_feature'],
      promptTemplate: (v) => {
        const type = String(v.subject_type || '');
        if (type.includes('生物') || type.toLowerCase().includes('creature')) {
          return `Creature "${v.creature_name}": ${v.creature_species}, ${v.creature_size}, ` +
            `color ${v.creature_color}, texture: ${v.creature_texture}. ` +
            `Motion: ${v.creature_motion}. Accent color ${v.char_accent}. ` +
            `Distinguishing: ${v.char_feature}.`;
        }
        if (type.includes('物品') || type.toLowerCase().includes('object')) {
          return `Object "${v.obj_name}": ${v.obj_material}, ${v.obj_size}, ` +
            `color ${v.obj_color}. Detail: ${v.obj_detail}. ` +
            `Accent color ${v.char_accent}. Distinguishing: ${v.char_feature}.`;
        }
        return `Character "${v.char_name}": ${v.char_age}, ${v.char_hair}, skin tone ${v.char_skin}, ` +
          `wearing ${v.char_clothing}, accent color ${v.char_accent}. ` +
          `Distinguishing: ${v.char_feature}.`;
      }
    },
    {
      id: 'node_04', step: 4,
      title: t('node.04.title'),
      description: t('node.04.desc'),
      fields: [
        { key: 'scene_id',       label: t('field.scene_id.label'),       type: 'text',     placeholder: 'S01' },
        { key: 'scene_location', label: t('field.scene_location.label'), type: 'text',     placeholder: t('field.scene_location.placeholder') },
        { key: 'action_desc',    label: t('field.action_desc.label'),    type: 'textarea', placeholder: t('field.action_desc.placeholder') },
        { key: 'dialogue',       label: t('field.dialogue.label'),       type: 'textarea', placeholder: t('field.dialogue.placeholder') },
        { key: 'emotion_tag',    label: t('field.emotion_tag.label'),    type: 'text',     placeholder: t('field.emotion_tag.placeholder') },
        { key: 'ndf_T',          label: t('field.ndf_T.label'),          type: 'number',   placeholder: '0.55' },
        { key: 'ndf_E',          label: t('field.ndf_E.label'),          type: 'number',   placeholder: '0.60' },
        { key: 'scene_duration', label: t('field.scene_duration.label'), type: 'number',   placeholder: '10' }
      ],
      locks: ['scene_id', 'scene_location', 'ndf_T', 'ndf_E'],
      promptTemplate: (v) =>
        `Scene ${v.scene_id}: ${v.scene_location}. ` +
        `${v.action_desc} ${v.dialogue} ` +
        `Mood: ${v.emotion_tag}. NDF targets: T=${v.ndf_T}, E=${v.ndf_E}. Duration: ${v.scene_duration}s.`
    },
    {
      id: 'node_05', step: 5,
      title: t('node.05.title'),
      description: t('node.05.desc'),
      fields: [
        { key: 'T_start',  label: t('field.T_start.label'),  type: 'number', placeholder: '0.30' },
        { key: 'T_end',    label: t('field.T_end.label'),    type: 'number', placeholder: '0.65' },
        { key: 'T_easing', label: t('field.T_easing.label'), type: 'text',   placeholder: t('field.T_easing.placeholder') },
        { key: 'E_start',  label: t('field.E_start.label'),  type: 'number', placeholder: '0.25' },
        { key: 'E_end',    label: t('field.E_end.label'),    type: 'number', placeholder: '0.60' },
        { key: 'I_start',  label: t('field.I_start.label'),  type: 'number', placeholder: '0.10' },
        { key: 'I_end',    label: t('field.I_end.label'),    type: 'number', placeholder: '0.30' },
        { key: 'C_end',    label: t('field.C_end.label'),    type: 'number', placeholder: '0.70' }
      ],
      locks: ['T_end', 'E_end', 'I_end', 'C_end'],
      promptTemplate: (v) => {
        const te = (Number(v.T_end) * Number(v.E_end)).toFixed(3);
        const pass = Number(te) >= 0.35;
        return `NDF curve: T=${v.T_start}→${v.T_end} (${v.T_easing}), ` +
          `E=${v.E_start}→${v.E_end}, I=${v.I_start}→${v.I_end}, C_end=${v.C_end}. ` +
          `Validation: T×E=${te} ${pass ? t('field.node05.passThreshold') : t('field.node05.failThreshold')}`;
      }
    },
    {
      id: 'node_06', step: 6,
      title: t('node.06.title'),
      description: t('node.06.desc'),
      fields: [
        { key: 'env_prompt',  label: t('field.env_prompt.label'),  type: 'textarea', placeholder: t('field.env_prompt.placeholder') },
        { key: 'kelvin',      label: t('field.kelvin.label'),      type: 'number',   placeholder: '3800' },
        { key: 'ev',          label: t('field.ev.label'),          type: 'number',   placeholder: '-0.5' },
        { key: 'contrast',    label: t('field.contrast.label'),    type: 'number',   placeholder: '0.72' },
        { key: 'saturation',  label: t('field.saturation.label'),  type: 'number',   placeholder: '0.55' },
        { key: 'foreground',  label: t('field.foreground.label'),  type: 'text',     placeholder: t('field.foreground.placeholder') },
        { key: 'midground',   label: t('field.midground.label'),   type: 'text',     placeholder: t('field.midground.placeholder') },
        { key: 'background',  label: t('field.background.label'),  type: 'text',     placeholder: t('field.background.placeholder') },
        { key: 'key_light',   label: t('field.key_light.label'),   type: 'text',     placeholder: t('field.key_light.placeholder') }
      ],
      locks: ['kelvin', 'ev', 'contrast', 'saturation'],
      promptTemplate: (v) =>
        `${v.env_prompt} Key light: ${v.key_light}. ` +
        `Color temperature ${v.kelvin}K, EV ${v.ev}, contrast ${v.contrast}, saturation ${v.saturation}. ` +
        `Depth: ${v.foreground} in front, ${v.midground} center, ${v.background} behind.`
    },
    {
      id: 'node_07', step: 7,
      title: t('node.07.title'),
      description: t('node.07.desc'),
      fields: [
        { key: 'shot_id',     label: t('field.shot_id.label'),     type: 'text',   placeholder: 'S01_SH01' },
        { key: 'shot_type',   label: t('field.shot_type.label'),   type: 'text',   placeholder: t('field.shot_type.placeholder') },
        { key: 'focal_mm',    label: t('field.focal_mm.label'),    type: 'number', placeholder: '50' },
        { key: 'aperture',    label: t('field.aperture.label'),    type: 'number', placeholder: '2.0' },
        { key: 'movement',    label: t('field.movement.label'),    type: 'text',   placeholder: t('field.movement.placeholder') },
        { key: 'subject_pos', label: t('field.subject_pos.label'), type: 'text',   placeholder: t('field.subject_pos.placeholder') },
        { key: 'neg_space',   label: t('field.neg_space.label'),   type: 'number', placeholder: '0.35' },
        { key: 'char_action', label: t('field.char_action.label'), type: 'text',   placeholder: t('field.char_action.placeholder') }
      ],
      locks: ['shot_id'],
      promptTemplate: (v) =>
        `${v.shot_type} shot, ${v.focal_mm}mm f/${v.aperture}, shallow depth of field, ${v.movement}. ` +
        `Subject ${v.subject_pos}, ${v.neg_space} negative space. ` +
        `Character: ${v.char_action}.`
    },
    {
      id: 'node_08', step: 8,
      title: t('node.08.title'),
      description: t('node.08.desc'),
      fields: [
        { key: 'objects',       label: t('field.objects.label'),       type: 'textarea', placeholder: t('field.objects.placeholder') },
        { key: 'cam_pos',       label: t('field.cam_pos.label'),       type: 'text',     placeholder: '-2, 1.6, -4' },
        { key: 'cam_target',    label: t('field.cam_target.label'),    type: 'text',     placeholder: '0, 1.2, 0' },
        { key: 'key_light_pos', label: t('field.key_light_pos.label'), type: 'text',     placeholder: '3, 4, -2' }
      ],
      locks: [],
      promptTemplate: (v) =>
        `3D blockout: ${v.objects}. ` +
        `Camera at (${v.cam_pos}) looking at (${v.cam_target}). ` +
        `Key light at (${v.key_light_pos}). All objects white material, no textures. ` +
        `Focus on spatial composition and depth layering only.`
    },
    {
      id: 'node_09', step: 9,
      title: t('node.09.title'),
      description: t('node.09.desc'),
      fields: [
        { key: 'global_style',    label: t('field.global_style.label'),    type: 'textarea', placeholder: t('field.global_style.placeholder') },
        { key: 'global_negative', label: t('field.global_negative.label'), type: 'textarea', placeholder: t('field.global_negative.placeholder') },
        { key: 'lut_desc',        label: t('field.lut_desc.label'),        type: 'text',     placeholder: t('field.lut_desc.placeholder') },
        { key: 'grain',           label: t('field.grain.label'),           type: 'number',   placeholder: '0.03' },
        { key: 'vignette',        label: t('field.vignette.label'),        type: 'number',   placeholder: '0.12' },
        { key: 'hue_shift',       label: t('field.hue_shift.label'),       type: 'number',   placeholder: '-5' }
      ],
      locks: ['global_style', 'global_negative', 'lut_desc', 'grain', 'vignette', 'hue_shift'],
      promptTemplate: (v) =>
        `[STYLE LOCK PREFIX]\n` +
        `${v.global_style} Color grading: ${v.lut_desc}. ` +
        `Film grain ${v.grain}, vignette ${v.vignette}, hue shift ${v.hue_shift}°.\n` +
        `Negative: ${v.global_negative}`
    },
    {
      id: 'node_10', step: 10,
      title: t('node.10.title'),
      description: t('node.10.desc'),
      fields: [
        { key: 'shot_ref',            label: t('field.shot_ref.label'),            type: 'text',     placeholder: 'S01_SH01' },
        { key: 'detected_kelvin',     label: t('field.detected_kelvin.label'),     type: 'number',   placeholder: '5500' },
        { key: 'detected_palette',    label: t('field.detected_palette.label'),    type: 'text',     placeholder: '#1a1a2e, #16213e, #e94560', fieldVariant: 'palette', noDice: true },
        { key: 'detected_contrast',   label: t('field.detected_contrast.label'),   type: 'number',   placeholder: '0.65' },
        { key: 'detected_saturation', label: t('field.detected_saturation.label'), type: 'number',   placeholder: '0.55' },
        { key: 'delta_kelvin_ref',    label: t('field.delta_kelvin_ref.label'),    type: 'number',   placeholder: '0' },
        { key: 'delta_palette_ref',   label: t('field.delta_palette_ref.label'),   type: 'number',   placeholder: '0' },
        { key: 'prompt_correction',   label: t('field.prompt_correction.label'),   type: 'textarea', placeholder: t('field.prompt_correction.placeholder') },
      ],
      locks: ['detected_kelvin', 'detected_palette'],
      promptTemplate: (v, locks) => {
        const L = locks ?? {};
        const style   = L.global_style?.value ? `[STYLE] ${L.global_style.value}\n` : '';
        const targetK = L.kelvin?.value ?? 'N/A';
        const targetP = L.dominant_palette?.value ?? 'N/A';
        const correction = v.prompt_correction ? `\n[CORRECTION] ${v.prompt_correction}` : '';
        return `[REF IMAGE ANALYSIS — ${v.shot_ref}]\n${style}` +
          `[DETECTED] Kelvin: ${v.detected_kelvin} | Palette: [${v.detected_palette}] | Contrast: ${v.detected_contrast} | Sat: ${v.detected_saturation}\n` +
          `[TARGET] Kelvin: ${targetK} | Palette: [${targetP}]\n` +
          `[DEVIATION] ΔK=${v.delta_kelvin_ref} ${Number(v.delta_kelvin_ref) > 500 ? '⚠' : '✓'} | ΔE=${v.delta_palette_ref} ${Number(v.delta_palette_ref) > 3.0 ? '⚠' : '✓'}${correction}`;
      }
    },
    {
      id: 'node_11', step: 11,
      title: t('node.11.title'),
      description: t('node.11.desc'),
      fields: [
        { key: 'seg_id',              label: t('field.seg_id.label'),              type: 'text',     placeholder: 'SEG_001' },
        { key: 'seg_duration',        label: t('field.seg_duration.label'),        type: 'number',   placeholder: '10' },
        { key: 'transition',          label: t('field.transition.label'),          type: 'text',     placeholder: t('field.transition.placeholder') },
        { key: 'frames_sampled',      label: t('field.frames_sampled.label'),      type: 'number',   placeholder: '3' },
        { key: 'kelvin_drift',        label: t('field.kelvin_drift.label'),        type: 'number',   placeholder: '0' },
        { key: 'palette_consistency', label: t('field.palette_consistency.label'), type: 'number',   placeholder: '0.95' },
        { key: 'motion_pattern',      label: t('field.motion_pattern.label'),      type: 'text',     placeholder: t('field.motion_pattern.placeholder') },
        { key: 'movement_match',      label: t('field.movement_match.label'),      type: 'number',   placeholder: '0.85' },
        { key: 'prompt_correction',   label: t('field.prompt_correction_v.label'), type: 'textarea', placeholder: t('field.prompt_correction_v.placeholder') },
      ],
      locks: [],
      promptTemplate: (v, locks) => {
        const L = locks ?? {};
        const style          = L.global_style?.value ? `[STYLE] ${L.global_style.value}\n` : '';
        const targetMovement = L.movement?.value ?? 'N/A';
        const correction     = v.prompt_correction ? `\n[CORRECTION] ${v.prompt_correction}` : '';
        return `[REF VIDEO ANALYSIS — ${v.seg_id} — ${v.seg_duration}s]\n${style}` +
          `[SAMPLED] ${v.frames_sampled} frames | Kelvin drift: ±${v.kelvin_drift}K | Palette consistency: ${v.palette_consistency}\n` +
          `[MOTION] Detected: ${v.motion_pattern} | Target: ${targetMovement} | Match: ${v.movement_match}\n` +
          `[TRANSITION] ${v.transition}${correction}`;
      }
    },
    {
      id: 'node_12', step: 12,
      title: t('node.12.title'),
      description: t('node.12.desc'),
      fields: [
        { key: 'delta_kelvin',     label: t('field.delta_kelvin.label'),     type: 'number', placeholder: '200' },
        { key: 'delta_e_color',    label: t('field.delta_e_color.label'),    type: 'number', placeholder: '1.8' },
        { key: 'clip_sim',         label: t('field.clip_sim.label'),         type: 'number', placeholder: '0.89' },
        { key: 'obj_recall',       label: t('field.obj_recall.label'),       type: 'number', placeholder: '0.92' },
        { key: 'depth_corr',       label: t('field.depth_corr.label'),       type: 'number', placeholder: '0.81' },
        { key: 'ndf_delta',        label: t('field.ndf_delta.label'),        type: 'number', placeholder: '0.05' },
        { key: 'fail_nodes',       label: t('field.fail_nodes.label'),       type: 'text',   placeholder: t('field.fail_nodes.placeholder') },
        { key: 'rendered_palette', label: t('field.rendered_palette.label'), type: 'text',   placeholder: '#1a1a2e,#16213e,#e94560,#f5e6d3,#c8b8a2', fieldVariant: 'palette', noDice: true },
        { key: 'target_palette',   label: t('field.target_palette.label'),   type: 'text',   placeholder: '#1a1a2e,#16213e,#e94560,#f5e6d3,#c8b8a2', fieldVariant: 'palette', noDice: true }
      ],
      locks: [],
      promptTemplate: (v) => {
        const pass =
          Number(v.delta_kelvin)  <= 800  &&
          Number(v.delta_e_color) <= 3.0  &&
          Number(v.clip_sim)      >= 0.85 &&
          Number(v.obj_recall)    >= 0.80 &&
          Number(v.depth_corr)    >= 0.75 &&
          Number(v.ndf_delta)     <= 0.10;
        return (
          `[QA REPORT]\n` +
          `ΔKelvin: ${v.delta_kelvin} ${Number(v.delta_kelvin)  <= 800  ? '✓' : '✗(>800)'}\n` +
          `ΔE Color: ${v.delta_e_color} ${Number(v.delta_e_color) <= 3.0  ? '✓' : '✗(>3.0)'}\n` +
          `CLIP Sim: ${v.clip_sim} ${Number(v.clip_sim)      >= 0.85 ? '✓' : '✗(<0.85)'}\n` +
          `Obj Recall: ${v.obj_recall} ${Number(v.obj_recall)    >= 0.80 ? '✓' : '✗(<0.80)'}\n` +
          `Depth Corr: ${v.depth_corr} ${Number(v.depth_corr)    >= 0.75 ? '✓' : '✗(<0.75)'}\n` +
          `NDF Delta: ${v.ndf_delta} ${Number(v.ndf_delta)     <= 0.10 ? '✓' : '✗(>0.10)'}\n` +
          `─────────────────────\n` +
          `${pass ? t('qa.report.status.pass') : t('qa.report.status.fail', { nodes: String(v.fail_nodes || t('qa.report.status.failPlaceholder')) })}`
        );
      }
    }
  ];
}

// ─── 向下相容：靜態 NODE_DEFS（使用 key 直接回傳）────────────
// 用於不在 React 元件中的場景（如測試）
import { zhTW } from '../i18n/zh-TW';
const fallbackT: TFunction = (key: string) => zhTW[key] ?? key;
export const NODE_DEFS: NodeDef[] = getNodeDefs(fallbackT);
