import type { Rect, Snapshot } from '@stackray/core';
import {
  Color,
  GridHelper,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Texture,
  Scene as ThreeScene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { buildAtlas, type Tile, texturedCandidates, type UvRect } from './atlas';
import { type CameraRig, createCameraRig } from './camera';
import {
  defaultLayout,
  type LayoutOptions,
  layoutPlanes,
  type PlaneTransform,
  stackLevels,
} from './layout';
import { pulseAt } from './locate';
import { type ColorMode, type ModeEnv, modeEnv, type PlaneColor, planeColor } from './modes';
import { defaultPalette, type Palette } from './palette';
import {
  createPlaneMesh,
  disposePlaneMesh,
  fillPlaneMesh,
  liftPlaneMesh,
  type PlaneMesh,
  setAtlas,
  setHighlight,
  setTextured as setMeshTextured,
  setPulse,
} from './planes';
import { isSettled, liftSpring, type SpringState, stepSpring } from './spring';

export type FrameStats = { frameMs: number; planes: number };
export type Screenshot = { dataUrl: string; rect: Rect };

export type SceneOptions = {
  palette?: Palette;
  /** Element index under the pointer, or null, with the pointer in canvas pixels. */
  onHover?: (index: number | null, x: number, y: number) => void;
  onPick?: (index: number, detail: 'click' | 'dblclick') => void;
  onFrame?: (stats: FrameStats) => void;
};

export type Scene = {
  setSnapshot: (snapshot: Snapshot) => void;
  setLayout: (layout: Partial<LayoutOptions>) => void;
  setMode: (mode: ColorMode) => void;
  setSelected: (index: number | null) => void;
  /**
   * Select and draw attention: everything else fades, the plane blinks, the
   * rest fade back. `reduced` skips the animation and only selects.
   */
  locate: (index: number, options?: { reduced?: boolean }) => void;
  /** Photographed screens of the page; they lie under the stack and feed the crops. */
  setScreenshots: (tiles: Screenshot[]) => void;
  /** Draw each leaf plane with its own pixels from the screenshots. */
  setTextured: (on: boolean) => void;
  /** Dim every plane not in the set, e.g. while a search is typed. `null` clears. */
  setFocus: (indices: ReadonlySet<number> | null) => void;
  /** Jump to an explode value without animating. */
  setExplode: (value: number) => void;
  /** Spring the stack to an explode value, 0 flat to 1 fully apart; resolves when settled. */
  lift: (target: number) => Promise<void>;
  topDown: (animate: boolean) => void;
  home: (animate: boolean) => void;
  orbit: (dAzimuth: number, dPolar: number) => void;
  getStats: () => FrameStats;
  dispose: () => void;
};

/** Space between two stacked levels at explode 100 %, as a share of the page width. */
const GAP_RATIO = 0.045;
const GAP_MIN = 20;
const GAP_MAX = 72;
/** Slab thickness as a share of the gap; it stops growing past explode 130 %. */
const THICKNESS_SHARE = 0.32;
const MIN_THICKNESS = 0.6;
/** The explode slider goes to 200 %. */
const MAX_EXPLODE = 2;
const CLICK_SLOP_PX = 5;
const FLAT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const GROUND = new Plane(new Vector3(0, 1, 0), 0);
/** Share of the distance to the thing under the cursor covered by one wheel notch. */
const ZOOM_STEP = 0.2;

/**
 * A WebGL scene that draws a snapshot as lifted planes. Never touches the host
 * DOM beyond its own canvas.
 *
 * @example
 * const scene = createScene(canvas, { onHover: showTooltip });
 * scene.setSnapshot(snapshot);
 * scene.topDown();
 * await scene.lift(1);
 */
export function createScene(canvas: HTMLCanvasElement, options: SceneOptions = {}): Scene {
  const palette = options.palette ?? defaultPalette;
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(new Color(palette.viewport));
  const three = new ThreeScene();
  const rig: CameraRig = createCameraRig(canvas);
  const raycaster = new Raycaster();

  let snapshot: Snapshot | null = null;
  let env: ModeEnv | null = null;
  let levels: Int32Array | null = null;
  let maxLevel = 0;
  let layout: LayoutOptions = { ...defaultLayout };
  let mode: ColorMode = 'depth';
  let planes: PlaneTransform[] = [];
  let colors: PlaneColor[] = [];
  let mesh: PlaneMesh | null = null;
  let grid: GridHelper | null = null;
  let shots: Mesh[] = [];
  let pendingShots: Screenshot[] = [];
  let tiles: Tile[] = [];
  let uvOf: Map<number, UvRect> = new Map();
  let textured = false;
  let atlasJob = 0;
  let instanceOf = new Map<number, number>();
  let selected = -1;
  let hover = -1;
  let focus: ReadonlySet<number> | null = null;
  let explode: SpringState = { value: 1, velocity: 0 };
  let liftTarget: number | null = null;
  let liftDone: (() => void) | null = null;
  let pointer: { x: number; y: number } | null = null;
  let pointerDirty = false;
  let pressed: { x: number; y: number } | null = null;
  let panning = false;
  let pulseStart: number | null = null;
  let stats: FrameStats = { frameMs: 0, planes: 0 };
  let last = performance.now();
  let raf = 0;
  let disposed = false;

  const ndc = new Vector2();

  const gapFor = (): number => {
    if (snapshot === null) return GAP_MIN;
    if (layout.axis === 'order') {
      // The staircase: thousands of hair-thin steps adding up to one page height.
      return snapshot.meta.page.h / Math.max(1, snapshot.paintOrder.length - 1);
    }
    return Math.min(GAP_MAX, Math.max(GAP_MIN, snapshot.meta.page.w * GAP_RATIO));
  };
  const stackHeight = (): number => {
    if (snapshot === null) return 0;
    if (layout.axis === 'order') return snapshot.meta.page.h;
    return (layout.axis === 'depth' ? (env?.maxDepth ?? 0) : maxLevel) * gapFor();
  };

  const colorFor = (index: number): PlaneColor => {
    const el = snapshot?.elements[index];
    if (el === undefined || snapshot === null || env === null) {
      return { fill: palette.fill, edge: palette.edge, dashed: false };
    }
    const base = planeColor(el, snapshot, mode, palette, env);
    // In textured mode an invisible overlay must not hide what it covers.
    const color = textured && el.ghost ? { ...base, fill: [base.fill[0], 0.05] as const } : base;
    if (focus === null || focus.has(index)) return color;
    return {
      fill: [color.fill[0], color.fill[1] * 0.25],
      edge: [color.edge[0], color.edge[1] * 0.2],
      dashed: color.dashed,
    };
  };

  const thicknessFor = (value: number): number =>
    Math.max(MIN_THICKNESS, Math.min(value, 1.3) * gapFor() * THICKNESS_SHARE);

  const rebuild = () => {
    if (snapshot === null || env === null || mesh === null) return;
    planes = layoutPlanes(snapshot, { ...layout, gap: gapFor(), levels: levels ?? undefined });
    colors = planes.map((p) => colorFor(p.index));
    instanceOf = new Map(planes.map((p, i) => [p.index, i]));
    fillPlaneMesh(mesh, planes, colors, explode.value, uvOf, thicknessFor(explode.value));
    stats = { ...stats, planes: planes.length };
    applyHighlight();
  };

  const recolor = () => {
    if (snapshot === null || env === null || mesh === null) return;
    colors = planes.map((p) => colorFor(p.index));
    fillPlaneMesh(mesh, planes, colors, explode.value, uvOf, thicknessFor(explode.value));
  };

  const clearShots = () => {
    for (const m of shots) {
      three.remove(m);
      m.geometry.dispose();
      const material = m.material as MeshBasicMaterial;
      material.map?.dispose();
      material.dispose();
    }
    shots = [];
  };

  /** Lay the photographed screens under the stack; the first (the view at capture time) on top. */
  const placeShots = () => {
    clearShots();
    if (snapshot === null) return;
    const { page } = snapshot.meta;
    tiles.forEach((tile, i) => {
      const texture = new Texture(tile.image as HTMLImageElement);
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
      const { rect } = tile;
      const m = new Mesh(
        new PlaneGeometry(rect.w, rect.h),
        new MeshBasicMaterial({ map: texture, toneMapped: false }),
      );
      m.quaternion.copy(FLAT);
      m.position.set(
        rect.x + rect.w / 2 - page.w / 2,
        -1 - i * 0.05,
        -(page.h / 2 - (rect.y + rect.h / 2)),
      );
      three.add(m);
      shots.push(m);
    });
  };

  const rebuildAtlas = async () => {
    atlasJob += 1;
    const job = atlasJob;
    if (snapshot === null || mesh === null || tiles.length === 0) {
      uvOf = new Map();
      if (mesh !== null) {
        setAtlas(mesh, null);
        fillPlaneMesh(mesh, planes, colors, explode.value, uvOf, thicknessFor(explode.value));
      }
      return;
    }
    const size = Math.min(4096, renderer.capabilities.maxTextureSize);
    const result = await buildAtlas(tiles, snapshot, {
      size,
      maxCrop: 320,
      indices: texturedCandidates(snapshot),
    });
    if (job !== atlasJob || disposed || mesh === null) return;
    uvOf = result.uv;
    setAtlas(mesh, result.canvas);
    fillPlaneMesh(mesh, planes, colors, explode.value, uvOf, thicknessFor(explode.value));
  };

  const loadTile = (shot: Screenshot): Promise<Tile> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({ image, width: image.naturalWidth, height: image.naturalHeight, rect: shot.rect });
      image.onerror = () => reject(new Error('Screenshot tile failed to load.'));
      image.src = shot.dataUrl;
    });

  const applyHighlight = () => {
    if (mesh === null) return;
    setHighlight(mesh, hover, selected >= 0 ? (instanceOf.get(selected) ?? -1) : -1);
  };

  const resize = () => {
    const box = (canvas.parentElement ?? canvas).getBoundingClientRect();
    const w = Math.max(1, Math.floor(box.width));
    const h = Math.max(1, Math.floor(box.height));
    renderer.setSize(w, h, false);
    rig.camera.aspect = w / h;
    rig.camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement ?? canvas);
  resize();

  const raycast = () => {
    if (pointer === null || mesh === null || mesh.mesh.count === 0) return;
    const box = canvas.getBoundingClientRect();
    ndc.set((pointer.x / box.width) * 2 - 1, -(pointer.y / box.height) * 2 + 1);
    raycaster.setFromCamera(ndc, rig.camera);
    const hit = raycaster.intersectObject(mesh.mesh, false)[0];
    const instance = hit?.instanceId ?? -1;
    if (instance !== hover) {
      hover = instance;
      applyHighlight();
      const index = instance >= 0 ? (planes[instance]?.index ?? null) : null;
      options.onHover?.(index, pointer.x, pointer.y);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - box.left, y: e.clientY - box.top };
    pointerDirty = true;
  };
  const onPointerLeave = () => {
    pointer = null;
    if (hover !== -1) {
      hover = -1;
      applyHighlight();
      options.onHover?.(null, 0, 0);
    }
  };
  const cursorPoint = new Vector3();
  /** The plane under a client position, else the ground under it. False when neither is hit. */
  const pointUnder = (clientX: number, clientY: number, out: Vector3): boolean => {
    const box = canvas.getBoundingClientRect();
    ndc.set(
      ((clientX - box.left) / box.width) * 2 - 1,
      -((clientY - box.top) / box.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, rig.camera);
    const hit =
      mesh !== null && mesh.mesh.count > 0
        ? raycaster.intersectObject(mesh.mesh, false)[0]
        : undefined;
    if (hit !== undefined) {
      out.copy(hit.point);
      return true;
    }
    return raycaster.ray.intersectPlane(GROUND, out) !== null;
  };
  const onPointerDown = (e: PointerEvent) => {
    pressed = { x: e.clientX, y: e.clientY };
    // A pan tracks the surface under the cursor 1:1, whatever the zoom.
    if (
      (panning || e.button === 1 || e.button === 2) &&
      pointUnder(e.clientX, e.clientY, cursorPoint)
    ) {
      rig.anchor(cursorPoint);
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (pressed === null) return;
    const moved = Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y);
    pressed = null;
    if (moved > CLICK_SLOP_PX || e.button !== 0) return;
    onPointerMove(e);
    pointerDirty = false;
    raycast();
    const index = hover >= 0 ? planes[hover]?.index : undefined;
    if (index !== undefined) options.onPick?.(index, 'click');
  };
  const onDoubleClick = () => {
    const index = hover >= 0 ? planes[hover]?.index : undefined;
    if (index !== undefined) options.onPick?.(index, 'dblclick');
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!pointUnder(e.clientX, e.clientY, cursorPoint)) {
      raycaster.ray.at(rig.camera.position.distanceTo(rig.controls.target), cursorPoint);
    }
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    const notch = MathUtils.clamp((e.deltaY * unit) / 100, -1, 1);
    rig.dolly(cursorPoint, -notch * (e.ctrlKey ? ZOOM_STEP * 1.6 : ZOOM_STEP));
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('dblclick', onDoubleClick);

  // Hold Space to pan with a left drag, like every 3D app. Only when focus
  // is not in a text box or on a control, so Space still types and clicks.
  const setPanning = (on: boolean) => {
    if (panning === on) return;
    panning = on;
    rig.setPanMode(on);
    canvas.style.cursor = on ? 'grab' : '';
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== ' ' || e.repeat || !spaceIsFree(canvas)) return;
    setPanning(true);
    e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== ' ' || !panning) return;
    setPanning(false);
    e.preventDefault();
  };
  const onBlur = () => setPanning(false);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);

  const frame = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    if (liftTarget !== null && mesh !== null) {
      explode = stepSpring(explode, liftTarget, liftSpring, dt);
      if (isSettled(explode, liftTarget)) {
        explode = { value: liftTarget, velocity: 0 };
        const done = liftDone;
        liftTarget = null;
        liftDone = null;
        done?.();
      }
      liftPlaneMesh(mesh, planes, explode.value, thicknessFor(explode.value));
    }

    if (pulseStart !== null && mesh !== null) {
      const pulse = pulseAt(now - pulseStart);
      setPulse(mesh, pulse.dim, pulse.flash);
      if (pulse.done) pulseStart = null;
    }

    rig.update(now);
    if (pointerDirty && pressed === null) {
      pointerDirty = false;
      raycast();
    }
    const t0 = performance.now();
    renderer.render(three, rig.camera);
    stats = { frameMs: performance.now() - t0, planes: planes.length };
    options.onFrame?.(stats);
  };
  raf = requestAnimationFrame(frame);

  return {
    setSnapshot(next) {
      snapshot = next;
      env = modeEnv(next);
      levels = stackLevels(next);
      maxLevel = levels.reduce((m, l) => Math.max(m, l), 0);
      if (mesh !== null) {
        three.remove(mesh.mesh);
        disposePlaneMesh(mesh);
      }
      mesh = createPlaneMesh(Math.max(1, next.elements.length), palette);
      three.add(mesh.mesh);
      if (grid !== null) {
        three.remove(grid);
        grid.dispose();
      }
      const span = Math.max(next.meta.page.w, next.meta.page.h) * 1.6;
      grid = new GridHelper(span, Math.max(4, Math.round(span / 120)), '#2e2924', '#2e2924');
      grid.position.y = -2;
      three.add(grid);
      rig.fit(next.meta.page, stackHeight());
      selected = -1;
      hover = -1;
      uvOf = new Map();
      rebuild();
      if (tiles.length > 0) {
        placeShots();
        void rebuildAtlas();
      }
      setMeshTextured(mesh, textured);
    },
    setLayout(partial) {
      layout = { ...layout, ...partial };
      rebuild();
    },
    setMode(next) {
      mode = next;
      recolor();
    },
    setSelected(index) {
      selected = index ?? -1;
      applyHighlight();
      if (index === null && pulseStart !== null) {
        pulseStart = null;
        if (mesh !== null) setPulse(mesh, 0, 0);
      }
    },
    locate(index, options) {
      selected = index;
      applyHighlight();
      if (options?.reduced || mesh === null) return;
      pulseStart = performance.now();
      setPulse(mesh, 0, 0);
    },
    setFocus(indices) {
      focus = indices;
      recolor();
    },
    setScreenshots(next) {
      pendingShots = next;
      tiles = [];
      clearShots();
      if (next.length === 0) {
        void rebuildAtlas();
        return;
      }
      Promise.all(next.map(loadTile))
        .then((loaded) => {
          if (disposed || pendingShots !== next) return;
          tiles = loaded;
          placeShots();
          void rebuildAtlas();
        })
        .catch(() => {
          tiles = [];
        });
    },
    setTextured(on) {
      textured = on;
      if (mesh !== null) setMeshTextured(mesh, on);
      recolor();
    },
    setExplode(value) {
      liftTarget = null;
      liftDone?.();
      liftDone = null;
      explode = { value: Math.min(MAX_EXPLODE, Math.max(0, value)), velocity: 0 };
      if (mesh !== null) liftPlaneMesh(mesh, planes, explode.value, thicknessFor(explode.value));
    },
    lift(target) {
      liftDone?.();
      liftTarget = target;
      return new Promise<void>((resolve) => {
        liftDone = resolve;
      });
    },
    topDown: (animate) => rig.topDown(animate),
    home: (animate) => rig.home(animate),
    orbit: (dAzimuth, dPolar) => rig.orbit(dAzimuth, dPolar),
    getStats: () => stats,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      canvas.style.cursor = '';
      atlasJob += 1;
      clearShots();
      if (mesh !== null) disposePlaneMesh(mesh);
      grid?.dispose();
      rig.dispose();
      renderer.dispose();
    },
  };
}

const PAN_SAFE_TAGS = new Set(['BODY', 'HTML', 'DIV', 'CANVAS', 'STACKRAY-STAGE']);

/** True when Space is not needed for typing or for a focused control. */
function spaceIsFree(canvas: HTMLCanvasElement): boolean {
  const root = canvas.getRootNode() as Document | ShadowRoot;
  const active = root.activeElement ?? document.activeElement;
  if (active === null) return true;
  return PAN_SAFE_TAGS.has(active.tagName) && !active.hasAttribute('role');
}
