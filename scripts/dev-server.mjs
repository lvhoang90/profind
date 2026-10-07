// Máy chủ chạy thử cục bộ: phục vụ thư mục dist/ và các hàm Edge trong api/ (kho tạm trong bộ nhớ, thư mã xác thực in ra bảng điều khiển).
//   npm run build && ADMIN_EMAILS=admin@example.com node scripts/dev-server.mjs [cổng]
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
process.env.MAIL_PROVIDER ??= "console";
const port = Number(process.argv[2] || process.env.PORT || 4173), root = join(process.cwd(), "dist");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".xml": "application/xml", ".md": "text/markdown" };
const handlers = {};
for (const n of ["account", "visit", "correction"]) handlers[n] = (await import(`../api/${n}.js`)).default;
http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${port}`);
  const m = u.pathname.match(/^\/api\/([a-z]+)$/);
  if (m && handlers[m[1]]) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await handlers[m[1]](new Request(u, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
    res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let f = normalize(join(root, decodeURIComponent(u.pathname))); if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(root, "index.html");
  res.writeHead(200, { "content-type": mime[extname(f)] ?? "application/octet-stream" }); res.end(readFileSync(f));
}).listen(port, () => console.log(`http://localhost:${port}`));
