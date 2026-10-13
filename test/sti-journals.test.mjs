import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Dữ liệu cấp tạp chí từ STI.gov.vn (scripts/build-sti-journals.mjs): đúng cấu trúc, không có dữ liệu cá nhân, chỉ là chỉ số tham khảo.
const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const D = JSON.parse(rd("data/sti-journals.json")), PUB = JSON.parse(rd("public/data/sti-journals.json"));
const ISSN = /^\d{4}-\d{3}[\dX]$/;
const FIELDS = ["id", "name", "nameEn", "publisher", "issn", "eissn", "impactFactor", "citeScore", "points", "pubs5y", "pubs2y", "cited2y", "cites5y", "citesByYear"];

test("cấu trúc tệp: meta khớp danh sách, tên trường đúng danh sách cho phép", () => {
  assert.equal(D.meta.count, D.journals.length);
  assert.ok(D.journals.length >= 300, "phải có vài trăm tạp chí");
  assert.match(D.meta.source, /STI\.gov\.vn/);
  assert.match(D.meta.licence, /chưa có điều khoản/i);
  const ids = new Set();
  for (const j of D.journals) {
    assert.deepEqual(Object.keys(j).sort(), [...FIELDS].sort(), `trường lạ ở tạp chí ${j.id}`);
    assert.ok(Number.isInteger(j.id) && !ids.has(j.id)); ids.add(j.id);
    assert.ok(typeof j.name === "string" && j.name.trim());
    for (const k of ["issn", "eissn"]) assert.ok(j[k] === null || (ISSN.test(j[k]) && j[k] !== "0000-0000"), `${k} sai dạng: ${j[k]}`);
    if (j.issn && j.eissn) assert.notEqual(j.issn, j.eissn);
    for (const k of ["impactFactor", "citeScore", "points", "pubs5y", "pubs2y", "cited2y", "cites5y"]) assert.ok(j[k] === null || (typeof j[k] === "number" && j[k] >= 0), `${k} phải là số không âm hoặc null`);
    for (const [y, n] of Object.entries(j.citesByYear)) assert.ok(/^\d{4}$/.test(y) && Number.isInteger(n) && n >= 0);
  }
});

test("không chứa trường hay nội dung cá nhân (liên hệ, email, điện thoại, số căn cước)", () => {
  for (const f of ["data/sti-journals.json", "public/data/sti-journals.json"]) {
    const t = rd(f);
    assert.doesNotMatch(t, /cccd/i, `${f} có chữ cccd`);
    assert.doesNotMatch(t, /[\w.+-]+@[\w-]+\.[\w.]+/, `${f} có địa chỉ email`);
    assert.doesNotMatch(t, /emailLienLac|sdtLienLac|tenNguoiLienLac|dienThoai|nguoiDuyet|userid/i, `${f} có trường liên hệ`);
  }
});

test("tệp gọn cho giao diện khớp tệp đầy đủ theo ISSN", () => {
  assert.equal(PUB.meta.count, D.meta.count);
  const exp = {};
  for (const j of D.journals) for (const i of [j.issn, j.eissn]) if (i) exp[i] = [j.pubs5y, j.cites5y, j.impactFactor, j.citeScore, j.id];
  assert.deepEqual(PUB.by, exp);
  assert.ok(JSON.stringify(PUB).length < 60_000, "tệp gọn phải nhỏ (tải ở mọi hồ sơ)");
});

test("số liệu đối chiếu trong meta khớp với dữ liệu và danh mục ProFind", () => {
  const cat = new Set(Object.keys(JSON.parse(rd("data/journals.json")).byIssn));
  const sc = new Set(Object.keys(JSON.parse(rd("data/scopus-sources.json")).sources).map((k) => `${k.slice(0, 4)}-${k.slice(4)}`));
  const has = (j) => [j.issn, j.eissn].filter(Boolean);
  const c = D.meta.compare;
  assert.equal(c.total, D.journals.length);
  assert.equal(c.noIssn, D.journals.filter((j) => !has(j).length).length);
  assert.equal(c.inCatalogue, D.journals.filter((j) => has(j).some((i) => cat.has(i))).length);
  assert.equal(c.missing, D.journals.filter((j) => has(j).length && !has(j).some((i) => cat.has(i) || sc.has(i))).length);
});

test("giao diện: chỉ số STI là tham khảo, có chú thích song ngữ, không đưa vào điểm", () => {
  const ts = rd("src/stiJournals.ts"), i18n = rd("src/i18n.ts");
  assert.match(ts, /sti-journals\.json/);
  assert.equal((i18n.match(/stiJ: /g) ?? []).length, 2, "stiJ phải có cả vi và en");
  assert.equal((i18n.match(/stiJTip: /g) ?? []).length, 2);
  assert.match(i18n, /không tính vào PRO-SCORE1000™ và hạng/);
  for (const f of ["scripts/pro-score.mjs", "scripts/build-index.mjs"]) assert.doesNotMatch(rd(f), /sti-journals|sti-pubs|sti-pilot/, `${f} không được dùng dữ liệu STI`);
});
