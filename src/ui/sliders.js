import { Pane } from 'tweakpane';

const LABELS = {
  armholeDepth:  'Armhole Depth',
  chestWidth:    'Chest (half)',
  shoulderWidth: 'Shoulder (half)',
  sideLength:    'Side Length',
  sleeveLength:  'Sleeve Length',
  sleeveOpening: 'Sleeve Opening',
  neckWidth:     'Neck (half)',
  neckDepth:     'Neck Depth'
};

const ORDER = [
  'armholeDepth', 'chestWidth', 'shoulderWidth', 'sideLength',
  'sleeveLength', 'sleeveOpening',
  'neckWidth', 'neckDepth'
];

export function mountSliders(containerEl, state) {
  containerEl.innerHTML = '';
  const host = document.createElement('div');
  host.className = 'tp-host';
  containerEl.appendChild(host);

  const pane = new Pane({ container: host });
  const model = { ...state.measurements };
  const inputs = {};

  for (const key of ORDER) {
    const range = state.getScalarRange(key);
    const input = pane.addBinding(model, key, {
      label: LABELS[key],
      min: range.min,
      max: range.max,
      step: 0.1,
      format: (v) => `${v.toFixed(1)} cm`
    });
    input.on('change', (ev) => {
      state.updateMeasurement(key, ev.value);
      model[key] = state.measurements[key];
      input.refresh();
    });
    inputs[key] = input;
  }

  state.subscribe(() => {
    let dirty = false;
    for (const key of ORDER) {
      if (Math.abs(model[key] - state.measurements[key]) > 1e-4) {
        model[key] = state.measurements[key];
        dirty = true;
      }
    }
    if (dirty) pane.refresh();
  });

  state.subscribe(({ softWall }) => {
    if (!softWall) return;
    const el = inputs[softWall.source]?.element;
    if (!el) return;
    el.classList.add('tp-clamped');
    setTimeout(() => el.classList.remove('tp-clamped'), 420);
  });
}
