#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We'll define the displays inline since we can't easily import TS from Node.js
// This should match the displaysConfig from src/configs/displayConfig.ts
const displaysConfig = [
    {
        id: "curie-shop-desktop",
        url: "https://curie.shop",
        title: "Curie Shop",
        responsive: { desktop: { width: 1200, height: 800 } },
    },
    {
        id: "curie-shop-mobile",
        url: "https://curie.shop",
        title: "Curie Shop Mobile",
        responsive: { desktop: { width: 375, height: 812 } },
    },
    {
        id: "nicolas-portfolio",
        url: "https://nicolasbelovoskey.com",
        title: "Nicolas Belovoskey Portfolio",
        responsive: { desktop: { width: 1200, height: 800 } },
    },
    {
        id: "saucedog-3d-landscape",
        url: "https://3d.saucedog.art",
        title: "3D Saucedog Art - Landscape",
        responsive: { desktop: { width: 1200, height: 800 } },
    },
    {
        id: "saucedog-3d-mobile",
        url: "https://3d.saucedog.art",
        title: "3D Saucedog Art - Mobile",
        responsive: { desktop: { width: 852, height: 393 } },
    },
    {
        id: "saucedog-art",
        url: "https://saucedog.art",
        title: "Saucedog Art",
        responsive: { desktop: { width: 900, height: 650 } },
    },
    {
        id: "pocket-coach",
        url: "https://pocket-coach-app-replit-app.replit.app/",
        title: "Pocket Coach",
        responsive: { desktop: { width: 300, height: 650 } },
    },
    {
        id: "vgq-mobile",
        url: "https://videogamequest.me",
        title: "Video Game Quest Mobile",
        responsive: { desktop: { width: 320, height: 680 } },
    },
    {
        id: "vgq-desktop",
        url: "https://videogamequest.me",
        title: "Video Game Quest",
        responsive: { desktop: { width: 1200, height: 800 } },
    },
    {
        id: "curie-world",
        url: "https://main.d1ms1tn7cz2qzf.amplifyapp.com/",
        title: "Curie World",
        responsive: { desktop: { width: 900, height: 650 } },
    },
];

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, "../public/screenshots");
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshot(display) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();

        // Set viewport based on display's responsive config
        const viewport = display.responsive.desktop;
        await page.setViewport({
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: 1,
        });

        console.log(`📸 Capturing screenshot for ${display.title}...`);
        console.log(`   URL: ${display.url}`);
        console.log(`   Viewport: ${viewport.width}x${viewport.height}`);

        // Navigate to the website
        await page.goto(display.url, {
            waitUntil: "networkidle2",
            timeout: 30000,
        });

        // Wait a bit more for any dynamic content
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Generate filename based on display ID
        const filename = `${display.id}.png`;
        const filepath = path.join(screenshotsDir, filename);

        // Take screenshot
        await page.screenshot({
            path: filepath,
            fullPage: false, // Only capture the viewport
            type: "png",
        });

        console.log(`✅ Screenshot saved: ${filename}`);
        return `/screenshots/${filename}`;
    } catch (error) {
        console.error(`❌ Failed to capture ${display.title}:`, error.message);
        return null;
    } finally {
        await browser.close();
    }
}

async function captureAllScreenshots() {
    console.log("🚀 Starting screenshot capture process...\n");

    const results = {};

    for (const display of displaysConfig) {
        const screenshotPath = await captureScreenshot(display);
        results[display.id] = screenshotPath;

        // Add a small delay between screenshots to be nice to servers
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n📋 Results Summary:");
    console.log("==================");
    for (const [id, path] of Object.entries(results)) {
        if (path) {
            console.log(`✅ ${id}: ${path}`);
        } else {
            console.log(`❌ ${id}: Failed to capture`);
        }
    }

    console.log("\n🔧 Next steps:");
    console.log("- Run: npm run update-screenshots-config");
    console.log("- Review the changes and commit them");

    return results;
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    captureAllScreenshots().catch(console.error);
}

export { captureAllScreenshots };
