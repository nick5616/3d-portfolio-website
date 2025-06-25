# Screenshot Management Scripts

This directory contains scripts for automatically capturing and managing website screenshots for the 3D portfolio displays.

## Scripts

### `capture-screenshots.js`

Automatically captures screenshots of all websites defined in the display configuration using Puppeteer.

**Features:**

-   Takes screenshots at the exact viewport sizes specified in each display's responsive config
-   Handles dynamic content loading with proper wait times
-   Saves screenshots as PNG files in `public/screenshots/`
-   Provides detailed progress reporting

### `update-screenshots-config.js`

Updates the `src/configs/displayConfig.ts` file to replace Unsplash placeholder URLs with local screenshot paths.

**Features:**

-   Automatically maps display IDs to their corresponding screenshot files
-   Preserves all other configuration while updating only screenshot URLs
-   Provides detailed update reporting

## Usage

### Update All Screenshots (Recommended)

```bash
npm run update-screenshots
```

This runs both capture and config update scripts in sequence.

### Individual Commands

```bash
# Capture screenshots only
npm run capture-screenshots

# Update config file only (after screenshots exist)
npm run update-screenshots-config
```

## Workflow

1. **Capture Screenshots**: Run the capture script to take fresh screenshots of all websites
2. **Update Config**: Run the update script to replace Unsplash URLs with local paths
3. **Review Changes**: Use `git diff` to review the changes
4. **Test**: Verify screenshots load correctly in the application
5. **Commit**: Commit the new screenshots and updated config

## Screenshot Storage

Screenshots are stored in `public/screenshots/` with filenames matching their display IDs:

-   `curie-shop-desktop.png`
-   `curie-shop-mobile.png`
-   `nicolas-portfolio.png`
-   etc.

## Git Integration

Since screenshots are stored in the repository:

-   Git will track changes to screenshot files
-   Developers can see visual diffs when websites change
-   Screenshots are served directly from the public folder (no external dependencies)

## Updating Website URLs

If you add new displays or change URLs:

1. Update the `displaysConfig` array in both:
    - `src/configs/displayConfig.ts` (main config)
    - `scripts/capture-screenshots.js` (script config)
2. Run `npm run update-screenshots`
3. Commit the changes

## Benefits

-   **Real Screenshots**: Shows actual website content instead of generic stock photos
-   **Performance**: Local files load faster than external URLs
-   **Reliability**: No external dependencies for screenshot loading
-   **Version Control**: Screenshot changes are tracked in git
-   **Automation**: Easy to update all screenshots with a single command
