import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 center = vec2(0.5, 0.56);
    vec2 p = (uv - center) * vec2(aspect, 1.0);
    vec2 pointer = (uPointer - center) * vec2(aspect, 1.0);

    float radius = length(p);
    float pointerFalloff = exp(-length(p - pointer) * 3.0);
    vec2 radial = normalize(p + vec2(0.0001));
    vec2 tangent = vec2(-radial.y, radial.x);

    float breathing = sin(radius * 24.0 - uTime * 0.48) * 0.0035;
    float drift = sin(p.x * 6.0 + p.y * 9.0 + uTime * 0.22) * 0.0018;
    vec2 warp = radial * breathing * (0.7 + pointerFalloff * 0.9);
    warp += tangent * drift;
    warp += (uPointer - vec2(0.5)) * pointerFalloff * 0.006;

    float split = 0.0012 + pointerFalloff * 0.0016;
    vec4 base = texture2D(uTexture, uv + warp);
    float red = texture2D(uTexture, uv + warp + tangent * split).r;
    float blue = texture2D(uTexture, uv + warp - tangent * split).b;

    vec3 color = vec3(red, base.g, blue);
    float glint = smoothstep(0.64, 1.0, max(max(color.r, color.g), color.b));
    color += vec3(0.08, 0.05, 0.14) * glint * (0.35 + pointerFalloff * 0.65);

    float vignette = smoothstep(1.15, 0.18, radius);
    float pulse = 0.94 + 0.06 * sin(uTime * 0.42);
    float alpha = base.a * vignette * pulse;

    gl_FragColor = vec4(color, alpha);
  }
`;

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function HeroAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      premultipliedAlpha: true,
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const pointerLocation = gl.getUniformLocation(program, "uPointer");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const textureLocation = gl.getUniformLocation(program, "uTexture");

    const buffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!buffer || !texture || positionLocation < 0) {
      gl.deleteProgram(program);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const pointerTarget = { x: 0.5, y: 0.48 };
    const pointerCurrent = { x: 0.5, y: 0.48 };
    let frameId = 0;
    let disposed = false;
    let visible = true;
    let textureReady = false;
    let firstFrame = true;
    let resizePending = true;
    const startedAt = performance.now();

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const cap = window.matchMedia("(max-width: 640px)").matches ? 1.15 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      resizePending = false;
    };

    const draw = (now: number) => {
      frameId = 0;
      if (!visible || document.hidden || !textureReady) return;
      if (resizePending) resize();

      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.045;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.045;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(pointerLocation, pointerCurrent.x, pointerCurrent.y);
      gl.uniform1f(timeLocation, (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (firstFrame) {
        firstFrame = false;
        root.dataset.ready = "true";
      }

      frameId = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!frameId && visible && !document.hidden && textureReady) {
        frameId = window.requestAnimationFrame(draw);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      pointerTarget.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      pointerTarget.y = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    };

    const onResize = () => {
      resizePending = true;
      start();
    };

    const onVisibilityChange = () => {
      if (document.hidden && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else {
        start();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (!visible && frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        } else {
          start();
        }
      },
      { rootMargin: "180px 0px" },
    );
    observer.observe(root);

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.uniform1i(textureLocation, 0);
      textureReady = true;
      resizePending = true;
      start();
    };
    image.src = "/ancbuddy-sonic-field.svg";

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      image.onload = null;
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frameId) window.cancelAnimationFrame(frameId);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div ref={rootRef} className="hero-atmosphere" aria-hidden="true">
      <img
        className="hero-atmosphere-fallback"
        src="/ancbuddy-sonic-field.svg"
        alt=""
        width="1800"
        height="1200"
        fetchPriority="high"
        decoding="async"
      />
      <canvas ref={canvasRef} className="hero-atmosphere-canvas" />
      <span className="hero-atmosphere-flare hero-atmosphere-flare-left" />
      <span className="hero-atmosphere-flare hero-atmosphere-flare-right" />
    </div>
  );
}
