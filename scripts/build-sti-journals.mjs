// Danh sách tạp chí Việt Nam trên cổng STI.gov.vn (Hệ thống thông tin quốc gia về KH,CN&ĐMST) để đối chiếu ISSN và hiện chỉ số tham khảo.
//   NODE_USE_ENV_PROXY=1 node scripts/build-sti-journals.mjs [--delay 400]
// Nguồn: API công khai không cần đăng nhập, robots.txt cho phép (POST /api/public/journals/search, GET /api/public/journals/{id}).
// STI chưa công bố điều khoản tái sử dụng dữ liệu: chỉ lấy dữ liệu CẤP TẠP CHÍ, hiển thị là chỉ số tham khảo kèm ghi nguồn, không dùng để chấm điểm hay xếp hạng.
// Gọi tuần tự, nghỉ giữa các yêu cầu (~450 yêu cầu). KHÔNG lấy thông tin liên hệ (email, điện thoại, tên người) của tạp chí.
// Ghi: data/sti-journals.json (đầy đủ trường cấp tạp chí) và public/data/sti-journals.json (gọn: ISSN -> chỉ số, tải khi cần).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { arg } from "./lib/cli.mjs";

const API = "https://sti.gov.vn/api/public", DELAY = Number(arg("delay", 400)), UA = "ProFind-STI-check (+https://profind.isavn.edu.vn)";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ISSN = /^\d{4}-\d{3}[\dX]$/;
/** Chuẩn hóa ISSN; trả về null nếu không đúng dạng NNNN-NNNN. */
export const normIssn = (s) => { const x = String(s ?? "").trim().toUpperCase().replace(/^(E?ISSN)[:\s]*/, ""); const m = x.replace(/[^\dX]/g, ""); const y = m.length === 8 ? `${m.slice(0, 4)}-${m.slice(4)}` : x; return ISSN.test(y) && y !== "0000-0000" ? y : null; };

async function call(path, init) {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(API + path, { ...init, headers: { "content-type": "application/json", "user-agent": UA, ...(init?.headers ?? {}) } });
      if (r.ok) return await r.json();
      if (r.status === 429 || r.status >= 500) { await wait(3000 * (k + 1)); continue; }
      throw new Error(`HTTP ${r.status} ${path}`);
    } catch (e) { if (k === 2) throw e; await wait(3000 * (k + 1)); }
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const list = [];
  for (let page = 1; ; page++) {
    const r = await call(`/journals/search?page=${page}&size=100&orderBy=impactFactor&sortDirection=desc`, { method: "POST", body: JSON.stringify({ isVerified: true }) });
    list.push(...(r.content ?? []));
    console.log(`danh sách: trang ${page}, ${list.length}/${r.totalElements}`);
    if (r.last || !(r.content ?? []).length || list.length >= r.totalElements) break;
    await wait(DELAY);
  }
  const seen = new Set(), journals = [];
  for (const s of list) {
    if (seen.has(s.id) || s.isVerified === false) continue; seen.add(s.id);
    await wait(DELAY);
    const d = await call(`/journals/${s.id}`);
    const by = Array.isArray(d.tongSoLuotTrichDanTheoNam) ? d.tongSoLuotTrichDanTheoNam.filter((x) => x && Number.isFinite(Number(x.nam))) : [];
    const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
    journals.push({
      id: d.id, name: d.tenTapChi ?? s.tenTapChi ?? "", nameEn: d.tenTapChiTA || null, publisher: d.nhaXuatBan || null,
      issn: normIssn(d.inISSN), eissn: normIssn(d.onlineISSN) === normIssn(d.inISSN) ? null : normIssn(d.onlineISSN),
      impactFactor: num(d.impactFactor), citeScore: num(d.citeScore), points: num(d.diemTC),
      pubs5y: num(d.soBaiBaoDaXuatBan5Nam), pubs2y: num(d.soBaiBao2NamGanDay), cited2y: num(d.soBaiBaoDuocTrichDan2NamGanDay),
      cites5y: by.length ? by.reduce((t, x) => t + (Number(x.tongSoLuotTrichDan) || 0), 0) : null,
      citesByYear: Object.fromEntries(by.map((x) => [String(x.nam), Number(x.tongSoLuotTrichDan) || 0]).sort((a, b) => Number(a[0]) - Number(b[0]))),
    });
    if (journals.length % 50 === 0) console.log(`chi tiết: ${journals.length}/${list.length}`);
  }
  journals.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  // Đối chiếu với danh mục của ProFind: danh mục HĐGSNN (data/journals.json), danh sách nguồn Scopus và ISSN xuất hiện trong công trình đã nạp.
  const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
  const cat = new Set(Object.keys(rd("data/journals.json").byIssn));
  const scopus = new Set(Object.keys(rd("data/scopus-sources.json").sources).map((k) => `${k.slice(0, 4)}-${k.slice(4)}`));
  const inCat = (j) => [j.issn, j.eissn].filter(Boolean).some((i) => cat.has(i));
  const inScopus = (j) => [j.issn, j.eissn].filter(Boolean).some((i) => scopus.has(i));
  const noIssn = journals.filter((j) => !j.issn && !j.eissn);
  const compare = {
    total: journals.length, withIssn: journals.length - noIssn.length, noIssn: noIssn.length,
    inCatalogue: journals.filter(inCat).length, inScopus: journals.filter(inScopus).length,
    missing: journals.filter((j) => (j.issn || j.eissn) && !inCat(j) && !inScopus(j)).length,
  };
  const out = { meta: { source: "STI.gov.vn (Hệ thống thông tin quốc gia về KH,CN&ĐMST), API công khai", endpoint: "POST /api/public/journals/search + GET /api/public/journals/{id}", fetched: new Date().toISOString().slice(0, 10), count: journals.length, licence: "Chưa có điều khoản tái sử dụng; đang xin phép. Chỉ hiển thị tham khảo kèm ghi nguồn, không dùng chấm điểm hay xếp hạng.", citesYears: "tổng lượt trích dẫn theo năm trong tối đa 5 năm gần nhất STI trả về", compare }, journals };
  writeFileSync("data/sti-journals.json", JSON.stringify(out, null, 1) + "\n");
  // Bản gọn cho giao diện: ISSN (cả ISSN in và điện tử) -> [số công bố 5 năm, số trích dẫn 5 năm, IF, CiteScore, mã STI]
  const by = {};
  for (const j of journals) for (const i of [j.issn, j.eissn]) if (i) by[i] = [j.pubs5y, j.cites5y, j.impactFactor, j.citeScore, j.id];
  writeFileSync("public/data/sti-journals.json", JSON.stringify({ meta: { fetched: out.meta.fetched, count: journals.length }, by }));
  console.log("so sánh:", compare);
}
