import { NODE_LABELS, NODES } from '../state/patternModel.js';

const CURVE_IDS = new Set([
  NODES.C_NECKLINE, NODES.C_SHOULDER, NODES.C_SLEEVE_TOP,
  NODES.C_SLEEVE_CUFF, NODES.C_ARMHOLE, NODES.C_SIDE_SEAM
]);

function triggerLabel(trigger) {
  if (!trigger) return '';
  if (trigger.kind === 'measurement') return trigger.key;
  if (trigger.kind === 'anchor') return trigger.key;
  if (trigger.kind === 'reset') return 'reset';
  return '';
}

export function mountStatusStrip(els, state) {
  let clampTimer = null;

  state.subscribe(({ cascade, softWall, ms, trigger }) => {
    if (softWall) {
      els.softWallMsg.textContent = softWall.reason;
      els.softWall.hidden = false;
      if (clampTimer) clearTimeout(clampTimer);
      clampTimer = setTimeout(() => { els.softWall.hidden = true; clampTimer = null; }, 1400);
    } else if (trigger?.kind !== 'reset' && !clampTimer) {
      els.softWall.hidden = true;
    }

    const source = triggerLabel(trigger);
    const curves = cascade.recomputed.filter((id) => CURVE_IDS.has(id));
    const curveNames = curves.map((id) => NODE_LABELS[id]);

    let txt;
    if (curves.length === 0) {
      txt = source ? `${source} → (no curve change)` : 'ready';
    } else if (curves.length <= 3) {
      txt = `${source} → ${curveNames.join(', ')}`;
    } else {
      txt = `${source} → ${curveNames.slice(0, 2).join(', ')} +${curves.length - 2}`;
    }
    els.activity.textContent = txt;

    els.perfCascade.textContent = ms.toFixed(2);
    els.perfNodes.textContent   = String(cascade.recomputed.length);
    els.perfSkipped.textContent = String(cascade.skipped.length);
  });

  let last = performance.now();
  const fpsWindow = [];
  const tick = (t) => {
    const dt = t - last; last = t;
    fpsWindow.push(1000 / dt);
    if (fpsWindow.length > 30) fpsWindow.shift();
    const avg = fpsWindow.reduce((a, b) => a + b, 0) / fpsWindow.length;
    els.perfFrame.textContent = Math.round(avg);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
