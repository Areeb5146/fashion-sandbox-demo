const NUM_WIDTH = 5;

const MEASUREMENT_ORDER = [
  'armholeDepth', 'chestWidth', 'shoulderWidth', 'sideLength',
  'sleeveLength', 'sleeveOpening',
  'neckWidth', 'neckDepth'
];
const OFFSET_ORDER = ['armholeMid', 'sideMid', 'neckMid'];

function pad(v, width = NUM_WIDTH) {
  const s = v.toFixed(1);
  return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

function padRight(s, width) {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

export function mountJsonPanel(containerEl, state) {
  containerEl.innerHTML = '';
  const shell = document.createElement('pre');
  shell.className = 'json-shell';
  containerEl.appendChild(shell);

  const rows = {};

  function appendLine(parent, text, cls) {
    const el = document.createElement('div');
    el.className = 'json-line json-' + (cls || 'plain');
    el.textContent = text;
    parent.appendChild(el);
  }

  function render() {
    shell.innerHTML = '';
    const mLabel = Math.max(...MEASUREMENT_ORDER.map(k => k.length));
    const oLabel = Math.max(...OFFSET_ORDER.map(k => k.length));

    appendLine(shell, 'measurements: {', 'k');
    for (const k of MEASUREMENT_ORDER) {
      const line = document.createElement('div');
      line.className = 'json-line';
      line.dataset.key = `m.${k}`;
      line.innerHTML = `  <span class="json-key">${padRight(k, mLabel)}</span> ` +
                       `<span class="json-num">${pad(state.measurements[k])}</span>`;
      shell.appendChild(line);
      rows[`m.${k}`] = line;
    }
    appendLine(shell, '}', 'k');
    appendLine(shell, '', '');
    appendLine(shell, 'offsets: {', 'k');
    for (const k of OFFSET_ORDER) {
      const o = state.offsets[k];
      const line = document.createElement('div');
      line.className = 'json-line';
      line.dataset.key = `o.${k}`;
      line.innerHTML = `  <span class="json-key">${padRight(k, oLabel)}</span> ` +
                       `t=<span class="json-num">${pad(o.tAlong, 4)}</span>  ` +
                       `perp=<span class="json-num">${pad(o.perpCm, 4)}</span>`;
      shell.appendChild(line);
      rows[`o.${k}`] = line;
    }
    appendLine(shell, '}', 'k');
  }

  render();

  const lastRendered = snapshot();

  state.subscribe(() => {
    for (const k of MEASUREMENT_ORDER) {
      const line = rows[`m.${k}`];
      const v = state.measurements[k];
      line.querySelector('.json-num').textContent = pad(v);
      if (v !== lastRendered.measurements[k]) {
        flash(line);
        lastRendered.measurements[k] = v;
      }
    }
    for (const k of OFFSET_ORDER) {
      const line = rows[`o.${k}`];
      const o = state.offsets[k];
      const spans = line.querySelectorAll('.json-num');
      spans[0].textContent = pad(o.tAlong, 4);
      spans[1].textContent = pad(o.perpCm, 4);
      const prev = lastRendered.offsets[k];
      if (o.tAlong !== prev.tAlong || o.perpCm !== prev.perpCm) {
        flash(line);
        lastRendered.offsets[k] = { ...o };
      }
    }
  });

  function snapshot() {
    return {
      measurements: { ...state.measurements },
      offsets: Object.fromEntries(OFFSET_ORDER.map(k => [k, { ...state.offsets[k] }]))
    };
  }

  function flash(el) {
    el.classList.add('json-flash');
    setTimeout(() => el.classList.remove('json-flash'), 420);
  }
}
