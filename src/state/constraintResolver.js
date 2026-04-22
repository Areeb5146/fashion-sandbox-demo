export class ConstraintResolver {
  constructor() {
    this.scalar = new Map();
    this.relational = [];
  }

  addScalar(key, c) {
    this.scalar.set(key, c);
  }

  addRelational(c) {
    this.relational.push(c);
  }

  clampScalar(key, v) {
    const c = this.scalar.get(key);
    if (!c) return { value: v, clamped: false, reason: null };
    if (v < c.min) return { value: c.min, clamped: true, reason: c.reason || `${key} minimum is ${c.min}` };
    if (v > c.max) return { value: c.max, clamped: true, reason: c.reason || `${key} maximum is ${c.max}` };
    return { value: v, clamped: false, reason: null };
  }

  resolveRelational(state) {
    const fixes = {};
    let firstReason = null;
    let anyFixed = false;
    for (const r of this.relational) {
      const result = r.check(state);
      if (!result.ok) {
        anyFixed = true;
        if (!firstReason) firstReason = result.reason;
        Object.assign(fixes, result.fix);
        Object.assign(state, result.fix);
      }
    }
    return { fixed: anyFixed, fixes, reason: firstReason };
  }

  getScalar(key) {
    return this.scalar.get(key);
  }
}
