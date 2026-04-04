import { describe, it, expect } from 'vitest';
import { hexToLab, rgbToLab, deltaE2000, deltaEHex, paletteDeltaE } from './colorScience';

describe('hexToLab', () => {
  it('白色應接近 L*=100, a*≈0, b*≈0', () => {
    const [L, a, b] = hexToLab('#ffffff');
    expect(L).toBeCloseTo(100, 0);
    expect(Math.abs(a)).toBeLessThan(1);
    expect(Math.abs(b)).toBeLessThan(1);
  });

  it('黑色應接近 L*=0', () => {
    const [L] = hexToLab('#000000');
    expect(L).toBeCloseTo(0, 0);
  });

  it('純紅色 L* 應在 50-55 之間', () => {
    const [L] = hexToLab('#ff0000');
    expect(L).toBeGreaterThan(50);
    expect(L).toBeLessThan(56);
  });
});

describe('rgbToLab', () => {
  it('與 hexToLab 結果一致', () => {
    const fromHex = hexToLab('#1a1a2e');
    const fromRgb = rgbToLab(0x1a, 0x1a, 0x2e);
    fromHex.forEach((v, i) => expect(v).toBeCloseTo(fromRgb[i], 4));
  });
});

describe('deltaE2000', () => {
  it('相同顏色 ΔE 應為 0', () => {
    const lab = hexToLab('#e94560');
    expect(deltaE2000(lab, lab)).toBe(0);
  });

  it('相似色 ΔE < 3（VDL 閾值）', () => {
    const a = hexToLab('#e94560');
    const b = hexToLab('#ea4862');
    expect(deltaE2000(a, b)).toBeLessThan(3);
  });

  it('黑白色差 ΔE 應非常大 (>50)', () => {
    const black = hexToLab('#000000');
    const white = hexToLab('#ffffff');
    expect(deltaE2000(black, white)).toBeGreaterThan(50);
  });

  it('對稱性：deltaE(a,b) === deltaE(b,a)', () => {
    const a = hexToLab('#1a1a2e');
    const b = hexToLab('#e94560');
    expect(deltaE2000(a, b)).toBeCloseTo(deltaE2000(b, a), 10);
  });
});

describe('deltaEHex', () => {
  it('封裝 hexToLab + deltaE2000 結果一致', () => {
    const direct = deltaE2000(hexToLab('#1a1a2e'), hexToLab('#16213e'));
    const shortcut = deltaEHex('#1a1a2e', '#16213e');
    expect(shortcut).toBeCloseTo(direct, 10);
  });
});

describe('paletteDeltaE', () => {
  it('相同調色板 mean 應為 0', () => {
    const palette = ['#1a1a2e', '#16213e', '#e94560'];
    const { mean, maxPair } = paletteDeltaE(palette, palette);
    expect(mean).toBe(0);
    expect(maxPair).toBe(0);
  });

  it('不同長度取最短', () => {
    const a = ['#1a1a2e', '#16213e', '#e94560'];
    const b = ['#1a1a2e', '#16213e'];
    const { pairs } = paletteDeltaE(a, b);
    expect(pairs).toHaveLength(2);
  });

  it('maxPair >= mean', () => {
    const a = ['#1a1a2e', '#e94560', '#f5e6d3'];
    const b = ['#222244', '#ee5577', '#f0e0d0'];
    const { mean, maxPair } = paletteDeltaE(a, b);
    expect(maxPair).toBeGreaterThanOrEqual(mean);
  });
});
