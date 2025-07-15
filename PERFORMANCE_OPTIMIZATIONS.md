# 🚀 Performance Optimizations for Event Loop Protection

## Problem Diagnosed

When your computer gets hot and thermal throttling kicks in, the website becomes unresponsive because multiple heavy computations are blocking the main event loop at 60fps, preventing input processing.

## Root Causes Identified

### 1. **Multiple useFrame Callbacks (60fps)**

-   SceneDataBridge: Camera data updates every frame
-   SceneManager: Shader updates + FPS monitoring every frame
-   CameraController: Movement/rotation calculations every frame
-   PlayerBody: Physics calculations every frame
-   Room animations: Per-room shader animations every frame
-   VirtualControls: Touch handling animation frames

### 2. **Heavy Shader System**

-   Custom GLSL shaders updating uniforms 60 times per second
-   Complex calculations for marble, caustics, holographic effects
-   No throttling based on system performance

### 3. **Excessive State Updates**

-   Zustand store updates every frame triggering re-renders
-   Physics system running at full resolution regardless of capability

## Solutions Implemented

### 🎯 **Adaptive Frame Rate Throttling**

#### SceneDataBridge Optimization

```typescript
// Before: 60fps camera updates
useFrame(() => updateCameraData(...));

// After: 30fps throttled updates
const CAMERA_UPDATE_INTERVAL = 1000 / 30;
useFrame(() => {
    const now = window.performance.now();
    if (now - lastUpdate.current >= CAMERA_UPDATE_INTERVAL) {
        updateCameraData(...);
        lastUpdate.current = now;
    }
});
```

#### SceneManager Optimization

```typescript
// Adaptive shader update rates based on quality
const shaderUpdateInterval =
    performance.quality === "low"
        ? 1000 / 20 // 20fps
        : performance.quality === "medium"
        ? 1000 / 30 // 30fps
        : 1000 / 60; // 60fps

// Skip shader updates entirely on low quality
if (performance.quality !== "low" && now - lastUpdate.current >= interval) {
    updateAllShaders(clock.elapsedTime);
}
```

#### CameraController Optimization

```typescript
// Reuse Vector3 objects to prevent garbage collection
const forward = useRef(new THREE.Vector3());
const right = useRef(new THREE.Vector3());
const direction = useRef(new THREE.Vector3());

// Skip micro-movements to reduce computation
if (Math.abs(rotationX) > 0.001 || Math.abs(rotationY) > 0.001) {
    // Only update rotation if significant change
}
```

### 🔥 **Automatic Quality Adjustment**

#### Smart Performance Monitoring

```typescript
// Auto-reduce quality when FPS drops below 20
// Auto-increase quality when FPS exceeds 45
const adjustQualityBasedOnFPS = () => {
    const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;

    if (avgFps < LOW_FPS_THRESHOLD && currentQuality !== "low") {
        setPerformanceQuality("low"); // Reduces all computational load
    }
};
```

#### Quality-Based Feature Scaling

```typescript
// Physics optimization
timeStep={performance.quality === "low" ? 1/20 : 1/60}
maxCcdSubsteps={performance.quality === "low" ? 1 : 3}

// Shader optimization
shadows={performance.quality !== "low" && !isMobile}
environmentIntensity={performance.quality === "low" ? 0.3 : 0.6}

// Grass shader only on high quality
if (grassMaterial && performance.quality === "high") {
    // Update every other frame even on high quality
    if (Math.floor(elapsed * 30) % 2 === 0) {
        grassMaterial.uniforms.time.value = elapsed;
    }
}
```

### ⚡ **Memory & Allocation Optimization**

#### Vector Reuse Pattern

```typescript
// Before: New allocations every frame
const forward = new THREE.Vector3(0, 0, -1);
const right = new THREE.Vector3(1, 0, 0);

// After: Reuse refs to prevent GC pressure
forward.current.set(0, 0, -1);
right.current.set(1, 0, 0);
```

#### Conditional Processing

```typescript
// Skip unnecessary calculations
let hasMovement = false;
if (activeMovement.forward) {
    direction.current.add(forward.current);
    hasMovement = true;
}

// Only normalize and apply if there's actual movement
if (hasMovement) {
    direction.current.normalize();
    camera.position.add(direction.current);
}
```

## Performance Monitoring & Feedback

### Visual FPS Indicator

-   Real-time FPS counter with color coding:
    -   🟢 Green: 50+ FPS (optimal)
    -   🟡 Yellow: 30-49 FPS (acceptable)
    -   🔴 Red: <30 FPS (poor, triggers auto-adjustment)
-   Quality level indicator (LOW/MEDIUM/HIGH)

### Automatic Intervention

-   **5-second cooldown** between quality adjustments
-   **10-frame history** for stable FPS averaging
-   **Progressive degradation**: High → Medium → Low
-   **Console logging** for performance changes

## Expected Results

### Before Optimization

-   🔥 **Thermal throttling**: Event loop blocked, controls unresponsive
-   🐌 **High CPU usage**: 60fps across all systems regardless of capability
-   💾 **Memory pressure**: Constant allocations and shader updates
-   ❌ **Poor UX**: Website becomes unusable when computer heats up

### After Optimization

-   ✅ **Thermal resilience**: Auto-reduces load when performance drops
-   🎯 **Adaptive performance**: 20-60fps based on system capability
-   🧠 **Smart resource management**: Selective feature disabling
-   🎮 **Maintained responsiveness**: Controls always work, even at reduced fidelity

## Quality Level Behavior

### 🔴 **Low Quality (Emergency Mode)**

-   Physics: 20fps timestep, minimal substeps
-   Shaders: Disabled/basic materials only
-   Shadows: Disabled
-   Environment: Reduced intensity
-   Camera updates: 20fps
-   Grass effects: Disabled

### 🟡 **Medium Quality (Balanced)**

-   Physics: 30fps timestep
-   Shaders: 30fps updates
-   Shadows: Enabled with 1024x1024 maps
-   Camera updates: 30fps
-   Selective effects enabled

### 🟢 **High Quality (Full Experience)**

-   Physics: 60fps timestep
-   Shaders: 60fps updates with all effects
-   Shadows: 2048x2048 high-quality maps
-   Camera updates: 60fps
-   All visual effects enabled

## Implementation Status

✅ **Core Performance Infrastructure**

-   Adaptive frame rate throttling
-   Vector reuse patterns
-   Quality-based feature scaling

✅ **Automatic Quality Management**

-   FPS-based quality adjustment
-   Visual performance monitoring
-   Progressive degradation system

✅ **Event Loop Protection**

-   Reduced computation frequency during thermal stress
-   Conditional processing based on system capability
-   Memory allocation optimization

## Testing Recommendations

1. **Stress Test**: Run intensive background processes to simulate thermal throttling
2. **Monitor FPS**: Watch for automatic quality reduction when performance degrades
3. **Control Responsiveness**: Verify camera/movement controls remain functional
4. **Recovery Testing**: Confirm quality increases back when thermal pressure reduces

This optimization system ensures your 3D portfolio remains interactive and responsive even when your computer is under thermal stress, providing a smooth user experience across all performance conditions.
