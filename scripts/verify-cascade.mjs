import { PatternState, NODES } from '../src/state/index.js';

const state = new PatternState();

function assert(label, cond) {
  const mark = cond ? '✔' : '✘';
  const color = cond ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${mark}\x1b[0m ${label}`);
  if (!cond) process.exitCode = 1;
}

{
  const before = state.measurements.armholeDepth;
  const { cascade, ms } = state.updateMeasurement('armholeDepth', before + 2);
  const rec = new Set(cascade.recomputed);
  const skip = new Set(cascade.skipped);
  console.log('\n[1] armholeDepth slider → cascade:');
  console.log(`    recomputed: ${cascade.recomputed.length}, skipped: ${cascade.skipped.length}, ${ms.toFixed(2)}ms`);
  assert('armhole curve recomputed',       rec.has(NODES.C_ARMHOLE));
  assert('side seam curve recomputed',     rec.has(NODES.C_SIDE_SEAM));
  assert('neckline curve SKIPPED',         skip.has(NODES.C_NECKLINE));
  assert('shoulder curve SKIPPED',         skip.has(NODES.C_SHOULDER));
  assert('sleeveTop curve SKIPPED',        skip.has(NODES.C_SLEEVE_TOP));
  assert('sleeveCuff curve SKIPPED',       skip.has(NODES.C_SLEEVE_CUFF));
  assert('hem curve SKIPPED',              skip.has(NODES.C_HEM));
  assert('neckMid anchor SKIPPED',         skip.has(NODES.A_NECK_MID));
}

{
  state.reset();
  const { cascade } = state.updateMeasurement('neckDepth', 10);
  const rec = new Set(cascade.recomputed);
  const skip = new Set(cascade.skipped);
  console.log('\n[2] neckDepth slider → cascade:');
  console.log(`    recomputed: ${cascade.recomputed.length}, skipped: ${cascade.skipped.length}`);
  assert('neckline curve recomputed',      rec.has(NODES.C_NECKLINE));
  assert('armhole curve SKIPPED',          skip.has(NODES.C_ARMHOLE));
  assert('side seam curve SKIPPED',        skip.has(NODES.C_SIDE_SEAM));
  assert('sleeveTop curve SKIPPED',        skip.has(NODES.C_SLEEVE_TOP));
  assert('armholePit anchor SKIPPED',      skip.has(NODES.A_ARMHOLE_PIT));
}

{
  state.reset();
  const { cascade } = state.updateMeasurement('sleeveLength', 14);
  const rec = new Set(cascade.recomputed);
  const skip = new Set(cascade.skipped);
  console.log('\n[3] sleeveLength slider → cascade:');
  console.log(`    recomputed: ${cascade.recomputed.length}, skipped: ${cascade.skipped.length}`);
  assert('sleeveTop recomputed',           rec.has(NODES.C_SLEEVE_TOP));
  assert('sleeveCuff recomputed',          rec.has(NODES.C_SLEEVE_CUFF));
  assert('armhole recomputed (shares sleeveBottomOuter)', rec.has(NODES.C_ARMHOLE));
  assert('side seam SKIPPED',              skip.has(NODES.C_SIDE_SEAM));
  assert('neckline SKIPPED',               skip.has(NODES.C_NECKLINE));
}

{
  state.reset();
  const { softWall } = state.updateMeasurement('armholeDepth', 50);
  console.log('\n[4a] scalar clamp fires:');
  assert('soft wall fired on over-max',    softWall !== null);
  assert('armholeDepth clamped (≤25)',     state.measurements.armholeDepth <= 25);
  assert('soft wall has reason',           Boolean(softWall?.reason));
  console.log(`    final armholeDepth: ${state.measurements.armholeDepth}`);
  console.log(`    reason: "${softWall?.reason}"`);
}

{
  state.reset();
  const { softWall } = state.updateMeasurement('chestWidth', 15);
  console.log('\n[4b] scalar clamp on min:');
  assert('scalar clamp fired',             softWall !== null);
  console.log(`    reason: "${softWall?.reason}"`);
}

{
  state.reset();
  const before = state.measurements.chestWidth;
  const { softWall } = state.updateMeasurement('shoulderWidth', 22);
  console.log('\n[4c] relational cascade (shoulderWidth bump forces chestWidth):');
  console.log(`    chestWidth before: ${before}, after: ${state.measurements.chestWidth}`);
  assert('chest auto-corrected',            state.measurements.chestWidth >= 22 + 2);
  assert('soft wall surfaced reason',       softWall !== null);
  console.log(`    reason: "${softWall?.reason}"`);
}

{
  state.reset();
  const { softWall } = state.dragMidAnchorTo('armholeMid', { x: 40, y: 10 });
  console.log('\n[5] mid-anchor drag past perp limit:');
  assert('soft wall fired',                softWall !== null);
  console.log(`    clamped offset: ${JSON.stringify(state.offsets.armholeMid)}`);
  console.log(`    reason: "${softWall?.reason}"`);
}

{
  state.reset();
  const N = 500;
  const t0 = performance.now();
  for (let i = 0; i < N; i++) {
    state.updateMeasurement('armholeDepth', 15 + (i % 10) * 0.5);
  }
  const total = performance.now() - t0;
  console.log('\n[6] perf sweep:');
  console.log(`    ${N} updates in ${total.toFixed(2)}ms (${(total / N).toFixed(3)}ms per cascade)`);
  assert('avg cascade < 1ms',               total / N < 1);
}

if (process.exitCode) console.log('\n\x1b[31mFAILED\x1b[0m');
else console.log('\n\x1b[32mall checks passed\x1b[0m');
