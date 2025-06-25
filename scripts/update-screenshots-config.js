#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the display config file
const configPath = path.join(__dirname, "../src/configs/displayConfig.ts");
const screenshotsDir = path.join(__dirname, "../public/screenshots");

async function updateScreenshotPaths() {
    console.log("🔧 Updating display config with local screenshot paths...\n");

    // Read the current config file
    let configContent = fs.readFileSync(configPath, "utf8");

    // Get list of available screenshots
    const screenshotFiles = fs
        .readdirSync(screenshotsDir)
        .filter((file) => file.endsWith(".png"))
        .map((file) => file.replace(".png", ""));

    console.log("📁 Available screenshots:", screenshotFiles);

    // Replace Unsplash URLs with local paths
    let updatedCount = 0;

    // Pattern to match screenshotUrl lines with Unsplash URLs
    const screenshotUrlPattern =
        /screenshotUrl:\s*"https:\/\/images\.unsplash\.com[^"]*"/g;

    // We need to map each display ID to its screenshot
    // Let's extract the display IDs and match them
    const displayIdPattern = /id:\s*"([^"]+)"/g;
    const displayIds = [];
    let match;

    // Extract all display IDs
    const tempContent = configContent;
    while ((match = displayIdPattern.exec(tempContent)) !== null) {
        displayIds.push(match[1]);
    }

    console.log("🎯 Found display IDs:", displayIds);

    // Replace each Unsplash URL with local screenshot path
    for (const displayId of displayIds) {
        if (screenshotFiles.includes(displayId)) {
            // Find and replace the screenshotUrl for this specific display
            const displayBlockPattern = new RegExp(
                `(id:\\s*"${displayId}"[\\s\\S]*?)screenshotUrl:\\s*"[^"]*"`,
                "g"
            );

            const replacement = `$1screenshotUrl: "/screenshots/${displayId}.png"`;
            const beforeUpdate = configContent;
            configContent = configContent.replace(
                displayBlockPattern,
                replacement
            );

            if (configContent !== beforeUpdate) {
                updatedCount++;
                console.log(`✅ Updated ${displayId} screenshot path`);
            }
        } else {
            console.log(`⚠️  No screenshot found for ${displayId}`);
        }
    }

    // Write the updated config back to file
    fs.writeFileSync(configPath, configContent, "utf8");

    console.log(
        `\n🎉 Update complete! Updated ${updatedCount} screenshot paths.`
    );
    console.log(
        "📝 The displayConfig.ts file has been updated with local screenshot paths."
    );
    console.log("\n🔧 Next steps:");
    console.log(
        "- Review the changes in git: git diff src/configs/displayConfig.ts"
    );
    console.log("- Test the application to ensure screenshots load correctly");
    console.log("- Commit the changes when ready");
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    updateScreenshotPaths().catch(console.error);
}

export { updateScreenshotPaths };
