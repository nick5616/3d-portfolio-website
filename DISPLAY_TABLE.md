# Display Configuration Table

This document outlines all the website displays in the 3D portfolio environment. Each display is configured with responsive sizing and screenshot-based loading for optimal performance.

## Display Features

- **Screenshot Mode**: By default, displays show a screenshot preview to save resources
- **Click-to-Load**: Users can click on screenshots to load the live website
- **Responsive Sizing**: Displays automatically adapt their dimensions based on device type (desktop/mobile)
- **Fallback Support**: If live websites fail to load, displays show an elegant fallback with a call-to-action

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

## Technical Implementation

### Resource Optimization
- Screenshots are loaded immediately for instant visual feedback
- Live websites are only loaded when users explicitly click to interact
- Responsive sizing reduces memory usage on mobile devices

### Mobile Considerations
- All displays automatically scale down for mobile viewing
- Touch-friendly interaction areas
- Optimized screenshot sizes for faster loading on mobile networks

### Configuration Files
- Main configuration: `src/configs/displayConfig.ts`
- Layout generation: `src/configs/createProjectsLayout.ts`
- Display component: `src/components/models/Web3DDisplay.tsx`

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