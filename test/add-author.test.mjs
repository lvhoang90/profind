// scripts/lib/add-author.mjs: kiểm tra đầu vào và ghi cấu hình (không gọi mạng).
import assert from "node:assert/strict";
import { scholarId, addManual, setScholar, ID_RE, ORCID_RE } from "../scripts/lib/add-author.mjs";

assert.equal(scholarId("pvflg0MAAAAJ"), "pvflg0MAAAAJ");
assert.equal(scholarId("https://scholar.google.com/citations?user=pvflg0MAAAAJ&hl=en"), "pvflg0MAAAAJ");
assert.equal(scholarId("https://scholar.google.com/citations?hl=en&user=pvflg0MAAAAJ"), "pvflg0MAAAAJ");
assert.equal(scholarId("abc"), null); assert.equal(scholarId(""), null); assert.equal(scholarId("<script>alert(1)</script>"), null);
assert.ok(ID_RE.test("A5021889240")); assert.ok(!ID_RE.test("5021889240")); assert.ok(!ID_RE.test("A5021889240; rm"));
assert.ok(ORCID_RE.test("0000-0003-2787-1618")); assert.ok(ORCID_RE.test("0000-0002-1825-009X")); assert.ok(!ORCID_RE.test("0000-0003-2787"));

const list = [{ id: "A5000000001", unit: "hnue" }];
let r = addManual(list, "A5021889240", "ueh"); assert.equal(r.added, true); assert.equal(list.length, 2);
r = addManual(list, "A5021889240", "ueh"); assert.equal(r.added, false); assert.equal(list.length, 2, "chạy lại không nhân đôi");
assert.throws(() => addManual(list, "A5021889240", "hnue"), /đã có trong manual-authors/);
assert.throws(() => addManual(list, "bad", "ueh"), /không hợp lệ/);

const map = { _note: "giữ nguyên", A5000000001: { id: "AAAAAAAAAAAA", citations: 10, asOf: "2026-10-01", by: "x" } };
setScholar(map, "A5021889240", "pvflg0MAAAAJ", { by: "tác giả", citations: 357, asOf: "2026-10-13" });
assert.deepEqual(map.A5021889240, { id: "pvflg0MAAAAJ", citations: 357, asOf: "2026-10-13", by: "tác giả" }); assert.equal(map._note, "giữ nguyên");
assert.throws(() => setScholar(map, "A5021889240", "ZZZZZZZZZZZZ", {}), /--force/);
setScholar(map, "A5021889240", "ZZZZZZZZZZZZ", { force: true, by: "đổi" }); assert.equal(map.A5021889240.id, "ZZZZZZZZZZZZ");
console.log("OK add-author");
