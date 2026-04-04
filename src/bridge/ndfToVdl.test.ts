import { describe, it, expect } from 'vitest';
import { ndfToVdl, node05ToNode06Prefill, palette02ToPhotometric } from './ndfToVdl';

describe('ndfToVdl', () => {
  it('高張力 → 低色溫 + 高對比', () => {
    const result = ndfToVdl({ T: 0.9, E: 0.5, I: 0.2, C: 0.5 });
    expect(result.photometric.kelvin).toBeLessThan(4500);
    expect(result.photometric.contrast).toBeGreaterThan(0.6);
  });

  it('高情緒 → 高飽和度', () => {
    const result = ndfToVdl({ T: 0.3, E: 0.9, I: 0.3, C: 0.5 });
    expect(result.photometric.saturation).toBeGreaterThan(0.6);
  });

  it('高知識量 → 高 EV + deep_focus', () => {
    const result = ndfToVdl({ T: 0.2, E: 0.3, I: 0.9, C: 0.3 });
    expect(result.photometric.ev).toBeGreaterThan(0);
    expect(result.camera.depthLayers).toBe('deep_focus');
    expect(result.camera.objDensity).toBe('dense');
  });

  it('高角色焦點 → 大光圈(低 f-stop) + 少留白', () => {
    const result = ndfToVdl({ T: 0.3, E: 0.5, I: 0.3, C: 0.95 });
    expect(result.camera.aperture).toBeLessThan(4);
    expect(result.camera.negativeSpace).toBeLessThan(0.3);
  });

  it('中性 NDF 應產生中性參數', () => {
    const result = ndfToVdl({ T: 0.5, E: 0.5, I: 0.5, C: 0.5 });
    expect(result.photometric.kelvin).toBeGreaterThan(4000);
    expect(result.photometric.kelvin).toBeLessThan(6500);
    expect(result.photometric.ev).toBeGreaterThan(-1);
    expect(result.photometric.ev).toBeLessThan(1);
  });

  it('所有值應在合法範圍內', () => {
    const extremes = [
      { T: 0, E: 0, I: 0, C: 0 },
      { T: 1, E: 1, I: 1, C: 1 },
      { T: 0, E: 1, I: 0, C: 1 },
      { T: 1, E: 0, I: 1, C: 0 },
    ];
    for (const ndf of extremes) {
      const r = ndfToVdl(ndf);
      expect(r.photometric.kelvin).toBeGreaterThanOrEqual(2800);
      expect(r.photometric.kelvin).toBeLessThanOrEqual(7500);
      expect(r.photometric.contrast).toBeGreaterThanOrEqual(0);
      expect(r.photometric.contrast).toBeLessThanOrEqual(1);
      expect(r.photometric.saturation).toBeGreaterThanOrEqual(0.1);
      expect(r.photometric.saturation).toBeLessThanOrEqual(1);
      expect(r.camera.aperture).toBeGreaterThanOrEqual(1.4);
      expect(r.camera.aperture).toBeLessThanOrEqual(16);
    }
  });

  it('promptHint 應包含色溫描述', () => {
    const result = ndfToVdl({ T: 0.5, E: 0.5, I: 0.5, C: 0.5 });
    expect(result.promptHint).toContain('K');
    expect(result.promptHint).toContain('EV');
  });
});

describe('node05ToNode06Prefill', () => {
  it('回傳 string 型態的預填值', () => {
    const result = node05ToNode06Prefill(0.6, 0.5, 0.3, 0.7);
    expect(typeof result.kelvin).toBe('string');
    expect(typeof result.ev).toBe('string');
    expect(typeof result.contrast).toBe('string');
    expect(typeof result.saturation).toBe('string');
  });

  it('env_prompt 不為空', () => {
    const result = node05ToNode06Prefill(0.6, 0.5, 0.3, 0.7);
    expect(result.env_prompt.length).toBeGreaterThan(0);
  });
});

describe('palette02ToPhotometric', () => {
  it('暖色調色板 → 低色溫', () => {
    const result = palette02ToPhotometric('#ff6600,#cc5500,#aa4400');
    expect(result.kelvin).toBeLessThan(5000);
  });

  it('冷色調色板色溫應高於暖色調色板', () => {
    const warm = palette02ToPhotometric('#ff6600,#cc5500,#aa4400');
    const cool = palette02ToPhotometric('#0066ff,#0055cc,#003399');
    expect(cool.kelvin!).toBeGreaterThan(warm.kelvin!);
  });

  it('高亮度色板 → 正 EV', () => {
    const result = palette02ToPhotometric('#ffffff,#eeeeee,#dddddd');
    expect(result.ev).toBeGreaterThan(0);
  });

  it('低亮度色板 → 負 EV', () => {
    const result = palette02ToPhotometric('#111111,#222222,#333333');
    expect(result.ev).toBeLessThan(0);
  });

  it('空字串回傳空物件', () => {
    const result = palette02ToPhotometric('');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('無效 hex 回傳空物件', () => {
    const result = palette02ToPhotometric('not-a-color, also-bad');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('kelvin 應在 kelvinMin/kelvinMax 範圍內', () => {
    const result = palette02ToPhotometric('#ff0000,#00ff00,#0000ff', 3000, 6000);
    expect(result.kelvin).toBeGreaterThanOrEqual(3000);
    expect(result.kelvin).toBeLessThanOrEqual(6000);
  });
});
