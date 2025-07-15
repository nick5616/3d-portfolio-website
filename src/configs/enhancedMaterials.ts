import * as THREE from 'three';
import { RoomMaterials } from '../types/material.types';

// Enhanced material system with custom shaders
export class EnhancedMaterialSystem {
  private static instance: EnhancedMaterialSystem;
  private shaderUpdateCallbacks: Map<string, (elapsed: number) => void> = new Map();

  static getInstance(): EnhancedMaterialSystem {
    if (!EnhancedMaterialSystem.instance) {
      EnhancedMaterialSystem.instance = new EnhancedMaterialSystem();
    }
    return EnhancedMaterialSystem.instance;
  }

  // ATRIUM SHADERS
  createKintsugiMarbleShader(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        kintsugiIntensity: { value: 0.8 },
        marbleScale: { value: 2.0 },
        veinScale: { value: 8.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float kintsugiIntensity;
        uniform float marbleScale;
        uniform float veinScale;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        // Noise functions
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        float worleyNoise(vec2 st) {
          vec2 i_st = floor(st);
          vec2 f_st = fract(st);
          float minDist = 1.0;
          
          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 neighbor = vec2(float(x), float(y));
              vec2 point = random(i_st + neighbor) * vec2(1.0);
              vec2 diff = neighbor + point - f_st;
              float dist = length(diff);
              minDist = min(minDist, dist);
            }
          }
          return minDist;
        }
        
        void main() {
          // Base marble pattern
          float marbleNoise = noise(vWorldPosition.xz * marbleScale);
          float marblePattern = smoothstep(0.3, 0.7, marbleNoise);
          
          // Golden veins using worley noise
          float veinNoise = worleyNoise(vWorldPosition.xz * veinScale);
          float veinMask = smoothstep(0.85, 0.95, veinNoise);
          
          // Animated glow for veins
          float glowPulse = sin(time * 2.0) * 0.5 + 0.5;
          float veinGlow = veinMask * kintsugiIntensity * glowPulse;
          
          // Colors
          vec3 marbleColor = vec3(0.96, 0.96, 0.98);
          vec3 veinColor = vec3(1.0, 0.84, 0.0); // Gold
          
          // Final color mixing
          vec3 finalColor = mix(marbleColor, veinColor, veinMask);
          vec3 emissive = veinColor * veinGlow;
          
          gl_FragColor = vec4(finalColor + emissive * 0.3, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    this.shaderUpdateCallbacks.set('kintsugi', (elapsed: number) => {
      material.uniforms.time.value = elapsed;
    });

    return material;
  }

  createCausticsShader(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        causticsScale: { value: 4.0 },
        causticsSpeed: { value: 0.8 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float causticsScale;
        uniform float causticsSpeed;
        
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        void main() {
          float timeOffset = time * causticsSpeed;
          
          // Multiple layers of caustics
          float caustic1 = noise((vWorldPosition.xz + vec2(timeOffset, 0.0)) * causticsScale);
          float caustic2 = noise((vWorldPosition.xz + vec2(0.0, timeOffset)) * causticsScale * 1.3);
          float caustic3 = noise((vWorldPosition.xz + vec2(timeOffset * 0.5)) * causticsScale * 0.7);
          
          float causticPattern = (caustic1 * caustic2 + caustic3) / 2.0;
          float causticIntensity = pow(smoothstep(0.4, 0.8, causticPattern), 2.0);
          
          vec3 causticColor = vec3(0.8, 0.9, 1.0);
          vec3 emissive = causticColor * causticIntensity * 0.3;
          
          gl_FragColor = vec4(emissive, causticIntensity * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.shaderUpdateCallbacks.set('caustics', (elapsed: number) => {
      material.uniforms.time.value = elapsed;
    });

    return material;
  }

  // GALLERY SHADERS
  createGalleryWallMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      reflectivity: 0.1,
      side: THREE.DoubleSide
    });
  }

  createArtFrameSpotlight(
    position: THREE.Vector3, 
    target: THREE.Vector3, 
    intensity: number = 0.8,
    angle: number = 0.4,
    penumbra: number = 0.5
  ): THREE.SpotLight {
    const spotlight = new THREE.SpotLight(0xffffff, intensity, 50, angle, penumbra);
    spotlight.position.copy(position);
    spotlight.target.position.copy(target);
    spotlight.castShadow = true;
    
    // Enhanced shadow settings
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;
    spotlight.shadow.camera.near = 0.1;
    spotlight.shadow.camera.far = 50;
    spotlight.shadow.bias = -0.0001;
    spotlight.shadow.normalBias = 0.02;
    
    return spotlight;
  }

  // PROJECTS SHADERS
  createHolographicShader(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        hologramIntensity: { value: 0.8 },
        scanlineFreq: { value: 50.0 },
        glitchAmount: { value: 0.1 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float hologramIntensity;
        uniform float scanlineFreq;
        uniform float glitchAmount;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        
        void main() {
          // Scanlines effect
          float scanlines = sin(vUv.y * scanlineFreq + time * 10.0);
          float scanlineEffect = smoothstep(-0.1, 0.1, scanlines);
          
          // Hologram flicker
          float flicker = sin(time * 20.0) * 0.1 + 0.9;
          
          // Edge glow effect (fresnel)
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - dot(vNormal, viewDirection), 2.0);
          
          // Glitch displacement
          float glitch = sin(time * 15.0 + vUv.y * 100.0) * glitchAmount;
          
          // Base hologram colors (cyan/blue)
          vec3 baseColor = vec3(0.0, 0.8, 1.0);
          vec3 edgeColor = vec3(0.0, 1.0, 1.0);
          
          vec3 finalColor = mix(baseColor, edgeColor, fresnel);
          float finalIntensity = scanlineEffect * flicker * hologramIntensity;
          
          gl_FragColor = vec4(finalColor, finalIntensity * 0.7);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.shaderUpdateCallbacks.set('holographic', (elapsed: number) => {
      material.uniforms.time.value = elapsed;
    });

    return material;
  }

  createFuturisticWallShader(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        circuitIntensity: { value: 0.3 },
        techGlowColor: { value: new THREE.Vector3(0.0, 1.0, 1.0) }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float circuitIntensity;
        uniform vec3 techGlowColor;
        
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          // Circuit board pattern
          float circuitScale = 8.0;
          vec2 scaledUV = vUv * circuitScale;
          
          // Horizontal and vertical lines
          float hLines = step(0.02, fract(scaledUV.y)) * step(0.98, fract(scaledUV.y));
          float vLines = step(0.02, fract(scaledUV.x)) * step(0.98, fract(scaledUV.x));
          float circuitLines = hLines + vLines;
          
          // Animated glow along circuits
          float glowPulse = sin(time * 3.0 + scaledUV.x * 2.0) * 0.5 + 0.5;
          float circuitGlow = circuitLines * glowPulse * circuitIntensity;
          
          // Base wall color (dark metallic)
          vec3 baseColor = vec3(0.15, 0.15, 0.2);
          vec3 emissive = techGlowColor * circuitGlow;
          
          gl_FragColor = vec4(baseColor + emissive, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    this.shaderUpdateCallbacks.set('futuristicWall', (elapsed: number) => {
      material.uniforms.time.value = elapsed;
    });

    return material;
  }

  // ABOUT ROOM SHADERS
  createWireframeGridShader(): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        gridScale: { value: 1.0 },
        lineWidth: { value: 0.02 },
        gridIntensity: { value: 1.0 },
        dataFlowSpeed: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float gridScale;
        uniform float lineWidth;
        uniform float gridIntensity;
        uniform float dataFlowSpeed;
        
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          // Grid calculation
          vec2 scaledUV = vUv * gridScale;
          vec2 gridUV = fract(scaledUV);
          
          // Grid lines
          float lineX = step(1.0 - lineWidth, gridUV.x) + step(gridUV.x, lineWidth);
          float lineY = step(1.0 - lineWidth, gridUV.y) + step(gridUV.y, lineWidth);
          float gridMask = clamp(lineX + lineY, 0.0, 1.0);
          
          // Data flow effect
          float flowX = sin(scaledUV.x * 4.0 - time * dataFlowSpeed);
          float flowY = sin(scaledUV.y * 4.0 - time * dataFlowSpeed * 0.7);
          float dataFlow = flowX * flowY;
          float flowIntensity = smoothstep(-0.3, 0.3, dataFlow);
          
          // Intersection points (brighter)
          float intersection = lineX * lineY;
          
          // Grid color (white with data flow highlights)
          vec3 baseGridColor = vec3(1.0, 1.0, 1.0);
          vec3 dataFlowColor = vec3(0.0, 0.8, 1.0);
          
          vec3 finalColor = mix(baseGridColor, dataFlowColor, flowIntensity * 0.5);
          float finalIntensity = gridMask * gridIntensity + intersection * 0.5;
          
          gl_FragColor = vec4(finalColor, finalIntensity * 0.8);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.shaderUpdateCallbacks.set('wireframeGrid', (elapsed: number) => {
      material.uniforms.time.value = elapsed;
    });

    return material;
  }

  // PARTICLE SYSTEMS
  createMistParticles(scene: THREE.Scene, count: number = 100): { particles: THREE.Points, animateMist: (elapsed: number) => void } {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      
      sizes[i] = Math.random() * 2 + 1;
      alphas[i] = Math.random() * 0.5 + 0.1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          float opacity = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(1.0, 1.0, 1.0, opacity * 0.3);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(geometry, material);
    
    const animateMist = (elapsed: number) => {
      const positions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += Math.sin(elapsed * 0.5 + i) * 0.01;
        if (positions[i * 3 + 1] > 10) positions[i * 3 + 1] = 0;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    };
    
    scene.add(particles);
    return { particles, animateMist };
  }

  // Enhanced Room Materials
  getEnhancedRoomMaterials(roomId: string): RoomMaterials & { enhanced?: any } {
    const base = this.getBaseMaterials(roomId);
    
    switch (roomId) {
      case 'atrium':
        return {
          ...base,
          walls: this.createKintsugiMarbleShader(),
          enhanced: {
            caustics: this.createCausticsShader(),
            mist: (scene: THREE.Scene) => this.createMistParticles(scene)
          }
        };
        
      case 'gallery':
        return {
          ...base,
          walls: this.createGalleryWallMaterial(),
          enhanced: {
            createSpotlight: this.createArtFrameSpotlight.bind(this)
          }
        };
        
      case 'projects':
        return {
          ...base,
          walls: this.createFuturisticWallShader(),
          enhanced: {
            holographic: this.createHolographicShader()
          }
        };
        
      case 'about':
        return {
          ...base,
          enhanced: {
            wireframeGrid: this.createWireframeGridShader()
          }
        };
        
      default:
        return base;
    }
  }

  private getBaseMaterials(roomId: string): RoomMaterials {
    switch (roomId) {
      case 'atrium':
        return {
          walls: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide }),
          floor: new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.3, metalness: 0.1 }),
          ceiling: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2, metalness: 0.05, emissive: '#ffffff', emissiveIntensity: 0.1, side: THREE.DoubleSide })
        };
      case 'gallery':
        return {
          walls: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide }),
          floor: new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.5, metalness: 0.1 }),
          ceiling: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.2, emissive: '#ffd700', emissiveIntensity: 0.05, side: THREE.DoubleSide }),
          dividers: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide })
        };
      case 'projects':
        return {
          walls: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide }),
          floor: new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6, metalness: 0.2 }),
          ceiling: new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.8, metalness: 0.4, emissive: '#00ffff', emissiveIntensity: 0.1, side: THREE.DoubleSide })
        };
      case 'about':
        return {
          walls: new THREE.MeshStandardMaterial({ color: '#f0e6d3', roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide }),
          floor: new THREE.MeshStandardMaterial({ color: '#e6d5c3', roughness: 0.5, metalness: 0.1 }),
          ceiling: new THREE.MeshStandardMaterial({ color: '#f5e6d3', roughness: 0.4, metalness: 0.05, emissive: '#ffa500', emissiveIntensity: 0.05, side: THREE.DoubleSide })
        };
      default:
        return {
          walls: new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide }),
          floor: new THREE.MeshStandardMaterial({ color: '#e0e0e0', roughness: 0.3, metalness: 0.1 }),
          ceiling: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2, metalness: 0.05, side: THREE.DoubleSide })
        };
    }
  }

  // Update all shader uniforms
  updateShaders(elapsed: number): void {
    this.shaderUpdateCallbacks.forEach((callback) => {
      callback(elapsed);
    });
  }
}

// Export enhanced materials function
export const getEnhancedRoomMaterials = (roomId: string) => {
  return EnhancedMaterialSystem.getInstance().getEnhancedRoomMaterials(roomId);
};

export const updateAllShaders = (elapsed: number) => {
  EnhancedMaterialSystem.getInstance().updateShaders(elapsed);
};