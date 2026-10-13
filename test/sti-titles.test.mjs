import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENABLED_UNITS, VALID_TITLE, titleOf, stripTitles, keyOf, orgKey, buildOrgMap, orgUnitOf, compatDisciplines, profileProblem, coherent, decide } from "../scripts/build-sti-titles.mjs";

// Chức danh lấy từ STI.gov.vn (scripts/build-sti-titles.mjs): tệp chỉ gồm id -> chức danh, chỉ trường được bật, không hồ sơ suspect, không trường cá nhân; quy tắc khớp chắc.
const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const T = JSON.parse(rd("public/data/sti-titles.json")), P = JSON.parse(rd("public/data/profind.json")), au = new Map(P.authors.map((a) => [a.id, a]));

test("tệp chức danh: chỉ id -> chức danh hợp lệ, không trường cá nhân", () => {
  assert.deepEqual(Object.keys(T).sort(), ["by", "meta"]);
  assert.deepEqual(Object.keys(T.meta).sort(), ["fetched", "source", "status", "units"]);
  assert.match(T.meta.status, /chưa xác thực/); assert.match(T.meta.status, /không tính vào PRO-SCORE1000™/);
  const text = rd("public/data/sti-titles.json");
  assert.ok(!/cccd|maDinhDanh|gioiTinh|CB\.\d|hoVaTen|coQuan/i.test(text), "không được có trường cá nhân");
  const ids = Object.keys(T.by); assert.ok(ids.length > 0);
  for (const [id, v] of Object.entries(T.by)) { assert.match(id, /^A\d+$/); assert.match(v, VALID_TITLE); }
});

test("chỉ hồ sơ thật, không suspect, thuộc đơn vị được bật, hiện đang công tác", () => {
  const all = T.meta.units === "all";
  assert.ok(all || JSON.stringify(T.meta.units) === JSON.stringify(ENABLED_UNITS), "units phải là \"all\" hoặc danh sách ENABLED_UNITS");
  const risky = new Set([...JSON.parse(rd("data/merge-risk.json")).profiles.map((p) => p.id), ...JSON.parse(rd("data/split-candidates.json")).flatMap((x) => [x.a, x.b]), ...JSON.parse(rd("data/split-hold.json")).flatMap((x) => x.pair)]);
  const inst = new Set(P.institutions.map((i) => i.id));
  for (const id of Object.keys(T.by)) {
    const a = au.get(id); assert.ok(a, `mã lạ: ${id}`);
    assert.equal(profileProblem(a, risky), null, `${id} không đạt điều kiện hồ sơ sạch`);
    assert.ok(a.institutions.some((u) => inst.has(u) && (all || ENABLED_UNITS.includes(u)) && !(a.instPast ?? []).includes(u)), `${id} không thuộc đơn vị được bật`);
  }
});

test("không đụng PRO-SCORE/hạng: dựng chức danh không ghi vào profind.json, và mã giao diện không đọc điểm", () => {
  assert.ok(!("stiTitle" in P.authors[0]) && !JSON.stringify(P.meta).includes("sti-titles"));
  const ui = rd("src/StiTitle.tsx"); assert.ok(!/proScore|\.pro\b|rankScore/.test(ui));
  assert.match(rd("package.json"), /"d:sti-titles": "node scripts\/build-sti-titles\.mjs"/);
  assert.ok(!/sti-titles/.test(JSON.parse(rd("package.json")).scripts.build));
});

test("chức danh: học hàm + học vị hợp lệ, bỏ bằng cấp khác", () => {
  assert.equal(titleOf("PGS", "TS"), "PGS.TS"); assert.equal(titleOf("GS", "TSKH"), "GS.TSKH"); assert.equal(titleOf("", "ThS"), "ThS");
  assert.equal(titleOf("PGS", ""), "PGS"); assert.equal(titleOf("", "CN"), ""); assert.equal(titleOf("", "KS"), ""); assert.equal(titleOf("", ""), "");
});

test("tên: bỏ danh xưng, xoay vòng; cơ quan: khớp chắc đúng toàn chuỗi hoặc đơn vị con kèm đơn vị mẹ", () => {
  assert.equal(keyOf("PGS.TS. Nguyễn Văn An"), keyOf("An Nguyen Van"));
  assert.equal(stripTitles("TS Lê Minh Quý"), "Lê Minh Quý");
  assert.equal(orgKey("Đại học Cần Thơ, Bộ GD&ĐT"), "dai hoc can tho");
  const m = buildOrgMap(P.institutions, ENABLED_UNITS);
  assert.equal(orgUnitOf("Trường Đại học Cần Thơ", m), "ctu");
  assert.equal(orgUnitOf("Trường Điện - Điện tử, Đại học Bách khoa Hà Nội", m), "hust");
  assert.equal(orgUnitOf("Trường Đại học Y Dược Cần Thơ", m), "ctump");
  assert.equal(orgUnitOf("Trường Đại học Nam Cần Thơ", m), null);
  assert.equal(orgUnitOf("Bệnh viện Đại học Y Hà Nội", m), null);
  assert.equal(orgKey("Trường Đại học Sư phạm Kỹ thuật Thành phố Hồ Chí Minh"), orgKey("Trường đại học sư phạm kỹ thuật TP. Hồ Chí Minh"));
  assert.equal(orgUnitOf("Trường Đại học FPT Cần Thơ", m), null);
});

test("lĩnh vực và hồ sơ lẫn nhiều người", () => {
  assert.ok(compatDisciplines(["30211"]).has("y-hoc")); assert.ok(!compatDisciplines(["30211"]).has("toan-hoc"));
  assert.equal(compatDisciplines(["Hóa học hữu cơ"]).size, 0, "mã chữ không dùng");
  assert.ok(coherent(["y-hoc", "duoc", "sinh-hoc"])); assert.ok(!coherent(["y-hoc", "luat"]));
  const risky = new Set(["X"]);
  assert.equal(profileProblem({ id: "A1", suspect: true }, risky), "suspect");
  assert.equal(profileProblem({ id: "X" }, risky), "nghi-gop-tach");
  assert.equal(profileProblem({ id: "A1", worksCount: 400 }, risky), "nhieu-cong-trinh");
});

test("quyết định khớp: duy nhất hai phía, cơ quan, đơn vị, dấu, lĩnh vực", () => {
  const a = { id: "A1", name: "Trần Danh Cường", institutions: ["hmu"], instPast: [], disciplines: ["y-hoc"], discShares: { "y-hoc": 100 }, worksCount: 7 };
  const row = { name: "Trần Danh Cường", hocHam: "GS", hocVi: "TS", codes: ["30202"] };
  const base = { a, risky: new Set(), unit: "hmu", stiRows: [row], profRows: 1, common: false, nameVariants: 1, orgUnit: "hmu" };
  assert.equal(decide(base), "GS.TS");
  assert.deepEqual(decide({ ...base, stiRows: [row, row] }), { skip: "trung-ten-sti" });
  assert.deepEqual(decide({ ...base, profRows: 2 }), { skip: "trung-ten-profind" });
  assert.deepEqual(decide({ ...base, orgUnit: null }), { skip: "co-quan-lech" });
  assert.deepEqual(decide({ ...base, stiRows: [{ ...row, name: "Trần Danh Cương" }] }), { skip: "dau-khac" }, "Cường khác Cương");
  assert.deepEqual(decide({ ...base, a: { ...a, name: "Tran Danh Cuong" }, nameVariants: 2 }), { skip: "dau-khong-ro" });
  assert.deepEqual(decide({ ...base, stiRows: [{ ...row, codes: ["50202"] }] }), { skip: "nganh-lech" });
  assert.deepEqual(decide({ ...base, stiRows: [{ ...row, codes: [] }] }), { skip: "khong-co-linh-vuc" });
  assert.deepEqual(decide({ ...base, common: true }), { skip: "ten-pho-bien" });
  assert.deepEqual(decide({ ...base, a: { ...a, suspect: true } }), { skip: "suspect" });
  assert.deepEqual(decide({ ...base, stiRows: [{ ...row, hocHam: "", hocVi: "KS" }] }), { skip: "khong-co-chuc-danh" });
});
