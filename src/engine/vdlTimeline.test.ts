import { describe, it, expect } from 'vitest';
import { createSceneTimeline, stitchScenes, validateQA, type SceneConfig } from './vdlTimeline';

function makeScene(overrides?: Partial<SceneConfig>): SceneConfig {
  return {
    id: 'test_scene',
    duration: 10,
    ndf: {
      tensionStart: 0.3, tensionEnd: 0.6,
      emotionStart: 0.2, emotionEnd: 0.5,
      informationStart: 0.1, informationEnd: 0.4,
      characterFocusStart: 0.4, characterFocusEnd: 0.7,
    },
    photometric: {
      kelvinStart: 4000, kelvinEnd: 5500,
      evStart: -0.5, evEnd: 0.2,
      contrastStart: 0.4, contrastEnd: 0.7,
      saturationStart: 0.5, saturationEnd: 0.65,
    },
    camera: {
      focalLengthEnd: 50,
      dollyZEnd: 0,
      panXEnd: 0,
      tiltYEnd: 0,
    },
    ...overrides,
  };
}

describe('createSceneTimeline', () => {
  it('回傳快照數量 = duration / interval + 1', () => {
    const snapshots = createSceneTimeline(makeScene({ duration: 10 }), 2);
    // t=0, 2, 4, 6, 8, 10 → 6 個快照
    expect(snapshots).toHaveLength(6);
  });

  it('第一個快照的 NDF 應接近起始值', () => {
    const snapshots = createSceneTimeline(makeScene(), 1);
    const first = snapshots[0];
    expect(first.raw_ndf.T).toBeCloseTo(0.3, 1);
    expect(first.raw_ndf.E).toBeCloseTo(0.2, 1);
  });

  it('最後一個快照的 NDF 應接近終點值', () => {
    const snapshots = createSceneTimeline(makeScene(), 1);
    const last = snapshots[snapshots.length - 1];
    expect(last.raw_ndf.T).toBeCloseTo(0.6, 1);
    expect(last.raw_ndf.E).toBeCloseTo(0.5, 1);
  });

  it('prompt_visual 應包含色溫描述', () => {
    const snapshots = createSceneTimeline(makeScene(), 1);
    expect(snapshots[0].prompt_visual).toContain('K');
  });

  it('prompt_camera 應包含鏡頭描述', () => {
    const snapshots = createSceneTimeline(makeScene(), 1);
    expect(snapshots[0].prompt_camera).toContain('mm');
  });

  it('duration=0 應回傳至少 1 個快照', () => {
    const snapshots = createSceneTimeline(makeScene({ duration: 0 }), 1);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
  });
});

describe('stitchScenes', () => {
  it('單場景應 valid=true 且無 gaps', () => {
    const result = stitchScenes([makeScene()]);
    expect(result.valid).toBe(true);
    expect(result.gaps).toHaveLength(0);
  });

  it('連續場景（終點=起點）應 valid=true', () => {
    const scene1 = makeScene({ id: 'scene_1' });
    const scene2 = makeScene({
      id: 'scene_2',
      ndf: {
        tensionStart: 0.6, tensionEnd: 0.8,
        emotionStart: 0.5, emotionEnd: 0.7,
        informationStart: 0.4, informationEnd: 0.6,
        characterFocusStart: 0.7, characterFocusEnd: 0.9,
      },
      photometric: {
        kelvinStart: 5500, kelvinEnd: 6000,
        evStart: 0.2, evEnd: 0.5,
        contrastStart: 0.7, contrastEnd: 0.8,
        saturationStart: 0.65, saturationEnd: 0.75,
      },
    });
    const result = stitchScenes([scene1, scene2]);
    expect(result.valid).toBe(true);
  });

  it('不連續場景應偵測 gaps', () => {
    const scene1 = makeScene({ id: 'scene_1' });
    const scene2 = makeScene({
      id: 'scene_2',
      ndf: {
        tensionStart: 0.1, tensionEnd: 0.5,  // 從 0.1 開始但 scene1 結束在 0.6 → gap
        emotionStart: 0.2, emotionEnd: 0.5,
        informationStart: 0.1, informationEnd: 0.4,
        characterFocusStart: 0.4, characterFocusEnd: 0.7,
      },
    });
    const result = stitchScenes([scene1, scene2]);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.gaps.some(g => g.field === 'tension')).toBe(true);
  });

  it('stitchScenes 強制繼承前場景終點', () => {
    const scene1 = makeScene({ id: 's1' });
    const scene2 = makeScene({ id: 's2' });
    const result = stitchScenes([scene1, scene2]);
    // 第二場景第一個快照的 NDF 應等於第一場景最後快照的 NDF
    const scene1Snapshots = createSceneTimeline(scene1, 1);
    const scene1Last = scene1Snapshots[scene1Snapshots.length - 1];
    // timeline 長度 = scene1 snapshots + scene2 snapshots
    const scene2First = result.timeline[scene1Snapshots.length];
    expect(scene2First.raw_ndf.T).toBeCloseTo(scene1Last.raw_ndf.T, 1);
  });
});

describe('validateQA', () => {
  it('全部通過應 pass=true', () => {
    const { pass, report } = validateQA({
      deltaKelvin: 200, deltaEColor: 1.5,
      clipSim: 0.92, objRecall: 0.88,
      depthCorr: 0.82, ndfDelta: 0.05,
    });
    expect(pass).toBe(true);
    expect(Object.values(report).every(Boolean)).toBe(true);
  });

  it('任一指標失敗應 pass=false', () => {
    const { pass, report } = validateQA({
      deltaKelvin: 200, deltaEColor: 1.5,
      clipSim: 0.70,  // 低於 0.85 閾值
      objRecall: 0.88,
      depthCorr: 0.82, ndfDelta: 0.05,
    });
    expect(pass).toBe(false);
    expect(report.clipSim).toBe(false);
  });

  it('邊界值測試', () => {
    const { pass } = validateQA({
      deltaKelvin: 800, deltaEColor: 3.0,
      clipSim: 0.85, objRecall: 0.80,
      depthCorr: 0.75, ndfDelta: 0.10,
    });
    expect(pass).toBe(true);
  });

  it('超出邊界值應失敗', () => {
    const { pass } = validateQA({
      deltaKelvin: 801, deltaEColor: 3.0,
      clipSim: 0.85, objRecall: 0.80,
      depthCorr: 0.75, ndfDelta: 0.10,
    });
    expect(pass).toBe(false);
  });
});
