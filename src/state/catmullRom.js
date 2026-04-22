const DEFAULT_TENSION = 1.0;

export function catmullRomToBezier(anchors, tension = DEFAULT_TENSION) {
  if (anchors.length < 2) return [];

  const pts = [anchors[0], ...anchors, anchors[anchors.length - 1]];
  const segments = [];
  const f = tension / 6;

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    segments.push({
      p1: { x: p1.x, y: p1.y },
      c1: { x: p1.x + (p2.x - p0.x) * f, y: p1.y + (p2.y - p0.y) * f },
      c2: { x: p2.x - (p3.x - p1.x) * f, y: p2.y - (p3.y - p1.y) * f },
      p2: { x: p2.x, y: p2.y }
    });
  }

  return segments;
}

export function bezierPoint(seg, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * seg.p1.x + 3 * mt2 * t * seg.c1.x + 3 * mt * t2 * seg.c2.x + t2 * t * seg.p2.x,
    y: mt2 * mt * seg.p1.y + 3 * mt2 * t * seg.c1.y + 3 * mt * t2 * seg.c2.y + t2 * t * seg.p2.y
  };
}

export function sampleBezier(segments, samplesPerSegment = 16) {
  const out = [];
  for (const seg of segments) {
    for (let i = 0; i <= samplesPerSegment; i++) {
      out.push(bezierPoint(seg, i / samplesPerSegment));
    }
  }
  return out;
}

export function mirrorBezier(segs) {
  return segs.map((s) => ({
    p1: { x: -s.p1.x, y: s.p1.y },
    c1: { x: -s.c1.x, y: s.c1.y },
    c2: { x: -s.c2.x, y: s.c2.y },
    p2: { x: -s.p2.x, y: s.p2.y }
  }));
}

export function reverseBezier(segs) {
  return segs.slice().reverse().map((s) => ({
    p1: s.p2, c1: s.c2, c2: s.c1, p2: s.p1
  }));
}
