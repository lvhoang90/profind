// Dựng data/institutions.json từ nguồn công khai: Wikipedia vi (danh sách trường, có chủ quản, viết tắt, tên Anh) + ROR (mã định danh, viện nghiên cứu).
//   NODE_USE_ENV_PROXY=1 node scripts/import-institutions.mjs        (trong môi trường có proxy; máy thường không cần biến này)
// Ghi: data/institutions.json (dùng cho app) và data/institutions.review.json (dòng chưa khớp ROR, cần người duyệt).
// Chủ quản (managedBy) lấy từ tiêu đề mục của Wikipedia. Danh sách chính thức của Bộ GD&ĐT (moet.gov.vn) chưa truy cập được từ môi trường dựng:
// khi có file xuất từ MOET, đối chiếu bằng cách thêm vào data/moet.csv (cột name) và chạy lại (bước đối chiếu: xem `moetCheck`).
import { writeFileSync, readFileSync, existsSync } from "node:fs";
const UA = { "User-Agent": "ProFind/0.1 (+https://github.com/lvhoang90/profind)" };
const WIKI = "https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C6%B0%E1%BB%9Dng_%C4%91%E1%BA%A1i_h%E1%BB%8Dc,_h%E1%BB%8Dc_vi%E1%BB%87n_v%C3%A0_cao_%C4%91%E1%BA%B3ng_t%E1%BA%A1i_Vi%E1%BB%87t_Nam";
const strip = (h) => h.replace(/<sup[\s\S]*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+([,.)])/g, "$1").replace(/\(\s+/g, "(").replace(/\s+/g, " ").trim();
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\b(the|truong|of)\b/g, " ").replace(/\s+/g, " ").trim();
const slug = (s) => norm(s).replace(/ /g, "-");
const NAME = /^(Trường|Học viện|Đại học|Viện|Phân hiệu|Phân viện)\b/i;
const ABBR = /^[A-ZĐ][A-Z0-9Đ\-–. ]{1,13}$/;
const LATIN = /^[A-Za-z0-9 ,.'’()&:\/\-–]+$/;
const PROVINCE = /^(Hà Nội|TP\.? ?HCM|Hồ Chí Minh|Đà Nẵng|Hải Phòng|Cần Thơ|Huế|[A-ZÀ-Ỹ][\p{L} ]{2,18})$/u;
// Loại hình theo mục: public-univ, private-univ, foreign-univ, college, other
const typeOf = (sec) => /tư thục/i.test(sec) ? "private-univ" : /nước ngoài/i.test(sec) ? "foreign-univ" : /cao đẳng|dự bị/i.test(sec) ? "college" : /tôn giáo|phật giáo/i.test(sec) ? "other" : "public-univ";

// ---- 1. Wikipedia ----
const html = await (await fetch(WIKI, { headers: UA })).text();
const wiki = []; let city = "";
for (const part of html.split(/(?=<h[23][ >])/)) {
  const sec = strip((part.match(/<h[23][\s\S]*?<\/h[23]>/) ?? [""])[0]); if (!sec || /Liên kết|Tham khảo|Xem thêm|Chú thích/.test(sec)) continue;
  if (!/<tr/.test(part)) continue; city = "";
  const isUniSection = /^Đại học( tư thục)?$/.test(sec);
  for (const tr of part.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/g) ?? []).map(strip).filter((c, i) => !(i === 0 && /^\d+$/.test(c)));
    if (cells.length < 2 || /^(STT|TT|Tên|Trường|Học viện|Viết tắt|Thành phố|Tỉnh)$/i.test(cells[0])) continue;
    let name;
    if (isUniSection) { const c = cells.find((x) => /Lĩnh vực/.test(x)); if (!c) continue; name = c.replace(/\s*Lĩnh vực.*$/, ""); }
    else name = cells.find((x) => NAME.test(x) && x.length < 120);
    if (!name) continue;
    const idx = cells.indexOf(cells.find((x) => x.startsWith(name.split(" (")[0])) ?? name);
    const before = cells.slice(0, Math.max(idx, 0)).find((x) => PROVINCE.test(x) && !NAME.test(x) && !ABBR.test(x)); if (before) city = before;
    const nameClean = name.replace(/\s*\(([^)]*)\)\s*$/, "").replace(/\s*,\s*(ĐHQGHN|ĐHQG-?HCM|ĐHQG TP\.?HCM)$/, " ($1)").trim();
    const abbrIn = (name.match(/\(([^)]*)\)\s*$/) ?? [])[1];
    const rest = cells.slice(idx + 1);
    const abbr = abbrIn && ABBR.test(abbrIn.trim()) ? abbrIn.trim() : rest.find((x) => ABBR.test(x) && x.length < 14);
    const en = [...rest].reverse().find((x) => LATIN.test(x) && x.length > 6 && x !== abbr && !ABBR.test(x));
    wiki.push({ name: nameClean, abbr: abbr ?? null, en: en ?? null, city: city || null, managedBy: sec, type: typeOf(sec) });
  }
}
console.log(`Wikipedia: ${wiki.length} đơn vị`);

// ---- 2. ROR (toàn bộ tổ chức tại VN) ----
const ror = []; 
for (let page = 1; ; page++) {
  const r = await fetch(`https://api.ror.org/v2/organizations?filter=locations.geonames_details.country_code:VN&page=${page}`, { headers: UA });
  if (!r.ok) { console.error("ROR", r.status); break; }
  const j = await r.json(); if (!j.items?.length) break; ror.push(...j.items);
  if (ror.length >= j.number_of_results) break;
}
const seenR = new Set(); for (let i = ror.length - 1; i >= 0; i--) if (seenR.has(ror[i].id)) ror.splice(i, 1); else seenR.add(ror[i].id);
console.log(`ROR: ${ror.length} tổ chức tại Việt Nam`);
const rname = (o) => o.names.find((n) => n.types.includes("ror_display"))?.value ?? o.names[0].value;
const idx = new Map();
for (const o of ror) for (const n of o.names) { const k = norm(n.value); if (k && !idx.has(k)) idx.set(k, o); }
// Đối chiếu mờ: giao/hợp các từ khóa (bỏ từ chung) ≥ 0.8 và duy nhất.
const STOP = new Set(["university", "universities", "vietnam", "viet", "nam", "vnu", "and", "for", "in", "school", "college"]);
const toks = (s) => new Set(norm(s).split(" ").filter((t) => t && !STOP.has(t)));
const rtoks = ror.map((o) => ({ o, ts: o.names.map((n) => toks(n.value)) }));
const fuzzy = (names) => {
  let best = null, tie = false;
  for (const nm of names) { const a = toks(nm); if (a.size < 2) continue;
    for (const { o, ts } of rtoks) for (const b of ts) { let i = 0; for (const t of a) if (b.has(t)) i++; const sc = i / (a.size + b.size - i); if (sc >= 0.8) { if (!best || sc > best.sc) { best = { o, sc }; tie = false; } else if (sc === best.sc && o.id !== best.o.id) tie = true; } } }
  return best && !tie ? best.o : null;
};
const rcity = (o) => o.locations?.[0]?.geonames_details?.name ?? null;

// Tra cứu từng đơn vị qua tìm kiếm ROR (bổ sung cho danh sách theo quốc gia, vốn không đầy đủ). Chỉ nhận kết quả ở VN và khớp tên ≥ 0.8 hoặc trùng chính xác.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rorSearch = async (q) => {
  try {
    const r = await fetch(`https://api.ror.org/v2/organizations?query=${encodeURIComponent(q)}`, { headers: UA }); if (!r.ok) return null;
    const a = toks(q), nq = norm(q);
    for (const o of (await r.json()).items ?? []) {
      if (o.locations?.[0]?.geonames_details?.country_code !== "VN") continue;
      for (const n of o.names) { if (norm(n.value) === nq) return o; const b = toks(n.value); let i = 0; for (const t of a) if (b.has(t)) i++; if (a.size >= 2 && i / (a.size + b.size - i) >= 0.8) return o; }
    }
  } catch { /* bỏ qua */ }
  return null;
};
// ---- 3. Hợp nhất ----
const used = new Set(), inst = [], review = [], ids = new Set();
const uid = (s) => { let b = slug(s) || "dv", i = b, n = 2; while (ids.has(i)) i = `${b}-${n++}`; ids.add(i); return i; };
// Đơn vị lớn thường là nơi tác giả công bố nhưng không nằm trong bảng của Wikipedia (đại học vùng, viện hàn lâm...). Khóa: tên tìm trên ROR.
const SEEDS = [["Vietnam National University, Hanoi", "Đại học Quốc gia Hà Nội", "ĐHQGHN", "public-univ", "Hà Nội"], ["Vietnam National University Ho Chi Minh City", "Đại học Quốc gia TP. Hồ Chí Minh", "ĐHQG-HCM", "public-univ", "TP. Hồ Chí Minh"],
  ["Thai Nguyen University", "Đại học Thái Nguyên", "TNU", "public-univ", "Thái Nguyên"], ["Can Tho University", "Đại học Cần Thơ", "CTU", "public-univ", "Cần Thơ"], ["Hue University", "Đại học Huế", "HUE", "public-univ", "Huế"], ["The University of Danang", "Đại học Đà Nẵng", "UD", "public-univ", "Đà Nẵng"],
  ["Vietnam Academy of Science and Technology", "Viện Hàn lâm Khoa học và Công nghệ Việt Nam", "VAST", "institute", "Hà Nội"], ["Vietnam Academy of Social Sciences", "Viện Hàn lâm Khoa học xã hội Việt Nam", "VASS", "institute", "Hà Nội"],
  ["Vietnam National Institute of Educational Sciences", "Viện Khoa học Giáo dục Việt Nam", "VNIES", "institute", "Hà Nội"], ["Vietnam Institute for Advanced Study in Mathematics", "Viện Nghiên cứu cao cấp về Toán", "VIASM", "institute", "Hà Nội"]];
for (const [en, vi, ab, type, c] of SEEDS) { const o = await rorSearch(en); await sleep(250); inst.push({ id: uid(ab), name: vi, en, abbr: ab, type, managedBy: null, city: c, ror: o?.id ?? null, source: "seed+ror.org" }); if (o) used.add(o.id); }
for (const w of wiki) {
  const o = [w.name, w.en, w.abbr].filter(Boolean).map((x) => idx.get(norm(x))).find(Boolean) ?? fuzzy([w.en, w.name].filter(Boolean));
  const HINT = { "Đại học Kinh tế Quốc dân": "National Economics University" };
  let o2 = o;
  if (!o2) { o2 = await rorSearch(HINT[w.name] ?? w.en ?? w.name); await sleep(250); }
  if (o2) used.add(o2.id); else review.push({ name: w.name, en: w.en, abbr: w.abbr });
  inst.push({ id: uid(w.abbr ?? w.en ?? w.name), name: w.name, en: w.en ?? (o2 ? rname(o2) : w.name), abbr: w.abbr, type: w.type, managedBy: w.managedBy, city: w.city ?? (o2 ? rcity(o2) : null), ror: o2 ? o2.id : null, source: "vi.wikipedia.org" });
}
// Tổ chức ROR chưa có trong Wikipedia: giữ viện nghiên cứu / cơ quan nhà nước / tổ chức phi lợi nhuận (cần duyệt)
const RINST = /viện|institute|academy|học viện|research/i, NOT = /hospital|bệnh viện|ministry|bộ |care international|consult|foundation|ngo\b/i;
for (const o of ror) {
  if (used.has(o.id) || o.status !== "active") continue;
  const types = o.types ?? [], name = rname(o), isEdu = types.includes("education");
  if (isEdu && !RINST.test(name)) { review.push({ ror: o.id, name, note: "education, chưa có trong Wikipedia" }); continue; }
  if (!RINST.test(name) || NOT.test(name) || types.includes("healthcare") || types.includes("company")) continue;
  inst.push({ id: uid(name), name, en: name, abbr: o.names.find((n) => n.types.includes("acronym"))?.value ?? null, type: "institute", managedBy: null, city: rcity(o), ror: o.id, source: "ror.org", rorTypes: types });
}
const types = { "public-univ": { vi: "Đại học, học viện công lập", en: "Public university / academy" }, "private-univ": { vi: "Đại học tư thục", en: "Private university" }, "foreign-univ": { vi: "Đại học nước ngoài tại Việt Nam", en: "Foreign university in Vietnam" }, college: { vi: "Cao đẳng, dự bị đại học", en: "College" }, institute: { vi: "Viện nghiên cứu, cơ sở khác", en: "Research institute / other" }, other: { vi: "Cơ sở tôn giáo", en: "Religious institution" } };
writeFileSync("data/institutions.json", JSON.stringify({ meta: { status: "wikipedia+ror, chờ đối chiếu danh sách chính thức Bộ GD&ĐT", built: new Date().toISOString().slice(0, 10), count: inst.length, withRor: inst.filter((i) => i.ror).length, sources: [WIKI, "https://ror.org (CC0)"] }, institutions: inst, types }, null, 1));
writeFileSync("data/institutions.review.json", JSON.stringify(review, null, 1));
const by = {}; for (const i of inst) by[i.type] = (by[i.type] ?? 0) + 1;
console.log("institutions.json:", inst.length, by, "có ROR:", inst.filter((i) => i.ror).length, "· cần duyệt:", review.length);
