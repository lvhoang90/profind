import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Quy tắc toàn trang: mỗi trang kết quả tối đa 25 mục, xem tiếp bằng chuyển trang (src/Pager.tsx).
const rd = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("kích thước trang là 25 và dùng chung một bộ chuyển trang", () => {
  assert.match(rd("src/Pager.tsx"), /export const PAGE = 25;/);
  for (const f of ["src/App.tsx", "src/Leaderboard.tsx", "src/Business.tsx"]) assert.match(rd(f), /import \{ Pager, PAGE \} from "\.\/Pager"/, `${f} phải dùng Pager chung`);
  assert.match(rd("src/wsearch.ts"), /size = 25/);
});

test("không còn danh sách công khai kiểu 'xem thêm' tự do", () => {
  assert.doesNotMatch(rd("src/Business.tsx"), /const PAGE = \d+/);
  assert.doesNotMatch(rd("src/App.tsx"), /works\.more\(|setExtraAll/);
});
