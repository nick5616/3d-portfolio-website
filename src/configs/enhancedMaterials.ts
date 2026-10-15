import * as THREE from "three";
import { RoomMaterials } from "../types/material.types";
import { roomConfigs } from "./rooms";

// Enhanced material system with custom shaders
export class EnhancedMaterialSystem {
    private static instance: EnhancedMaterialSystem;
    private shaderUpdateCallbacks: Map<string, (elapsed: number) => void> =
        new Map();
    private materialCache: Map<string, THREE.Material> = new Map();
    // Uses THREE.DefaultLoadingManager, so the boot loading screen's
    // useProgress() sees these loads.
    private textureLoader = new THREE.TextureLoader();

    static getInstance(): EnhancedMaterialSystem {
        if (!EnhancedMaterialSystem.instance) {
            EnhancedMaterialSystem.instance = new EnhancedMaterialSystem();
        }
        return EnhancedMaterialSystem.instance;
    }

    createCausticsShader(): THREE.ShaderMaterial {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                causticsScale: { value: 4.0 },
                causticsSpeed: { value: 0.8 },
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
            blending: THREE.AdditiveBlending,
        });

        this.shaderUpdateCallbacks.set("caustics", (elapsed: number) => {
            material.uniforms.time.value = elapsed;
        });

        return material;
    }

    // Generic PBR material from a pre-built texture set in
    // public/textures/<id>/ (see scripts/build-textures.mjs). The material
    // renders immediately with its fallback color and gets all of its maps
    // swapped in together once they've loaded (one shader recompile instead
    // of one per map). Cached per id + options, so every room sharing a
    // look shares the GPU textures too.
    pbr(
        id: string,
        options: {
            repeat?: number | [number, number];
            fallbackColor?: string;
            tint?: string;
            roughness?: number;
            metalness?: number;
            normalScale?: number;
            envMapIntensity?: number;
            hasNormal?: boolean;
            anisotropy?: number;
        } = {}
    ): THREE.MeshStandardMaterial {
        const cacheKey = `pbr:${id}:${JSON.stringify(options)}`;
        const cached = this.materialCache.get(cacheKey);
        if (cached) return cached as THREE.MeshStandardMaterial;

        const {
            repeat = 1,
            fallbackColor = "#bbbbbb",
            tint = "#ffffff",
            roughness = 1,
            metalness = 1,
            normalScale = 1,
            envMapIntensity = 1,
            hasNormal = true,
            anisotropy = 4,
        } = options;

        const material = new THREE.MeshStandardMaterial({
            color: fallbackColor,
            roughness: 0.6,
            metalness: 0,
            side: THREE.FrontSide,
        });
        this.materialCache.set(cacheKey, material);

        const load = (file: string, colorSpace: THREE.ColorSpace) =>
            new Promise<THREE.Texture>((resolve, reject) => {
                this.textureLoader.load(
                    `/textures/${id}/${file}`,
                    (texture) => {
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        if (Array.isArray(repeat)) {
                            texture.repeat.set(repeat[0], repeat[1]);
                        } else {
                            texture.repeat.set(repeat, repeat);
                        }
                        texture.colorSpace = colorSpace;
                        texture.anisotropy = anisotropy;
                        resolve(texture);
                    },
                    undefined,
                    reject
                );
            });

        Promise.all([
            load("color.webp", THREE.SRGBColorSpace),
            hasNormal ? load("normal.webp", THREE.NoColorSpace) : null,
            // ORM: R = AO, G = roughness, B = metalness. Data, not color.
            load("orm.webp", THREE.NoColorSpace),
        ])
            .then(([color, normal, orm]) => {
                material.map = color;
                material.color.set(tint);
                if (normal) {
                    material.normalMap = normal;
                    material.normalScale.set(normalScale, normalScale);
                }
                material.aoMap = orm;
                material.roughnessMap = orm;
                material.metalnessMap = orm;
                // With maps present these act as multipliers on the map values.
                material.roughness = roughness;
                material.metalness = metalness;
                material.envMapIntensity = envMapIntensity;
                material.needsUpdate = true;
            })
            .catch((error) =>
                console.warn(`Failed to load texture set "${id}":`, error)
            );

        return material;
    }

    flat(
        key: string,
        params: THREE.MeshStandardMaterialParameters
    ): THREE.MeshStandardMaterial {
        const cacheKey = `flat:${key}`;
        const cached = this.materialCache.get(cacheKey);
        if (cached) return cached as THREE.MeshStandardMaterial;
        const material = new THREE.MeshStandardMaterial({
            side: THREE.FrontSide,
            ...params,
        });
        this.materialCache.set(cacheKey, material);
        return material;
    }

    // Kept for existing callers (HolodeckGrid, GreekPillar).
    createFabricPadded008PBRMaterial(): THREE.MeshStandardMaterial {
        return this.pbr("fabric-padded", {
            repeat: 2,
            fallbackColor: "#6b6b8a",
            roughness: 1,
            metalness: 0,
        });
    }

    createStoneColumnPBRMaterial(): THREE.MeshStandardMaterial {
        return this.pbr("stone-column", {
            fallbackColor: "#d8d0c0",
            metalness: 0,
        });
    }

    // PROJECTS SHADERS
    createHolographicShader(): THREE.ShaderMaterial {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                hologramIntensity: { value: 0.8 },
                scanlineFreq: { value: 50.0 },
                glitchAmount: { value: 0.1 },
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
            side: THREE.FrontSide, // Only render front faces for better performance
        });

        this.shaderUpdateCallbacks.set("holographic", (elapsed: number) => {
            material.uniforms.time.value = elapsed;
        });

        return material;
    }

    createFuturisticWallShader(): THREE.ShaderMaterial {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                circuitIntensity: { value: 0.3 },
                techGlowColor: { value: new THREE.Vector3(0.0, 1.0, 1.0) },
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
            side: THREE.FrontSide, // Only render front faces for better performance
        });

        this.shaderUpdateCallbacks.set("futuristicWall", (elapsed: number) => {
            material.uniforms.time.value = elapsed;
        });

        return material;
    }

    // WALL NOISE SHADER - adds texture and depth to walls
    createWallNoiseShader(): THREE.ShaderMaterial {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                noiseScale: { value: 2.0 },
                noiseIntensity: { value: 0.3 },
                baseColor: { value: new THREE.Vector3(0.96, 0.96, 0.98) },
                noiseColor: { value: new THREE.Vector3(0.9, 0.9, 0.95) },
                normalStrength: { value: 0.5 },
            },
            vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vTangent;
        varying vec3 vBitangent;
        
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          
          // Calculate tangent and bitangent for normal mapping
          vec3 tangent = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
          vec3 bitangent = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
          vTangent = tangent;
          vBitangent = bitangent;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform float time;
        uniform float noiseScale;
        uniform float noiseIntensity;
        uniform vec3 baseColor;
        uniform vec3 noiseColor;
        uniform float normalStrength;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vTangent;
        varying vec3 vBitangent;
        
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
        
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        // Calculate normal from height field
        vec3 calculateNormal(vec2 uv, float height) {
          float eps = 0.01;
          float hL = fbm(uv + vec2(-eps, 0.0));
          float hR = fbm(uv + vec2(eps, 0.0));
          float hD = fbm(uv + vec2(0.0, -eps));
          float hU = fbm(uv + vec2(0.0, eps));
          
          vec3 normal = normalize(vec3(
            (hL - hR) / (2.0 * eps),
            (hD - hU) / (2.0 * eps),
            1.0
          ));
          
          return normal;
        }
        
        void main() {
          // Create noise pattern based on world position
          vec2 noiseUV = vWorldPosition.xz * noiseScale;
          float noisePattern = fbm(noiseUV);
          
          // Add some variation based on UV coordinates
          float uvNoise = noise(vUv * 4.0) * 0.3;
          noisePattern += uvNoise;
          
          // Create height field for normal mapping
          float height = noisePattern * noiseIntensity;
          
          // Calculate perturbed normal
          vec3 perturbedNormal = calculateNormal(noiseUV, height);
          
          // Transform normal to world space
          mat3 TBN = mat3(normalize(vTangent), normalize(vBitangent), normalize(vNormal));
          vec3 worldNormal = normalize(TBN * perturbedNormal);
          
          // Mix base color with noise color
          vec3 finalColor = mix(baseColor, noiseColor, noisePattern * noiseIntensity);
          
          // Enhanced lighting with normal mapping
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          float lightIntensity = dot(worldNormal, lightDir) * 0.5 + 0.5;
          
          // Add some rim lighting for depth
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float rim = 1.0 - max(dot(worldNormal, viewDir), 0.0);
          rim = pow(rim, 2.0);
          
          vec3 rimColor = vec3(0.8, 0.9, 1.0) * rim * 0.3;
          
          gl_FragColor = vec4(finalColor * lightIntensity + rimColor, 1.0);
        }
      `,
            side: THREE.FrontSide, // Only render front faces for better performance
        });

        this.shaderUpdateCallbacks.set("wallNoise", (elapsed: number) => {
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
                dataFlowSpeed: { value: 1.0 },
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
            side: THREE.FrontSide, // Only render front faces for better performance
        });

        this.shaderUpdateCallbacks.set("wireframeGrid", (elapsed: number) => {
            material.uniforms.time.value = elapsed;
        });

        return material;
    }

    // Room surface materials, keyed by "materials key" (a room id, or
    // "gallery" for the whole gallery wing). Every call returns cached
    // materials, so asking again is free.
    getEnhancedRoomMaterials(
        roomId: string
    ): RoomMaterials & { enhanced?: any } {
        switch (roomId) {
            case "atrium":
                return {
                    walls: this.pbr("tiles-062", {
                        repeat: 2,
                        fallbackColor: "#e8e2d4",
                        metalness: 0,
                    }),
                    floor: this.pbr("tiles-fluted", {
                        repeat: 3,
                        fallbackColor: "#d9d3c7",
                        metalness: 0,
                        anisotropy: 8,
                    }),
                    ceiling: this.pbr("ceiling-drop", {
                        repeat: 4,
                        fallbackColor: "#f0f0f0",
                        metalness: 0,
                    }),
                    enhanced: {
                        stoneColumn: this.createStoneColumnPBRMaterial(),
                    },
                };

            case "gallery":
                return {
                    // Matte warm-white plaster: art should be the only thing
                    // on the wall that catches the eye.
                    walls: this.flat("gallery-walls", {
                        color: "#f4f1ea",
                        roughness: 0.92,
                        metalness: 0,
                    }),
                    dividers: this.flat("gallery-dividers", {
                        color: "#f7f5f0",
                        roughness: 0.9,
                        metalness: 0,
                    }),
                    floor: this.pbr("marble-white", {
                        repeat: 4,
                        fallbackColor: "#e9e6e0",
                        roughness: 0.55,
                        metalness: 0,
                        envMapIntensity: 1.2,
                        anisotropy: 8,
                    }),
                    ceiling: this.pbr("ceiling-drop", {
                        repeat: 4,
                        fallbackColor: "#f0f0f0",
                        metalness: 0,
                    }),
                };

            case "projects":
                return {
                    walls: this.pbr("scifi-panel", {
                        repeat: 2,
                        fallbackColor: "#2a2f38",
                        tint: "#8a96aa",
                    }),
                    floor: this.pbr("scifi-plate", {
                        repeat: 4,
                        fallbackColor: "#30343c",
                        tint: "#7d8796",
                        anisotropy: 8,
                    }),
                    // Plain concrete, as authored (no tint) - the original look.
                    ceiling: this.pbr("concrete-ceiling", {
                        repeat: 3,
                        fallbackColor: "#8a8a8a",
                        metalness: 0,
                    }),
                    enhanced: {
                        holographic: this.getHolographicShader(),
                    },
                };

            case "about": {
                const fabric = this.createFabricPadded008PBRMaterial();
                return {
                    walls: this.getWallNoiseShader(),
                    floor: fabric,
                    ceiling: fabric,
                    enhanced: {
                        wireframeGrid: this.getWireframeGridShader(),
                    },
                };
            }

            case "achievements":
                return {
                    walls: this.pbr("wall-stone", {
                        repeat: 3,
                        fallbackColor: "#6a5d50",
                        tint: "#d8c8b4",
                        metalness: 0,
                    }),
                    floor: this.pbr("wood-floor", {
                        repeat: 4,
                        fallbackColor: "#5a3a22",
                        metalness: 0,
                        envMapIntensity: 0.8,
                        anisotropy: 8,
                    }),
                    ceiling: this.pbr("wood-coffers", {
                        repeat: 2,
                        fallbackColor: "#3a2616",
                        metalness: 0,
                    }),
                };

            // Self-built rooms (customRooms.ts) take their shell surfaces
            // from here too, so a room one door away can preload them.
            // Repeats are room size / tile size, per room.
            case "rupee-shop":
                return {
                    walls: this.pbr("plaster", {
                        repeat: [6, 3],
                        fallbackColor: "#e8d6b8",
                        tint: "#f4dcb4",
                        metalness: 0,
                        normalScale: 0.5,
                    }),
                    floor: this.pbr("wood-shop", {
                        repeat: [3, 2.5],
                        fallbackColor: "#6b4428",
                        metalness: 0,
                        anisotropy: 8,
                    }),
                    ceiling: this.flat("rupee-shop-ceiling", {
                        color: "#5a3a22",
                        roughness: 0.9,
                    }),
                    enhanced: {
                        rug: this.pbr("carpet", {
                            repeat: 2,
                            fallbackColor: "#2f6e48",
                            tint: "#3f8a5c",
                            metalness: 0,
                        }),
                    },
                };

            case "bird-dog-studio":
                return {
                    walls: this.pbr("acoustic-wedge", {
                        repeat: [8, 3.5],
                        fallbackColor: "#17121f",
                        tint: "#2a2236",
                        metalness: 0,
                    }),
                    floor: this.pbr("wood-walnut", {
                        repeat: [8, 7],
                        fallbackColor: "#2b1d16",
                        tint: "#8a7a70",
                        metalness: 0,
                        anisotropy: 8,
                    }),
                    ceiling: this.flat("bird-dog-studio-ceiling", {
                        color: "#0e0b14",
                        roughness: 1,
                    }),
                };

            case "jam-room":
                return {
                    walls: this.pbr("acoustic-egg", {
                        repeat: [8, 4],
                        fallbackColor: "#3b2a5c",
                        tint: "#5a4486",
                        metalness: 0,
                    }),
                    floor: this.pbr("carpet", {
                        repeat: 7,
                        fallbackColor: "#2a2238",
                        tint: "#4a3a6e",
                        metalness: 0,
                    }),
                    ceiling: this.flat("jam-room-ceiling", {
                        color: "#241a38",
                        roughness: 1,
                    }),
                };

            case "marble-machine":
                return {
                    walls: this.pbr("brick-terracotta", {
                        repeat: [8, 4.5],
                        fallbackColor: "#a0624a",
                        metalness: 0,
                    }),
                    floor: this.pbr("wood-floor", {
                        repeat: 5,
                        fallbackColor: "#7a5a3a",
                        metalness: 0,
                        envMapIntensity: 0.8,
                        anisotropy: 8,
                    }),
                    ceiling: this.flat("marble-machine-ceiling", {
                        color: "#cdbfa6",
                        roughness: 1,
                    }),
                };

            default:
                return {
                    walls: this.getWallNoiseShader(),
                    floor: this.flat("default-floor", {
                        color: "#e0e0e0",
                        roughness: 0.3,
                        metalness: 0.1,
                    }),
                    ceiling: this.flat("default-ceiling", {
                        color: "#ffffff",
                        roughness: 0.2,
                        metalness: 0.05,
                    }),
                };
        }
    }

    // Shader materials register a per-frame uniform callback, so they're
    // created once and shared rather than rebuilt on every lookup.
    private shaderCache = new Map<string, THREE.ShaderMaterial>();
    private cachedShader(key: string, create: () => THREE.ShaderMaterial) {
        let material = this.shaderCache.get(key);
        if (!material) {
            material = create();
            this.shaderCache.set(key, material);
        }
        return material;
    }
    getHolographicShader() {
        return this.cachedShader("holographic", () =>
            this.createHolographicShader()
        );
    }
    getWallNoiseShader() {
        return this.cachedShader("wallNoise", () =>
            this.createWallNoiseShader()
        );
    }
    getWireframeGridShader() {
        return this.cachedShader("wireframeGrid", () =>
            this.createWireframeGridShader()
        );
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
    return EnhancedMaterialSystem.getInstance().getEnhancedRoomMaterials(
        roomId
    );
};

export const materialsKeyForRoom = (roomId: string) =>
    roomConfigs[roomId]?.galleryRoomKind ? "gallery" : roomId;

// Room surface textures load when a room is about to be seen: the room
// you're in right away, then (when the browser is idle) every room one door
// away, so walking through a door never waits on a texture fetch. This used
// to download every room's textures up front before the site would start.
export const preloadRoomMaterials = (roomId: string) => {
    getEnhancedRoomMaterials(materialsKeyForRoom(roomId));
};

export const preloadNeighborRoomMaterials = (roomId: string) => {
    const neighbors = roomConfigs[roomId]?.archways ?? [];
    const run = () =>
        neighbors.forEach((archway) =>
            preloadRoomMaterials(archway.targetRoomId)
        );
    const idle = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout: number }) => number)
        | undefined;
    if (idle) idle(run, { timeout: 3000 });
    else setTimeout(run, 1500);
};

export const updateAllShaders = (elapsed: number) => {
    EnhancedMaterialSystem.getInstance().updateShaders(elapsed);
};
