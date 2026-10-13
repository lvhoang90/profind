// Tải danh sách hồ sơ nhà khoa học công khai từ cổng STI.gov.vn (POST /api/public/v2/profiles/search), tuần tự, nghỉ giữa các yêu cầu.
// CHỈ chọn tường minh các trường cần để khớp chức danh: họ tên, học hàm, học vị, lĩnh vực, cơ quan, trạng thái. KHÔNG lấy mã cán bộ, giới tính hay trường cá nhân khác.
// Dữ liệu thô chỉ ghi vào thư mục tạm NGOÀI repo (--raw <tệp>), không commit.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const API = "https://sti.gov.vn/api/public/v2/profiles/search";
const UA = "ProFind-STI-titles (+https://profind.isavn.edu.vn)";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function fetchProfiles(rawFile, delay = 600, log = console.log) {
  let st = existsSync(rawFile) ? JSON.parse(readFileSync(rawFile, "utf8")) : { fetched: new Date().toISOString().slice(0, 10), nextPage: 1, totalPages: null, rows: [] };
  if (st.done) return st;
  for (let page = st.nextPage; !st.totalPages || page <= st.totalPages; page++) {
    let r;
    for (let k = 0; k < 4; k++) {
      try {
        const res = await fetch(`${API}?page=${page}&size=100`, { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: "{}" });
        if (res.ok) { r = await res.json(); break; }
        if (res.status === 429 || res.status >= 500) await wait(5000 * (k + 1)); else throw new Error(`HTTP ${res.status}`);
      } catch (e) { if (k === 3) throw e; await wait(5000 * (k + 1)); }
    }
    st.totalPages = Math.ceil(r.totalElements / 100);
    for (const c of r.content ?? []) st.rows.push([c.hoVaTen ?? "", c.hocHam ?? "", c.hocHamLabel ?? "", c.hocVi ?? "", c.hocViLabel ?? "", c.linhVucNC ?? [], c.coQuanCongTac ?? "", c.status ?? null, !!c.isUpdated]);
    st.nextPage = page + 1;
    if (page % 10 === 0) { writeFileSync(rawFile, JSON.stringify(st)); log(`trang ${page}/${st.totalPages}: ${st.rows.length} hồ sơ`); }
    await wait(delay);
  }
  st.done = true; writeFileSync(rawFile, JSON.stringify(st)); log(`xong: ${st.rows.length} hồ sơ`);
  return st;
}
if (process.argv[1]?.endsWith("sti-profiles.mjs")) await fetchProfiles(process.argv[2], Number(process.argv[3] ?? 600));
