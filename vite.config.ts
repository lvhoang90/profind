import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
// Số liệu trong thẻ meta / JSON-LD / sơ đồ trang luôn lấy từ dữ liệu hiện hành (public/data/profind.json), không gõ tay.
const SITE = "https://profind.isavn.edu.vn";
const seoMeta = (): Plugin => {
  const M = (() => { try { return JSON.parse(readFileSync("public/data/profind.json", "utf8")).meta; } catch { return null; } })();
  const vn = (n: number) => n.toLocaleString("vi-VN");
  return {
    name: "profind-seo-meta",
    transformIndexHtml: (html) => !M ? html : html.replaceAll("%AUTHORS_K%", vn(Math.floor(M.authors / 1000) * 1000)).replaceAll("%AUTHORS_N%", vn(M.authors)).replaceAll("%WORKS_N%", vn(M.works)).replaceAll("%BUILT%", String(M.built ?? "")),
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc><lastmod>${M?.built ?? new Date().toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>\n` });
    },
  };
};
export default defineConfig({ plugins: [react(), seoMeta()], base: "./" });
