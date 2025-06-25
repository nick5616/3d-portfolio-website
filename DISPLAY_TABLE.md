# Display Configuration Table

This document outlines all the website displays in the 3D portfolio environment. Each display is configured with responsive sizing and screenshot-based previews for optimal performance and user experience.

## Display Features

- **Screenshot Preview**: By default, displays show a screenshot preview with interactive buttons
- **Dual Interaction Options**: Users can choose to:
  - **📺 View in Display**: Remove the screenshot overlay to reveal the live website embedded in the display
  - **🔗 Open in Tab**: Open the website in a new browser tab for full interaction
- **Responsive Sizing**: Displays automatically adapt their dimensions based on device type (desktop/mobile)
- **Background Loading**: Live websites load in the background while screenshots are shown, ensuring smooth transitions
- **Fallback Support**: If live websites fail to load, displays show an elegant fallback with call-to-action

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
   - Removes the screenshot overlay
   - Reveals the live website embedded in the 3D display
   - Allows full interaction within the 3D environment
   - Maintains immersive 3D experience

2. **🔗 Open in Tab**:
   - Opens the website in a new browser tab
   - Provides full browser functionality
   - Keeps the 3D environment running in the background

## Technical Implementation

### Resource Optimization
- **Screenshot First**: Screenshots load instantly (~10KB each) providing immediate visual feedback
- **Background Loading**: Live websites load in the background while users view screenshots
- **On-Demand Interaction**: Live websites only become visible when users explicitly choose to view them
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

### Configuration Files
- Main configuration: `src/configs/displayConfig.ts`
- Layout generation: `src/configs/createProjectsLayout.ts`
- Display component: `src/components/models/Web3DDisplay.tsx`
- Interactive object handler: `src/components/core/InteractiveObject.tsx`

## Adding New Displays

To add a new display:

1. Add a new entry to the `displaysConfig` array in `src/configs/displayConfig.ts`
2. Include all required properties: `id`, `url`, `title`, `description`, `screenshotUrl`, `position`, `responsive`
3. Choose appropriate screenshot dimensions that match the display size
4. Set responsive breakpoints for desktop and mobile viewing

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

## Performance Benefits

### Resource Usage Comparison
- **Before**: 8 websites × ~2MB each = ~16MB immediate loading
- **After**: 8 screenshots × ~10KB each = ~80KB immediate loading (99.5% reduction)

### User Experience Improvements
- **Faster Initial Load**: Screenshots appear instantly
- **User Control**: Users choose when to load resource-intensive content
- **Smooth Interactions**: No lag when navigating between displays
- **Responsive Design**: Optimal viewing on all device types