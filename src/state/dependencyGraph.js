export class DependencyGraph {
  constructor() {
    this.nodes = new Map();
    this.downstream = new Map();
    this.values = new Map();
    this.topoOrder = [];
  }

  register(node) {
    this.nodes.set(node.id, node);
  }

  build() {
    this.downstream.clear();
    for (const id of this.nodes.keys()) this.downstream.set(id, new Set());

    for (const node of this.nodes.values()) {
      for (const dep of node.deps) {
        if (!this.downstream.has(dep)) {
          throw new Error(`Unknown dep "${dep}" referenced by "${node.id}"`);
        }
        this.downstream.get(dep).add(node.id);
      }
    }

    const indeg = new Map();
    for (const node of this.nodes.values()) indeg.set(node.id, node.deps.length);

    const queue = [];
    for (const [id, d] of indeg) if (d === 0) queue.push(id);

    this.topoOrder = [];
    while (queue.length) {
      const id = queue.shift();
      this.topoOrder.push(id);
      for (const down of this.downstream.get(id)) {
        indeg.set(down, indeg.get(down) - 1);
        if (indeg.get(down) === 0) queue.push(down);
      }
    }

    if (this.topoOrder.length !== this.nodes.size) {
      throw new Error('Cycle detected in dependency graph');
    }
  }

  recomputeAll(ctx) {
    const recomputed = [];
    for (const id of this.topoOrder) {
      const node = this.nodes.get(id);
      this.values.set(id, node.compute({ ...ctx, get: (k) => this.values.get(k) }));
      recomputed.push(id);
    }
    return { recomputed, skipped: [] };
  }

  cascadeFrom(changedIds, ctx) {
    const dirty = new Set(changedIds);
    const stack = [...changedIds];
    while (stack.length) {
      const id = stack.pop();
      for (const down of this.downstream.get(id)) {
        if (!dirty.has(down)) {
          dirty.add(down);
          stack.push(down);
        }
      }
    }

    const recomputed = [];
    const skipped = [];
    for (const id of this.topoOrder) {
      if (!dirty.has(id)) {
        skipped.push(id);
        continue;
      }
      const node = this.nodes.get(id);
      this.values.set(id, node.compute({ ...ctx, get: (k) => this.values.get(k) }));
      recomputed.push(id);
    }
    return { recomputed, skipped };
  }

  get(id) {
    return this.values.get(id);
  }
}
