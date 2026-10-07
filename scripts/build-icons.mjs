// Sinh biểu tượng ProFind vào public/: favicon.svg, icon-maskable.svg, manifest.webmanifest, và PNG (180/192/512/maskable, og.jpg) nếu có Playwright + Chromium.
//   node scripts/build-icons.mjs [--png]
import fs from "node:fs";
import { APP_ICON, DISC } from "./lib/brand.mjs";
const OUT = "public";
fs.writeFileSync(`${OUT}/favicon.svg`, APP_ICON() + "\n");
fs.writeFileSync(`${OUT}/icon-maskable.svg`, APP_ICON({ maskable: true }) + "\n");
fs.writeFileSync(`${OUT}/logo-disc.svg`, DISC() + "\n");
fs.writeFileSync(`${OUT}/manifest.webmanifest`, JSON.stringify({
  name: "ProFind - Tra cứu tác giả và công trình nghiên cứu", short_name: "ProFind", lang: "vi", start_url: "./", scope: "./", display: "standalone", background_color: "#0b2a40", theme_color: "#0b2a40",
  icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }, { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
}, null, 2) + "\n");
if (process.argv.includes("--png")) {
  const { chromium } = await import(process.env.PLAYWRIGHT_PATH ?? "playwright");
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
  const shot = async (svgFile, size, out) => { const p = await b.newPage({ viewport: { width: size, height: size } }); await p.setContent(`<body style="margin:0;background:transparent">${fs.readFileSync(`${OUT}/${svgFile}`, "utf8").replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body>`); await p.screenshot({ path: `${OUT}/${out}`, omitBackground: true }); await p.close(); };
  await shot("favicon.svg", 180, "icon-180.png"); await shot("favicon.svg", 192, "icon-192.png"); await shot("favicon.svg", 512, "icon-512.png"); await shot("icon-maskable.svg", 512, "icon-maskable-512.png");
  await b.close();
}
