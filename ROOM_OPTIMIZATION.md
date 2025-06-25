# Room Optimization and Dynamic Loading

## Problem Solved

The 3D portfolio was experiencing z-fighting issues and performance problems due to all rooms being rendered simultaneously. This caused:

- Z-fighting between overlapping room materials
- Poor performance from rendering all room resources at once
- Memory leaks from materials never being disposed
- Unnecessary computation for rooms not currently being viewed

## Solution Implementation

### 1. Dynamic Room Loading (`src/stores/sceneStore.ts`)
- **Enhanced state management**: Added `currentRoomId`, `previousRoomId`, and `isTransitioning` to track room states
- **Room visibility control**: Only the current room is now rendered at any time
- **Transition management**: Smooth transitions between rooms with loading states
- **Adjacent room tracking**: System knows which rooms are connected via archways

### 2. Optimized Scene Management (`src/components/core/SceneManager.tsx`)
- **Single room rendering**: Only the current room is rendered instead of all rooms
- **Selective transition triggers**: Only archways for current and adjacent rooms are active
- **Performance monitoring**: Enhanced with transition state awareness

### 3. Enhanced Room Component (`src/components/core/Room.tsx`)
- **Resource cleanup**: Materials are properly disposed when rooms unload
- **Performance adaptation**: Shadows and lighting quality adapt during transitions
- **Fade-in effects**: Smooth visual transitions when rooms load
- **Memory management**: Prevents memory leaks through proper cleanup

### 4. Material Management System (`src/configs/materials.ts`)
- **Material caching**: Prevents recreation of materials for better performance
- **Disposal utilities**: Proper cleanup functions for memory management
- **Consistent creation**: Standardized material creation with configurable properties
- **Legacy compatibility**: Maintains backwards compatibility with existing code

## Performance Benefits

### Before Optimization
- **All rooms rendered simultaneously**: ~4-5 rooms with full geometry, materials, and lighting
- **Z-fighting issues**: Overlapping surfaces causing visual artifacts
- **Memory usage**: All materials loaded permanently
- **Frame rate**: Lower FPS due to excessive draw calls

### After Optimization
- **Single room rendering**: Only current room rendered, ~80% reduction in geometry
- **No z-fighting**: Rooms are completely separate, no overlapping surfaces
- **Dynamic memory management**: Materials loaded/unloaded on demand
- **Improved frame rate**: Significantly better performance, especially on mobile devices

## Technical Details

### Room Transition Flow
1. User approaches archway trigger
2. `RoomTransitionTrigger` detects collision
3. `sceneStore.teleportToRoom()` called
4. Previous room unloaded, materials disposed
5. New room loaded with fade-in effect
6. Transition state cleared after 500ms

### Material Lifecycle
1. **Creation**: Materials created on-demand when room loads
2. **Caching**: Materials cached to prevent recreation
3. **Usage**: Materials applied to room geometry
4. **Disposal**: Materials disposed when room unloads
5. **Cleanup**: Cache cleared to prevent memory leaks

### Performance Optimizations
- **Adaptive shadows**: Disabled during transitions for smoother performance
- **LOD lighting**: Reduced shadow map size during transitions
- **Selective rendering**: Only necessary transition triggers active
- **Memory cleanup**: Proper disposal of unused resources

## Usage

The optimization is completely transparent to users. Room transitions work exactly as before, but with:
- Smoother performance
- No visual artifacts
- Better memory usage
- Faster loading times

## Configuration

Room materials can be easily customized in `src/configs/materials.ts` using the new configuration system:

```typescript
const materialConfigs = {
    myRoom: {
        wallColor: "#ffffff",
        floorColor: "#cccccc", 
        ceilingColor: "#f0f0f0",
        emissiveColor: "#ffff00",
        emissiveIntensity: 0.1,
        // ... other properties
    }
};
```

## Future Enhancements

- **Preloading**: Adjacent rooms could be preloaded for even smoother transitions
- **LOD system**: Level-of-detail for distant objects
- **Instanced rendering**: For repeated objects like pillars
- **Occlusion culling**: Hide objects not visible to camera