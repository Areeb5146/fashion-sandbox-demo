import { PatternState, NODES } from './state/index.js';
import { NODE_FAMILY, straightLine, MIRRORED_CURVES, CENTER_LANDMARKS, MIRRORED_LANDMARKS } from './state/patternModel.js';
import { mirrorBezier, reverseBezier } from './state/catmullRom.js';
import { FabricRenderer } from './renderer/FabricRenderer.js';
import { mountSliders } from './ui/sliders.js';
import { mountStatusStrip } from './ui/statusStrip.js';
import { mountJsonPanel } from './ui/jsonPanel.js';

const state = new PatternState();

const renderer = new FabricRenderer();
renderer.init(document.getElementById('patternCanvas'), {
  pxPerCm: 9,
  originPx: { x: 360, y: 90 },
  canvasBg: '#fbf5ec'
});

const MID_ANCHOR_COLORS = {
  armholeMid: '#0c0a09',
  sideMid: '#6366f1',
  neckMid: '#78716c'
};


function composeFullOutline() {
  const neckline    = state.getCurve(NODES.C_NECKLINE);
  const shoulder    = state.getCurve(NODES.C_SHOULDER);
  const sleeveTop   = state.getCurve(NODES.C_SLEEVE_TOP);
  const sleeveCuff  = state.getCurve(NODES.C_SLEEVE_CUFF);
  const armhole     = state.getCurve(NODES.C_ARMHOLE);
  const sideSeam    = state.getCurve(NODES.C_SIDE_SEAM);
  const sideHem     = state.getAnchor(NODES.A_SIDE_HEM);

  const bottomAcross = straightLine(sideHem, { x: -sideHem.x, y: sideHem.y });

  return [
    ...neckline,
    ...shoulder,
    ...sleeveTop,
    ...sleeveCuff,
    ...armhole,
    ...sideSeam,
    ...bottomAcross,
    ...reverseBezier(mirrorBezier(sideSeam)),
    ...reverseBezier(mirrorBezier(armhole)),
    ...reverseBezier(mirrorBezier(sleeveCuff)),
    ...reverseBezier(mirrorBezier(sleeveTop)),
    ...reverseBezier(mirrorBezier(shoulder)),
    ...reverseBezier(mirrorBezier(neckline))
  ];
}

function composeHem() {
  const sideHem = state.getAnchor(NODES.A_SIDE_HEM);
  return straightLine({ x: -sideHem.x, y: sideHem.y }, sideHem);
}

function composeFoldLine() {
  const sideLength = state.measurements.sideLength;
  return straightLine({ x: 0, y: 0 }, { x: 0, y: sideLength });
}

function paintAll() {
  renderer.drawShape('bodice', composeFullOutline(), {
    fill: 'rgba(251, 113, 133, 0.12)'
  });

  renderer.drawCurve('fold', composeFoldLine(), { family: 'static' });
  renderer.drawCurve('hem', composeHem(), { family: 'neck' });

  for (const id of MIRRORED_CURVES) {
    const bez = state.getCurve(id);
    const fam = NODE_FAMILY[id];
    renderer.drawCurve(id + '.R', bez, { family: fam });
    renderer.drawCurve(id + '.L', mirrorBezier(bez), { family: fam });
  }

  for (const id of CENTER_LANDMARKS) {
    renderer.drawLandmark(id, state.getAnchor(id));
  }
  for (const id of MIRRORED_LANDMARKS) {
    const pt = state.getAnchor(id);
    renderer.drawLandmark(id + '.R', pt);
    renderer.drawLandmark(id + '.L', { x: -pt.x, y: pt.y });
  }

  for (const m of state.getMidAnchors()) {
    renderer.drawAnchor(m.key, m.position, (posCm) => {
      state.dragMidAnchorTo(m.key, posCm);
    }, { color: MID_ANCHOR_COLORS[m.key] });
  }
  renderer.render();
}

paintAll();

state.subscribe(({ cascade }) => {
  const touched = new Set(cascade.recomputed);

  const curveChanged = MIRRORED_CURVES.some((id) => touched.has(id));
  const sideHemChanged = touched.has(NODES.A_SIDE_HEM);
  if (curveChanged || sideHemChanged) {
    renderer.drawShape('bodice', composeFullOutline(), {
      fill: 'rgba(251, 113, 133, 0.12)'
    });
  }
  if (sideHemChanged) {
    renderer.drawCurve('hem', composeHem(), { family: 'neck' });
  }
  if (touched.has(NODES.M_SIDE_LENGTH) || touched.has(NODES.A_CF_HEM)) {
    renderer.drawCurve('fold', composeFoldLine(), { family: 'static' });
  }

  for (const id of MIRRORED_CURVES) {
    if (!touched.has(id)) continue;
    const bez = state.getCurve(id);
    const fam = NODE_FAMILY[id];
    renderer.drawCurve(id + '.R', bez, { family: fam });
    renderer.drawCurve(id + '.L', mirrorBezier(bez), { family: fam });
    renderer.flashCurve(id + '.R');
    renderer.flashCurve(id + '.L');
  }

  for (const id of CENTER_LANDMARKS) {
    if (touched.has(id)) renderer.drawLandmark(id, state.getAnchor(id));
  }
  for (const id of MIRRORED_LANDMARKS) {
    if (!touched.has(id)) continue;
    const pt = state.getAnchor(id);
    renderer.drawLandmark(id + '.R', pt);
    renderer.drawLandmark(id + '.L', { x: -pt.x, y: pt.y });
  }

  for (const m of state.getMidAnchors()) {
    renderer.drawAnchor(m.key, m.position, (posCm) => {
      state.dragMidAnchorTo(m.key, posCm);
    }, { color: MID_ANCHOR_COLORS[m.key] });
  }
  renderer.render();
});

mountSliders(document.getElementById('measurements'), state);
mountStatusStrip({
  softWall:    document.getElementById('softWall'),
  softWallMsg: document.getElementById('softWallMessage'),
  activity:    document.getElementById('activityText'),
  perfCascade: document.getElementById('perfCascade'),
  perfNodes:   document.getElementById('perfNodes'),
  perfSkipped: document.getElementById('perfSkipped'),
  perfFrame:   document.getElementById('perfFrame')
}, state);
mountJsonPanel(document.querySelector('#jsonPanel .json-body'), state);

const handlesBtn = document.getElementById('toggleHandles');
let handlesOn = false;
handlesBtn.addEventListener('click', () => {
  handlesOn = !handlesOn;
  renderer.setHandlesVisible(handlesOn);
  handlesBtn.textContent = handlesOn ? 'Hide handles' : 'Show handles';
  handlesBtn.classList.toggle('active', handlesOn);
});

const jsonBtn = document.getElementById('toggleJson');
jsonBtn.addEventListener('click', () => {
  const panel = document.getElementById('jsonPanel');
  const hidden = panel.hidden;
  panel.hidden = !hidden;
  jsonBtn.textContent = hidden ? 'Hide JSON' : 'Show JSON';
  jsonBtn.classList.toggle('active', hidden);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  state.reset();
});
