import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Mốc huy hiệu hạng PRO-SCORE1000™ phải khớp giữa pipeline (scripts/pro-score.mjs) và giao diện (src/Badge.tsx).
const STEPS = [10, 50, 100, 500, 1000, 2000, 5000];
const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("giao diện và pipeline dùng cùng các mốc huy hiệu", () => {
  const badge = rd("src/Badge.tsx"), pro = rd("scripts/pro-score.mjs");
  for (const n of STEPS) {
    assert.match(badge, new RegExp(`rank <= ${n} \\? "t${n}"`), `Badge.tsx thiếu mốc ${n}`);
    assert.match(pro, new RegExp(`r <= ${n} \\? "t${n}"`), `pro-score.mjs thiếu mốc ${n}`);
    assert.match(pro, new RegExp(`r <= ${n} \\? ${n}`), `pro-score.mjs (độ vững) thiếu mốc ${n}`);
  }
  assert.match(badge, new RegExp(`TIERS: Tier\\[\\] = \\[${STEPS.map((n) => `"t${n}"`).join(", ")}\\]`));
});

test("mỗi mốc có tên tiếng Việt và tiếng Anh", () => {
  const i18n = rd("src/i18n.ts");
  for (const n of STEPS) assert.equal((i18n.match(new RegExp(`tier_t${n}:`, "g")) || []).length, 2, `tier_t${n} phải có ở vi và en`);
});
