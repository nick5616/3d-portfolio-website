# Hardware Acceleration Detection System

This system provides utilities to detect if hardware acceleration is disabled in the user's browser and displays an uncloseable modal to guide them on how to enable it.

## Components

### 1. `useHardwareAcceleration` Hook

Located in `src/hooks/useHardwareAcceleration.ts`

**Features:**

-   Detects hardware acceleration status using multiple methods
-   Returns detection state and results
-   Handles various browser configurations

**Usage:**

```typescript
import { useHardwareAcceleration } from "./hooks/useHardwareAcceleration";

const { isHardwareAccelerationDisabled, isDetecting } =
    useHardwareAcceleration();
```

**Detection Methods:**

1. **WebGL Context Check**: Verifies if WebGL is available
2. **Software Renderer Detection**: Identifies common software renderers (llvmpipe, swiftshader, etc.)
3. **Browser Flag Detection**: Checks for hardware acceleration disable flags in user agent
4. **Performance Testing**: Measures rendering performance to identify software rendering

### 2. Scene Fallback UI

The Scene component (`src/components/core/Scene.tsx`) now includes built-in fallback UI that:

**Features:**

-   Prevents 3D scene rendering when hardware acceleration is disabled
-   Shows a loading state while detecting hardware acceleration
-   Displays a clear error message with refresh button when hardware acceleration is disabled
-   Prevents WebGL context creation errors that would crash the app
-   Provides a better user experience than modal overlays
-   Hides all UI elements (HUD, controls, modals) when hardware acceleration is disabled

### 3. `WebGLErrorBoundary` Component

Located in `src/components/ui/WebGLErrorBoundary.tsx`

**Features:**

-   Catches WebGL-related errors that might still occur
-   Provides a fallback UI for unexpected WebGL failures
-   Only catches WebGL errors, re-throws other errors
-   Shows detailed error information for debugging

### 4. Interface Component Behavior

The Interface component (`src/components/ui/Interface.tsx`) now:

**Features:**

-   Hides all UI elements when hardware acceleration is disabled or still detecting
-   Prevents UI clutter during hardware acceleration detection
-   Provides clean fallback experience without HUD elements
-   Only shows UI when 3D scene is ready to render

## Integration

The system is integrated into the main App component (`src/App.tsx`):

```typescript
import { WebGLErrorBoundary } from "./components/ui/WebGLErrorBoundary";

export default function App() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <WebGLErrorBoundary>
                <Scene />
            </WebGLErrorBoundary>
            <Interface />
        </Suspense>
    );
}
```

The Scene component (`src/components/core/Scene.tsx`) handles hardware acceleration detection internally:

```typescript
import { useHardwareAcceleration } from "../../hooks/useHardwareAcceleration";

export const Scene: React.FC = () => {
    const { isHardwareAccelerationDisabled, isDetecting } =
        useHardwareAcceleration();

    // Show fallback when hardware acceleration is disabled or still detecting
    if (isDetecting || isHardwareAccelerationDisabled) {
        return <FallbackUI />;
    }

    return <Canvas>...</Canvas>;
};
```

## Browser Instructions

The modal provides specific instructions for each major browser:

### Chrome

1. Go to Settings → Advanced → System
2. Enable "Use hardware acceleration when available"
3. Restart browser

### Firefox

1. Go to `about:config`
2. Set `layers.acceleration.force-enabled` to `true`
3. Restart browser

### Safari

1. Go to Safari → Preferences → Advanced
2. Enable "Show Develop menu"
3. Go to Develop → Enable WebGL
4. Restart browser

### Edge

1. Go to Settings → System
2. Enable "Use hardware acceleration when available"
3. Restart browser

## Testing

### Manual Testing

1. Start the development server: `npm run dev`
2. Disable hardware acceleration in your browser
3. Refresh the page to see the fallback UI
4. Check browser console for hardware acceleration detection logs

### Simulating Disabled Hardware Acceleration

**Chrome:**

-   Start Chrome with flags: `--disable-gpu --disable-software-rasterizer`

**Firefox:**

-   Set `layers.acceleration.disabled` to `true` in `about:config`

**Safari:**

-   Disable WebGL in Develop menu

## Production Deployment

The system is production-ready as implemented. No additional steps are required for deployment.

## Browser Compatibility

The detection system works with:

-   Chrome 50+
-   Firefox 45+
-   Safari 10+
-   Edge 79+

## Performance Considerations

-   Detection runs once on component mount
-   Uses minimal resources for detection
-   Modal only shows when hardware acceleration is actually disabled
-   No impact on performance when hardware acceleration is enabled

## Troubleshooting

### False Positives

If the system incorrectly detects hardware acceleration as disabled:

1. Check browser console for WebGL errors
2. Verify browser supports WebGL
3. Check browser console for hardware acceleration detection logs

### False Negatives

If hardware acceleration is disabled but not detected:

1. Check if browser is using a software renderer not in the detection list
2. Add new software renderer names to the `softwareRenderers` array
3. Adjust performance threshold in the detection logic

## Future Enhancements

Potential improvements:

-   Add more sophisticated performance testing
-   Support for detecting specific GPU models
-   Integration with browser-specific APIs
-   Fallback detection methods for older browsers
