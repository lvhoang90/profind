// Đối chiếu độc lập với hồ sơ ORCID (public API, ghi nhận công tác do chính nhà khoa học khai): trong mẫu phân tầng theo tỉ lệ liên kết Việt Nam,
// bao nhiêu % hồ sơ hiện có nơi làm việc tại Việt Nam trên ORCID? Kết quả dùng để hiệu chuẩn xác suất "liên kết chính tại Việt Nam" cho hội đồng mô phỏng.
//   node scripts/abroad-orcid-validate.mjs   -> data/abroad-orcid-sample.json (chỉ lưu mã, tầng, nhãn: không lưu chi tiết việc làm)
// Nhãn: "vn" = có ít nhất một công tác HIỆN TẠI (không ngày kết thúc, hoặc kết thúc từ 2024) tại Việt Nam; "foreign" = có công tác hiện tại nhưng không có ở Việt Nam; "unknown" = ORCID không khai công tác hiện tại (bị loại khỏi hiệu chuẩn).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), OUT = "data/abroad-orcid-sample.json";
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { rows: [] }, have = new Set(done.rows.map((r) => r.id));
let s = 20261111 >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
const STR = { recent: [[0, 5], [5, 20], [20, 40], [40, 60], [60, 80], [80, 95], [95, 101]], overall: [[0, 10], [10, 30], [30, 50], [50, 70], [70, 90], [90, 101]] }, TARGET = { recent: 60, overall: 35 };
const pool = (f) => P.authors.filter((a) => !a.suspect && a.orcid && (f === "recent" ? a.vnRecent != null : a.vnRecent == null && a.vnShare != null));
const val = (f, a) => (f === "recent" ? a.vnRecent : a.vnShare);
const label = async (id) => { for (let t = 0; t < 4; t++) { try { const r = await fetch(`https://pub.orcid.org/v3.0/${id}/employments`, { headers: { accept: "application/json" } }); if (r.status === 404) return "unknown"; if (!r.ok) throw new Error(r.status); const d = await r.json(); let cur = 0, vn = 0; for (const g of d["affiliation-group"] ?? []) for (const x of g.summaries ?? []) { const e = x["employment-summary"], end = e["end-date"]?.year?.value; if (end && +end < 2024) continue; cur++; if (e.organization?.address?.country === "VN") vn++; } return cur === 0 ? "unknown" : vn > 0 ? "vn" : "foreign"; } catch { await new Promise((r) => setTimeout(r, 1500 * (t + 1))); } } return "error"; };
for (const f of ["recent", "overall"]) {
  const cand = shuffle(pool(f)); console.log(f, "ứng viên có ORCID:", cand.length);
  for (const [lo, hi] of STR[f]) {
    const inBin = cand.filter((a) => val(f, a) >= lo && val(f, a) < hi); let got = done.rows.filter((r) => r.factor === f && r.lo === lo).filter((r) => r.label === "vn" || r.label === "foreign").length;
    const todo = inBin.filter((a) => !have.has(a.id)); let i = 0;
    while (got < TARGET[f] && i < todo.length) {
      const batch = todo.slice(i, i + 6); i += 6;
      const res = await Promise.all(batch.map((a) => label(a.orcid)));
      batch.forEach((a, k) => { done.rows.push({ factor: f, lo, hi, id: a.id, x: val(f, a), label: res[k] }); have.add(a.id); if (res[k] === "vn" || res[k] === "foreign") got++; });
      await new Promise((r) => setTimeout(r, 400));
    }
    console.log(f, `[${lo},${hi})`, "có nhãn:", got, "/ trong tầng:", inBin.length);
    writeFileSync(OUT, JSON.stringify({ _note: "Mẫu đối chiếu ORCID (scripts/abroad-orcid-validate.mjs). Chỉ lưu mã OpenAlex, giá trị đặc trưng và nhãn.", built: P.meta.built, rows: done.rows }) + "\n");
  }
}
const sum = {}; for (const r of done.rows) { const k = `${r.factor}|${r.lo}`; (sum[k] ??= { vn: 0, foreign: 0, unknown: 0, error: 0 })[r.label]++; } console.log(JSON.stringify(sum, null, 0));
