import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Hạng Q trong ProFind là SJR của SCImago (dữ liệu Scopus), không phải CiteScore: nhãn phải ghi đúng để khỏi gây nhầm.
const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("nhãn hạng Q ghi SJR (SCImago), không ghi 'Scopus Qx'", () => {
  const app = rd("src/App.tsx");
  assert.match(app, /title=\{`SJR \$\{w\.quartile\} \(SCImago/);
  assert.doesNotMatch(app, /title=\{`Scopus \$\{w\.quartile\}`\}/);
  assert.match(rd("src/ProScore.tsx"), /không phải hạng CiteScore/);
  assert.match(rd("src/ProScore.tsx"), /not the CiteScore quartile/);
});
