import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fold, nameKey, dKey, usableName, normDoi, normIssn, decide } from "../scripts/pilot-sti-pubs.mjs";

// Thí điểm công bố trong nước theo hồ sơ (scripts/pilot-sti-pubs.mjs): quy tắc khớp chắc, cấu trúc dữ liệu, giao diện chưa xác thực và phân trang 25.
const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const D = JSON.parse(rd("data/sti-pubs-pilot.json")), PUB = JSON.parse(rd("public/data/sti-pilot.json"));
const REASONS = new Set(["d", "t", "ni", "n"]);

test("chuẩn hóa tên: chỉ cho phép xoay vòng thứ tự, không đảo tùy ý", () => {
  assert.equal(fold("Trần Đình Đạt"), "tran dinh dat");
  assert.equal(nameKey("Minh-Triet Tran"), nameKey("Trần Minh Triết"));
  assert.equal(nameKey("Thị Chi Chu"), nameKey("Chu Thị Chi"));
  assert.notEqual(nameKey("Nguyen Hoan Phuc"), nameKey("Nguyễn Phúc Hoàn"), "Phúc Hoàn khác Hoàn Phúc");
  assert.notEqual(dKey("Đỗ Thị Hường"), dKey("Đỗ Thị Hương"));
  assert.equal(nameKey("Đỗ Thị Hường"), nameKey("Do Thi Huong"));
  assert.ok(usableName("Nguyễn Văn An") && !usableName("Nguyen Anh") && !usableName("T. Kim Le"));
  assert.equal(normDoi("https://doi.org/10.1000/ABC"), "10.1000/abc");
  assert.equal(normIssn("2354 080x"), "2354-080X");
});

test("quy tắc khớp: DOI; tên + cơ quan + năm; không khớp chỉ theo tên", () => {
  const base = { pub: { doi: null, y: 2024, issn: "1111-2222" }, profile: { firstYear: 2020, lastYear: 2025 }, nameOk: true, orgOnly: true, issns: new Set(), dois: new Set(), fieldOk: true };
  assert.equal(decide(base), "n");
  assert.equal(decide({ ...base, issns: new Set(["1111-2222"]) }), "ni");
  assert.equal(decide({ ...base, titleSame: true }), "t");
  assert.equal(decide({ ...base, nameOk: false, pub: { ...base.pub, doi: "10.1/x" }, dois: new Set(["10.1/x"]) }), "d", "DOI trùng là đủ");
  assert.deepEqual(decide({ ...base, nameOk: false }), { skip: "ten" }, "không khớp chỉ theo tên khi thiếu bằng chứng khác thì bỏ");
  assert.deepEqual(decide({ ...base, orgOnly: false }), { skip: "nhieu-co-quan" });
  assert.deepEqual(decide({ ...base, fieldOk: false }), { skip: "nganh-lech" });
  assert.deepEqual(decide({ ...base, pub: { ...base.pub, y: 2010 } }), { skip: "nam" });
  assert.deepEqual(decide({ ...base, pub: { ...base.pub, y: 2030 } }), { skip: "nam" });
  assert.deepEqual(decide({ ...base, common: true }), { skip: "ten-pho-bien" }, "tên phổ biến cần bằng chứng thêm");
  assert.equal(decide({ ...base, common: true, titleSame: true }), "t", "nhan đề trùng cho phép tên phổ biến");
});

test("tệp thí điểm: khóa theo mã tác giả ProFind của đúng một đơn vị, mục đủ trường, lý do hợp lệ", () => {
  const P = JSON.parse(rd("public/data/profind.json")), au = new Map(P.authors.map((a) => [a.id, a]));
  assert.equal(D.meta.unit, "hmu");
  assert.match(D.meta.status, /chưa xác thực/);
  assert.match(D.meta.status, /không tính vào PRO-SCORE1000™/);
  let n = 0;
  for (const [id, v] of Object.entries(D.byAuthor)) {
    const a = au.get(id); assert.ok(a, `mã tác giả lạ: ${id}`); assert.ok(a.institutions.includes(D.meta.unit), `${id} không thuộc đơn vị thí điểm`);
    assert.ok(v.length > 0);
    for (const r of v) {
      n++;
      assert.deepEqual(Object.keys(r).sort(), ["citations", "id", "issn", "journal", "title", "why", "year"]);
      assert.ok(Number.isInteger(r.id) && r.id > 0); assert.ok(r.title.trim()); assert.ok(REASONS.has(r.why));
      assert.ok(r.issn === null || /^\d{4}-\d{3}[\dX]$/.test(r.issn)); assert.ok(Number.isInteger(r.citations) && r.citations >= 0);
      assert.ok(r.year === null || (r.year >= 1990 && r.year <= new Date().getFullYear() + 1));
    }
  }
  assert.equal(n, D.meta.stats.matchedPubs);
  assert.equal(Object.keys(D.byAuthor).length, D.meta.stats.authorsWithMatch);
  assert.equal(Object.values(D.meta.stats.byReason).reduce((s, x) => s + x, 0), n);
  assert.equal(D.meta.stats.profiles > 1000, true);
});

test("không chứa dữ liệu cá nhân nhạy cảm; tệp công khai khớp tệp đầy đủ và gọn", () => {
  for (const f of ["data/sti-pubs-pilot.json", "public/data/sti-pilot.json"]) assert.doesNotMatch(rd(f), /cccd|căn cước|can cuoc/i, `${f} có dấu hiệu dữ liệu nhạy cảm`);
  assert.doesNotMatch(rd("scripts/pilot-sti-pubs.mjs"), /\.pCccd|\["pCccd"\]|pCccd:/, "script không được đọc trường pCccd");
  assert.doesNotMatch(rd("scripts/build-sti-journals.mjs"), /pCccd/);
  assert.equal(PUB.meta.unit, D.meta.unit);
  assert.deepEqual(Object.keys(PUB.by).sort(), Object.keys(D.byAuthor).sort());
  for (const [id, v] of Object.entries(D.byAuthor)) assert.deepEqual(PUB.by[id], v.map((r) => [r.id, r.title, r.year ?? 0, r.issn ?? "", r.journal ?? "", r.citations, r.why]));
  assert.ok(JSON.stringify(PUB).length < 400_000, "tệp tải khi cần phải nhỏ");
});

test("giao diện: đơn vị thí điểm khớp dữ liệu, dùng Pager chung, nhãn chưa xác thực, liên kết mở tab mới an toàn, có cả hai ngôn ngữ", () => {
  const ui = rd("src/StiPilot.tsx"), app = rd("src/App.tsx"), i18n = rd("src/i18n.ts"), about = rd("src/About.tsx");
  assert.match(ui, new RegExp(`STI_PILOT_UNIT = "${D.meta.unit}"`));
  assert.match(ui, /import \{ Pager, PAGE \} from "\.\/Pager"/);
  assert.match(ui, /slice\(page \* PAGE, \(page \+ 1\) \* PAGE\)/);
  assert.match(ui, /<Pager page=\{page\}/);
  assert.match(ui, /stiBadge/); assert.match(app, /<StiPilot id=\{a\.id\} institutions=\{a\.institutions\}/);
  for (const m of ui.match(/<a [^>]*target="_blank"[^>]*>/g) ?? []) assert.match(m, /rel="noopener noreferrer"/);
  assert.match(app, /stiSearchUrl\(a\.name\)[^]*rel="noopener noreferrer"|rel="noopener noreferrer"[^]*stiSearchUrl\(a\.name\)/);
  assert.match(rd("src/StiPilot.tsx"), /https:\/\/sti\.gov\.vn\/publication\?q=/);
  for (const k of ["stiLink", "stiLinkTip", "stiAscii", "stiH", "stiBadge", "stiNote", "stiOpen", "stiCites", "stiWhyDoi", "stiWhyTitle", "stiWhyName", "stiWhyNameIssn", "stiLoad", "stiFail"]) assert.equal((i18n.match(new RegExp(`\\b${k}: `, "g")) ?? []).length, 2, `${k} phải có vi và en`);
  assert.match(i18n, /Chưa xác thực, không tính vào PRO-SCORE1000™|Chưa xác thực/);
  assert.match(about, /STI\.gov\.vn/); assert.match(about, /chưa công bố điều khoản tái sử dụng/); assert.match(about, /has not published reuse terms/);
  assert.match(rd("docs/DATA-PIPELINE.md"), /STI\.gov\.vn/);
  for (const f of ["scripts/pro-score.mjs", "scripts/build-index.mjs"]) assert.doesNotMatch(rd(f), /sti-pubs|sti-pilot|sti-journals/);
});
