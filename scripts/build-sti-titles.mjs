// Bổ sung CHỨC DANH (học hàm GS/PGS; học vị TS/TSKH/ThS) từ hồ sơ nhà khoa học công khai của cổng STI.gov.vn cho hồ sơ ProFind KHỚP CHẮC.
//   NODE_USE_ENV_PROXY=1 node scripts/build-sti-titles.mjs [--fetch] [--raw <tệp>] [--delay 600] [--units hmu,hust,...]
//                                                           [--sample 100 --seed 7 --sample-out <tệp>]
// Quyết định của quản trị viên khi STI chưa trả lời thư xin phép (xem data/sti-titles-rules.md và docs/STI-DOI-CHIEU.md mục 4).
// Chỉ ghi chức danh vào public/data/sti-titles.json (khóa theo mã tác giả ProFind). KHÔNG ghi họ tên, mã cán bộ, giới tính, cơ quan thô.
// KHÔNG đổi đơn vị, KHÔNG đưa vào PRO-SCORE1000™ hay hạng, KHÔNG tạo hồ sơ mới. Dữ liệu thô tải về (--raw) nằm ở thư mục tạm ngoài repo, không commit; xoá khi xong.
// Quy tắc khớp (độ chính xác hơn độ phủ):
//  (a) họ tên chuẩn hóa (bỏ dấu, bỏ danh xưng, xoay vòng thứ tự tiếng) duy nhất ở CẢ HAI phía trong cùng đơn vị; tên ProFind có dấu thì dấu phải khớp (Cường ≠ Cương),
//      tên không dấu thì phía STI chỉ được có một cách viết có dấu; tên phổ biến (>= COMMON hồ sơ cùng tên toàn ProFind) bị loại;
//  (b) cơ quan STI ánh xạ CHẮC vào đơn vị ProFind (khớp đúng toàn chuỗi với tên/viết tắt/tên cũ của đơn vị sau khi bỏ hậu tố "Bộ GD&ĐT"...); cơ quan chỉ khớp lỏng thì không dùng để khớp nhưng được dùng để phát hiện người trùng tên;
//  (c) lĩnh vực nghiên cứu STI (mã phân loại) tương thích ngành của hồ sơ ProFind;
//  (d) hồ sơ ProFind không suspect, không nằm trong danh sách rủi ro gộp nhầm/tách đôi, không dấu hiệu lẫn nhiều người (nhiều công trình bất thường, nhiều ngành, nhiều đơn vị hiện tại);
//  (e) hồ sơ ProFind có đơn vị hiện tại trùng đơn vị của cơ quan STI (không mâu thuẫn).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { arg, tmpFile } from "./lib/cli.mjs";
import { fetchProfiles } from "./lib/sti-profiles.mjs";
import { fold, nameKey, dKey, hasMarks, usableName } from "./pilot-sti-pubs.mjs";
import { readWorks } from "./_works-io.mjs";

/** Đơn vị được BẬT hiển thị ở lần triển khai đầu (5 trường lớn, đơn vị đơn lẻ không phải hệ thống nhiều thành viên). Chỉ mở rộng khi mẫu kiểm tay mới đạt >= 95%. */
export const ENABLED_UNITS = ["hmu", "hust", "ctu", "yds", "ctump"];
/** Tên phổ biến: từ ngần này hồ sơ cùng tên (xoay vòng) trong toàn ProFind trở lên thì không khớp. */
export const COMMON = 5;
/** Ngưỡng nghi lẫn nhiều người. */
export const MAX_WORKS = 300, MAX_CUR_INST = 3;
/** Cụm ngành "liền mạch": các ngành của hồ sơ phải nằm trọn trong một cụm thì mới coi là một người (nhiều ngành rời rạc là dấu hiệu lẫn nhiều người). */
export const CLUSTERS = [
  ["y-hoc", "duoc", "sinh-hoc", "hoa-thuc-pham", "chan-nuoi", "nong-lam", "tam-ly"],
  ["cntt", "dien-tu", "co-khi", "co-hoc", "xay-dung", "giao-thong", "luyen-kim", "thuy-loi", "vat-ly", "toan-hoc", "hoa-thuc-pham", "trai-dat-mo", "kinh-te"],
  ["kinh-te", "luat", "giao-duc", "tam-ly", "triet-xhh", "van-hoa", "su-hoc", "ngon-ngu", "van-hoc", "an-ninh", "quan-su", "toan-hoc", "cntt"],
];
export const coherent = (ds) => (ds ?? []).length <= 1 || CLUSTERS.some((c) => ds.every((d) => c.includes(d)));

/** Bỏ danh xưng ở đầu tên (GS.TS, PGS, TS, ThS, BS, ...): mỗi danh xưng là một tiếng, tối đa 3 tiếng đầu. */
const TITLE_TOK = new Set(["gs", "pgs", "ts", "tskh", "ths", "thskh", "bs", "bsck", "bsckii", "bsckI", "cn", "ks", "dr", "prof", "mr", "ms", "mrs", "phd", "ncs", "ds", "gv", "gvc", "gvcc"].map((x) => x.toLowerCase()));
export function stripTitles(name) {
  const parts = String(name ?? "").replace(/[.,;]/g, " ").split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < 3 && i < parts.length - 2 && TITLE_TOK.has(fold(parts[i]))) i++;
  return parts.slice(i).join(" ");
}
export const keyOf = (name) => nameKey(stripTitles(name));
export const dKeyOf = (name) => dKey(stripTitles(name));

/** Chức danh hiển thị: học hàm (GS|PGS) + học vị (TS|TSKH|ThS) nối bằng dấu chấm; rỗng nếu không có gì đủ điều kiện. */
export function titleOf(hocHam, hocVi) {
  const h = ["GS", "PGS"].includes(hocHam) ? hocHam : "", v = ["TS", "TSKH", "ThS"].includes(hocVi) ? hocVi : "";
  return [h, v].filter(Boolean).join(".");
}
export const VALID_TITLE = /^(GS|PGS)(\.(TS|TSKH|ThS))?$|^(TS|TSKH|ThS)$/;

// ---- (b) cơ quan ----
const NOISE = [/\(.*?\)/g, /[,;-]\s*b[oộ]\s+gi[aáà]o\s+d[uụ]c\s+v[aà]\s+[dđ][aàạ]o\s+t[aạ]o.*$/i, /[,;-]\s*b[oộ]\s+gd\s*(&|va)?\s*[dđ]t.*$/i, /[,;-]\s*b[oộ]\s+y\s+t[eế].*$/i];
/** Chuỗi cơ quan đã bỏ ngoặc, hậu tố bộ chủ quản, viết thường không dấu. */
export function orgKey(s) {
  let x = String(s ?? "");
  for (const re of NOISE) x = x.replace(re, " ");
  x = fold(x).replace(/\b(bo gd dt|bo giao duc va dao tao|bo y te)\b.*$/, " ");
  return x.replace(/\s+/g, " ").trim();
}
/** Biến thể của một tên đơn vị (khớp CHẮC phải bằng đúng toàn chuỗi một biến thể). */
function variants(name) {
  const k = orgKey(name); if (!k) return [];
  const out = new Set([k, k.replace(/^truong /, "")]);
  if (/^dai hoc /.test(k)) out.add(`truong ${k}`);
  return [...out];
}
/** Bảng biệt danh bổ sung cho từng đơn vị bật (tên cũ, viết tắt, tên có thêm địa danh). Mỗi chuỗi sẽ qua orgKey khi so khớp. */
export const EXTRA_ALIASES = {
  hmu: ["HMU", "Đại học Y Hà Nội", "Trường Đại học Y Hà Nội", "Hanoi Medical University", "Đại học Y Hà Nội - Hanoi Medical University"],
  hust: ["HUST", "Đại học Bách khoa Hà Nội", "Trường Đại học Bách khoa Hà Nội", "Đại học Bách Khoa Hà Nội", "Hanoi University of Science and Technology", "Viện Đại học Bách khoa Hà Nội"],
  ctu: ["CTU", "Đại học Cần Thơ", "Trường Đại học Cần Thơ", "Can Tho University"],
  yds: ["Đại học Y Dược Thành phố Hồ Chí Minh", "Đại học Y Dược TP. Hồ Chí Minh", "Đại học Y Dược TP.HCM", "Đại học Y Dược TP Hồ Chí Minh", "Đại học Y dược Thành phố Hồ Chí Minh", "University of Medicine and Pharmacy at Ho Chi Minh City", "UMP"],
  ctump: ["CTUMP", "Trường Đại học Y Dược Cần Thơ", "Đại học Y Dược Cần Thơ", "Can Tho University of Medicine and Pharmacy"],
};
/** Bản đồ cơ quan CHẮC: khóa chuỗi (orgKey) -> mã đơn vị. Một khóa trỏ tới hai đơn vị thì bỏ (mơ hồ). */
export function buildOrgMap(institutions, units) {
  const m = new Map();
  for (const id of units) {
    const i = institutions.find((x) => x.id === id); if (!i) throw new Error(`Không thấy đơn vị ${id}`);
    for (const n of [i.name, i.en, i.abbr, ...(EXTRA_ALIASES[id] ?? [])].filter(Boolean)) for (const k of variants(n)) { if (k.length < 3) continue; if (m.has(k) && m.get(k) !== id) m.set(k, null); else if (!m.has(k)) m.set(k, id); }
  }
  for (const [k, v] of [...m]) if (v === null) m.delete(k);
  return m;
}
/** Ánh xạ CHẮC một chuỗi cơ quan STI vào đơn vị: đúng toàn chuỗi, hoặc "<Trường|Viện|Khoa|Phòng|Trung tâm|Bộ môn ...> - / , <đơn vị>" (đơn vị con ghi kèm đơn vị mẹ ở cuối). */
export function orgUnitOf(org, orgMap) {
  const k = orgKey(org); if (!k) return null;
  if (orgMap.has(k)) return orgMap.get(k);
  const segs = String(org).replace(NOISE[0], " ").split(/\s+[-–]\s+|\s*,\s*/).map((x) => orgKey(x)).filter(Boolean);
  if (segs.length >= 2 && /^(truong|vien|khoa|phong|trung tam|bo mon) /.test(segs[0]) && !/benh vien/.test(segs[0])) return orgMap.get(segs[segs.length - 1]) ?? null;
  return null;
}
/** Khớp lỏng (để phát hiện người trùng tên): chuỗi cơ quan có chứa một biến thể dài (>= 8 ký tự) của đơn vị. Trả về tập mã đơn vị. */
export function looseUnits(org, units, institutions) {
  const f = ` ${orgKey(org)} `, out = new Set();
  if (!f.trim()) return out;
  for (const id of units) {
    const i = institutions.find((x) => x.id === id);
    for (const n of [i.name, i.en, i.abbr, ...(EXTRA_ALIASES[id] ?? [])].filter(Boolean)) for (const k of variants(n)) if ((k.length >= 8 || k === fold(i.abbr ?? "")) && f.includes(` ${k} `)) out.add(id);
  }
  return out;
}

// ---- (c) lĩnh vực ----
const NAT = ["toan-hoc", "vat-ly", "hoa-thuc-pham", "sinh-hoc", "trai-dat-mo", "cntt", "co-hoc"], ENG = ["xay-dung", "co-khi", "dien-tu", "co-hoc", "giao-thong", "luyen-kim", "thuy-loi", "cntt", "hoa-thuc-pham", "vat-ly"],
  MED = ["y-hoc", "duoc", "sinh-hoc"], AGR = ["nong-lam", "chan-nuoi", "sinh-hoc", "hoa-thuc-pham", "thuy-loi"], SOC = ["kinh-te", "luat", "giao-duc", "tam-ly", "triet-xhh", "van-hoa", "su-hoc", "ngon-ngu", "an-ninh", "quan-su"], HUM = ["su-hoc", "van-hoa", "van-hoc", "ngon-ngu", "triet-xhh", "giao-duc"];
/** Mã phân loại lĩnh vực nghiên cứu của STI (chữ số đầu = lĩnh vực lớn, ba chữ số đầu = nhóm ngành) -> các ngành ProFind tương thích. Mã chữ (tên ngành) không dùng. */
export const FIELD_COMPAT = {
  1: NAT, 2: ENG, 3: MED, 4: AGR, 5: SOC, 6: HUM,
  101: ["toan-hoc", "cntt", "co-hoc", "vat-ly"], 102: ["cntt", "toan-hoc", "dien-tu"], 103: ["vat-ly", "co-hoc", "dien-tu", "toan-hoc"], 104: ["hoa-thuc-pham", "vat-ly", "duoc", "luyen-kim", "sinh-hoc"],
  105: ["trai-dat-mo", "thuy-loi", "nong-lam", "xay-dung", "sinh-hoc", "giao-thong"], 106: ["sinh-hoc", "y-hoc", "duoc", "nong-lam", "chan-nuoi", "hoa-thuc-pham"], 107: NAT,
  201: ["xay-dung", "giao-thong", "thuy-loi", "co-hoc"], 202: ["dien-tu", "cntt", "co-khi"], 203: ["co-khi", "co-hoc", "giao-thong", "luyen-kim"], 204: ["hoa-thuc-pham", "luyen-kim", "duoc"],
  205: ["luyen-kim", "vat-ly", "hoa-thuc-pham", "xay-dung", "co-khi"], 206: ["y-hoc", "duoc", "dien-tu"], 207: ["trai-dat-mo", "thuy-loi", "nong-lam", "hoa-thuc-pham", "xay-dung"],
  208: ["sinh-hoc", "hoa-thuc-pham", "nong-lam", "y-hoc", "duoc", "chan-nuoi"], 209: ["sinh-hoc", "hoa-thuc-pham", "nong-lam", "y-hoc", "duoc", "chan-nuoi"], 210: ["vat-ly", "hoa-thuc-pham", "luyen-kim", "dien-tu", "duoc"], 211: ENG,
  301: ["y-hoc", "duoc", "sinh-hoc"], 302: ["y-hoc", "duoc"], 303: ["y-hoc", "duoc", "tam-ly"], 304: ["y-hoc", "duoc", "sinh-hoc"], 305: MED,
  401: ["nong-lam", "sinh-hoc", "thuy-loi"], 402: ["chan-nuoi", "nong-lam"], 403: ["chan-nuoi", "nong-lam", "y-hoc"], 404: ["nong-lam", "sinh-hoc", "chan-nuoi"], 405: AGR,
  501: ["tam-ly", "giao-duc", "triet-xhh"], 502: ["kinh-te", "luat", "giao-duc"], 503: ["giao-duc", "tam-ly", "ngon-ngu"], 504: ["triet-xhh", "tam-ly", "van-hoa", "su-hoc"], 505: ["luat", "an-ninh", "quan-su"],
  506: ["triet-xhh", "luat", "su-hoc", "kinh-te"], 507: ["trai-dat-mo", "kinh-te", "triet-xhh"], 508: ["van-hoa", "ngon-ngu", "triet-xhh"], 509: SOC,
  601: ["su-hoc", "van-hoa", "triet-xhh"], 602: ["ngon-ngu", "van-hoc", "giao-duc"], 603: ["triet-xhh", "van-hoa"], 604: ["van-hoa", "van-hoc"], 605: HUM,
};
/** Tập ngành ProFind tương thích với danh sách mã lĩnh vực STI; rỗng nếu không có mã số nào dùng được. */
export function compatDisciplines(codes) {
  const out = new Set();
  for (const c of codes ?? []) {
    const s = String(c).trim(); if (!/^\d+$/.test(s)) continue;
    const g = s.length >= 3 ? Number(s.slice(0, 3)) : Number(s.slice(0, 1));
    for (const d of FIELD_COMPAT[g] ?? FIELD_COMPAT[Number(s.slice(0, 1))] ?? []) out.add(d);
  }
  return out;
}

/** Ngành chính của hồ sơ: các ngành chiếm từ 30% trở lên (ngành phụ lẻ tẻ không đủ làm bằng chứng tương thích). */
export const mainDisciplines = (a) => { const ds = a.disciplines ?? [], sh = a.discShares; return sh ? ds.filter((d) => (sh[d] ?? 0) >= 30) : ds; };

/** Hồ sơ ProFind có đủ "sạch" để nhận chức danh không (điều kiện d). Trả về null nếu đạt, hoặc mã lý do loại. */
export function profileProblem(a, risky) {
  if (a.suspect) return "suspect";
  if (a.demo) return "demo";
  if (risky.has(a.id)) return "nghi-gop-tach";
  if (a.bigFlag) return "nhom-lon";
  if (a.abroadMain) return "nuoc-ngoai";
  if ((a.worksCount ?? 0) >= MAX_WORKS) return "nhieu-cong-trinh";
  if (!coherent(a.disciplines) || a.discBasis === "khac-biet") return "nhieu-nganh";
  if ((a.institutions ?? []).filter((i) => !(a.instPast ?? []).includes(i)).length > MAX_CUR_INST) return "nhieu-don-vi";
  return null;
}

/** Quyết định thuần cho một hồ sơ ProFind. ctx: { unit, sti: dòng STI duy nhất cùng tên trong đơn vị, ... }. Trả về chức danh hoặc { skip }. */
export function decide({ a, risky, unit, stiRows, profRows, common, nameVariants, orgUnit }) {
  const p = profileProblem(a, risky); if (p) return { skip: p };
  if (!usableName(stripTitles(a.name))) return { skip: "ten-ngan" };
  if (common) return { skip: "ten-pho-bien" };
  if (profRows !== 1) return { skip: "trung-ten-profind" };
  if (stiRows.length !== 1) return { skip: stiRows.length ? "trung-ten-sti" : "khong-co-sti" };
  const s = stiRows[0];
  if (orgUnit !== unit) return { skip: "co-quan-lech" };
  if (!(a.institutions ?? []).includes(unit) || (a.instPast ?? []).includes(unit)) return { skip: "don-vi-lech" };
  if (hasMarks(a.name) ? dKeyOf(a.name) !== dKeyOf(s.name) : nameVariants > 1) return { skip: hasMarks(a.name) ? "dau-khac" : "dau-khong-ro" };
  const compat = compatDisciplines(s.codes);
  if (!compat.size) return { skip: "khong-co-linh-vuc" };
  if (!mainDisciplines(a).some((d) => compat.has(d))) return { skip: "nganh-lech" };
  const t = titleOf(s.hocHam, s.hocVi); if (!t) return { skip: "khong-co-chuc-danh" };
  return t;
}

// ---------------------------------------------------------------------------------------------------------------------
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const RAW = arg("raw", tmpFile("sti-profiles.json")), UNITS = (arg("units", "") ? arg("units", "").split(",") : ENABLED_UNITS);
  if (process.argv.includes("--fetch")) await fetchProfiles(RAW, Number(arg("delay", 600)));
  if (!existsSync(RAW)) throw new Error(`Chưa có dữ liệu thô ${RAW}; chạy với --fetch`);
  const raw = JSON.parse(readFileSync(RAW, "utf8")); if (!raw.done) throw new Error("Dữ liệu thô chưa tải xong (chạy lại với --fetch để tải tiếp).");
  const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), inst = P.institutions;
  const risky = new Set([...JSON.parse(readFileSync("data/merge-risk.json", "utf8")).profiles.map((p) => p.id), ...JSON.parse(readFileSync("data/split-candidates.json", "utf8")).flatMap((x) => [x.a, x.b]), ...JSON.parse(readFileSync("data/split-hold.json", "utf8")).flatMap((x) => x.pair)]);
  const orgMap = buildOrgMap(inst, UNITS);
  // Dòng STI: chỉ giữ trường cần để khớp; lập chỉ mục theo (đơn vị, khóa tên) cho khớp chắc và khớp lỏng.
  const sti = raw.rows.map(([name, hocHam, , hocVi, , codes, org, status, isUpdated]) => ({ name, hocHam, hocVi, codes, org, status, isUpdated, key: keyOf(name), orgUnit: orgUnitOf(org, orgMap), loose: looseUnits(org, UNITS, inst) }));
  const byUnitKey = new Map(), vars = new Map(), add = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);
  for (const r of sti) {
    if (!r.key) continue;
    for (const u of new Set([...(r.orgUnit ? [r.orgUnit] : []), ...r.loose])) add(byUnitKey, `${u}|${r.key}`, r);
    if (r.orgUnit) add(vars, `${r.orgUnit}|${r.key}`, dKeyOf(r.name));
  }
  const gcount = new Map(); for (const a of P.authors) if (usableName(stripTitles(a.name))) { const k = keyOf(a.name); gcount.set(k, (gcount.get(k) ?? 0) + 1); }
  const unitKeyCount = new Map(); for (const a of P.authors) for (const u of a.institutions ?? []) if (UNITS.includes(u)) { const k = `${u}|${keyOf(a.name)}`; unitKeyCount.set(k, (unitKeyCount.get(k) ?? 0) + 1); }

  const out = {}, stat = { profiles: 0, matched: 0, byTitle: {}, byUnit: {}, skip: {}, skipByUnit: {} }, picks = [];
  for (const a of P.authors) {
    const units = (a.institutions ?? []).filter((u) => UNITS.includes(u) && !(a.instPast ?? []).includes(u));
    if (!units.length) continue;
    stat.profiles++;
    let res = { skip: "don-vi-lech" };
    for (const u of units) {
      const k = keyOf(a.name), rows = (byUnitKey.get(`${u}|${k}`) ?? []);
      const strong = rows.filter((r) => r.orgUnit === u), loose = rows.length - strong.length;
      const r = decide({ a, risky, unit: u, stiRows: loose ? [...strong, ...rows.filter((r) => r.orgUnit !== u)] : strong, profRows: unitKeyCount.get(`${u}|${k}`) ?? 0, common: (gcount.get(k) ?? 0) >= COMMON, nameVariants: new Set(vars.get(`${u}|${k}`) ?? []).size, orgUnit: strong[0]?.orgUnit ?? null });
      res = r; if (typeof r === "string") { picks.push({ id: a.id, unit: u, row: strong[0] }); break; }
    }
    if (typeof res === "string") { out[a.id] = res; stat.matched++; stat.byTitle[res] = (stat.byTitle[res] ?? 0) + 1; const u = picks[picks.length - 1].unit; stat.byUnit[u] = (stat.byUnit[u] ?? 0) + 1; }
    else { stat.skip[res.skip] = (stat.skip[res.skip] ?? 0) + 1; const su = (stat.skipByUnit[units[0]] ??= {}); su[res.skip] = (su[res.skip] ?? 0) + 1; }
  }
  const keys = Object.keys(out).sort();
  const sorted = Object.fromEntries(keys.map((k) => [k, out[k]]));
  const text = JSON.stringify({ meta: { source: "STI.gov.vn (hồ sơ nhà khoa học công khai)", fetched: raw.fetched, units: UNITS, status: "chưa xác thực bởi chính chủ; không tính vào PRO-SCORE1000™ và hạng; STI chưa có điều khoản tái sử dụng (đang xin phép)" }, by: sorted }) + "\n";
  if (/cccd|maDinhDanh|gioiTinh/i.test(text)) throw new Error("Tệp có trường nhạy cảm: dừng, không ghi.");
  if (!process.argv.includes("--dry")) writeFileSync("public/data/sti-titles.json", text);
  console.log(JSON.stringify({ stiRows: sti.length, ...stat }, null, 1));

  // ---- mẫu kiểm tay: chỉ ghi ra thư mục tạm, kèm bằng chứng độc lập ----
  if (arg("sample", "")) {
    let seed = Number(arg("seed", 7)) >>> 0; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pool = [...picks]; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const au = new Map(P.authors.map((x) => [x.id, x]));
    const sample = pool.slice(0, Number(arg("sample"))).map(({ id, unit, row }) => {
      const a = au.get(id), ws = readWorks(id).slice().sort((x, y) => (y.year ?? 0) - (x.year ?? 0)).slice(0, 6);
      return { id, profind: { name: a.name, unit, disciplines: a.disciplines, works: a.worksCount, years: [a.firstYear, a.lastYear], institutions: a.institutions, recent: ws.map((w) => `${w.year} ${w.title}`.slice(0, 110)) }, sti: { name: row.name, org: row.org, codes: row.codes, hocHam: row.hocHam, hocVi: row.hocVi }, title: out[id] };
    });
    writeFileSync(arg("sample-out", tmpFile("sti-titles-sample.json")), JSON.stringify(sample, null, 1));
    console.log(`đã ghi mẫu ${sample.length} cặp -> ${arg("sample-out", tmpFile("sti-titles-sample.json"))}`);
  }
}
