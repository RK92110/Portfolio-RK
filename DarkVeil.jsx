import React, { useEffect, useRef } from 'react';
import './style.css';
import { Renderer, Camera, Program, Mesh, Geometry } from 'ogl';

const DarkVeil = ({
  speed = 0.5,
  hueShift = 0.0,
  noiseIntensity = 0.8,
  scanlineIntensity = 0.3,
  distortionAmount = 0.5,
  colorShift = 0.0,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const { clientWidth, clientHeight } = canvas.parentElement;

    // Initialize OGL Renderer
    const renderer = new Renderer({
      canvas,
      antialias: true,
      alpha: true,
      dpr: window.devicePixelRatio,
    });

    renderer.setSize(clientWidth, clientHeight);
    renderer.setClearColor([0, 0, 0, 1]);

    // Camera setup
    const camera = new Camera(renderer.gl, {
      fov: 45,
      aspect: clientWidth / clientHeight,
      near: 0.1,
      far: 1000,
    });
    camera.position.z = 5;

    // Vertex Shader
    const vertexShader = `
      attribute vec3 position;
      attribute vec2 uv;
      
      varying vec2 vUv;
      
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      
      void main() {
        vUv = uv;
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 1.0);
      }
    `;

    // Fragment Shader with noise and distortion
    const fragmentShader = `
      precision highp float;
      
      varying vec2 vUv;
      
      uniform float uTime;
      uniform float uSpeed;
      uniform float uHueShift;
      uniform float uNoiseIntensity;
      uniform float uScanlineIntensity;
      uniform float uDistortionAmount;
      uniform float uColorShift;
      
      // Simplex noise function
      vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec2 mod289(vec2 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }
      
      vec3 permute(vec3 x) {
        return mod289(((x * 34.0) + 1.0) * x);
      }
      
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 x12;
        x12.x = x0.x + C.xx;
        x12 = x12 - i;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, C.z, C.w)) + i.x + vec3(0.0, C.x, C.w));
        vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 sx = sign(x) * step(abs(y), abs(x));
        vec3 sy = sign(y) * step(abs(x), abs(y));
        vec3 x0_alt = vec3(sx.x + sy.x, sx.y + sy.y, sx.z + sy.z);
        float g0 = dot(x0_alt, vec3(0.0, C.x, C.y));
        float g1 = dot(x0_alt + vec3(C.z, C.z, C.z), vec3(0.0, C.x, C.y));
        vec2 g2 = dot(vec3(x12.x, x12.y, x12.z) + vec3(C.x, C.x, C.x), vec3(0.0, C.x, C.y));
        vec3 g = vec3(g0, g1, g2.x);
        m = m * fract(abs(g) * 41.0) * (1.0 - 2.0 * step(0.5, fract(abs(g) * 41.0)));
        return 130.0 * dot(m, vec3(g0, g1, g2.y));
      }
      
      // RGB to HSL conversion
      vec3 rgb2hsl(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      
      // HSL to RGB conversion
      vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
      }
      
      void main() {
        vec2 uv = vUv;
        
        // Add distortion based on noise
        float noise = snoise(uv * 3.0 + uTime * uSpeed * 0.5) * uDistortionAmount;
        uv += noise * 0.1;
        
        // Generate noise pattern
        float n = snoise(uv * 5.0 + uTime * uSpeed);
        n += snoise(uv * 10.0 + uTime * uSpeed * 0.5) * 0.5;
        n += snoise(uv * 20.0 - uTime * uSpeed * 0.3) * 0.25;
        n = n * 0.5 + 0.5;
        
        // Add scanlines
        float scanlines = sin(uv.y * 200.0) * uScanlineIntensity;
        
        // Base color with noise intensity
        vec3 color = vec3(n * uNoiseIntensity + scanlines);
        
        // Apply hue shift
        vec3 hsl = rgb2hsl(color);
        hsl.x += uHueShift + uColorShift * 0.1;
        color = hsl2rgb(hsl);
        
        // Add vignette effect
        float dist = length(uv - 0.5);
        float vignette = smoothstep(1.0, 0.0, dist * 1.5);
        color *= vignette;
        
        // Output with slight opacity
        gl_FragColor = vec4(color, 0.95);
      }
    `;

    // Create geometry
    const geometry = new Geometry(renderer.gl, {
      position: {
        size: 3,
        data: new Float32Array([
          -1, -1, 0,
          1, -1, 0,
          1, 1, 0,
          -1, 1, 0,
        ]),
      },
      uv: {
        size: 2,
        data: new Float32Array([
          0, 0,
          1, 0,
          1, 1,
          0, 1,
        ]),
      },
      index: {
        data: new Uint16Array([0, 1, 2, 0, 2, 3]),
      },
    });

    // Create program
    const program = new Program(renderer.gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uHueShift: { value: hueShift },
        uNoiseIntensity: { value: noiseIntensity },
        uScanlineIntensity: { value: scanlineIntensity },
        uDistortionAmount: { value: distortionAmount },
        uColorShift: { value: colorShift },
      },
    });

    // Create mesh
    const mesh = new Mesh(renderer.gl, { geometry, program });

    // Animation loop
    let time = 0;
    const animate = () => {
      time += 0.016; // ~60fps
      program.uniforms.uTime.value = time;

      renderer.render({ scene: mesh });
      requestAnimationFrame(animate);
    };

    // Handle window resize
    const handleResize = () => {
      const newWidth = canvas.parentElement.clientWidth;
      const newHeight = canvas.parentElement.clientHeight;
      renderer.setSize(newWidth, newHeight);
      camera.perspective({
        aspect: newWidth / newHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.gl.deleteProgram(program.program);
      geometry.destroyVAO(renderer.gl);
    };
  }, [speed, hueShift, noiseIntensity, scanlineIntensity, distortionAmount, colorShift]);

  return (
    <div className="dark-veil-container">
      <canvas ref={canvasRef} className="dark-veil-canvas" />
    </div>
  );
};

export default DarkVeil;
