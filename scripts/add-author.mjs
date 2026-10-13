// Thêm hồ sơ theo yêu cầu (đề nghị bổ sung nhà nghiên cứu) bằng MỘT lệnh: ghi data/manual-authors.json (+ data/scholar.json) -> nạp tác giả và công trình theo ORCID -> dựng lại chỉ mục -> kiểm tra -> in tóm tắt hồ sơ.
//   OPENALEX_API_KEY=... node scripts/add-author.mjs --id A5021889240 --unit ueh [--scholar pvflg0MAAAAJ | URL Scholar] [--citations 357 --as-of 2026-10-13] [--by "ghi chú nguồn"] [--mailto email]
//   hoặc tra mã bằng ORCID:  --orcid 0000-0003-2787-1618 --unit ueh
//   --dry-run: chỉ kiểm tra và in việc sẽ làm; --no-build: chỉ ghi tệp cấu hình (bỏ qua nạp và dựng); --force: thay mã Scholar đã có.
// Sau khi chạy: kiểm tra hồ sơ, `npm run build && npm test`, commit và mở PR như thường lệ (thuộc về người làm, lệnh này không chạy git).
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { arg, MAILTO } from "./lib/cli.mjs";
import { ID_RE, ORCID_RE, scholarId, addManual, setScholar, load, save } from "./lib/add-author.mjs";

const has = (k) => process.argv.includes(`--${k}`);
const mailto = arg("mailto", MAILTO), KEY = process.env.OPENALEX_API_KEY, unit = arg("unit"), dry = has("dry-run"), noBuild = has("no-build");
let id = arg("id"); const orcid = arg("orcid"), scholarArg = arg("scholar");
if (!unit) throw new Error("Thiếu --unit <mã đơn vị ProFind> (ví dụ ueh).");
if (!id && !orcid) throw new Error("Cần --id A… hoặc --orcid xxxx-xxxx-xxxx-xxxx.");
if (!KEY && !(dry && id)) throw new Error("Cần biến môi trường OPENALEX_API_KEY.");
const INST = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions;
if (!INST.some((i) => i.id === unit)) throw new Error(`Không có đơn vị "${unit}" trong data/institutions.json.`);
const sc = scholarArg ? scholarId(scholarArg) : null; if (scholarArg && !sc) throw new Error(`Mã/đường dẫn Google Scholar không hợp lệ: ${scholarArg}`);
const run = (c) => execSync(c, { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
const oa = async (u) => { const r = await fetch(`https://api.openalex.org${u}${u.includes("?") ? "&" : "?"}mailto=${encodeURIComponent(mailto)}`, { headers: { Authorization: `Bearer ${KEY}` } }); if (!r.ok) throw new Error(`OpenAlex ${r.status}`); return r.json(); };

if (!id) {
  if (!ORCID_RE.test(orcid)) throw new Error(`ORCID không hợp lệ: ${orcid}`);
  const r = (await oa(`/authors?filter=orcid:${orcid}&select=id,display_name,works_count`)).results;
  if (r.length !== 1) throw new Error(r.length ? `ORCID ${orcid} ứng với ${r.length} mã OpenAlex (${r.map((x) => x.id.split("/").pop()).join(", ")}); chọn một và chạy lại với --id.` : `OpenAlex chưa có tác giả cho ORCID ${orcid}.`);
  id = r[0].id.split("/").pop(); console.log(`ORCID ${orcid} -> ${id} (${r[0].display_name}, ${r[0].works_count} công trình)`);
}
if (!ID_RE.test(id)) throw new Error(`Mã OpenAlex không hợp lệ: ${id}`);

const manual = load("data/manual-authors.json", []), scholar = load("data/scholar.json", {});
const m = addManual(manual, id, unit);
console.log(m.added ? `Thêm ${id} vào data/manual-authors.json (đơn vị ${unit}).` : `${id} đã có trong manual-authors (đơn vị ${unit}), giữ nguyên.`);
if (sc) console.log(`Scholar: ${sc}${arg("citations") ? `, ${arg("citations")} trích dẫn tự khai` : ""}.`);
if (dry) { console.log("--dry-run: chưa ghi tệp, chưa nạp, chưa dựng."); process.exit(0); }
if (m.added) save("data/manual-authors.json", manual, 1);
if (sc) { setScholar(scholar, id, sc, { citations: arg("citations"), asOf: arg("as-of", new Date().toISOString().slice(0, 10)), by: arg("by", `quản trị viên, ${new Date().toISOString().slice(0, 10).split("-").reverse().join("/")}`), force: has("force") }); save("data/scholar.json", scholar, 2); }
if (noBuild) { console.log("--no-build: đã ghi cấu hình; chạy `node scripts/refresh.mjs` hoặc lại lệnh này không kèm --no-build để dựng."); process.exit(0); }

// Nạp tác giả chỉ định + công trình theo ORCID. Phải nạp LẠI TOÀN BỘ đơn vị đã có cache (đừng chỉ truyền --only <unit>: dữ liệu trung gian sẽ chỉ còn đơn vị đó).
if (!existsSync("data/raw") || !readdirSync("data/raw").length) run("node scripts/cache.mjs restore");
run(`node scripts/ingest-manual.mjs --mailto ${mailto} --from 2016`);
const have = new Set(readdirSync("data/raw").map((f) => f.replace(".json", "")));
const pend = existsSync("data/ingest-pending.json") ? JSON.parse(readFileSync("data/ingest-pending.json", "utf8")).map((x) => x.id) : [];
const all = [...new Set([...INST.filter((i) => have.has(i.id) || pend.includes(i.id)).map((i) => i.id)])];
run(`node scripts/ingest-openalex.mjs --mailto ${mailto} --only "${all.join(",")}" --max-authors 50 --from 2021`);
run(`node scripts/enrich-authors.mjs --mailto ${mailto}`);
run("node scripts/build-index.mjs");
run("node scripts/build-top-works.mjs"); run("node scripts/build-wsearch.mjs"); run("node scripts/check-data.mjs");

const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), a = P.authors.find((x) => x.id === id);
console.log(`\nTổng: ${P.meta.authors} tác giả, ${P.meta.works} công trình.`);
if (!a) { console.warn(`CẢNH BÁO: ${id} chưa xuất hiện trong profind.json. Kiểm tra OpenAlex có công trình có ISSN từ 2016 và đơn vị ${unit}.`); process.exit(2); }
console.log(`Hồ sơ: ${a.name} | ${a.orcid ?? "không ORCID"} | đơn vị ${a.institutions.join(", ")} | ${a.worksCount} công trình, ${a.citations} trích dẫn, h ${a.hIndex} | PRO-SCORE ${a.pro ?? "—"} hạng ${a.proRank ?? "chưa xếp"} | Scholar ${a.scholar ?? "—"}`);
console.log(`Link: https://profind.isavn.edu.vn/#/tac-gia/${id}\nTiếp theo: npm run build && npm test, rồi commit + PR (mỗi lần dựng có thể đổi ngày trong data/discipline-review.json: bỏ đi bằng git checkout).`);
