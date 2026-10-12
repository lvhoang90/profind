// Kiểm tra tự động khi xác thực hồ sơ (api/_claim.js runChecks): ORCID của hồ sơ dùng để so tên khi người gửi chưa khai, tên miền email so với website đơn vị. Chạy: node test/claim-checks.test.mjs
import assert from "node:assert/strict";
import { runChecks } from "../api/_claim.js";
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const real = globalThis.fetch;
const mock = ({ oaOrcid = "0000-0002-6590-046X", orcName = ["Le Minh Tu", "Phan"], home = "https://www.pctu.edu.vn/" } = {}) => {
  globalThis.fetch = async (url) => {
    const u = String(url), j = (x) => ({ ok: true, json: async () => x });
    if (u.includes("/authors/")) return j({ id: "https://openalex.org/A1", display_name: "Le Minh Tu Phan", orcid: oaOrcid ? `https://orcid.org/${oaOrcid}` : null, last_known_institutions: [{ id: "https://openalex.org/I9", display_name: "Phan Chau Trinh University" }], works_count: 5, cited_by_count: 1 });
    if (u.includes("/institutions/")) return j({ homepage_url: home });
    if (u.includes("pub.orcid.org")) return j({ name: { "given-names": { value: orcName[0] }, "family-name": { value: orcName[1] } } });
    return { ok: false, json: async () => null };
  };
};
const run = (o) => runChecks({ authorId: "A1", name: "Le Minh Tu Phan", email: "tu.plm@pctu.edu.vn", orcid: "", ...o });
const get = (r, k) => r.checks.find((c) => c.k === k);
try {
  // 1. Người gửi chưa khai ORCID, hồ sơ có ORCID, tên khớp: tín hiệu tham khảo, không tự duyệt
  mock(); let r = await run({});
  ok(get(r, "orcidName").ok === true && /chưa khai ORCID/.test(get(r, "orcidName").detail), "so tên với ORCID của hồ sơ");
  ok(r.auto === false, "chưa khai ORCID thì không tự duyệt");
  ok(get(r, "domain").ok === true && /khớp website/.test(get(r, "domain").detail), "tên miền khớp website đơn vị");
  // 2. Tên ORCID của hồ sơ không khớp: chỉ cảnh báo, không ❌
  mock({ orcName: ["Tran Van", "Binh"] }); r = await run({});
  ok(get(r, "orcidName").ok === null && /không khớp/.test(get(r, "orcidName").detail), "tên không khớp chỉ cảnh báo");
  // 3. Hồ sơ không có ORCID
  mock({ oaOrcid: null }); r = await run({});
  ok(get(r, "orcidName").ok === null && /Không có ORCID/.test(get(r, "orcidName").detail), "không có ORCID nào");
  // 4. Tên miền không khớp website: cảnh báo kèm website
  mock({ home: "https://hcmue.edu.vn" }); r = await run({});
  ok(get(r, "domain").ok === null && /website đơn vị: hcmue\.edu\.vn/.test(get(r, "domain").detail), "tên miền không khớp");
  // 5. Tên miền phụ (student.pctu.edu.vn) vẫn khớp
  mock(); r = await run({ email: "a@student.pctu.edu.vn" });
  ok(get(r, "domain").ok === true, "tên miền phụ khớp");
  // 6. Người gửi khai ORCID trùng hồ sơ: vẫn tự duyệt như trước
  mock(); r = await run({ orcid: "0000-0002-6590-046X" });
  ok(get(r, "orcidMatch").ok === true && r.auto === true, "khai ORCID trùng thì tự duyệt");
} finally { globalThis.fetch = real; }
console.log(`claim-checks: ${n} kiểm tra đạt`);
