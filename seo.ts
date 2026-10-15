// Build-time SEO for nicolebelovoskey.com (index.html only; world.html stays
// nameless). The site is a JS app, and many crawlers (including the ones that
// feed AI answers) never run JS, so this writes who Nicole is into the HTML
// itself: a schema.org Person record, plus a plain bio inside #root that
// React replaces the moment it mounts. Everything comes from the synced
// portfolio data, so it can't drift from what the site shows.
import type { Plugin } from "vite";
import { EDUCATION, EXPERIENCE, PROFILE, PROJECTS } from "./src/data/portfolio";

const SITE = "https://nicolebelovoskey.com";
const FULL_PORTFOLIO = "https://software.nicolebelovoskey.com";

const esc = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Newest work first, skipping entries that are just rooms of this site.
const featured = PROJECTS.filter((project) => project.url && !project.url.startsWith(SITE)).slice(0, 8);
const factoryOrchestrator = PROJECTS.find((project) => project.id === "factory-orchestrator");
if (factoryOrchestrator && !featured.includes(factoryOrchestrator)) featured.push(factoryOrchestrator);

const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    url: `${SITE}/`,
    image: `${SITE}/og-image.jpg`,
    jobTitle: "Software Engineer",
    description: PROFILE.summary,
    email: `mailto:${PROFILE.links.email}`,
    alumniOf: EDUCATION.map((item) => ({ "@type": "CollegeOrUniversity", name: item.school })),
    sameAs: [PROFILE.links.github, PROFILE.links.linkedin, FULL_PORTFOLIO],
};

const bio = `
            <main class="static-bio">
                <h1>${esc(PROFILE.name)}</h1>
                <p>Software engineer and artist.</p>
                <p>${esc(PROFILE.summary)}</p>
                <h2>Experience</h2>
                <ul>${EXPERIENCE.map((item) => `<li><strong>${esc(item.org)}.</strong> ${esc(item.detail)}</li>`).join("")}</ul>
                <h2>Education</h2>
                <ul>${EDUCATION.map((item) => `<li><strong>${esc(item.school)}.</strong> ${esc(item.degree)}</li>`).join("")}</ul>
                <h2>Selected projects</h2>
                <ul>${featured
                    .map((project) => `<li><a href="${esc(project.url!)}">${esc(project.title)}</a>. ${esc(project.description)}</li>`)
                    .join("")}</ul>
                <p>
                    <a href="/basic">One-page résumé</a> ·
                    <a href="${FULL_PORTFOLIO}">Full portfolio</a> ·
                    <a href="/atrium">3D world</a> ·
                    <a href="${esc(PROFILE.links.github)}">GitHub</a> ·
                    <a href="${esc(PROFILE.links.linkedin)}">LinkedIn</a> ·
                    <a href="mailto:${esc(PROFILE.links.email)}">${esc(PROFILE.links.email)}</a>
                </p>
            </main>
        `;

const style = `
        <style>
            html { background: #0b0a14; }
            .static-bio { max-width: 640px; margin: 0 auto; padding: 48px 16px; color: #cfcbe0; font: 15px/1.6 Manrope, system-ui, sans-serif; }
            .static-bio h1 { font: 600 40px/1.1 Fraunces, Georgia, serif; color: #fff; margin: 0 0 8px; }
            .static-bio h2 { font: 600 18px/1.3 Fraunces, Georgia, serif; color: #fff; margin: 28px 0 8px; }
            .static-bio ul { padding-left: 18px; }
            .static-bio a { color: #b9a8ff; }
        </style>`;

export const seo = (): Plugin => ({
    name: "nicole-seo",
    transformIndexHtml: {
        order: "post",
        handler(html, ctx) {
            if (!ctx.filename.endsWith("index.html")) return html;
            const jsonLd = `\n        <script type="application/ld+json">${JSON.stringify(person).replace(/</g, "\\u003c")}</script>`;
            return html
                .replace("</head>", `${jsonLd}${style}\n    </head>`)
                .replace('<div id="root"></div>', `<div id="root">${bio}</div>`);
        },
    },
});
