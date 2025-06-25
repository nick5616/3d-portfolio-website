# Display Configuration Table

This document outlines all the website displays in the 3D portfolio environment. Each display is configured with responsive sizing, screenshot-based previews, and automatic eviction management for optimal performance.

## Display Features

- **Screenshot Preview**: By default, displays show a screenshot preview with interactive buttons
- **Automatic Eviction**: Only 2 displays can show live websites simultaneously; the least recently opened display is automatically evicted when a third is opened
- **Dual Interaction Options**: Users can choose to:
  - **📺 View in Display**: Remove the screenshot overlay to reveal the live website embedded in the display
  - **🔗 Open in Tab**: Open the website in a new browser tab for full interaction
- **Manual Control**: Users can manually return displays to screenshot mode using the 📷 button in the header
- **Responsive Sizing**: Displays automatically adapt their dimensions based on device type (desktop/mobile)
- **Background Loading**: Live websites load in the background while screenshots are shown, ensuring smooth transitions
- **Fallback Support**: If live websites fail to load, displays show an elegant fallback with call-to-action

## Eviction System

### How It Works
1. **Maximum Active Displays**: Only 2 displays can show live content simultaneously
2. **Least Recently Used (LRU)**: When a 3rd display is opened, the oldest active display is automatically evicted
3. **Automatic Return**: Evicted displays automatically return to screenshot mode without user intervention
4. **Activity Tracking**: Mouse interactions update a display's "last used" timestamp, affecting eviction priority
5. **Console Logging**: All eviction events are logged to the browser console for debugging

### User Experience
- **Seamless Operation**: Users can open as many displays as they want without worrying about resource limits
- **Smart Management**: The system automatically manages resources by keeping only the most recently used displays active
- **Visual Feedback**: Users can see which displays are in live mode vs. screenshot mode
- **Manual Override**: Users can manually return displays to screenshot mode at any time

## Display Configuration

| Display ID | Title | Location | URL | Desktop Size | Mobile Size |
|------------|-------|----------|-----|--------------|-------------|
| `curie-shop-desktop` | Curie Shop | Left Wall (Front) | https://curie.shop | 1200×800 | 375×667 |
| `curie-shop-mobile` | Curie Shop Mobile | Left Wall (Center) | https://curie.shop | 375×812 | 320×640 |
| `nicolas-portfolio` | Nicolas Belovoskey Portfolio | Left Wall (Back) | https://nicolasbelovoskey.com | 1200×800 | 375×667 |
| `saucedog-art` | Saucedog Art | Right Wall (Center) | https://saucedog.art | 900×650 | 375×667 |
| `pocket-coach` | Pocket Coach | Right Wall (Front) | https://pocket-coach-app-replit-app.replit.app/ | 300×650 | 280×580 |
| `vgq-mobile` | Video Game Quest Mobile | Right Wall (Back) | https://videogamequest.me | 320×680 | 300×600 |
| `vgq-desktop` | Video Game Quest | Back Wall (Left) | https://videogamequest.me | 1200×800 | 375×667 |
| `curie-world` | Curie World | Back Wall (Right) | https://main.d1ms1tn7cz2qzf.amplifyapp.com/ | 900×650 | 375×667 |

## Wall Layout

### Left Wall (Position X: -9)
- **Front**: Curie Shop Desktop (Z: -3)
- **Center**: Curie Shop Mobile (Z: 0)
- **Back**: Nicolas Portfolio (Z: 3)

### Right Wall (Position X: 9)
- **Front**: Pocket Coach Mobile (Z: -3)
- **Center**: Saucedog Art (Z: 0)
- **Back**: Video Game Quest Mobile (Z: 3)

### Back Wall (Position Z: -9)
- **Left**: Video Game Quest Desktop (X: -5)
- **Right**: Curie World (X: 5)

## User Interaction Flow

### Initial State
1. **Screenshot Preview**: Each display shows a screenshot of the website
2. **Information Overlay**: Dark overlay at the bottom showing title, description, and two action buttons
3. **Background Loading**: The actual website loads silently in the background

### User Actions
1. **📺 View in Display**: 
   - Registers the display with the eviction manager
   - May trigger automatic eviction of the least recently used display
   - Removes the screenshot overlay
   - Reveals the live website embedded in the 3D display
   - Allows full interaction within the 3D environment

2. **🔗 Open in Tab**:
   - Opens the website in a new browser tab
   - Provides full browser functionality
   - Keeps the 3D environment running in the background
   - Does not count toward the 2-display limit

3. **📷 Return to Screenshot** (when live):
   - Manual button in the header bar of active displays
   - Immediately returns display to screenshot mode
   - Frees up a slot for other displays
   - Unregisters from the eviction manager

### Eviction Scenarios

#### Example: Opening 3 Displays
1. **Open Display A**: Screenshot → Live (Active displays: 1/2)
2. **Open Display B**: Screenshot → Live (Active displays: 2/2)
3. **Open Display C**: 
   - Display A (oldest) automatically returns to screenshot mode
   - Display C becomes live (Active displays: 2/2)
   - Console log: "🔄 Evicting display: Display A (opened at 2:30:15 PM)"

#### Example: Activity Updates Priority
1. **Displays A & B are active**
2. **User interacts with Display A** (mouse hover/focus)
3. **Open Display C**: 
   - Display B gets evicted (now oldest)
   - Display A remains active (recently used)

## Technical Implementation

### Display Manager (`src/stores/displayManager.ts`)
- **Global State Management**: Zustand store tracks all active displays
- **LRU Queue**: Maintains order of display activation with timestamps
- **Eviction Logic**: Automatically removes oldest displays when limit exceeded
- **Callback System**: Each display provides an eviction callback for forced return to screenshot mode

### Resource Optimization
- **Screenshot First**: Screenshots load instantly (~10KB each) providing immediate visual feedback
- **Background Loading**: Live websites load in the background while users view screenshots
- **Limited Concurrency**: Maximum 2 live displays prevents resource overload
- **Smart Eviction**: Least recently used displays are prioritized for eviction
- **Responsive Sizing**: Reduces memory usage on mobile devices

### Mobile Considerations
- **Touch-Friendly Buttons**: Large, easy-to-tap buttons on mobile devices
- **Adaptive Text Sizes**: Font sizes automatically adjust based on display dimensions
- **Optimized Layouts**: Button layouts adapt to smaller screens
- **Performance Optimization**: Smaller display dimensions reduce rendering overhead

### Error Handling
- **Iframe Failures**: If websites can't be embedded, displays show elegant fallbacks
- **Network Issues**: Graceful degradation when screenshots or websites fail to load
- **Timeout Protection**: 10-second timeout prevents indefinite loading states
- **Eviction Safety**: Failed evictions are logged but don't break the system

### Configuration Files
- Display manager: `src/stores/displayManager.ts`
- Main configuration: `src/configs/displayConfig.ts`
- Layout generation: `src/configs/createProjectsLayout.ts`
- Display component: `src/components/models/Web3DDisplay.tsx`
- Interactive object handler: `src/components/core/InteractiveObject.tsx`

## Performance Benefits

### Resource Usage Comparison
- **Before**: 8 websites × ~2MB each = ~16MB immediate loading
- **After**: 8 screenshots × ~10KB each = ~80KB immediate loading (99.5% reduction)
- **With Eviction**: Maximum 2 active websites × ~2MB = ~4MB concurrent usage (75% reduction vs. unlimited)

### Memory Management
- **Concurrent Limit**: Never more than 2 live websites in memory
- **Automatic Cleanup**: Evicted displays release their iframe resources
- **Smart Priority**: Most recently used displays stay active
- **User Control**: Manual eviction allows immediate resource cleanup

### User Experience Improvements
- **Faster Initial Load**: Screenshots appear instantly
- **Smooth Performance**: Limited concurrent displays prevent lag
- **Intelligent Management**: System handles resource optimization automatically
- **User Choice**: Full control over which displays to view live
- **Responsive Design**: Optimal viewing on all device types

## Debug Information

### Console Logging
The system provides detailed console logging for debugging:

```
📺 Active displays (2/2): ["Curie Shop (2:30:15 PM)", "Saucedog Art (2:31:22 PM)"]
🔄 Evicting display: Curie Shop (opened at 2:30:15 PM)
📺 Viewing Video Game Quest in display
❌ Unregistering display: Curie Shop
📷 Returned to screenshot mode: Nicolas Portfolio
⏰ Updated activity for: Saucedog Art
```

### Display Manager State
You can inspect the display manager state in browser dev tools:
```javascript
// Check active displays
useDisplayManager.getState().activeDisplays

// Check if a specific display is active
useDisplayManager.getState().isDisplayActive('display-id')

// Get current active count
useDisplayManager.getState().getActiveDisplayCount()
```

## Adding New Displays

To add a new display:

1. Add a new entry to the `displaysConfig` array in `src/configs/displayConfig.ts`
2. Include all required properties: `id`, `url`, `title`, `description`, `screenshotUrl`, `position`, `responsive`
3. Choose appropriate screenshot dimensions that match the display size
4. Set responsive breakpoints for desktop and mobile viewing
5. The eviction system will automatically manage the new display

Example:
```typescript
{
    id: "new-project",
    url: "https://example.com",
    title: "New Project",
    description: "Description of the new project",
    screenshotUrl: "https://example.com/screenshot.jpg",
    position: [x, y, z],
    rotation: [0, Math.PI / 2, 0],
    scale: [1.2, 1.2, 1],
    responsive: {
        desktop: { width: 1200, height: 800 },
        mobile: { width: 375, height: 667 }
    }
}
```