// ◎ VDL-FLOW V2 14 節點定義表 + 生成端選項 (i18n 版)

import type { NodeDef } from '../types/vdl';
import type { TFunction } from '../i18n/context';

// promptTemplate 安全取值：undefined/空 → '—'
const V = (val: string | number | undefined): string =>
  (val === undefined || val === null || val === '') ? '—' : String(val);

// ─── 主要匯出：getNodeDefs(t) ──────────────────────────────

export function getNodeDefs(t: TFunction): NodeDef[] {
  return [
    // ═══════════════════════════════════════════════════════════
    // NODE 01 — Theme Genesis (creative)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_01', step: 1,
      title: t('node.01.title'),
      description: t('node.01.desc'),
      layer: 'creative',
      fields: [
        { key: 'theme_core',      label: t('field.theme_core.label'),      type: 'textarea', placeholder: t('field.theme_core.placeholder') },
        { key: 'emotion_start',   label: t('field.emotion_start.label'),   type: 'text',     placeholder: t('field.emotion_start.placeholder') },
        { key: 'emotion_end',     label: t('field.emotion_end.label'),     type: 'text',     placeholder: t('field.emotion_end.placeholder') },
        { key: 'style_keywords',  label: t('field.style_keywords.label'),  type: 'text',     placeholder: t('field.style_keywords.placeholder') },
        { key: 'target_audience', label: t('field.target_audience.label'), type: 'text',     placeholder: t('field.target_audience.placeholder'), visibility: 'advanced' },
        { key: 'total_duration',  label: t('field.total_duration.label'),  type: 'number',   placeholder: '120', visibility: 'advanced' }
      ],
      locks: ['style_keywords', 'emotion_start', 'emotion_end', 'theme_core'],
      promptTemplate: (v) =>
        `Create a ${V(v.total_duration) === '—' ? '120' : V(v.total_duration)}s animated film about "${V(v.theme_core)}". ` +
        `The emotional journey moves from ${V(v.emotion_start)} to ${V(v.emotion_end)}. ` +
        `Visual style: ${V(v.style_keywords)}.` +
        (v.target_audience ? ` Target audience: ${V(v.target_audience)}.` : '')
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 02 — World Building (creative)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_02', step: 2,
      title: t('node.02.title'),
      description: t('node.02.desc'),
      layer: 'creative',
      fields: [
        { key: 'time_period',       label: t('field.time_period.label'),       type: 'text',   placeholder: t('field.time_period.placeholder') },
        { key: 'location_type',     label: t('field.location_type.label'),     type: 'text',   placeholder: t('field.location_type.placeholder') },
        { key: 'dominant_palette',  label: t('field.dominant_palette.label'),  type: 'text',   placeholder: '#1a1a2e, #16213e, #e94560, #f5e6d3, #c8b8a2', fieldVariant: 'palette', noDice: true },
        { key: 'kelvin_min',        label: t('field.kelvin_min.label'),        type: 'number', placeholder: '2800', noDice: true, visibility: 'advanced' },
        { key: 'kelvin_max',        label: t('field.kelvin_max.label'),        type: 'number', placeholder: '6500', noDice: true, visibility: 'advanced' },
        { key: 'material_keywords', label: t('field.material_keywords.label'), type: 'text',   placeholder: t('field.material_keywords.placeholder'), visibility: 'advanced' },
        { key: 'atmosphere',        label: t('field.atmosphere.label'),        type: 'text',   placeholder: t('field.atmosphere.placeholder') }
      ],
      locks: ['dominant_palette', 'kelvin_min', 'kelvin_max', 'material_keywords'],
      promptTemplate: (v) =>
        `World setting: ${V(v.time_period)}, ${V(v.location_type)}. ` +
        `Environment defined by ${V(v.material_keywords)}, color palette [${V(v.dominant_palette)}], ` +
        `color temperature range ${V(v.kelvin_min)}K–${V(v.kelvin_max)}K, ${V(v.atmosphere)}.`
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 03 — Subject Design (creative)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_03', step: 3,
      title: t('node.03.title'),
      description: t('node.03.desc'),
      layer: 'creative',
      fields: [
        // ── 主體類型選擇 ──
        { key: 'subject_type', label: t('field.subject_type.label'), type: 'select', placeholder: t('field.subject_type.placeholder'), options: [t('field.subject_type.character'), t('field.subject_type.creature'), t('field.subject_type.object')] },
        // ── 角色專用欄位 ──
        { key: 'char_name',     label: t('field.char_name.label'),     type: 'text', placeholder: t('field.char_name.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] } },
        { key: 'char_age',      label: t('field.char_age.label'),      type: 'text', placeholder: t('field.char_age.placeholder'),      showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] }, visibility: 'advanced' },
        { key: 'char_hair',     label: t('field.char_hair.label'),     type: 'text', placeholder: t('field.char_hair.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] }, visibility: 'advanced' },
        { key: 'char_skin',     label: t('field.char_skin.label'),     type: 'text', placeholder: '#D4A574', fieldVariant: 'color', noDice: true, showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] }, visibility: 'advanced' },
        { key: 'char_clothing', label: t('field.char_clothing.label'), type: 'text', placeholder: t('field.char_clothing.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.character')] }, visibility: 'advanced' },
        // ── 生物專用欄位 ──
        { key: 'creature_name',    label: t('field.creature_name.label'),    type: 'text',     placeholder: t('field.creature_name.placeholder'),    showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] } },
        { key: 'creature_species', label: t('field.creature_species.label'), type: 'text',     placeholder: t('field.creature_species.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] }, visibility: 'advanced' },
        { key: 'creature_size',    label: t('field.creature_size.label'),    type: 'text',     placeholder: t('field.creature_size.placeholder'),    showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] }, visibility: 'advanced' },
        { key: 'creature_color',   label: t('field.creature_color.label'),   type: 'text',     placeholder: '#4A7C59', fieldVariant: 'color', noDice: true, showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] }, visibility: 'advanced' },
        { key: 'creature_texture', label: t('field.creature_texture.label'), type: 'text',     placeholder: t('field.creature_texture.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] }, visibility: 'advanced' },
        { key: 'creature_motion',  label: t('field.creature_motion.label'),  type: 'textarea', placeholder: t('field.creature_motion.placeholder'),  showWhen: { key: 'subject_type', values: [t('field.subject_type.creature')] }, visibility: 'advanced' },
        // ── 物品專用欄位 ──
        { key: 'obj_name',     label: t('field.obj_name.label'),     type: 'text',     placeholder: t('field.obj_name.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] } },
        { key: 'obj_material', label: t('field.obj_material.label'), type: 'text',     placeholder: t('field.obj_material.placeholder'), showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] }, visibility: 'advanced' },
        { key: 'obj_size',     label: t('field.obj_size.label'),     type: 'text',     placeholder: t('field.obj_size.placeholder'),     showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] }, visibility: 'advanced' },
        { key: 'obj_color',    label: t('field.obj_color.label'),    type: 'text',     placeholder: '#B8860B', fieldVariant: 'color', noDice: true, showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] }, visibility: 'advanced' },
        { key: 'obj_detail',   label: t('field.obj_detail.label'),   type: 'textarea', placeholder: t('field.obj_detail.placeholder'),   showWhen: { key: 'subject_type', values: [t('field.subject_type.object')] }, visibility: 'advanced' },
        // ── 共用欄位 ──
        { key: 'char_accent',  label: t('field.char_accent.label'),  type: 'text', placeholder: '#E94560', fieldVariant: 'color', noDice: true },
        { key: 'char_feature', label: t('field.char_feature.label'), type: 'text', placeholder: t('field.char_feature.placeholder') }
      ],
      locks: ['subject_type', 'char_name', 'creature_name', 'obj_name', 'char_skin', 'creature_color', 'obj_color', 'char_clothing', 'creature_texture', 'obj_material', 'char_accent', 'char_feature'],
      promptTemplate: (v) => {
        const type = String(v.subject_type || '');
        if (type.includes('生物') || type.toLowerCase().includes('creature')) {
          return `Creature "${V(v.creature_name)}": ${V(v.creature_species)}, ${V(v.creature_size)}, ` +
            `color ${V(v.creature_color)}, texture: ${V(v.creature_texture)}. ` +
            `Motion: ${V(v.creature_motion)}. Accent color ${V(v.char_accent)}. ` +
            `Distinguishing: ${V(v.char_feature)}.`;
        }
        if (type.includes('物品') || type.toLowerCase().includes('object')) {
          return `Object "${V(v.obj_name)}": ${V(v.obj_material)}, ${V(v.obj_size)}, ` +
            `color ${V(v.obj_color)}. Detail: ${V(v.obj_detail)}. ` +
            `Accent color ${V(v.char_accent)}. Distinguishing: ${V(v.char_feature)}.`;
        }
        return `Character "${V(v.char_name)}": ${V(v.char_age)}, ${V(v.char_hair)}, skin tone ${V(v.char_skin)}, ` +
          `wearing ${V(v.char_clothing)}, accent color ${V(v.char_accent)}. ` +
          `Distinguishing: ${V(v.char_feature)}.`;
      }
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 04 — Screenplay (narrative)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_04', step: 4,
      title: t('node.04.title'),
      description: t('node.04.desc'),
      layer: 'narrative',
      fields: [
        { key: 'scene_id',       label: t('field.scene_id.label'),       type: 'text',     placeholder: 'S01' },
        { key: 'scene_location', label: t('field.scene_location.label'), type: 'text',     placeholder: t('field.scene_location.placeholder') },
        { key: 'action_desc',    label: t('field.action_desc.label'),    type: 'textarea', placeholder: t('field.action_desc.placeholder') },
        { key: 'dialogue',       label: t('field.dialogue.label'),       type: 'textarea', placeholder: t('field.dialogue.placeholder') },
        { key: 'emotion_tag',    label: t('field.emotion_tag.label'),    type: 'text',     placeholder: t('field.emotion_tag.placeholder') },
        { key: 'ndf_T',          label: t('field.ndf_T.label'),          type: 'number',   placeholder: '0.55', visibility: 'advanced' },
        { key: 'ndf_E',          label: t('field.ndf_E.label'),          type: 'number',   placeholder: '0.60', visibility: 'advanced' },
        { key: 'scene_duration', label: t('field.scene_duration.label'), type: 'number',   placeholder: '10', visibility: 'advanced' }
      ],
      locks: ['scene_id', 'scene_location', 'ndf_T', 'ndf_E'],
      promptTemplate: (v) =>
        `Scene ${V(v.scene_id)}: ${V(v.scene_location)}. ` +
        `${V(v.action_desc)} ${V(v.dialogue)} ` +
        `Mood: ${V(v.emotion_tag)}. NDF targets: T=${V(v.ndf_T)}, E=${V(v.ndf_E)}. Duration: ${V(v.scene_duration)}s.`
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 05 — Tension Mapping (narrative)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_05', step: 5,
      title: t('node.05.title'),
      description: t('node.05.desc'),
      layer: 'narrative',
      fields: [
        { key: 'T_start',  label: t('field.T_start.label'),  type: 'number', placeholder: '0.30' },
        { key: 'T_end',    label: t('field.T_end.label'),    type: 'number', placeholder: '0.65' },
        { key: 'T_easing', label: t('field.T_easing.label'), type: 'text',   placeholder: t('field.T_easing.placeholder'), visibility: 'advanced' },
        { key: 'E_start',  label: t('field.E_start.label'),  type: 'number', placeholder: '0.25' },
        { key: 'E_end',    label: t('field.E_end.label'),    type: 'number', placeholder: '0.60' },
        { key: 'I_start',  label: t('field.I_start.label'),  type: 'number', placeholder: '0.10', visibility: 'advanced' },
        { key: 'I_end',    label: t('field.I_end.label'),    type: 'number', placeholder: '0.30', visibility: 'advanced' },
        { key: 'C_end',    label: t('field.C_end.label'),    type: 'number', placeholder: '0.70', visibility: 'advanced' }
      ],
      locks: ['T_end', 'E_end', 'I_end', 'C_end'],
      promptTemplate: (v) => {
        const te = (Number(v.T_end) * Number(v.E_end)).toFixed(3);
        const pass = Number(te) >= 0.35;
        return `NDF curve: T=${V(v.T_start)}→${V(v.T_end)} (${V(v.T_easing)}), ` +
          `E=${V(v.E_start)}→${V(v.E_end)}, I=${V(v.I_start)}→${V(v.I_end)}, C_end=${V(v.C_end)}. ` +
          `Validation: T×E=${te} ${pass ? t('field.node05.passThreshold') : t('field.node05.failThreshold')}`;
      }
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 06 — Photometric (flow)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_06', step: 6,
      title: t('node.06.title'),
      description: t('node.06.desc'),
      layer: 'flow',
      fields: [
        { key: 'env_prompt',  label: t('field.env_prompt.label'),  type: 'textarea', placeholder: t('field.env_prompt.placeholder') },
        { key: 'kelvin',      label: t('field.kelvin.label'),      type: 'number',   placeholder: '3800' },
        { key: 'ev',          label: t('field.ev.label'),          type: 'number',   placeholder: '-0.5' },
        { key: 'contrast',    label: t('field.contrast.label'),    type: 'number',   placeholder: '0.72' },
        { key: 'saturation',  label: t('field.saturation.label'),  type: 'number',   placeholder: '0.55' },
        { key: 'shadowLift',  label: t('field.shadowLift.label'),  type: 'number',   placeholder: '0.03', noDice: true, visibility: 'advanced' },
        { key: 'foreground',  label: t('field.foreground.label'),  type: 'text',     placeholder: t('field.foreground.placeholder'), visibility: 'advanced' },
        { key: 'midground',   label: t('field.midground.label'),   type: 'text',     placeholder: t('field.midground.placeholder'), visibility: 'advanced' },
        { key: 'background',  label: t('field.background.label'),  type: 'text',     placeholder: t('field.background.placeholder'), visibility: 'advanced' },
        { key: 'key_light',   label: t('field.key_light.label'),   type: 'text',     placeholder: t('field.key_light.placeholder'), visibility: 'advanced' }
      ],
      locks: ['kelvin', 'ev', 'contrast', 'saturation', 'shadowLift'],
      promptTemplate: (v) =>
        `${V(v.env_prompt)} Key light: ${V(v.key_light)}. ` +
        `Color temperature ${V(v.kelvin)}K, EV ${V(v.ev)}, contrast ${V(v.contrast)}, saturation ${V(v.saturation)}, shadow lift ${V(v.shadowLift)}. ` +
        `Depth: ${V(v.foreground)} in front, ${V(v.midground)} center, ${V(v.background)} behind.`
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 07 — Camera (flow) [RESTRUCTURED]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_07', step: 7,
      title: t('node.07.title'),
      description: t('node.07.desc'),
      layer: 'flow',
      fields: [
        { key: 'shot_id',            label: t('field.shot_id.label'),            type: 'text',   placeholder: 'S01_SH01' },
        { key: 'shot_type',          label: t('field.shot_type.label'),          type: 'select', placeholder: t('field.shot_type.placeholder'),
          options: [t('field.shot_type.ECU'), t('field.shot_type.CU'), t('field.shot_type.MCU'), t('field.shot_type.MS'), t('field.shot_type.WS'), t('field.shot_type.EWS')] },
        { key: 'focal_mm',           label: t('field.focal_mm.label'),           type: 'number', placeholder: '35' },
        { key: 'aperture',           label: t('field.aperture.label'),           type: 'number', placeholder: '2.8', visibility: 'advanced' },
        { key: 'movement_type',      label: t('field.movement_type.label'),      type: 'select', placeholder: t('field.movement_type.placeholder'),
          options: [
            t('field.movement_type.static'), t('field.movement_type.dolly_in'), t('field.movement_type.dolly_out'),
            t('field.movement_type.pan_left'), t('field.movement_type.pan_right'),
            t('field.movement_type.tilt_up'), t('field.movement_type.tilt_down'),
            t('field.movement_type.crane_up'), t('field.movement_type.crane_down'),
            t('field.movement_type.tracking'), t('field.movement_type.orbit_360'), t('field.movement_type.orbit_partial'),
            t('field.movement_type.vertigo'), t('field.movement_type.whip_pan'),
            t('field.movement_type.steadicam'), t('field.movement_type.handheld'),
            t('field.movement_type.drone'), t('field.movement_type.rack_focus')
          ] },
        { key: 'movement_speed',     label: t('field.movement_speed.label'),     type: 'select', placeholder: t('field.movement_speed.placeholder'),
          options: [t('field.movement_speed.slow'), t('field.movement_speed.normal'), t('field.movement_speed.fast')], visibility: 'advanced' },
        { key: 'dutch_angle',        label: t('field.dutch_angle.label'),        type: 'number', placeholder: '0', visibility: 'advanced' },
        { key: 'cam_height',         label: t('field.cam_height.label'),         type: 'number', placeholder: '1.6', visibility: 'advanced' },
        { key: 'orbit_start_angle',  label: t('field.orbit_start_angle.label'),  type: 'number', placeholder: '0',
          showWhen: { key: 'movement_type', values: [t('field.movement_type.orbit_360'), t('field.movement_type.orbit_partial')] }, visibility: 'advanced' },
        { key: 'orbit_end_angle',    label: t('field.orbit_end_angle.label'),    type: 'number', placeholder: '360',
          showWhen: { key: 'movement_type', values: [t('field.movement_type.orbit_360'), t('field.movement_type.orbit_partial')] }, visibility: 'advanced' },
        { key: 'orbit_direction',    label: t('field.orbit_direction.label'),    type: 'select', placeholder: t('field.orbit_direction.placeholder'),
          options: [t('field.orbit_direction.cw'), t('field.orbit_direction.ccw')],
          showWhen: { key: 'movement_type', values: [t('field.movement_type.orbit_360'), t('field.movement_type.orbit_partial')] }, visibility: 'advanced' },
        { key: 'time_scale',         label: t('field.time_scale.label'),         type: 'number', placeholder: '1.0',
          showWhen: { key: 'movement_type', values: [t('field.movement_type.orbit_360'), t('field.movement_type.orbit_partial')] }, visibility: 'advanced' }
      ],
      locks: ['shot_id', 'focal_mm', 'aperture', 'movement_type'],
      promptTemplate: (v) => {
        let prompt = `${V(v.shot_type)} shot, ${V(v.focal_mm)}mm f/${V(v.aperture)}, ${V(v.movement_type)} at ${V(v.movement_speed)} speed.`;
        if (Number(v.dutch_angle) !== 0) {
          prompt += ` Dutch angle: ${V(v.dutch_angle)}°.`;
        }
        prompt += ` Camera height: ${V(v.cam_height)}m.`;
        const mt = String(v.movement_type || '').toLowerCase();
        if (mt.includes('orbit')) {
          prompt += ` Orbit: ${V(v.orbit_start_angle)}°→${V(v.orbit_end_angle)}° ${V(v.orbit_direction)}, time scale ${V(v.time_scale)}x.`;
        }
        return prompt;
      }
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 08 — Composition (flow) [NEW — split from old node_07]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_08', step: 8,
      title: t('node.08.title'),
      description: t('node.08.desc'),
      layer: 'flow',
      fields: [
        { key: 'rule_of_thirds',     label: t('field.rule_of_thirds.label'),     type: 'number',   placeholder: '0.5', visibility: 'advanced' },
        { key: 'depth_layers',       label: t('field.depth_layers.label'),       type: 'number',   placeholder: '3' },
        { key: 'negative_space',     label: t('field.negative_space.label'),     type: 'number',   placeholder: '0.35', visibility: 'advanced' },
        { key: 'subject_position',   label: t('field.subject_position.label'),   type: 'select',   placeholder: t('field.subject_position.placeholder'),
          options: [t('field.subject_position.center'), t('field.subject_position.thirds_left'), t('field.subject_position.thirds_right'), t('field.subject_position.golden_left'), t('field.subject_position.golden_right')] },
        { key: 'char_action',        label: t('field.char_action.label'),        type: 'textarea', placeholder: t('field.char_action.placeholder') },
        { key: 'leading_lines',      label: t('field.leading_lines.label'),      type: 'text',     placeholder: t('field.leading_lines.placeholder'), visibility: 'advanced' },
        { key: 'frame_within_frame', label: t('field.frame_within_frame.label'), type: 'text',     placeholder: t('field.frame_within_frame.placeholder'), visibility: 'advanced' }
      ],
      locks: ['rule_of_thirds', 'depth_layers', 'negative_space'],
      promptTemplate: (v) =>
        `Composition: rule-of-thirds offset ${V(v.rule_of_thirds)}, ${V(v.depth_layers)} depth layers, ` +
        `${V(v.negative_space)} negative space ratio. Subject at ${V(v.subject_position)}. ` +
        `Character action: ${V(v.char_action)}. ` +
        `Leading lines: ${V(v.leading_lines)}. Frame-within-frame: ${V(v.frame_within_frame)}.`
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 09 — Style & Filter (flow) [EXPANDED]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_09', step: 9,
      title: t('node.09.title'),
      description: t('node.09.desc'),
      layer: 'flow',
      fields: [
        { key: 'global_style',    label: t('field.global_style.label'),    type: 'textarea', placeholder: t('field.global_style.placeholder') },
        { key: 'global_negative', label: t('field.global_negative.label'), type: 'textarea', placeholder: t('field.global_negative.placeholder') },
        { key: 'lut_desc',        label: t('field.lut_desc.label'),        type: 'text',     placeholder: t('field.lut_desc.placeholder') },
        { key: 'grain',           label: t('field.grain.label'),           type: 'number',   placeholder: '0.03', visibility: 'advanced' },
        { key: 'vignette',        label: t('field.vignette.label'),        type: 'number',   placeholder: '0.12', visibility: 'advanced' },
        { key: 'hue_shift',       label: t('field.hue_shift.label'),       type: 'number',   placeholder: '-5', visibility: 'advanced' },
        { key: 'style_warm',      label: t('field.style_warm.label'),      type: 'number',   placeholder: '0.5', visibility: 'advanced' },
        { key: 'style_contrast',  label: t('field.style_contrast.label'),  type: 'number',   placeholder: '0.5', visibility: 'advanced' },
        { key: 'style_vintage',   label: t('field.style_vintage.label'),   type: 'number',   placeholder: '0.0', visibility: 'advanced' },
        { key: 'style_cinematic', label: t('field.style_cinematic.label'), type: 'number',   placeholder: '0.7', visibility: 'advanced' },
        { key: 'style_dream',     label: t('field.style_dream.label'),     type: 'number',   placeholder: '0.0', visibility: 'advanced' }
      ],
      locks: ['global_style', 'global_negative', 'lut_desc', 'grain', 'vignette', 'hue_shift', 'style_warm', 'style_contrast', 'style_vintage', 'style_cinematic', 'style_dream'],
      promptTemplate: (v) =>
        `[STYLE LOCK PREFIX]\n` +
        `${V(v.global_style)} Color grading: ${V(v.lut_desc)}. ` +
        `Film grain ${V(v.grain)}, vignette ${V(v.vignette)}, hue shift ${V(v.hue_shift)}°.\n` +
        `Style vector: warm=${V(v.style_warm)}, contrast=${V(v.style_contrast)}, vintage=${V(v.style_vintage)}, cinematic=${V(v.style_cinematic)}, dream=${V(v.style_dream)}.\n` +
        `Negative: ${V(v.global_negative)}`
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 10 — 3D Blockout & Lighting (spatial) [EXPANDED]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_10', step: 10,
      title: t('node.10.title'),
      description: t('node.10.desc'),
      layer: 'spatial',
      fields: [
        { key: 'objects',             label: t('field.objects.label'),             type: 'textarea', placeholder: t('field.objects.placeholder') },
        { key: 'cam_pos',             label: t('field.cam_pos.label'),             type: 'text',     placeholder: '-2, 1.6, -4' },
        { key: 'cam_target',          label: t('field.cam_target.label'),          type: 'text',     placeholder: '0, 1.2, 0' },
        { key: 'key_light_type',      label: t('field.key_light_type.label'),      type: 'select',   placeholder: t('field.key_light_type.placeholder'),
          options: [t('field.key_light_type.point'), t('field.key_light_type.spot'), t('field.key_light_type.area'), t('field.key_light_type.directional')] },
        { key: 'key_light_kelvin',    label: t('field.key_light_kelvin.label'),    type: 'number',   placeholder: '4000' },
        { key: 'key_light_intensity', label: t('field.key_light_intensity.label'), type: 'number',   placeholder: '100', visibility: 'advanced' },
        { key: 'key_light_angle',     label: t('field.key_light_angle.label'),     type: 'number',   placeholder: '45', visibility: 'advanced' },
        { key: 'key_light_softness',  label: t('field.key_light_softness.label'),  type: 'select',   placeholder: t('field.key_light_softness.placeholder'),
          options: [t('field.key_light_softness.hard'), t('field.key_light_softness.soft')], visibility: 'advanced' },
        { key: 'fill_intensity',      label: t('field.fill_intensity.label'),      type: 'number',   placeholder: '35', visibility: 'advanced' },
        { key: 'rim_intensity',       label: t('field.rim_intensity.label'),       type: 'number',   placeholder: '60', visibility: 'advanced' },
        { key: 'ambient_level',       label: t('field.ambient_level.label'),       type: 'number',   placeholder: '15', visibility: 'advanced' },
        { key: 'key_fill_ratio',      label: t('field.key_fill_ratio.label'),      type: 'number',   placeholder: '3.0', autoCompute: true, visibility: 'advanced' }
      ],
      locks: [],
      promptTemplate: (v) =>
        `3D blockout: ${V(v.objects)}. ` +
        `Camera at (${V(v.cam_pos)}) looking at (${V(v.cam_target)}). ` +
        `Key light: ${V(v.key_light_type)} ${V(v.key_light_kelvin)}K, intensity ${V(v.key_light_intensity)}%, angle ${V(v.key_light_angle)}°, ${V(v.key_light_softness)}. ` +
        `Fill: ${V(v.fill_intensity)}%, Rim: ${V(v.rim_intensity)}%, Ambient: ${V(v.ambient_level)}%. ` +
        `Key:Fill ratio = ${V(v.key_fill_ratio)}:1. ` +
        `All objects white material, no textures. Focus on spatial composition, depth layering, and lighting.`
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 11 — Image Generation (generation) [was old node_10]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_11', step: 11,
      title: t('node.11.title'),
      description: t('node.11.desc'),
      layer: 'generation',
      fields: [
        { key: 'shot_ref',            label: t('field.shot_ref.label'),            type: 'text',     placeholder: 'S01_SH01' },
        { key: 'detected_kelvin',     label: t('field.detected_kelvin.label'),     type: 'number',   placeholder: '5500', visibility: 'advanced' },
        { key: 'detected_palette',    label: t('field.detected_palette.label'),    type: 'text',     placeholder: '#1a1a2e, #16213e, #e94560', fieldVariant: 'palette', noDice: true, visibility: 'advanced' },
        { key: 'detected_contrast',   label: t('field.detected_contrast.label'),   type: 'number',   placeholder: '0.65', visibility: 'advanced' },
        { key: 'detected_saturation', label: t('field.detected_saturation.label'), type: 'number',   placeholder: '0.55', visibility: 'advanced' },
        { key: 'delta_kelvin_ref',    label: t('field.delta_kelvin_ref.label'),    type: 'number',   placeholder: '0', visibility: 'advanced' },
        { key: 'delta_palette_ref',   label: t('field.delta_palette_ref.label'),   type: 'number',   placeholder: '0', visibility: 'advanced' },
        { key: 'prompt_correction',   label: t('field.prompt_correction.label'),   type: 'textarea', placeholder: t('field.prompt_correction.placeholder') },
        { key: 'generator',           label: t('field.generator.label'),           type: 'select',   placeholder: t('field.generator.placeholder'),
          options: [t('field.generator.sdxl'), t('field.generator.dalle3'), t('field.generator.midjourney'), t('field.generator.stability')] },
        { key: 'seed',                label: t('field.seed.label'),                type: 'number',   placeholder: '42' }
      ],
      locks: ['detected_kelvin', 'detected_palette', 'seed'],
      promptTemplate: (v, locks) => {
        const L = locks ?? {};
        const style   = L.global_style?.value ? `[STYLE] ${L.global_style.value}\n` : '';
        const targetK = L.kelvin?.value ?? 'N/A';
        const targetP = L.dominant_palette?.value ?? 'N/A';
        const correction = v.prompt_correction ? `\n[CORRECTION] ${V(v.prompt_correction)}` : '';
        return `[REF IMAGE ANALYSIS — ${V(v.shot_ref)}]\n${style}` +
          `[DETECTED] Kelvin: ${V(v.detected_kelvin)} | Palette: [${V(v.detected_palette)}] | Contrast: ${V(v.detected_contrast)} | Sat: ${V(v.detected_saturation)}\n` +
          `[TARGET] Kelvin: ${targetK} | Palette: [${targetP}]\n` +
          `[DEVIATION] ΔK=${V(v.delta_kelvin_ref)} ${Number(v.delta_kelvin_ref) > 500 ? '⚠' : '✓'} | ΔE=${V(v.delta_palette_ref)} ${Number(v.delta_palette_ref) > 3.0 ? '⚠' : '✓'}${correction}`;
      }
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 12 — Video Generation (generation) [was old node_11]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_12', step: 12,
      title: t('node.12.title'),
      description: t('node.12.desc'),
      layer: 'generation',
      fields: [
        { key: 'seg_id',              label: t('field.seg_id.label'),              type: 'text',     placeholder: 'SEG_001' },
        { key: 'seg_duration',        label: t('field.seg_duration.label'),        type: 'number',   placeholder: '10' },
        { key: 'transition',          label: t('field.transition.label'),          type: 'text',     placeholder: t('field.transition.placeholder'), visibility: 'advanced' },
        { key: 'frames_sampled',      label: t('field.frames_sampled.label'),      type: 'number',   placeholder: '3', visibility: 'advanced' },
        { key: 'kelvin_drift',        label: t('field.kelvin_drift.label'),        type: 'number',   placeholder: '0', visibility: 'advanced' },
        { key: 'palette_consistency', label: t('field.palette_consistency.label'), type: 'number',   placeholder: '0.95', visibility: 'advanced' },
        { key: 'motion_pattern',      label: t('field.motion_pattern.label'),      type: 'text',     placeholder: t('field.motion_pattern.placeholder'), visibility: 'advanced' },
        { key: 'movement_match',      label: t('field.movement_match.label'),      type: 'number',   placeholder: '0.85', visibility: 'advanced' },
        { key: 'prompt_correction',   label: t('field.prompt_correction_v.label'), type: 'textarea', placeholder: t('field.prompt_correction_v.placeholder') },
        { key: 'video_gen',           label: t('field.video_gen.label'),           type: 'select',   placeholder: t('field.video_gen.placeholder'),
          options: [t('field.video_gen.veo'), t('field.video_gen.runway'), t('field.video_gen.kling'), t('field.video_gen.pika')] }
      ],
      locks: [],
      promptTemplate: (v, locks) => {
        const L = locks ?? {};
        const style          = L.global_style?.value ? `[STYLE] ${L.global_style.value}\n` : '';
        const targetMovement = L.movement_type?.value ?? L.movement?.value ?? 'N/A';
        const correction     = v.prompt_correction ? `\n[CORRECTION] ${V(v.prompt_correction)}` : '';
        return `[REF VIDEO ANALYSIS — ${V(v.seg_id)} — ${V(v.seg_duration)}s]\n${style}` +
          `[SAMPLED] ${V(v.frames_sampled)} frames | Kelvin drift: ±${V(v.kelvin_drift)}K | Palette consistency: ${V(v.palette_consistency)}\n` +
          `[MOTION] Detected: ${V(v.motion_pattern)} | Target: ${targetMovement} | Match: ${V(v.movement_match)}\n` +
          `[TRANSITION] ${V(v.transition)}${correction}`;
      }
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 13 — QA Validation (validation) [was old node_12]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_13', step: 13,
      title: t('node.13.title'),
      description: t('node.13.desc'),
      layer: 'validation',
      fields: [
        { key: 'delta_kelvin',     label: t('field.delta_kelvin.label'),     type: 'number', placeholder: '200' },
        { key: 'delta_e_color',    label: t('field.delta_e_color.label'),    type: 'number', placeholder: '1.8' },
        { key: 'clip_sim',         label: t('field.clip_sim.label'),         type: 'number', placeholder: '0.89' },
        { key: 'obj_recall',       label: t('field.obj_recall.label'),       type: 'number', placeholder: '0.92', visibility: 'advanced' },
        { key: 'depth_corr',       label: t('field.depth_corr.label'),       type: 'number', placeholder: '0.81', visibility: 'advanced' },
        { key: 'ndf_delta',        label: t('field.ndf_delta.label'),        type: 'number', placeholder: '0.05', visibility: 'advanced' },
        { key: 'fail_nodes',       label: t('field.fail_nodes.label'),       type: 'text',   placeholder: t('field.fail_nodes.placeholder'), visibility: 'advanced' },
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
          `ΔKelvin: ${V(v.delta_kelvin)} ${Number(v.delta_kelvin)  <= 800  ? '✓' : '✗(>800)'}\n` +
          `ΔE Color: ${V(v.delta_e_color)} ${Number(v.delta_e_color) <= 3.0  ? '✓' : '✗(>3.0)'}\n` +
          `CLIP Sim: ${V(v.clip_sim)} ${Number(v.clip_sim)      >= 0.85 ? '✓' : '✗(<0.85)'}\n` +
          `Obj Recall: ${V(v.obj_recall)} ${Number(v.obj_recall)    >= 0.80 ? '✓' : '✗(<0.80)'}\n` +
          `Depth Corr: ${V(v.depth_corr)} ${Number(v.depth_corr)    >= 0.75 ? '✓' : '✗(<0.75)'}\n` +
          `NDF Delta: ${V(v.ndf_delta)} ${Number(v.ndf_delta)     <= 0.10 ? '✓' : '✗(>0.10)'}\n` +
          `─────────────────────\n` +
          `${pass ? t('qa.report.status.pass') : t('qa.report.status.fail', { nodes: String(v.fail_nodes || t('qa.report.status.failPlaceholder')) })}`
        );
      }
    },

    // ═══════════════════════════════════════════════════════════
    // NODE 14 — Film Stitching (validation) [NEW]
    // ═══════════════════════════════════════════════════════════
    {
      id: 'node_14', step: 14,
      title: t('node.14.title'),
      description: t('node.14.desc'),
      layer: 'validation',
      fields: [
        { key: 'drift_kelvin',         label: t('field.drift_kelvin.label'),         type: 'number',   placeholder: '0', autoCompute: true, visibility: 'advanced' },
        { key: 'drift_ev',             label: t('field.drift_ev.label'),             type: 'number',   placeholder: '0', autoCompute: true, visibility: 'advanced' },
        { key: 'drift_contrast',       label: t('field.drift_contrast.label'),       type: 'number',   placeholder: '0', autoCompute: true, visibility: 'advanced' },
        { key: 'drift_saturation',     label: t('field.drift_saturation.label'),     type: 'number',   placeholder: '0', autoCompute: true, visibility: 'advanced' },
        { key: 'cumulative_drift_pct', label: t('field.cumulative_drift_pct.label'), type: 'number',   placeholder: '0', autoCompute: true },
        { key: 'correction_rate',      label: t('field.correction_rate.label'),      type: 'number',   placeholder: '0.40', visibility: 'advanced' },
        { key: 'stitch_gaps',          label: t('field.stitch_gaps.label'),          type: 'number',   placeholder: '0', autoCompute: true, visibility: 'advanced' },
        { key: 'film_continuity',      label: t('field.film_continuity.label'),      type: 'select',   placeholder: t('field.film_continuity.placeholder'),
          options: [t('field.film_continuity.continuous'), t('field.film_continuity.gaps_detected'), t('field.film_continuity.needs_correction')] },
        { key: 'film_notes',           label: t('field.film_notes.label'),           type: 'textarea', placeholder: t('field.film_notes.placeholder') }
      ],
      locks: [],
      promptTemplate: (v) =>
        `[FILM STITCH REPORT]\n` +
        `Drift from Film DNA mean — Kelvin: ${V(v.drift_kelvin)}K, EV: ${V(v.drift_ev)}, Contrast: ${V(v.drift_contrast)}, Saturation: ${V(v.drift_saturation)}\n` +
        `Cumulative drift: ${V(v.cumulative_drift_pct)}%\n` +
        `Correction rate: ${V(v.correction_rate)}\n` +
        `Stitch gaps: ${V(v.stitch_gaps)} | Continuity: ${V(v.film_continuity)}\n` +
        `Notes: ${v.film_notes || 'none'}`
    }
  ];
}

// ─── 向下相容：靜態 NODE_DEFS（使用 key 直接回傳）────────────
// 用於不在 React 元件中的場景（如測試）
import { zhTW } from '../i18n/zh-TW';
const fallbackT: TFunction = (key: string) => zhTW[key] ?? key;
export const NODE_DEFS: NodeDef[] = getNodeDefs(fallbackT);
