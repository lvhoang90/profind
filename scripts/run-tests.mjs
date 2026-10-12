// npm test: gói api/account.js bằng esbuild rồi chạy lần lượt các tệp trong test/ (xem chú thích đầu mỗi tệp).
import { build } from "esbuild";
import { readdirSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";
const dir = mkdtempSync(path.join(tmpdir(), "profind-test-")), handler = path.join(dir, "h.mjs"), rt = path.join(dir, "rt.mjs");
await build({ entryPoints: ["api/account.js"], bundle: true, format: "esm", platform: "neutral", outfile: handler, logLevel: "error" });
await build({ entryPoints: ["src/replyTemplates.ts"], bundle: true, format: "esm", outfile: rt, logLevel: "error" });
let bad = 0;
for (const f of readdirSync("test").filter((f) => f.endsWith(".test.mjs")).sort()) {
  const r = spawnSync("node", [path.join("test", f)], { env: { ...process.env, HANDLER: handler, TEMPLATES: rt }, encoding: "utf8" });
  const out = (r.stdout + r.stderr).trim().split("\n").pop();
  console.log(r.status === 0 ? "OK  " : "FAIL", f, "-", out); if (r.status !== 0) bad++;
}
process.exit(bad ? 1 : 0);
