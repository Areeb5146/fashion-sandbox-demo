import { DependencyGraph } from './dependencyGraph.js';
import { ConstraintResolver } from './constraintResolver.js';
import {
  defaultMeasurements, defaultOffsets,
  wireGraph, NODES, midAnchorFromPos, SHOULDER_SLOPE
} from './patternModel.js';

const OFFSET_BOUNDS = {
  armholeMid: { tMin: 0.20, tMax: 0.80, perpMin: -1.0, perpMax: 4.5 },
  sideMid:    { tMin: 0.20, tMax: 0.80, perpMin: -1.5, perpMax: 2.5 },
  neckMid:    { tMin: 0.20, tMax: 0.80, perpMin: -1.5, perpMax: 3.0 }
};

const MID_ANCHOR_SEGMENT = {
  armholeMid: [NODES.A_SLEEVE_BOTTOM_OUTER, NODES.A_ARMHOLE_PIT],
  sideMid:    [NODES.A_ARMHOLE_PIT, NODES.A_SIDE_HEM],
  neckMid:    [NODES.A_NECK_BOTTOM, NODES.A_NECK_SHOULDER]
};

const MID_ANCHOR_NODE = {
  armholeMid: NODES.A_ARMHOLE_MID,
  sideMid:    NODES.A_SIDE_MID,
  neckMid:    NODES.A_NECK_MID
};

const OFFSET_SOURCE_NODE = {
  armholeMid: NODES.O_ARMHOLE_MID,
  sideMid:    NODES.O_SIDE_MID,
  neckMid:    NODES.O_NECK_MID
};

const MEASUREMENT_SOURCE_NODE = {
  armholeDepth:  NODES.M_ARMHOLE_DEPTH,
  chestWidth:    NODES.M_CHEST_WIDTH,
  shoulderWidth: NODES.M_SHOULDER_WIDTH,
  sideLength:    NODES.M_SIDE_LENGTH,
  neckWidth:     NODES.M_NECK_WIDTH,
  neckDepth:     NODES.M_NECK_DEPTH,
  sleeveLength:  NODES.M_SLEEVE_LENGTH,
  sleeveOpening: NODES.M_SLEEVE_OPENING
};

export class PatternState {
  constructor() {
    this.measurements = defaultMeasurements();
    this.offsets = defaultOffsets();
    this.graph = new DependencyGraph();
    this.constraints = new ConstraintResolver();
    this._listeners = new Set();

    this._declareConstraints();
    wireGraph(this.graph, {
      getMeasurement: (k) => this.measurements[k],
      getOffset: (k) => this.offsets[k]
    });

    this.lastCascade = this.graph.recomputeAll({});
    this.lastSoftWall = null;
  }

  _declareConstraints() {
    const c = this.constraints;
    c.addScalar('armholeDepth',  { min: 12, max: 25, reason: 'armholeDepth ∈ [12, 25]' });
    c.addScalar('chestWidth',    { min: 18, max: 32, reason: 'chestWidth ∈ [18, 32]' });
    c.addScalar('shoulderWidth', { min: 12, max: 22, reason: 'shoulderWidth ∈ [12, 22]' });
    c.addScalar('sideLength',    { min: 35, max: 55, reason: 'sideLength ∈ [35, 55]' });
    c.addScalar('neckWidth',     { min:  6, max: 13, reason: 'neckWidth ∈ [6, 13]' });
    c.addScalar('neckDepth',     { min:  4, max: 14, reason: 'neckDepth ∈ [4, 14]' });
    c.addScalar('sleeveLength',  { min:  4, max: 20, reason: 'sleeveLength ∈ [4, 20]' });
    c.addScalar('sleeveOpening', { min:  5, max: 14, reason: 'sleeveOpening ∈ [5, 14]' });

    c.addRelational({
      id: 'armhole-above-hem',
      check: (state) => {
        const gap = state.sideLength - state.armholeDepth - SHOULDER_SLOPE;
        if (gap < 10) {
          return {
            ok: false,
            reason: 'sideLength − armholeDepth − 3 ≥ 10',
            fix: { armholeDepth: state.sideLength - SHOULDER_SLOPE - 10 }
          };
        }
        return { ok: true };
      }
    });

    c.addRelational({
      id: 'chest-wider-than-shoulder',
      check: (state) => {
        if (state.chestWidth < state.shoulderWidth + 2) {
          return {
            ok: false,
            reason: 'chestWidth ≥ shoulderWidth + 2',
            fix: { chestWidth: state.shoulderWidth + 2 }
          };
        }
        return { ok: true };
      }
    });

    c.addRelational({
      id: 'neck-inside-shoulder',
      check: (state) => {
        if (state.neckWidth > state.shoulderWidth - 3) {
          return {
            ok: false,
            reason: 'neckWidth ≤ shoulderWidth − 3',
            fix: { neckWidth: state.shoulderWidth - 3 }
          };
        }
        return { ok: true };
      }
    });

    c.addRelational({
      id: 'sleeve-clears-body',
      check: (state) => {
        const min = state.chestWidth - state.shoulderWidth + 2;
        if (state.sleeveLength < min) {
          return {
            ok: false,
            reason: 'sleeveLength ≥ chestWidth − shoulderWidth + 2',
            fix: { sleeveLength: min }
          };
        }
        return { ok: true };
      }
    });

    c.addRelational({
      id: 'sleeve-opening-fits-armhole',
      check: (state) => {
        const max = state.armholeDepth - 2;
        if (state.sleeveOpening > max) {
          return {
            ok: false,
            reason: 'sleeveOpening ≤ armholeDepth − 2',
            fix: { sleeveOpening: max }
          };
        }
        return { ok: true };
      }
    });
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(payload) {
    for (const fn of this._listeners) fn(payload);
  }

  updateMeasurement(key, rawValue) {
    const scalar = this.constraints.clampScalar(key, rawValue);
    const candidate = { ...this.measurements, [key]: scalar.value };
    const rel = this.constraints.resolveRelational(candidate);

    const changedKeys = Object.keys(candidate)
      .filter((k) => candidate[k] !== this.measurements[k]);
    this.measurements = candidate;

    const changedNodes = changedKeys
      .map((k) => MEASUREMENT_SOURCE_NODE[k])
      .filter(Boolean);

    const t0 = performance.now();
    const cascade = changedNodes.length
      ? this.graph.cascadeFrom(changedNodes, {})
      : { recomputed: [], skipped: [...this.graph.topoOrder] };
    const ms = performance.now() - t0;

    const softWall = scalar.clamped
      ? { reason: scalar.reason, source: key }
      : rel.fixed
        ? { reason: rel.reason, source: key }
        : null;
    this.lastCascade = cascade;
    this.lastSoftWall = softWall;

    this._emit({ cascade, softWall, ms, changedKeys, trigger: { kind: 'measurement', key } });
    return { cascade, softWall, ms };
  }

  dragMidAnchorTo(anchorKey, ptCm) {
    const seg = MID_ANCHOR_SEGMENT[anchorKey];
    const bounds = OFFSET_BOUNDS[anchorKey];
    if (!seg || !bounds) throw new Error(`Unknown mid anchor: ${anchorKey}`);

    const a = this.graph.get(seg[0]);
    const b = this.graph.get(seg[1]);
    const candidate = midAnchorFromPos(a, b, ptCm);

    let clamped = false;
    let reason = null;
    if (candidate.tAlong < bounds.tMin) { candidate.tAlong = bounds.tMin; clamped = true; reason = `tAlong ≥ ${bounds.tMin}`; }
    if (candidate.tAlong > bounds.tMax) { candidate.tAlong = bounds.tMax; clamped = true; reason = `tAlong ≤ ${bounds.tMax}`; }
    if (candidate.perpCm < bounds.perpMin) { candidate.perpCm = bounds.perpMin; clamped = true; reason = `perpCm ≥ ${bounds.perpMin}`; }
    if (candidate.perpCm > bounds.perpMax) { candidate.perpCm = bounds.perpMax; clamped = true; reason = `perpCm ≤ ${bounds.perpMax}`; }

    this.offsets[anchorKey] = candidate;

    const changedNode = OFFSET_SOURCE_NODE[anchorKey];
    const t0 = performance.now();
    const cascade = this.graph.cascadeFrom([changedNode], {});
    const ms = performance.now() - t0;

    const softWall = clamped ? { reason, source: anchorKey } : null;
    this.lastCascade = cascade;
    this.lastSoftWall = softWall;

    this._emit({ cascade, softWall, ms, trigger: { kind: 'anchor', key: anchorKey } });
    return { cascade, softWall, ms };
  }

  reset() {
    this.measurements = defaultMeasurements();
    this.offsets = defaultOffsets();
    const t0 = performance.now();
    const cascade = this.graph.recomputeAll({});
    const ms = performance.now() - t0;
    this.lastCascade = cascade;
    this.lastSoftWall = null;
    this._emit({ cascade, softWall: null, ms, trigger: { kind: 'reset' } });
    return { cascade, softWall: null, ms };
  }

  getCurve(id) { return this.graph.get(id); }
  getAnchor(id) { return this.graph.get(id); }
  getAllNodeIds() { return this.graph.topoOrder; }
  getScalarRange(key) { return this.constraints.getScalar(key); }

  getMidAnchors() {
    return Object.keys(MID_ANCHOR_NODE).map((key) => ({
      key,
      nodeId: MID_ANCHOR_NODE[key],
      position: this.graph.get(MID_ANCHOR_NODE[key])
    }));
  }
}

export { NODES };
