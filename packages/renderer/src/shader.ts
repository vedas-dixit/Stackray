/**
 * One draw call for every plane: fill, a pixel-width edge, optional dashes,
 * hover and selection, all from per-instance attributes. GLSL ES 3.0 so the
 * instance id is available for hover and selection without re-uploading.
 */
export const planeVertexShader = /* glsl */ `
in vec4 aFill;
in vec4 aEdge;
in vec2 aSize;
in float aStyle;
in vec4 aUvRect;
out vec2 vUv;
out vec4 vFill;
out vec4 vEdge;
out vec2 vSize;
out float vStyle;
out vec4 vUvRect;
out float vFace;
flat out int vId;

void main() {
  vUv = uv;
  // +1 on the top face, -1 underneath, 0 on the sides of the slab.
  vFace = normal.z;
  vFill = aFill;
  vEdge = aEdge;
  vSize = aSize;
  vStyle = aStyle;
  vUvRect = aUvRect;
  vId = gl_InstanceID;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

export const planeFragmentShader = /* glsl */ `
precision highp float;
in vec2 vUv;
in vec4 vFill;
in vec4 vEdge;
in vec2 vSize;
in float vStyle;
in vec4 vUvRect;
in float vFace;
flat in int vId;
uniform sampler2D uAtlas;
uniform float uTextured;
uniform float uBorder;
uniform int uHover;
uniform int uSelected;
uniform vec4 uHoverFill;
uniform vec4 uSelectedEdge;
uniform vec4 uFlashFill;
uniform vec4 uFlashEdge;
uniform float uDim;
uniform float uFlash;
out vec4 fragColor;

void main() {
  if (vFace < -0.5) discard;
  vec2 d = min(vUv, 1.0 - vUv) * vSize;
  float edgeDist = min(d.x, d.y);
  float border = uBorder;
  vec4 edge = vEdge;
  vec4 fill = vFill;
  if (uTextured > 0.5 && vUvRect.z > vUvRect.x) {
    vec2 t = vec2(mix(vUvRect.x, vUvRect.z, vUv.x), mix(vUvRect.y, vUvRect.w, 1.0 - vUv.y));
    vec4 tex = texture(uAtlas, t);
    fill = vec4(tex.rgb, 0.96);
  }
  if (vId == uSelected) {
    edge = mix(uSelectedEdge, uFlashEdge, uFlash);
    fill = mix(fill, uFlashFill, uFlash);
    border = uBorder * (1.6 + uFlash);
  } else {
    float keep = mix(1.0, 0.06, uDim);
    fill.a *= keep;
    edge.a *= keep;
  }
  if (vId == uHover && uDim < 0.5) {
    fill = uHoverFill;
  }
  float onEdge = 1.0 - smoothstep(border - 0.5, border + 0.5, edgeDist);
  if (vStyle > 0.5) {
    float along = d.x < d.y ? vUv.y * vSize.y : vUv.x * vSize.x;
    float dash = step(0.5, fract(along / 10.0));
    onEdge *= dash;
  }
  vec4 color = mix(fill, edge, onEdge);
  if (vFace < 0.5) {
    // The rim of the slab: the edge color, darker and a little more solid.
    color = vec4(edge.rgb * 0.75, min(1.0, edge.a * 1.2 + 0.1));
    if (vId == uSelected) color = vec4(edge.rgb, 1.0);
  }
  if (color.a < 0.003) discard;
  fragColor = color;
}
`;
