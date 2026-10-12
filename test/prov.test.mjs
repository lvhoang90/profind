// Kiểm tra trường prov (độ tin cậy hồ sơ) trong public/data/profind.json sau khi dựng chỉ mục.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const d = JSON.parse(readFileSync("public/data/profind.json", "utf8")), by = new Map(d.authors.map((a) => [a.id, a]));
for (const a of d.authors) {
  assert.ok(["works", "weak", "set", "none"].includes(a.prov?.instEv), `${a.id}: instEv`);
  const f = a.prov.fix; if (f) assert.ok(f.excl || f.assign || f.merged || f.units, `${a.id}: fix rỗng phải bỏ`);
  if (!a.institutions.length && a.prov.instEv !== "set") assert.equal(a.prov.instEv, "none", a.id);
}
const n = by.get("A5050246251"); assert.equal(n.prov.instEv, "set"); assert.equal(n.prov.fix.units, true);
assert.ok(by.get("A5008082871").prov.fix.excl > 0);
assert.ok(d.authors.some((a) => !a.prov.fix), "phải có hồ sơ không đính chính");
assert.ok(d.authors.filter((a) => !a.prov.fix).every((a) => a.prov.instEv !== "set"));
console.log("prov hợp lệ:", d.authors.length, "hồ sơ");
