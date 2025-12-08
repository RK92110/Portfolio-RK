// Floating Lines Background Component - Vanilla JavaScript Version
class FloatingLines {
  constructor(options = {}) {
    this.options = {
      speed: options.speed || 1.0,
      lineCount: options.lineCount || 15,
      lineWidth: options.lineWidth || 2.0,
      intensity: options.intensity || 0.8,
      colorShift: options.colorShift || 0.0,
      waveAmplitude: options.waveAmplitude || 0.5,
      ...options,
    };

    this.container = null;
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.time = 0;
    this.animationId = null;
  }

  init(containerId = 'floating-lines-bg') {
    // Create or get container
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -10;
        background: linear-gradient(135deg, #0a0e27 0%, #16213e 100%);
        overflow: hidden;
        pointer-events: none;
      `;
      document.body.insertBefore(this.container, document.body.firstChild);
    }

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      background-color: transparent;
    `;
    this.container.appendChild(this.canvas);

    // Get WebGL context
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    // Set canvas size
    this.resizeCanvas();

    // Enable alpha blending
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.clearColor(0, 0, 0, 0);

    // Create shaders and program
    this.createProgram();

    // Create geometry
    this.createGeometry();

    // Start animation loop
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  createProgram() {
    const vertexShader = `
      attribute vec3 position;
      attribute vec2 uv;
      
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision mediump float;
      
      varying vec2 vUv;
      
      uniform float uTime;
      uniform float uSpeed;
      uniform float uLineCount;
      uniform float uLineWidth;
      uniform float uIntensity;
      uniform float uColorShift;
      uniform float uWaveAmplitude;
      
      // Smooth noise function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      float smoothstep_custom(float edge0, float edge1, float x) {
        float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
      }
      
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      
      // Create floating lines effect
      float floatingLine(vec2 uv, float lineIndex, float time) {
        // Horizontal position with wave motion
        float waveX = sin(lineIndex * 0.5 + time * uSpeed * 0.3) * 0.3;
        float lineY = (lineIndex / uLineCount) + waveX;
        
        // Add vertical wave motion
        float verticalWave = sin(uv.x * 3.0 + time * uSpeed * 0.5 + lineIndex) * uWaveAmplitude * 0.05;
        lineY += verticalWave;
        
        // Calculate distance from line
        float dist = abs(uv.y - lineY);
        
        // Create anti-aliased line
        float line = smoothstep_custom(uLineWidth * 0.002, 0.0, dist);
        
        // Add glow effect
        float glow = exp(-dist * 20.0) * 0.3;
        
        return line + glow;
      }
      
      // HSL to RGB
      vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
      }
      
      void main() {
        vec2 uv = vUv;
        
        vec3 color = vec3(0.0);
        
        // Create multiple floating lines
        for(float i = 0.0; i < 20.0; i++) {
          if(i >= uLineCount) break;
          
          float line = floatingLine(uv, i, uTime);
          
          // Color variation per line
          float hue = mod(i / uLineCount + uColorShift * 0.1 + uTime * uSpeed * 0.05, 1.0);
          vec3 lineColor = hsl2rgb(vec3(hue, 0.7, 0.5));
          
          // Add to final color
          color += line * lineColor * uIntensity;
        }
        
        // Add horizontal flowing pattern
        float flowPattern = sin(uv.y * 15.0 + uTime * uSpeed * 0.2) * 0.1;
        color += flowPattern * 0.1;
        
        // Fade edges
        float edge = smoothstep_custom(1.0, 0.0, length(uv - 0.5) * 1.2);
        color *= edge;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Compile shaders
    const vs = this.compileShader(vertexShader, this.gl.VERTEX_SHADER);
    const fs = this.compileShader(fragmentShader, this.gl.FRAGMENT_SHADER);

    // Create program
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vs);
    this.gl.attachShader(this.program, fs);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(this.program));
    }

    this.gl.useProgram(this.program);
  }

  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  createGeometry() {
    // Vertex positions
    const positions = new Float32Array([
      -1, -1, 0,
      1, -1, 0,
      1, 1, 0,
      -1, 1, 0,
    ]);

    // UV coordinates
    const uvs = new Float32Array([
      0, 0,
      1, 0,
      1, 1,
      0, 1,
    ]);

    // Indices
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    // Position buffer
    const posBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, posBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    const posLoc = this.gl.getAttribLocation(this.program, 'position');
    this.gl.enableVertexAttribArray(posLoc);
    this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);

    // UV buffer
    const uvBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, uvBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, uvs, this.gl.STATIC_DRAW);
    const uvLoc = this.gl.getAttribLocation(this.program, 'uv');
    this.gl.enableVertexAttribArray(uvLoc);
    this.gl.vertexAttribPointer(uvLoc, 2, this.gl.FLOAT, false, 0, 0);

    // Index buffer
    const indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

    this.indexCount = indices.length;
  }

  animate = () => {
    this.time += 0.016; // ~60fps

    // Update uniforms
    const timeUniform = this.gl.getUniformLocation(this.program, 'uTime');
    const speedUniform = this.gl.getUniformLocation(this.program, 'uSpeed');
    const lineCountUniform = this.gl.getUniformLocation(this.program, 'uLineCount');
    const lineWidthUniform = this.gl.getUniformLocation(this.program, 'uLineWidth');
    const intensityUniform = this.gl.getUniformLocation(this.program, 'uIntensity');
    const colorShiftUniform = this.gl.getUniformLocation(this.program, 'uColorShift');
    const waveAmplitudeUniform = this.gl.getUniformLocation(this.program, 'uWaveAmplitude');

    this.gl.uniform1f(timeUniform, this.time);
    this.gl.uniform1f(speedUniform, this.options.speed);
    this.gl.uniform1f(lineCountUniform, this.options.lineCount);
    this.gl.uniform1f(lineWidthUniform, this.options.lineWidth);
    this.gl.uniform1f(intensityUniform, this.options.intensity);
    this.gl.uniform1f(colorShiftUniform, this.options.colorShift);
    this.gl.uniform1f(waveAmplitudeUniform, this.options.waveAmplitude);

    // Render
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);

    this.animationId = requestAnimationFrame(this.animate);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.container) {
      this.container.remove();
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FloatingLines;
}
// End of Floating Lines Background Component