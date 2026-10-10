// Nạp tiếp dữ liệu (dùng cho lịch tự động và chạy tay): khôi phục cache nếu thiếu -> nạp các đơn vị còn thiếu -> bổ sung quốc gia đơn vị -> dựng chỉ mục -> cơ quan/ORCID từng bài (đơn vị hiện tại, bài gán nhầm) -> kiểm tra -> lưu cache.
//   OPENALEX_API_KEY=... node scripts/refresh.mjs --mailto <email> [--from 2021] [--max-authors 50]
// Dừng sớm (mã thoát 0, ghi lại việc còn dở) nếu OpenAlex báo hết ngân sách trong ngày; chạy lại ngày hôm sau.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const mailto = arg("mailto"), from = arg("from", "2021"), max = arg("max-authors", "50");
const KEY = process.env.OPENALEX_API_KEY; if (!mailto || !KEY) throw new Error("Cần --mailto và OPENALEX_API_KEY.");
const run = (c) => execSync(c, { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
if (!existsSync("data/raw") || !readdirSync("data/raw").length) run("node scripts/cache.mjs restore");
const budget = async () => { const r = (await (await fetch(`https://api.openalex.org/rate-limit?api_key=${KEY}`)).json()).rate_limit; return { ...r, daily_remaining_usd: r.daily_remaining_usd + (r.prepaid_remaining_usd ?? 0) }; }; // gồm cả số dư nạp trước
let b = await budget(); console.log(`Ngân sách OpenAlex còn ${b.daily_remaining_usd} USD (đặt lại sau ${Math.round(b.resets_in_seconds / 3600)} giờ)`);
if (b.daily_remaining_usd < 0.05) { console.log("Hết ngân sách, dừng."); process.exit(0); }
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions.filter((i) => i.ror || existsSync(`data/raw/${i.id}.json`)); // gồm đơn vị nạp theo chuỗi cơ quan (chưa có ROR)
const have = new Set(readdirSync("data/raw").map((f) => f.replace(".json", "")));
const pending = JSON.parse(readFileSync("data/ingest-pending.json", "utf8")).map((x) => x.id).filter((id) => I.some((i) => i.id === id));
const all = [...new Set([...have].filter((id) => I.some((i) => i.id === id)).concat(pending))];
run(`node scripts/ingest-manual.mjs --mailto ${mailto} --from ${from}`);
try { run(`node scripts/orcid-supplement.mjs --mailto ${mailto} --from 2016 --max-age-days 30`); } catch (e) { console.warn("Bỏ qua bổ sung công trình theo ORCID:", String(e.message).slice(0, 200)); } // tác giả quản trị viên chỉ định + bổ sung công trình theo ORCID (data/manual-authors.json)
run(`node scripts/ingest-openalex.mjs --mailto ${mailto} --only "${all.join(",")}" --max-authors ${max} --from ${from}`);
run(`node scripts/backfill-doi.mjs --mailto ${mailto}`);
b = await budget(); if (b.daily_remaining_usd < 0.02) console.log("Ngân sách gần hết, bỏ qua bước bổ sung quốc gia; chạy lại sau.");
else run(`node scripts/enrich-authors.mjs --mailto ${mailto}`);
const left = readdirSync("data/raw").map((f) => f.replace(".json", ""));
const still = pending.filter((id) => !left.includes(id)).map((id) => ({ id, name: I.find((i) => i.id === id)?.name, ror: I.find((i) => i.id === id)?.ror }));
writeFileSync("data/ingest-pending.json", JSON.stringify(still, null, 1));
// Mỗi tháng (ngày 1, hoặc --recheck) dò lại đơn vị chưa có dữ liệu: OpenAlex cập nhật cơ quan công tác liên tục. Chỉ tạo báo cáo/ứng viên để duyệt, không tự nạp.
if (process.argv.includes("--recheck") || new Date().getUTCDate() === 1) { try { run(`node scripts/recheck-missing.mjs --mailto ${mailto}`); } catch (e) { console.warn("Bỏ qua kiểm tra lại đơn vị chưa có dữ liệu:", String(e.message).slice(0, 80)); } }
run("node scripts/build-index.mjs");
// Đơn vị hiện tại + dò bài gán nhầm (OpenAlex authorships): tăng dần, chỉ nạp tác giả đổi số công trình; lỗi ở đây không làm hỏng cả đợt.
try {
  b = await budget();
  if (b.daily_remaining_usd < 0.05) console.log("Ngân sách gần hết, bỏ qua bước cơ quan/ORCID từng bài; chạy lại sau.");
  else { run(`node scripts/fetch-authorship.mjs --mailto ${mailto} --limit-usd 0.3`); run(`node scripts/fetch-orcid-per-work.mjs --mailto ${mailto}`); run(`node scripts/build-current-inst.mjs --mailto ${mailto}`); run("node scripts/build-index.mjs"); run("node scripts/find-misattributed.mjs"); }
} catch (e) { console.warn("Bỏ qua bước đơn vị hiện tại/bài gán nhầm:", String(e.message).slice(0, 200)); }
try { run(`node scripts/fetch-extra-works.mjs --mailto ${mailto}`); } catch (e) { console.warn("Bỏ qua mục Công trình khác (không tính điểm):", String(e.message).slice(0, 120)); } // đủ công trình cho hồ sơ đã xác thực và hồ sơ trong data/full-works-authors.json
run("node scripts/build-top-works.mjs"); run("node scripts/build-suggest-index.mjs"); run("node scripts/build-wsearch.mjs"); run("node scripts/build-nodata.mjs"); try { run("node scripts/build-icons.mjs --png"); run("git checkout -- public/manifest.webmanifest"); } catch (e) { console.warn("Bỏ qua dựng lại ảnh chia sẻ (og.jpg):", String(e.message).slice(0, 120)); } // số tác giả/công trình trên ảnh xem trước theo dữ liệu mới
run("node scripts/check-data.mjs"); run("node scripts/cache.mjs save");
console.log(`Xong. Còn ${still.length} đơn vị chưa nạp được${still.length ? " (chạy lại ngày mai)" : ""}.`);
