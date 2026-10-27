import { MathUtils, MOUSE, PerspectiveCamera, Spherical, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Where the camera rests after the lift: 35° above the page, turned a little. */
const HOME = { polar: MathUtils.degToRad(55), azimuth: MathUtils.degToRad(-18) };
/** Straight down; a hair off the pole so OrbitControls keeps its bearings. */
const TOP_DOWN = { polar: 0.001, azimuth: 0 };
const EASE_MS = 600;
/** Closest the camera may get to its target, in page pixels. */
const MIN_DISTANCE = 6;
const NEAR = 1;

type Tween = { from: Spherical; to: Spherical; start: number; duration: number } | null;

export type CameraRig = {
  camera: PerspectiveCamera;
  controls: OrbitControls;
  /** Frame a page of this size with a stack this tall above it. */
  fit: (page: { w: number; h: number }, stackHeight?: number) => void;
  topDown: (animate: boolean) => void;
  home: (animate: boolean) => void;
  /** Nudge by angles, for the arrow keys. */
  orbit: (dAzimuth: number, dPolar: number) => void;
  /**
   * Move toward (`share` > 0) or away from a point by that share of the
   * distance to it, and put the orbit pivot at that depth.
   */
  dolly: (point: Vector3, share: number) => void;
  /** Put the orbit pivot at this point's depth so a pan tracks it 1:1. */
  anchor: (point: Vector3) => void;
  /** While on, a left drag slides the view instead of orbiting (Space held). */
  setPanMode: (on: boolean) => void;
  /** Advance tweens and damping. Returns true when the view changed. */
  update: (now: number) => boolean;
  dispose: () => void;
};

/**
 * A perspective camera with orbit controls that never goes under the page.
 *
 * @example
 * const rig = createCameraRig(canvas);
 * rig.fit(snapshot.meta.page); rig.topDown(); rig.home(true);
 */
export function createCameraRig(canvas: HTMLCanvasElement): CameraRig {
  const camera = new PerspectiveCamera(40, 1, 1, 200_000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.screenSpacePanning = true;
  // The wheel is handled by the scene (see `dolly`), so zoom measures the
  // distance to what is under the cursor rather than to the pivot.
  controls.enableZoom = false;
  controls.target.set(0, 0, 0);
  controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN };

  let distance = 2000;
  let tween: Tween = null;
  const spherical = new Spherical();
  const offset = new Vector3();

  const place = (s: Spherical) => {
    offset.setFromSpherical(s);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
  };
  const current = () =>
    spherical.setFromVector3(offset.copy(camera.position).sub(controls.target)).clone();

  const fit = (page: { w: number; h: number }, stackHeight = 0) => {
    controls.target.set(0, stackHeight * 0.3, 0);
    const span = Math.max(page.w, page.h * 0.9 + stackHeight * 0.5);
    distance = (span / 2 / Math.tan(MathUtils.degToRad(camera.fov / 2))) * 1.15;
    // The zoom floor is a few pixels, whatever the page size: a long page
    // must not keep the camera far from a small element.
    controls.minDistance = MIN_DISTANCE;
    controls.maxDistance = distance * 8;
    camera.near = NEAR;
    camera.far = distance * 40;
    camera.updateProjectionMatrix();
  };
  const topDown = (animate: boolean) => {
    const to = new Spherical(distance, TOP_DOWN.polar, TOP_DOWN.azimuth);
    if (!animate) {
      tween = null;
      place(to);
      return;
    }
    tween = { from: current(), to, start: performance.now(), duration: EASE_MS * 0.7 };
  };
  const home = (animate: boolean) => {
    const to = new Spherical(distance, HOME.polar, HOME.azimuth);
    if (!animate) {
      tween = null;
      place(to);
      return;
    }
    tween = { from: current(), to, start: performance.now(), duration: EASE_MS };
  };
  const orbit = (dAzimuth: number, dPolar: number) => {
    tween = null;
    const s = current();
    s.theta += dAzimuth;
    s.phi = MathUtils.clamp(s.phi + dPolar, 0.001, controls.maxPolarAngle);
    place(s);
  };
  const setPanMode = (on: boolean) => {
    controls.mouseButtons.LEFT = on ? MOUSE.PAN : MOUSE.ROTATE;
  };
  const toPoint = new Vector3();
  const forward = new Vector3();
  const dolly = (point: Vector3, share: number) => {
    tween = null;
    toPoint.subVectors(point, camera.position);
    const dist = toPoint.length();
    if (dist < 1e-3) return;
    const next = MathUtils.clamp(dist * (1 - share), MIN_DISTANCE, controls.maxDistance);
    toPoint.normalize();
    camera.position.copy(point).addScaledVector(toPoint, -next);
    camera.getWorldDirection(forward);
    const depth = Math.max(MIN_DISTANCE, toPoint.multiplyScalar(next).dot(forward));
    controls.target.copy(camera.position).addScaledVector(forward, depth);
  };
  const anchor = (point: Vector3) => {
    camera.getWorldDirection(forward);
    const depth = Math.max(MIN_DISTANCE, toPoint.subVectors(point, camera.position).dot(forward));
    controls.target.copy(camera.position).addScaledVector(forward, depth);
  };
  const update = (now: number): boolean => {
    if (tween !== null) {
      const t = Math.min(1, (now - tween.start) / tween.duration);
      const e = settle(t);
      place(
        new Spherical(
          MathUtils.lerp(tween.from.radius, tween.to.radius, e),
          MathUtils.lerp(tween.from.phi, tween.to.phi, e),
          MathUtils.lerp(tween.from.theta, tween.to.theta, e),
        ),
      );
      if (t >= 1) tween = null;
      return true;
    }
    return controls.update();
  };

  return {
    camera,
    controls,
    fit,
    topDown,
    home,
    orbit,
    setPanMode,
    dolly,
    anchor,
    update,
    dispose: () => controls.dispose(),
  };
}

/** `--sr-ease-settle`: decelerate without overshoot. */
function settle(t: number): number {
  return 1 - (1 - t) ** 3;
}
