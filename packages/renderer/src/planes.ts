import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  GLSL3,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector3,
  Vector4,
} from 'three';
import type { UvRect } from './atlas';
import type { PlaneTransform } from './layout';
import type { PlaneColor } from './modes';
import type { Palette, Rgba } from './palette';
import { planeFragmentShader, planeVertexShader } from './shader';

/** Width of a plane's edge, in page pixels. */
const EDGE_PX = 1.5;

/** Planes lie flat on the ground (XZ) and lift along +Y. */
const FLAT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);

const scratchMatrix = new Matrix4();
const scratchPosition = new Vector3();
const scratchScale = new Vector3();
const scratchColor = new Color();

/** One instanced mesh with its per-instance color and size buffers. */
export type PlaneMesh = {
  mesh: InstancedMesh;
  fill: InstancedBufferAttribute;
  edge: InstancedBufferAttribute;
  size: InstancedBufferAttribute;
  style: InstancedBufferAttribute;
  uvRect: InstancedBufferAttribute;
  material: ShaderMaterial;
  capacity: number;
};

/**
 * Allocate buffers for up to `capacity` planes. One draw call draws them all.
 *
 * @example
 * const planes = createPlaneMesh(snapshot.elements.length, palette);
 * scene.add(planes.mesh);
 */
export function createPlaneMesh(capacity: number, palette: Palette): PlaneMesh {
  const geometry = new BoxGeometry(1, 1, 1);
  const fill = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  const edge = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  const size = new InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
  const style = new InstancedBufferAttribute(new Float32Array(capacity), 1);
  const uvRect = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  for (const attr of [fill, edge, size, style, uvRect]) attr.setUsage(DynamicDrawUsage);
  geometry.setAttribute('aFill', fill);
  geometry.setAttribute('aEdge', edge);
  geometry.setAttribute('aSize', size);
  geometry.setAttribute('aStyle', style);
  geometry.setAttribute('aUvRect', uvRect);

  const material = new ShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: planeVertexShader,
    fragmentShader: planeFragmentShader,
    uniforms: {
      uBorder: { value: EDGE_PX },
      uHover: { value: -1 },
      uSelected: { value: -1 },
      uHoverFill: { value: toVec4(palette.fillHover) },
      uSelectedEdge: { value: toVec4(palette.selected) },
      uFlashFill: { value: toVec4([palette.accent, 0.75]) },
      uFlashEdge: { value: toVec4([palette.cream, 1]) },
      uDim: { value: 0 },
      uFlash: { value: 0 },
      uAtlas: { value: null },
      uTextured: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });

  const mesh = new InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return { mesh, fill, edge, size, style, uvRect, material, capacity };
}

/**
 * Upload every plane: transform, colors, size and dash style.
 *
 * @example
 * fillPlaneMesh(planes, layoutPlanes(snapshot), colors, 1);
 */
export function fillPlaneMesh(
  target: PlaneMesh,
  planes: PlaneTransform[],
  colors: PlaneColor[],
  explode: number,
  uvOf: ReadonlyMap<number, UvRect> = new Map(),
  thickness = 1,
): void {
  const count = Math.min(planes.length, target.capacity);
  for (let i = 0; i < count; i += 1) {
    const plane = planes[i];
    const color = colors[i];
    if (plane === undefined || color === undefined) continue;
    writeMatrix(target.mesh, i, plane, explode, thickness);
    writeRgba(target.fill, i, color.fill);
    writeRgba(target.edge, i, color.edge);
    target.size.setXY(i, plane.w, plane.h);
    target.style.setX(i, color.dashed ? 1 : 0);
    const uv = uvOf.get(plane.index);
    if (uv === undefined) target.uvRect.setXYZW(i, 0, 0, 0, 0);
    else target.uvRect.setXYZW(i, uv[0], uv[1], uv[2], uv[3]);
  }
  target.mesh.count = count;
  target.mesh.instanceMatrix.needsUpdate = true;
  target.fill.needsUpdate = true;
  target.edge.needsUpdate = true;
  target.size.needsUpdate = true;
  target.style.needsUpdate = true;
  target.uvRect.needsUpdate = true;
}

/**
 * Hand the shader the atlas canvas (or clear it) and switch textured mode.
 *
 * @example
 * setAtlas(planes, atlas.canvas); setTextured(planes, true);
 */
export function setAtlas(target: PlaneMesh, canvas: HTMLCanvasElement | null): void {
  const u = target.material.uniforms.uAtlas;
  if (u === undefined) return;
  const old = u.value as CanvasTexture | null;
  old?.dispose();
  if (canvas === null) {
    u.value = null;
    return;
  }
  const texture = new CanvasTexture(canvas);
  texture.flipY = false;
  texture.generateMipmaps = false;
  u.value = texture;
}

/**
 * Draw crops on the planes that have one.
 *
 * @example
 * setTextured(planes, true);
 */
export function setTextured(target: PlaneMesh, on: boolean): void {
  const u = target.material.uniforms.uTextured;
  if (u !== undefined) u.value = on ? 1 : 0;
}

/**
 * Re-upload only the transforms, for the lift and the explode slider.
 *
 * @example
 * liftPlaneMesh(planes, layout, spring.value);
 */
export function liftPlaneMesh(
  target: PlaneMesh,
  planes: PlaneTransform[],
  explode: number,
  thickness = 1,
): void {
  const count = Math.min(planes.length, target.capacity);
  for (let i = 0; i < count; i += 1) {
    const plane = planes[i];
    if (plane !== undefined) writeMatrix(target.mesh, i, plane, explode, thickness);
  }
  target.mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Point the shader at the hovered and selected instances. `-1` clears.
 *
 * @example
 * setHighlight(planes, hoverInstance, selectedInstance);
 */
export function setHighlight(target: PlaneMesh, hover: number, selected: number): void {
  const u = target.material.uniforms;
  if (u.uHover) u.uHover.value = hover;
  if (u.uSelected) u.uSelected.value = selected;
}

/**
 * Drive the locate pulse: how far the others are dimmed and how bright the
 * selected plane flashes, both 0..1.
 *
 * @example
 * setPulse(planes, 1, 0.5);
 */
export function setPulse(target: PlaneMesh, dim: number, flash: number): void {
  const u = target.material.uniforms;
  if (u.uDim) u.uDim.value = dim;
  if (u.uFlash) u.uFlash.value = flash;
}

/**
 * Free GPU resources.
 *
 * @example
 * disposePlaneMesh(planes);
 */
export function disposePlaneMesh(target: PlaneMesh): void {
  setAtlas(target, null);
  target.mesh.geometry.dispose();
  target.material.dispose();
  target.mesh.dispose();
}

/** The slab's bottom sits at the lift height; it grows upward by `thickness`. */
function writeMatrix(
  mesh: InstancedMesh,
  i: number,
  plane: PlaneTransform,
  explode: number,
  thickness: number,
): void {
  scratchPosition.set(plane.x, plane.z * explode + thickness / 2, -plane.y);
  scratchScale.set(Math.max(plane.w, 0.001), Math.max(plane.h, 0.001), Math.max(thickness, 0.001));
  scratchMatrix.compose(scratchPosition, FLAT, scratchScale);
  mesh.setMatrixAt(i, scratchMatrix);
}

function writeRgba(attr: InstancedBufferAttribute, i: number, rgba: Rgba): void {
  scratchColor.set(rgba[0]);
  attr.setXYZW(i, scratchColor.r, scratchColor.g, scratchColor.b, rgba[1]);
}

function toVec4(rgba: Rgba): Vector4 {
  scratchColor.set(rgba[0]);
  return new Vector4(scratchColor.r, scratchColor.g, scratchColor.b, rgba[1]);
}
