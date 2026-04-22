import { fabric } from 'fabric';
import { Renderer } from './RendererContract.js';

const STYLES = {
  armhole: { stroke: '#0c0a09', strokeWidth: 2.6 },
  side:    { stroke: '#6366f1', strokeWidth: 2.6 },
  neck:    { stroke: '#78716c', strokeWidth: 1.8 },
  static:  { stroke: '#d6d3d1', strokeWidth: 1.25, dashed: true }
};

const ANCHOR_RADIUS = 8;
const LANDMARK_RADIUS = 3;
const HANDLE_SIZE = 5;

export class FabricRenderer extends Renderer {
  constructor() {
    super();
    this.canvas = null;
    this.pxPerCm = 12;
    this.originPx = { x: 100, y: 70 };
    this.canvasBg = '#fbf5ec';

    this.curves = new Map();
    this.shapes = new Map();
    this.anchors = new Map();
    this.landmarks = new Map();
    this.handleGroups = new Map();
    this.handlesVisible = false;
  }

  init(canvasEl, viewport = {}) {
    if (viewport.pxPerCm) this.pxPerCm = viewport.pxPerCm;
    if (viewport.originPx) this.originPx = viewport.originPx;
    if (viewport.canvasBg) this.canvasBg = viewport.canvasBg;

    this.canvas = new fabric.Canvas(canvasEl, {
      selection: false,
      backgroundColor: this.canvasBg,
      renderOnAddRemove: false,
      fireRightClick: false,
      stopContextMenu: true
    });
  }

  _cmToPx(p) {
    return {
      x: this.originPx.x + p.x * this.pxPerCm,
      y: this.originPx.y + p.y * this.pxPerCm
    };
  }

  _pxToCm(p) {
    return {
      x: (p.x - this.originPx.x) / this.pxPerCm,
      y: (p.y - this.originPx.y) / this.pxPerCm
    };
  }

  _bezierToSvgPath(bezier) {
    if (!bezier.length) return '';
    const first = this._cmToPx(bezier[0].p1);
    let d = `M ${first.x} ${first.y}`;
    for (const seg of bezier) {
      const c1 = this._cmToPx(seg.c1);
      const c2 = this._cmToPx(seg.c2);
      const p2 = this._cmToPx(seg.p2);
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  drawShape(id, bezier, style = {}) {
    if (!bezier.length) return;
    const d = this._bezierToSvgPath(bezier) + ' Z';

    const existing = this.shapes.get(id);
    if (existing) this.canvas.remove(existing);

    const path = new fabric.Path(d, {
      fill: style.fill || 'rgba(254, 202, 202, 0.35)',
      stroke: null,
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      objectCaching: false
    });
    this.canvas.add(path);
    this.shapes.set(id, path);
    path.sendToBack();
  }

  drawCurve(id, bezier, style = {}) {
    if (!bezier.length) return;
    const styleKey = style.family || 'static';
    const s = { ...STYLES[styleKey], ...style };
    const d = this._bezierToSvgPath(bezier);

    const existing = this.curves.get(id);
    if (existing) this.canvas.remove(existing);

    const path = new fabric.Path(d, {
      stroke: s.stroke,
      strokeWidth: s.strokeWidth,
      strokeDashArray: s.dashed ? [6, 4] : null,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      fill: null,
      selectable: false,
      evented: false,
      hoverCursor: 'default',
      objectCaching: false
    });
    this.canvas.add(path);
    this.curves.set(id, path);

    this._rebuildHandles(id, bezier);
  }

  _rebuildHandles(curveId, bezier) {
    const existing = this.handleGroups.get(curveId);
    if (existing) existing.forEach((o) => this.canvas.remove(o));

    const objs = [];
    for (const seg of bezier) {
      const p1 = this._cmToPx(seg.p1);
      const c1 = this._cmToPx(seg.c1);
      const c2 = this._cmToPx(seg.c2);
      const p2 = this._cmToPx(seg.p2);

      objs.push(new fabric.Line([p1.x, p1.y, c1.x, c1.y], {
        stroke: '#c7d2fe', strokeWidth: 1, strokeDashArray: [3, 3],
        selectable: false, evented: false, visible: this.handlesVisible
      }));
      objs.push(new fabric.Line([p2.x, p2.y, c2.x, c2.y], {
        stroke: '#c7d2fe', strokeWidth: 1, strokeDashArray: [3, 3],
        selectable: false, evented: false, visible: this.handlesVisible
      }));
      objs.push(new fabric.Rect({
        left: c1.x, top: c1.y, width: HANDLE_SIZE, height: HANDLE_SIZE,
        fill: '#ffffff', stroke: '#6366f1', strokeWidth: 1.25,
        originX: 'center', originY: 'center',
        selectable: false, evented: false, visible: this.handlesVisible
      }));
      objs.push(new fabric.Rect({
        left: c2.x, top: c2.y, width: HANDLE_SIZE, height: HANDLE_SIZE,
        fill: '#ffffff', stroke: '#6366f1', strokeWidth: 1.25,
        originX: 'center', originY: 'center',
        selectable: false, evented: false, visible: this.handlesVisible
      }));
    }
    objs.forEach((o) => this.canvas.add(o));
    this.handleGroups.set(curveId, objs);
  }

  drawAnchor(id, positionCm, onDrag, style = {}) {
    const px = this._cmToPx(positionCm);
    const existing = this.anchors.get(id);

    if (existing) {
      existing.set({ left: px.x, top: px.y });
      existing.setCoords();
      return;
    }

    const circle = new fabric.Circle({
      left: px.x, top: px.y,
      radius: style.radius || ANCHOR_RADIUS,
      fill: '#ffffff',
      stroke: style.color || '#0c0a09',
      strokeWidth: 2.25,
      originX: 'center', originY: 'center',
      hasControls: false, hasBorders: false,
      lockRotation: true, lockScalingX: true, lockScalingY: true,
      hoverCursor: 'grab', moveCursor: 'grabbing',
      shadow: new fabric.Shadow({ color: 'rgba(12, 10, 9, 0.10)', blur: 4, offsetX: 0, offsetY: 1 }),
      objectCaching: false
    });

    circle.on('moving', () => {
      const cm = this._pxToCm({ x: circle.left, y: circle.top });
      onDrag(cm);
    });

    this.canvas.add(circle);
    this.anchors.set(id, circle);
  }

  drawLandmark(id, positionCm, style = {}) {
    const px = this._cmToPx(positionCm);
    const existing = this.landmarks.get(id);
    if (existing) {
      existing.set({ left: px.x, top: px.y });
      existing.setCoords();
      return;
    }
    const dot = new fabric.Circle({
      left: px.x, top: px.y,
      radius: style.radius || LANDMARK_RADIUS,
      fill: style.color || '#78716c',
      originX: 'center', originY: 'center',
      selectable: false, evented: false
    });
    this.canvas.add(dot);
    this.landmarks.set(id, dot);
  }

  flashCurve(id) {
    const path = this.curves.get(id);
    if (!path) return;
    const originalW = path.strokeWidth;
    path.set({ strokeWidth: originalW + 1.25 });
    this.canvas.requestRenderAll();
    setTimeout(() => {
      path.set({ strokeWidth: originalW });
      this.canvas.requestRenderAll();
    }, 180);
  }

  setHandlesVisible(visible) {
    this.handlesVisible = visible;
    for (const group of this.handleGroups.values()) {
      group.forEach((o) => { o.visible = visible; });
    }
    this.canvas.requestRenderAll();
  }

  render() {
    this._restackZ();
    this.canvas.requestRenderAll();
  }

  _restackZ() {
    for (const obj of this.shapes.values()) obj.sendToBack();
    for (const obj of this.anchors.values()) obj.bringToFront();
  }

  clear() {
    this.canvas.clear();
    this.canvas.backgroundColor = this.canvasBg;
    this.curves.clear();
    this.shapes.clear();
    this.anchors.clear();
    this.landmarks.clear();
    this.handleGroups.clear();
  }
}
