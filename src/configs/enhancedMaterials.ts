import * as THREE from "three";
import { RoomMaterials } from "../types/material.types";

// Enhanced material system with custom shaders
export class EnhancedMaterialSystem {
    private static instance: EnhancedMaterialSystem;
    private shaderUpdateCallbacks: Map<string, (elapsed: number) => void> =
        new Map();
    private materialCache: Map<string, THREE.Material> = new Map();

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

    // Stone Column PBR Material - cached for performance
    createStoneColumnPBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "stoneColumnPBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#8B7355", // Stone-like color
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 4; // Removed metallic texture

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material
                const material = new THREE.MeshStandardMaterial({
                    map: textures.baseColor,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    aoMap: textures.ao,
                    normalScale: new THREE.Vector2(1.0, 1.0),
                    side: THREE.DoubleSide,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Stylized_Stone_Column_001_SD/Stylized_Stone_Column_001_basecolor.png",
            onTextureLoad,
            undefined,
            (error) => console.warn("Failed to load base color texture:", error)
        );
        textures.normal = textureLoader.load(
            "/images/Stylized_Stone_Column_001_SD/Stylized_Stone_Column_001_normal.png",
            onTextureLoad,
            undefined,
            (error) => console.warn("Failed to load normal texture:", error)
        );
        textures.roughness = textureLoader.load(
            "/images/Stylized_Stone_Column_001_SD/Stylized_Stone_Column_001_roughness.png",
            onTextureLoad,
            undefined,
            (error) => console.warn("Failed to load roughness texture:", error)
        );
        textures.ao = textureLoader.load(
            "/images/Stylized_Stone_Column_001_SD/Stylized_Stone_Column_001_ambientOcclusion.png",
            onTextureLoad,
            undefined,
            (error) => console.warn("Failed to load AO texture:", error)
        );

        // Configure texture settings
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1, 1);
        });

        return fallbackMaterial;
    }

    // Tiles 062 PBR Material for Walls
    createTiles062WallPBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "tiles062WallPBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#f0f0f0", // Light grey color for tiles
            roughness: 0.4,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 6; // Base color, normal, roughness, AO, height, material

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material
                const material = new THREE.MeshStandardMaterial({
                    map: textures.baseColor,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    aoMap: textures.ao,
                    displacementMap: textures.height,
                    emissiveMap: textures.materialDetail,
                    normalScale: new THREE.Vector2(1.0, 1.0),
                    displacementScale: 0.1,
                    displacementBias: -0.05,
                    emissiveIntensity: 0.1,
                    side: THREE.DoubleSide,
                    roughness: 0.4,
                    metalness: 0.1,
                    envMapIntensity: 0.3,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Tiles_062_SD/Tiles_062_basecolor.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_062 base color texture:",
                    error
                )
        );
        textures.normal = textureLoader.load(
            "/images/Tiles_062_SD/Tiles_062_normal.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load Tiles_062 normal texture:", error)
        );
        textures.roughness = textureLoader.load(
            "/images/Tiles_062_SD/Tiles_062_roughness.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_062 roughness texture:",
                    error
                )
        );
        textures.ao = textureLoader.load(
            "/images/Tiles_062_SD/Tiles_062_ambientOcclusion.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load Tiles_062 AO texture:", error)
        );
        textures.height = textureLoader.load(
            "/images/Tiles_062_SD/Tiles_062_height.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load Tiles_062 height texture:", error)
        );
        textures.materialDetail = textureLoader.load(
            "/images/Tiles_062_SD/material_2002.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_062 material detail texture:",
                    error
                )
        );

        // Configure texture settings for proper tiling
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2); // 2x2 tiling for walls
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Ceiling Drop Tiles PBR Material
    createCeilingDropTilesPBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "ceilingDropTilesPBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#f0f0f0", // Light grey color for ceiling tiles
            roughness: 0.3,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 4; // Base color, normal, roughness, AO

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material
                const material = new THREE.MeshStandardMaterial({
                    map: textures.baseColor,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    aoMap: textures.ao,
                    normalScale: new THREE.Vector2(1.0, 1.0),
                    side: THREE.DoubleSide,
                    roughness: 0.3,
                    metalness: 0.1,
                    envMapIntensity: 0.3,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_basecolor.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load ceiling drop tiles base color texture:",
                    error
                )
        );
        textures.normal = textureLoader.load(
            "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_normal.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load ceiling drop tiles normal texture:",
                    error
                )
        );
        textures.roughness = textureLoader.load(
            "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_roughness.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load ceiling drop tiles roughness texture:",
                    error
                )
        );
        textures.ao = textureLoader.load(
            "/images/Ceiling_Drop_Tiles_001_SD/Ceiling_Drop_Tiles_001_ambientOcclusion.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load ceiling drop tiles AO texture:",
                    error
                )
        );

        // Configure texture settings for proper tiling
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4); // 4x4 tiling for ceiling coverage
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Tiles Flutted 001 PBR Material for Floor
    createTilesFlutted001FloorPBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "tilesFlutted001FloorPBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#f0f0f0", // Light grey color for tiles
            roughness: 0.5,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 6; // Base color, normal, roughness, AO, height, material

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material
                const material = new THREE.MeshStandardMaterial({
                    map: textures.baseColor,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    aoMap: textures.ao,
                    displacementMap: textures.height,
                    emissiveMap: textures.materialDetail,
                    normalScale: new THREE.Vector2(1.0, 1.0),
                    displacementScale: 0.15,
                    displacementBias: -0.08,
                    emissiveIntensity: 0.1,
                    side: THREE.DoubleSide,
                    roughness: 0.5,
                    metalness: 0.1,
                    envMapIntensity: 0.3,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Tiles_Flutted_001_SD/Tiles_Fluted_001_basecolor.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_Flutted_001 base color texture:",
                    error
                )
        );
        textures.normal = textureLoader.load(
            "/images/Tiles_Flutted_001_SD/Tiles_Fluted_001_normal.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_Flutted_001 normal texture:",
                    error
                )
        );
        textures.roughness = textureLoader.load(
            "/images/Tiles_Flutted_001_SD/Tiles_Fluted_001_roughness.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_Flutted_001 roughness texture:",
                    error
                )
        );
        textures.ao = textureLoader.load(
            "/images/Tiles_Flutted_001_SD/Tiles_Fluted_001_ambientOcclusion.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_Flutted_001 AO texture:",
                    error
                )
        );
        textures.height = textureLoader.load(
            "/images/Tiles_Flutted_001_SD/Tiles_Fluted_001_height.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_Flutted_001 height texture:",
                    error
                )
        );
        textures.materialDetail = textureLoader.load(
            "/images/Tiles_Flutted_001_SD/material_1902.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Tiles_Flutted_001 material detail texture:",
                    error
                )
        );

        // Configure texture settings for proper tiling
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(3, 3); // 3x3 tiling for floor
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Sci-Fi Panel 001 PBR Material for Walls
    createSciFiPanel001WallPBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "sciFiPanel001WallPBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#2a2a2a", // Dark grey color for sci-fi panels
            roughness: 0.3,
            metalness: 0.8,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 6; // Base color, normal, roughness, AO, height, metallic

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material
                const material = new THREE.MeshStandardMaterial({
                    map: textures.baseColor,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    aoMap: textures.ao,
                    displacementMap: textures.height,
                    metalnessMap: textures.metallic,
                    normalScale: new THREE.Vector2(1.0, 1.0),
                    displacementScale: 0.1,
                    displacementBias: -0.05,
                    side: THREE.DoubleSide,
                    roughness: 0.3,
                    metalness: 0.8,
                    envMapIntensity: 0.5,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Sci_fi_Panel_001_SD/Sci_fi_Panel_001_basecolor.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci_fi_Panel_001 base color texture:",
                    error
                )
        );
        textures.normal = textureLoader.load(
            "/images/Sci_fi_Panel_001_SD/Sci_fi_Panel_001_normal.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci_fi_Panel_001 normal texture:",
                    error
                )
        );
        textures.roughness = textureLoader.load(
            "/images/Sci_fi_Panel_001_SD/Sci_fi_Panel_001_roughness.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci_fi_Panel_001 roughness texture:",
                    error
                )
        );
        textures.ao = textureLoader.load(
            "/images/Sci_fi_Panel_001_SD/Sci_fi_Panel_001_ambientOcclusion.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci_fi_Panel_001 AO texture:",
                    error
                )
        );
        textures.height = textureLoader.load(
            "/images/Sci_fi_Panel_001_SD/Sci_fi_Panel_001_height.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci_fi_Panel_001 height texture:",
                    error
                )
        );
        textures.metallic = textureLoader.load(
            "/images/Sci_fi_Panel_001_SD/Sci_fi_Panel_001_metallic.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci_fi_Panel_001 metallic texture:",
                    error
                )
        );

        // Configure texture settings for proper tiling
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2); // 2x2 tiling for walls
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Concrete Ceiling 002 PBR Material for Ceiling
    createConcreteCeiling002PBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "concreteCeiling002PBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#f0f0f0", // Light grey color for concrete ceiling
            roughness: 0.6,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 5; // Base color, normal, roughness, AO, height

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material
                const material = new THREE.MeshStandardMaterial({
                    map: textures.baseColor,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    aoMap: textures.ao,
                    displacementMap: textures.height,
                    normalScale: new THREE.Vector2(1.0, 1.0),
                    displacementScale: 0.1,
                    displacementBias: -0.05,
                    side: THREE.DoubleSide,
                    roughness: 0.6,
                    metalness: 0.0,
                    envMapIntensity: 0.3,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Concrete_Ceiling_002_SD/Concrete_Ceiling_002_basecolor.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Concrete_Ceiling_002 base color texture:",
                    error
                )
        );
        textures.normal = textureLoader.load(
            "/images/Concrete_Ceiling_002_SD/Concrete_Ceiling_002_normal.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Concrete_Ceiling_002 normal texture:",
                    error
                )
        );
        textures.roughness = textureLoader.load(
            "/images/Concrete_Ceiling_002_SD/Concrete_Ceiling_002_roughness.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Concrete_Ceiling_002 roughness texture:",
                    error
                )
        );
        textures.ao = textureLoader.load(
            "/images/Concrete_Ceiling_002_SD/Concrete_Ceiling_002_ambientOcclusion.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Concrete_Ceiling_002 AO texture:",
                    error
                )
        );
        textures.height = textureLoader.load(
            "/images/Concrete_Ceiling_002_SD/Concrete_Ceiling_002_height.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Concrete_Ceiling_002 height texture:",
                    error
                )
        );

        // Configure texture settings for proper tiling
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(3, 3); // 3x3 tiling for ceiling
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Sci-Fi Metal Plate 004 PBR Material for Floor
    createSciFiMetalPlate004PBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "sciFiMetalPlate004PBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#2a2a2a", // Dark grey color for sci-fi metal plates
            roughness: 0.2,
            metalness: 0.9,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 6; // Base color, normal, roughness, AO, height, metallic

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material
                const material = new THREE.MeshStandardMaterial({
                    map: textures.baseColor,
                    normalMap: textures.normal,
                    roughnessMap: textures.roughness,
                    aoMap: textures.ao,
                    displacementMap: textures.height,
                    metalnessMap: textures.metallic,
                    normalScale: new THREE.Vector2(1.0, 1.0),
                    displacementScale: 0.1,
                    displacementBias: -0.05,
                    side: THREE.DoubleSide,
                    roughness: 0.2,
                    metalness: 0.9,
                    envMapIntensity: 0.5,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Sci-fi_Metal_Plate_004_SD/Sci-fi_Metal_Plate_004_basecolor.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci-fi_Metal_Plate_004 base color texture:",
                    error
                )
        );
        textures.normal = textureLoader.load(
            "/images/Sci-fi_Metal_Plate_004_SD/Sci-fi_Metal_Plate_004_normal.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci-fi_Metal_Plate_004 normal texture:",
                    error
                )
        );
        textures.roughness = textureLoader.load(
            "/images/Sci-fi_Metal_Plate_004_SD/Sci-fi_Metal_Plate_004_roughness.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci-fi_Metal_Plate_004 roughness texture:",
                    error
                )
        );
        textures.ao = textureLoader.load(
            "/images/Sci-fi_Metal_Plate_004_SD/Sci-fi_Metal_Plate_004_ambientOcclusion.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci-fi_Metal_Plate_004 AO texture:",
                    error
                )
        );
        textures.height = textureLoader.load(
            "/images/Sci-fi_Metal_Plate_004_SD/Sci-fi_Metal_Plate_004_height.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci-fi_Metal_Plate_004 height texture:",
                    error
                )
        );
        textures.metallic = textureLoader.load(
            "/images/Sci-fi_Metal_Plate_004_SD/Sci-fi_Metal_Plate_004_metallic.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load Sci-fi_Metal_Plate_004 metallic texture:",
                    error
                )
        );

        // Configure texture settings for proper tiling
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4); // 4x4 tiling for floor
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Wood Ceiling Coffers PBR Material
    createWoodCeilingCoffersPBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "woodCeilingCoffersPBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first - grey wood color to match texture
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#A0A0A0", // Grey wood color to match actual texture
            roughness: 0.6,
            metalness: 0.2, // Slightly more metallic for gold accents
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 7; // All PBR textures + Material_ file

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material with optimized PBR properties
                const material = new THREE.MeshStandardMaterial({
                    // Base color map - ensure proper color reproduction
                    map: textures.baseColor,
                    // Enhanced normal mapping for detailed surface relief
                    normalMap: textures.normal,
                    normalScale: new THREE.Vector2(2.0, 2.0), // Increased for more pronounced coffer details
                    // Roughness map for realistic surface variation
                    roughnessMap: textures.roughness,
                    roughness: 0.4, // Base roughness for wood
                    // Metallic map for gold accent variation
                    metalnessMap: textures.metallic,
                    metalness: 0.3, // Higher metalness to enhance gold accents
                    // Ambient occlusion for realistic shadows and depth
                    aoMap: textures.ao,
                    aoMapIntensity: 1.5, // Enhanced AO for better depth
                    // Displacement mapping for 3D coffer details
                    displacementMap: textures.height,
                    displacementScale: 0.3, // Increased for more pronounced coffers
                    displacementBias: -0.15, // Better offset for depth
                    // Material detail as emissive for gold accent enhancement
                    emissiveMap: textures.materialDetail,
                    emissiveIntensity: 0.2, // Enhanced emissive for gold accents
                    // Environment mapping for realistic reflections
                    envMapIntensity: 0.8,
                    side: THREE.DoubleSide,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Wood_Ceiling_Coffers_001_SD/Wood_Ceiling_Coffers_001_basecolor.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load wood base color texture:", error)
        );
        textures.normal = textureLoader.load(
            "/images/Wood_Ceiling_Coffers_001_SD/Wood_Ceiling_Coffers_001_normal.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load wood normal texture:", error)
        );
        textures.roughness = textureLoader.load(
            "/images/Wood_Ceiling_Coffers_001_SD/Wood_Ceiling_Coffers_001_roughness.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load wood roughness texture:", error)
        );
        textures.metallic = textureLoader.load(
            "/images/Wood_Ceiling_Coffers_001_SD/Wood_Ceiling_Coffers_001_metallic.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load wood metallic texture:", error)
        );
        textures.ao = textureLoader.load(
            "/images/Wood_Ceiling_Coffers_001_SD/Wood_Ceiling_Coffers_001_ambientOcclusion.jpg",
            onTextureLoad,
            undefined,
            (error) => console.warn("Failed to load wood AO texture:", error)
        );
        textures.height = textureLoader.load(
            "/images/Wood_Ceiling_Coffers_001_SD/Wood_Ceiling_Coffers_001_height.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load wood height texture:", error)
        );
        textures.materialDetail = textureLoader.load(
            "/images/Wood_Ceiling_Coffers_001_SD/Material_1495.jpg",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load wood material detail texture:",
                    error
                )
        );

        // Configure texture settings for optimal coffer pattern display and color accuracy
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(1.5, 1.5); // Slightly reduced repeat for better detail visibility
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            // Ensure proper color space for accurate color reproduction
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Wall Stone 029 PBR Material for Floor
    createWallStone029FloorPBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "wallStone029FloorPBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first - stone-like color
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#8B8B8B", // Stone grey color
            roughness: 0.7,
            metalness: 0.1,
            side: THREE.DoubleSide,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();
        let loadedTextures = 0;
        const totalTextures = 6; // All PBR textures available

        const textures: { [key: string]: THREE.Texture } = {};

        const onTextureLoad = () => {
            loadedTextures++;
            if (loadedTextures === totalTextures) {
                // All textures loaded, create the final material with enhanced PBR properties
                const material = new THREE.MeshStandardMaterial({
                    // Base color map
                    map: textures.baseColor,
                    // Enhanced normal mapping for detailed surface relief
                    normalMap: textures.normal,
                    normalScale: new THREE.Vector2(1.5, 1.5), // Good detail for stone
                    // Roughness map for realistic surface variation
                    roughnessMap: textures.roughness,
                    roughness: 0.6, // Base roughness for stone
                    // Ambient occlusion for realistic shadows and depth
                    aoMap: textures.ao,
                    aoMapIntensity: 1.3, // Enhanced AO for stone depth
                    // Displacement mapping for 3D stone details
                    displacementMap: textures.height,
                    displacementScale: 0.15, // Subtle displacement for stone texture
                    displacementBias: -0.05, // Slight offset for depth
                    // Material detail for additional surface variation
                    emissiveMap: textures.materialDetail,
                    emissiveIntensity: 0.05, // Very subtle emissive detail
                    // Environment mapping for realistic reflections
                    envMapIntensity: 0.6,
                    side: THREE.DoubleSide,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, material);
            }
        };

        // Load ALL available textures with proper callbacks
        textures.baseColor = textureLoader.load(
            "/images/Wall_Stone_029_SD/Wall_Stone_029_basecolor.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load stone base color texture:", error)
        );
        textures.normal = textureLoader.load(
            "/images/Wall_Stone_029_SD/Wall_Stone_029_normal.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load stone normal texture:", error)
        );
        textures.roughness = textureLoader.load(
            "/images/Wall_Stone_029_SD/Wall_Stone_029_roughness.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load stone roughness texture:", error)
        );
        textures.ao = textureLoader.load(
            "/images/Wall_Stone_029_SD/Wall_Stone_029_ambientOcclusion.png",
            onTextureLoad,
            undefined,
            (error) => console.warn("Failed to load stone AO texture:", error)
        );
        textures.height = textureLoader.load(
            "/images/Wall_Stone_029_SD/Wall_Stone_029_height.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn("Failed to load stone height texture:", error)
        );
        textures.materialDetail = textureLoader.load(
            "/images/Wall_Stone_029_SD/material_1917.png",
            onTextureLoad,
            undefined,
            (error) =>
                console.warn(
                    "Failed to load stone material detail texture:",
                    error
                )
        );

        // Configure texture settings for optimal stone floor display
        Object.values(textures).forEach((texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(3, 3); // Larger repeat for floor coverage
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            // Ensure proper color space for accurate color reproduction
            texture.colorSpace = THREE.SRGBColorSpace;
        });

        return fallbackMaterial;
    }

    // Marble White PBR Material - simplified to prevent z-fighting
    createMarbleWhitePBRMaterial(): THREE.MeshStandardMaterial {
        const cacheKey = "marbleWhitePBR";

        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(
                cacheKey
            ) as THREE.MeshStandardMaterial;
        }

        // Create a fallback material first - enhanced for shine
        const fallbackMaterial = new THREE.MeshStandardMaterial({
            color: "#f8f8f8", // Brighter marble-like color
            roughness: 0.1, // Much smoother for shine
            metalness: 0.3, // More metallic for reflections
            side: THREE.DoubleSide,
            transparent: false,
            alphaTest: 0,
            polygonOffset: true,
            polygonOffsetFactor: 5.0,
            polygonOffsetUnits: 5.0,
            envMapIntensity: 1.2, // Enhanced environment reflections
            name: `marble-wall-${Math.random()}`,
        });

        // Cache the fallback material temporarily
        this.materialCache.set(cacheKey, fallbackMaterial);

        const textureLoader = new THREE.TextureLoader();

        textureLoader.load(
            "/images/Marble_White_006_SD/Marble_White_006_basecolor.jpg",
            (texture) => {
                // Configure texture settings for enhanced appearance FIRST
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(2, 2);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;

                // Update the existing fallback material with the loaded texture
                fallbackMaterial.map = texture;
                fallbackMaterial.needsUpdate = true;

                // Also create a new enhanced material and cache it
                const enhancedMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.1, // Very smooth for marble shine
                    metalness: 0.3, // Enhanced metallic properties
                    side: THREE.DoubleSide,
                    transparent: false,
                    alphaTest: 0,
                    polygonOffset: true,
                    polygonOffsetFactor: 5.0,
                    polygonOffsetUnits: 5.0,
                    envMapIntensity: 1.2, // Enhanced reflections
                    name: `marble-wall-enhanced`,
                });

                // Update the cached material
                this.materialCache.set(cacheKey, enhancedMaterial);
            },
            undefined,
            (error) => console.warn("Failed to load marble texture:", error)
        );

        return fallbackMaterial;
    }

    createArtFrameSpotlight(
        position: THREE.Vector3,
        target: THREE.Vector3,
        intensity: number = 0.8,
        angle: number = 0.4,
        penumbra: number = 0.5
    ): THREE.SpotLight {
        const spotlight = new THREE.SpotLight(
            0xffffff,
            intensity,
            50,
            angle,
            penumbra
        );
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
            side: THREE.DoubleSide,
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
            side: THREE.DoubleSide,
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
            side: THREE.DoubleSide,
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
            side: THREE.DoubleSide,
        });

        this.shaderUpdateCallbacks.set("wireframeGrid", (elapsed: number) => {
            material.uniforms.time.value = elapsed;
        });

        return material;
    }

    // Enhanced Room Materials
    getEnhancedRoomMaterials(
        roomId: string
    ): RoomMaterials & { enhanced?: any } {
        const base = this.getBaseMaterials(roomId);

        switch (roomId) {
            case "atrium":
                return {
                    ...base,
                    walls: this.createTiles062WallPBRMaterial(),
                    floor: this.createTilesFlutted001FloorPBRMaterial(),
                    ceiling: this.createCeilingDropTilesPBRMaterial(),
                    enhanced: {
                        // caustics: this.createCausticsShader(),
                        stoneColumn: this.createStoneColumnPBRMaterial(),
                    },
                };

            case "gallery":
                return {
                    ...base,
                    walls: new THREE.MeshStandardMaterial({
                        color: 0xffffff, // Simple white
                        roughness: 0.4,
                        metalness: 0.1,
                        // side: THREE.DoubleSide,
                    }),
                    floor: this.createTilesFlutted001FloorPBRMaterial(),
                    ceiling: this.createCeilingDropTilesPBRMaterial(),
                    enhanced: {
                        createSpotlight:
                            this.createArtFrameSpotlight.bind(this),
                    },
                };

            case "projects":
                return {
                    ...base,
                    walls: this.createSciFiPanel001WallPBRMaterial(),
                    ceiling: this.createConcreteCeiling002PBRMaterial(),
                    floor: this.createSciFiMetalPlate004PBRMaterial(),
                    enhanced: {
                        holographic: this.createHolographicShader(),
                    },
                };

            case "about":
                return {
                    ...base,
                    walls: this.createWallNoiseShader(),
                    enhanced: {
                        wireframeGrid: this.createWireframeGridShader(),
                    },
                };

            default:
                return {
                    ...base,
                    walls: this.createWallNoiseShader(),
                };
        }
    }

    private getBaseMaterials(roomId: string): RoomMaterials {
        switch (roomId) {
            case "atrium":
                return {
                    walls: this.createTiles062WallPBRMaterial(),
                    floor: this.createTilesFlutted001FloorPBRMaterial(),
                    ceiling: this.createCeilingDropTilesPBRMaterial(),
                };
            case "gallery":
                return {
                    walls: new THREE.MeshStandardMaterial({
                        color: "#ffffff",
                        roughness: 0.4,
                        metalness: 0.1,
                        side: THREE.DoubleSide,
                    }),
                    floor: this.createTilesFlutted001FloorPBRMaterial(),
                    ceiling: this.createCeilingDropTilesPBRMaterial(),
                    dividers: new THREE.MeshStandardMaterial({
                        color: "#ffffff",
                        roughness: 0.7,
                        metalness: 0.0,
                        side: THREE.DoubleSide,
                    }),
                };
            case "projects":
                return {
                    walls: this.createSciFiPanel001WallPBRMaterial(),
                    floor: this.createSciFiMetalPlate004PBRMaterial(),
                    ceiling: this.createConcreteCeiling002PBRMaterial(),
                };
            case "about":
                return {
                    walls: new THREE.MeshStandardMaterial({
                        color: "#f0e6d3",
                        roughness: 0.6,
                        metalness: 0.1,
                        side: THREE.DoubleSide,
                    }),
                    floor: new THREE.MeshStandardMaterial({
                        color: "#e6d5c3",
                        roughness: 0.5,
                        metalness: 0.1,
                    }),
                    ceiling: new THREE.MeshStandardMaterial({
                        color: "#f5e6d3",
                        roughness: 0.4,
                        metalness: 0.05,
                        emissive: "#ffa500",
                        emissiveIntensity: 0.05,
                        side: THREE.DoubleSide,
                    }),
                };
            default:
                console.log("default base materials");
                return {
                    walls: new THREE.MeshStandardMaterial({
                        color: "#f5f5f5",
                        roughness: 0.3,
                        metalness: 0.1,
                        side: THREE.DoubleSide,
                    }),
                    floor: new THREE.MeshStandardMaterial({
                        color: "#e0e0e0",
                        roughness: 0.3,
                        metalness: 0.1,
                    }),
                    ceiling: new THREE.MeshStandardMaterial({
                        color: "#ffffff",
                        roughness: 0.2,
                        metalness: 0.05,
                        side: THREE.DoubleSide,
                    }),
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
    return EnhancedMaterialSystem.getInstance().getEnhancedRoomMaterials(
        roomId
    );
};

export const updateAllShaders = (elapsed: number) => {
    EnhancedMaterialSystem.getInstance().updateShaders(elapsed);
};
