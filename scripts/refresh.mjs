// Nạp tiếp dữ liệu (dùng cho lịch tự động và chạy tay): khôi phục cache nếu thiếu -> nạp các đơn vị còn thiếu -> bổ sung quốc gia đơn vị -> dựng chỉ mục -> kiểm tra -> lưu cache.
//   OPENALEX_API_KEY=... node scripts/refresh.mjs --mailto <email> [--from 2021] [--max-authors 50]
// Dừng sớm (mã thoát 0, ghi lại việc còn dở) nếu OpenAlex báo hết ngân sách trong ngày; chạy lại ngày hôm sau.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), from = arg("from", "2021"), max = arg("max-authors", "50");
const KEY = process.env.OPENALEX_API_KEY; if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const run = (c) => execSync(c, { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
if (!existsSync("data/raw") || !readdirSync("data/raw").length) run("node scripts/cache.mjs restore");
const budget = async () => (await (await fetch(`https://api.openalex.org/rate-limit?api_key=${KEY}`)).json()).rate_limit;
let b = await budget(); console.log(`Ngân sách OpenAlex còn ${b.daily_remaining_usd} USD (đặt lại sau ${Math.round(b.resets_in_seconds / 3600)} giờ)`);
if (b.daily_remaining_usd < 0.05) { console.log("Hết ngân sách, dừng."); process.exit(0); }
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions.filter((i) => i.ror);
const have = new Set(readdirSync("data/raw").map((f) => f.replace(".json", "")));
const pending = JSON.parse(readFileSync("data/ingest-pending.json", "utf8")).map((x) => x.id).filter((id) => I.some((i) => i.id === id));
const all = [...new Set([...have].filter((id) => I.some((i) => i.id === id)).concat(pending))];
run(`node scripts/ingest-openalex.mjs --mailto ${mailto} --only "${all.join(",")}" --max-authors ${max} --from ${from}`);
run(`node scripts/backfill-doi.mjs --mailto ${mailto}`);
b = await budget(); if (b.daily_remaining_usd < 0.02) console.log("Ngân sách gần hết, bỏ qua bước bổ sung quốc gia; chạy lại sau.");
else run(`node scripts/enrich-authors.mjs --mailto ${mailto}`);
const left = readdirSync("data/raw").map((f) => f.replace(".json", ""));
const still = pending.filter((id) => !left.includes(id)).map((id) => ({ id, name: I.find((i) => i.id === id)?.name, ror: I.find((i) => i.id === id)?.ror }));
writeFileSync("data/ingest-pending.json", JSON.stringify(still, null, 1));
run("node scripts/build-index.mjs"); run("node scripts/check-data.mjs"); run("node scripts/cache.mjs save");
console.log(`Xong. Còn ${still.length} đơn vị chưa nạp được${still.length ? " (chạy lại ngày mai)" : ""}.`);
