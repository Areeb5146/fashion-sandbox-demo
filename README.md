# AI Fashion Sandbox — Architecture POC

Proof-of-concept for the 3-layer parametric garment CAD architecture. Runs on
a full **t-shirt front** silhouette (neckline · shoulder · sleeve · cuff ·
armhole · side seam · hem). The two curves from the brief — **armhole** (as
underarm spline) and **side seam** — drive the cascade proof.

## What it proves

| Requirement | How |
|---|---|
| **Catmull-Rom splines** | Armhole, side seam, and neckline are cubic Beziers whose control handles are auto-generated from anchor points only. Toggle "Show handles" to see them. No handle is ever hardcoded or hand-edited. |
| **Dependency cascade + locking** | Drag `Armhole Depth`: armhole + side seam recompute, neckline/shoulder/sleeve/hem are skipped. Drag `Sleeve Length`: sleeve + armhole recompute, side seam stays locked. Perf HUD shows recomputed/skipped per frame. |
| **No global scaling** | Layer 1 works in cm. Layer 3 does cm↔px once per point. No `transform: scale` anywhere. |
| **Soft-wall clamping** | Scalar range per measurement + relational rules (chest ≥ shoulder+2, neck ≤ shoulder−3, armholePit above hem, sleeveLength clears body, sleeveOpening fits armhole) + mid-anchor (t,perp) regions. Clamps silently; amber badge surfaces the reason. |
| **Renderer swap point** | Layer 1 has zero DOM/Fabric imports. Layer 2 is a 9-method contract. `FabricRenderer` implements it; a Skia implementation would sit beside it. |

## Architecture

```
LAYER 1 · State Engine           src/state/
  pure JS, no DOM, no Fabric
  measurements · DAG · constraints · Catmull-Rom

                 ↓ emits { cascade, softWall, ms }

LAYER 2 · Renderer Contract      src/renderer/RendererContract.js
  init, drawCurve, drawShape, drawAnchor, drawLandmark,
  flashCurve, setHandlesVisible, render, clear

                 ↓ implemented by

LAYER 3 · Fabric.js Renderer     src/renderer/FabricRenderer.js
  cm↔px, hit-testing, drag events
```

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run verify    # headless Layer 1 proofs
npm run build
```

## Measurements

| Key | Default | Range |
|---|---|---|
| `armholeDepth` | 17 cm | 12–25 |
| `chestWidth` (half) | 22 cm | 18–32 |
| `shoulderWidth` (half) | 16 cm | 12–22 |
| `sideLength` | 45 cm | 35–55 |
| `sleeveLength` | 10 cm | 4–20 |
| `sleeveOpening` | 7 cm | 5–14 |
| `neckWidth` (half) | 8 cm | 6–13 |
| `neckDepth` | 7 cm | 4–14 |

## Try

1. **Armhole cascade** — drag `Armhole Depth`. Only armhole + side seam recompute.
2. **Sleeve cascade** — drag `Sleeve Length`. Sleeve top, cuff, and armhole recompute (they share `sleeveBottomOuter`). Side seam stays locked.
3. **Scalar soft wall** — push `Neck Width` toward `shoulderWidth − 3`. Clamps via relational rule; amber badge explains.
4. **Geometry soft wall** — set `Side Length` 35, push `Armhole Depth` up. Scalar clamps at 25, then relational `sideLength − armholeDepth − 3 ≥ 10` pulls it to 22.
5. **Parametric mid anchor** — grab the indigo dot on the side seam, pull a waist curve. Slide `Side Length` — the anchor slides with the new segment, preserving drag intent.
6. **Handles** — click "Show handles" to reveal auto-generated Bezier handles. Drag anything; they recompute live.

## File map

```
src/
├── state/                       Layer 1 — pure JS
│   ├── catmullRom.js            Spline → Bezier, mirror/reverse transforms
│   ├── dependencyGraph.js       DAG + topological cascade
│   ├── constraintResolver.js    Scalar + relational soft-wall
│   ├── patternModel.js          T-shirt: measurements → curves, garment topology
│   └── index.js                 Public PatternState API
├── renderer/
│   ├── RendererContract.js      Layer 2 — the swap point
│   └── FabricRenderer.js        Layer 3 — Fabric.js
├── ui/
│   ├── sliders.js               Tweakpane measurement sliders
│   ├── jsonPanel.js             Live state.json readout
│   └── statusStrip.js           Clamp badge · cascade feed · perf HUD
└── main.js                      Wiring
scripts/
└── verify-cascade.mjs           Headless asserts (cascade, clamps, perf)
```
