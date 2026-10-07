// Sinh biểu tượng ProFind vào public/: favicon.svg, icon-maskable.svg, manifest.webmanifest, và PNG (180/192/512/maskable, og.jpg) nếu có Playwright + Chromium.
//   node scripts/build-icons.mjs [--png]
import fs from "node:fs";
import { APP_ICON, DISC } from "./lib/brand.mjs";
const OUT = "public";
fs.writeFileSync(`${OUT}/favicon.svg`, APP_ICON() + "\n");
fs.writeFileSync(`${OUT}/icon-maskable.svg`, APP_ICON({ maskable: true }) + "\n");
fs.writeFileSync(`${OUT}/logo-disc.svg`, DISC() + "\n");
fs.writeFileSync(`${OUT}/manifest.webmanifest`, JSON.stringify({
  name: "ProFind - Tra cứu tác giả và công trình nghiên cứu", short_name: "ProFind", description: "Tra cứu tác giả, nhà nghiên cứu Việt Nam theo ngành, đơn vị, công trình và điểm tham khảo theo danh mục HĐGSNN.", lang: "vi", start_url: "./", scope: "./", display: "standalone", background_color: "#0b2a40", theme_color: "#0b2a40",
  icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }, { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }],
}, null, 2) + "\n");
if (process.argv.includes("--png")) {
  const pw = await import(process.env.PLAYWRIGHT_PATH ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
  const shot = async (svgFile, size, out) => { const p = await b.newPage({ viewport: { width: size, height: size } }); await p.setContent(`<body style="margin:0;background:transparent">${fs.readFileSync(`${OUT}/${svgFile}`, "utf8").replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body>`); await p.screenshot({ path: `${OUT}/${out}`, omitBackground: true }); await p.close(); };
  await shot("icon-maskable.svg", 180, "icon-180.png"); // apple-touch-icon: nền đặc, không góc trong suốt
   await shot("favicon.svg", 192, "icon-192.png"); await shot("favicon.svg", 512, "icon-512.png"); await shot("icon-maskable.svg", 512, "icon-maskable-512.png");
  // Ảnh chia sẻ mạng xã hội 1200x630
  const M = JSON.parse(fs.readFileSync(`${OUT}/data/profind.json`, "utf8")).meta;
  const og = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const fp = (f) => `file://${process.cwd()}/public/fonts/${f}`;
  await og.setContent(`<style>@font-face{font-family:SG;src:url(${fp("space-grotesk-vietnamese.woff2")});unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9}@font-face{font-family:SG;src:url(${fp("space-grotesk-latin.woff2")});unicode-range:U+0000-00FF,U+0131,U+2000-206F}body{margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:56px;padding:0 90px;box-sizing:border-box;font-family:SG,sans-serif;color:#fff;background:radial-gradient(40% 90% at 14% 10%,rgba(56,189,248,.3),transparent 70%),radial-gradient(36% 90% at 88% 0,rgba(139,92,246,.36),transparent 70%),linear-gradient(160deg,#08202f,#0b2a40 45%,#0f3d5e)}img{width:300px;height:300px;flex:none}h1{margin:0 0 18px;font-size:92px;line-height:1}h1 i{font-style:normal;color:#7dd3fc}p{margin:0;font-size:40px;line-height:1.25;color:#cfe8f7}small{display:block;margin-top:26px;font-size:26px;color:#8fb8d4}.chips{display:flex;gap:14px;margin-top:26px}.chips b{font-weight:600;font-size:23px;white-space:nowrap;padding:8px 18px;border-radius:999px;background:rgba(125,211,252,.16);border:1px solid rgba(125,211,252,.4);color:#e6f6ff}</style><img src="data:image/svg+xml;base64,${fs.readFileSync(`${OUT}/logo-disc.svg`).toString("base64")}"><div><h1>Pro<i>Find</i></h1><p>Tra cứu nhà nghiên cứu và công trình khoa học Việt Nam</p><div class="chips"><b>${M.authors.toLocaleString("vi-VN")} tác giả</b><b>${M.works.toLocaleString("vi-VN")} công trình</b><b>Điểm HĐGSNN</b></div><small>profind.isavn.edu.vn · Mã nguồn mở · Hệ sinh thái ISA</small></div>`);
  await og.waitForTimeout(400); await og.screenshot({ path: `${OUT}/og.jpg`, type: "jpeg", quality: 92 }); // JPEG ~60 KB: nhẹ hơn nhiều so với PNG, mọi nền tảng (Facebook, Zalo, LinkedIn, X) đều nhận
  await b.close();
}
