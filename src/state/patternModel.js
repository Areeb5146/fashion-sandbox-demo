import { catmullRomToBezier } from './catmullRom.js';

export const SHOULDER_SLOPE = 3;
const SLEEVE_SLOPE = 2;

export function defaultMeasurements() {
  return {
    armholeDepth: 17,
    chestWidth: 22,
    shoulderWidth: 16,
    sideLength: 45,
    neckWidth: 8,
    neckDepth: 7,
    sleeveLength: 10,
    sleeveOpening: 7
  };
}

export function defaultOffsets() {
  return {
    armholeMid: { tAlong: 0.50, perpCm: 1.6 },
    sideMid:    { tAlong: 0.45, perpCm: 0.8 },
    neckMid:    { tAlong: 0.50, perpCm: 1.2 }
  };
}

export function midAnchorPos(a, b, off) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return {
    x: a.x + dx * off.tAlong + nx * off.perpCm,
    y: a.y + dy * off.tAlong + ny * off.perpCm
  };
}

export function midAnchorFromPos(a, b, pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { tAlong: 0.5, perpCm: 0 };
  const px = pt.x - a.x, py = pt.y - a.y;
  const tAlong = (px * dx + py * dy) / len2;
  const len = Math.sqrt(len2);
  const nx = -dy / len, ny = dx / len;
  const perpCm = px * nx + py * ny;
  return { tAlong, perpCm };
}

export const NODES = {
  M_ARMHOLE_DEPTH:   'm.armholeDepth',
  M_CHEST_WIDTH:     'm.chestWidth',
  M_SHOULDER_WIDTH:  'm.shoulderWidth',
  M_SIDE_LENGTH:     'm.sideLength',
  M_NECK_WIDTH:      'm.neckWidth',
  M_NECK_DEPTH:      'm.neckDepth',
  M_SLEEVE_LENGTH:   'm.sleeveLength',
  M_SLEEVE_OPENING:  'm.sleeveOpening',

  O_ARMHOLE_MID: 'o.armholeMid',
  O_SIDE_MID:    'o.sideMid',
  O_NECK_MID:    'o.neckMid',

  A_CF_TOP:             'a.cfTop',
  A_CF_HEM:             'a.cfHem',
  A_NECK_BOTTOM:        'a.neckBottom',
  A_NECK_SHOULDER:      'a.neckShoulder',
  A_SHOULDER_TIP:       'a.shoulderTip',
  A_SLEEVE_TOP_OUTER:   'a.sleeveTopOuter',
  A_SLEEVE_BOTTOM_OUTER:'a.sleeveBottomOuter',
  A_ARMHOLE_PIT:        'a.armholePit',
  A_SIDE_HEM:           'a.sideHem',

  A_ARMHOLE_MID: 'a.armholeMid',
  A_SIDE_MID:    'a.sideMid',
  A_NECK_MID:    'a.neckMid',

  C_NECKLINE:     'c.neckline',
  C_SHOULDER:     'c.shoulder',
  C_SLEEVE_TOP:   'c.sleeveTop',
  C_SLEEVE_CUFF:  'c.sleeveCuff',
  C_ARMHOLE:      'c.armhole',
  C_SIDE_SEAM:    'c.sideSeam',
  C_HEM:          'c.hem'
};

export const NODE_LABELS = {
  [NODES.M_ARMHOLE_DEPTH]: 'armholeDepth',
  [NODES.M_CHEST_WIDTH]: 'chestWidth',
  [NODES.M_SHOULDER_WIDTH]: 'shoulderWidth',
  [NODES.M_SIDE_LENGTH]: 'sideLength',
  [NODES.M_NECK_WIDTH]: 'neckWidth',
  [NODES.M_NECK_DEPTH]: 'neckDepth',
  [NODES.M_SLEEVE_LENGTH]: 'sleeveLength',
  [NODES.M_SLEEVE_OPENING]: 'sleeveOpening',
  [NODES.O_ARMHOLE_MID]: 'armholeMid',
  [NODES.O_SIDE_MID]: 'sideMid',
  [NODES.O_NECK_MID]: 'neckMid',
  [NODES.A_CF_TOP]: 'cfTop',
  [NODES.A_CF_HEM]: 'cfHem',
  [NODES.A_NECK_BOTTOM]: 'neckBottom',
  [NODES.A_NECK_SHOULDER]: 'neckShoulder',
  [NODES.A_SHOULDER_TIP]: 'shoulderTip',
  [NODES.A_SLEEVE_TOP_OUTER]: 'sleeveTopOuter',
  [NODES.A_SLEEVE_BOTTOM_OUTER]: 'sleeveBottomOuter',
  [NODES.A_ARMHOLE_PIT]: 'armholePit',
  [NODES.A_SIDE_HEM]: 'sideHem',
  [NODES.A_ARMHOLE_MID]: 'armholeMid',
  [NODES.A_SIDE_MID]: 'sideMid',
  [NODES.A_NECK_MID]: 'neckMid',
  [NODES.C_NECKLINE]: 'neckline',
  [NODES.C_SHOULDER]: 'shoulder',
  [NODES.C_SLEEVE_TOP]: 'sleeveTop',
  [NODES.C_SLEEVE_CUFF]: 'sleeveCuff',
  [NODES.C_ARMHOLE]: 'armhole',
  [NODES.C_SIDE_SEAM]: 'sideSeam',
  [NODES.C_HEM]: 'hem'
};

export const NODE_FAMILY = {
  [NODES.C_NECKLINE]: 'neck',
  [NODES.C_SHOULDER]: 'neck',
  [NODES.C_SLEEVE_TOP]: 'neck',
  [NODES.C_SLEEVE_CUFF]: 'neck',
  [NODES.C_ARMHOLE]: 'armhole',
  [NODES.C_SIDE_SEAM]: 'side',
  [NODES.C_HEM]: 'static'
};

export const MIRRORED_CURVES = [
  NODES.C_NECKLINE, NODES.C_SHOULDER, NODES.C_SLEEVE_TOP,
  NODES.C_SLEEVE_CUFF, NODES.C_ARMHOLE, NODES.C_SIDE_SEAM
];

export const CENTER_LANDMARKS = [NODES.A_NECK_BOTTOM, NODES.A_CF_HEM];

export const MIRRORED_LANDMARKS = [
  NODES.A_NECK_SHOULDER, NODES.A_SHOULDER_TIP,
  NODES.A_SLEEVE_TOP_OUTER, NODES.A_SLEEVE_BOTTOM_OUTER,
  NODES.A_ARMHOLE_PIT, NODES.A_SIDE_HEM
];

export function straightLine(a, b) {
  return [{
    p1: { ...a },
    c1: { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 },
    c2: { x: a.x + 2 * (b.x - a.x) / 3, y: a.y + 2 * (b.y - a.y) / 3 },
    p2: { ...b }
  }];
}

export function wireGraph(graph, src) {
  const mNode = (id, key) => ({ id, deps: [], compute: () => src.getMeasurement(key) });
  graph.register(mNode(NODES.M_ARMHOLE_DEPTH, 'armholeDepth'));
  graph.register(mNode(NODES.M_CHEST_WIDTH, 'chestWidth'));
  graph.register(mNode(NODES.M_SHOULDER_WIDTH, 'shoulderWidth'));
  graph.register(mNode(NODES.M_SIDE_LENGTH, 'sideLength'));
  graph.register(mNode(NODES.M_NECK_WIDTH, 'neckWidth'));
  graph.register(mNode(NODES.M_NECK_DEPTH, 'neckDepth'));
  graph.register(mNode(NODES.M_SLEEVE_LENGTH, 'sleeveLength'));
  graph.register(mNode(NODES.M_SLEEVE_OPENING, 'sleeveOpening'));

  const oNode = (id, key) => ({ id, deps: [], compute: () => src.getOffset(key) });
  graph.register(oNode(NODES.O_ARMHOLE_MID, 'armholeMid'));
  graph.register(oNode(NODES.O_SIDE_MID, 'sideMid'));
  graph.register(oNode(NODES.O_NECK_MID, 'neckMid'));

  graph.register({
    id: NODES.A_CF_TOP, deps: [],
    compute: () => ({ x: 0, y: 0 })
  });
  graph.register({
    id: NODES.A_CF_HEM, deps: [NODES.M_SIDE_LENGTH],
    compute: ({ get }) => ({ x: 0, y: get(NODES.M_SIDE_LENGTH) })
  });
  graph.register({
    id: NODES.A_NECK_BOTTOM, deps: [NODES.M_NECK_DEPTH],
    compute: ({ get }) => ({ x: 0, y: get(NODES.M_NECK_DEPTH) })
  });
  graph.register({
    id: NODES.A_NECK_SHOULDER, deps: [NODES.M_NECK_WIDTH],
    compute: ({ get }) => ({ x: get(NODES.M_NECK_WIDTH), y: 0 })
  });
  graph.register({
    id: NODES.A_SHOULDER_TIP, deps: [NODES.M_SHOULDER_WIDTH],
    compute: ({ get }) => ({ x: get(NODES.M_SHOULDER_WIDTH), y: SHOULDER_SLOPE })
  });
  graph.register({
    id: NODES.A_SLEEVE_TOP_OUTER,
    deps: [NODES.M_SHOULDER_WIDTH, NODES.M_SLEEVE_LENGTH],
    compute: ({ get }) => ({
      x: get(NODES.M_SHOULDER_WIDTH) + get(NODES.M_SLEEVE_LENGTH),
      y: SHOULDER_SLOPE + SLEEVE_SLOPE
    })
  });
  graph.register({
    id: NODES.A_SLEEVE_BOTTOM_OUTER,
    deps: [NODES.M_SHOULDER_WIDTH, NODES.M_SLEEVE_LENGTH, NODES.M_SLEEVE_OPENING],
    compute: ({ get }) => ({
      x: get(NODES.M_SHOULDER_WIDTH) + get(NODES.M_SLEEVE_LENGTH),
      y: SHOULDER_SLOPE + SLEEVE_SLOPE + get(NODES.M_SLEEVE_OPENING)
    })
  });
  graph.register({
    id: NODES.A_ARMHOLE_PIT,
    deps: [NODES.M_CHEST_WIDTH, NODES.M_ARMHOLE_DEPTH],
    compute: ({ get }) => ({
      x: get(NODES.M_CHEST_WIDTH),
      y: SHOULDER_SLOPE + get(NODES.M_ARMHOLE_DEPTH)
    })
  });
  graph.register({
    id: NODES.A_SIDE_HEM,
    deps: [NODES.M_CHEST_WIDTH, NODES.M_SIDE_LENGTH],
    compute: ({ get }) => ({
      x: get(NODES.M_CHEST_WIDTH),
      y: get(NODES.M_SIDE_LENGTH)
    })
  });

  graph.register({
    id: NODES.A_ARMHOLE_MID,
    deps: [NODES.A_SLEEVE_BOTTOM_OUTER, NODES.A_ARMHOLE_PIT, NODES.O_ARMHOLE_MID],
    compute: ({ get }) => midAnchorPos(
      get(NODES.A_SLEEVE_BOTTOM_OUTER), get(NODES.A_ARMHOLE_PIT), get(NODES.O_ARMHOLE_MID)
    )
  });
  graph.register({
    id: NODES.A_SIDE_MID,
    deps: [NODES.A_ARMHOLE_PIT, NODES.A_SIDE_HEM, NODES.O_SIDE_MID],
    compute: ({ get }) => midAnchorPos(
      get(NODES.A_ARMHOLE_PIT), get(NODES.A_SIDE_HEM), get(NODES.O_SIDE_MID)
    )
  });
  graph.register({
    id: NODES.A_NECK_MID,
    deps: [NODES.A_NECK_BOTTOM, NODES.A_NECK_SHOULDER, NODES.O_NECK_MID],
    compute: ({ get }) => midAnchorPos(
      get(NODES.A_NECK_BOTTOM), get(NODES.A_NECK_SHOULDER), get(NODES.O_NECK_MID)
    )
  });

  graph.register({
    id: NODES.C_NECKLINE,
    deps: [NODES.A_NECK_BOTTOM, NODES.A_NECK_MID, NODES.A_NECK_SHOULDER],
    compute: ({ get }) => catmullRomToBezier([
      get(NODES.A_NECK_BOTTOM), get(NODES.A_NECK_MID), get(NODES.A_NECK_SHOULDER)
    ])
  });
  graph.register({
    id: NODES.C_SHOULDER,
    deps: [NODES.A_NECK_SHOULDER, NODES.A_SHOULDER_TIP],
    compute: ({ get }) => straightLine(get(NODES.A_NECK_SHOULDER), get(NODES.A_SHOULDER_TIP))
  });
  graph.register({
    id: NODES.C_SLEEVE_TOP,
    deps: [NODES.A_SHOULDER_TIP, NODES.A_SLEEVE_TOP_OUTER],
    compute: ({ get }) => straightLine(get(NODES.A_SHOULDER_TIP), get(NODES.A_SLEEVE_TOP_OUTER))
  });
  graph.register({
    id: NODES.C_SLEEVE_CUFF,
    deps: [NODES.A_SLEEVE_TOP_OUTER, NODES.A_SLEEVE_BOTTOM_OUTER],
    compute: ({ get }) => straightLine(get(NODES.A_SLEEVE_TOP_OUTER), get(NODES.A_SLEEVE_BOTTOM_OUTER))
  });
  graph.register({
    id: NODES.C_ARMHOLE,
    deps: [NODES.A_SLEEVE_BOTTOM_OUTER, NODES.A_ARMHOLE_MID, NODES.A_ARMHOLE_PIT],
    compute: ({ get }) => catmullRomToBezier([
      get(NODES.A_SLEEVE_BOTTOM_OUTER), get(NODES.A_ARMHOLE_MID), get(NODES.A_ARMHOLE_PIT)
    ])
  });
  graph.register({
    id: NODES.C_SIDE_SEAM,
    deps: [NODES.A_ARMHOLE_PIT, NODES.A_SIDE_MID, NODES.A_SIDE_HEM],
    compute: ({ get }) => catmullRomToBezier([
      get(NODES.A_ARMHOLE_PIT), get(NODES.A_SIDE_MID), get(NODES.A_SIDE_HEM)
    ])
  });
  graph.register({
    id: NODES.C_HEM,
    deps: [NODES.A_SIDE_HEM, NODES.A_CF_HEM],
    compute: ({ get }) => straightLine(get(NODES.A_SIDE_HEM), get(NODES.A_CF_HEM))
  });
  graph.build();
}
