// Thí điểm công bố trong nước theo hồ sơ (nguồn STI.gov.vn) cho MỘT đơn vị. KHÔNG tính vào PRO-SCORE1000™ hay hạng; mọi mục đều "chưa xác thực".
//   NODE_USE_ENV_PROXY=1 node scripts/pilot-sti-pubs.mjs [--unit hmu] [--delay 700] [--refresh] [--alias "ĐH Y Hà Nội"]
// Cách làm: quét các bản ghi STI nhắc đến đơn vị (POST /api/public/publications/advanced-search-es, tuần tự, nghỉ giữa các yêu cầu, vài chục yêu cầu),
// rồi khớp với hồ sơ ProFind của đơn vị theo quy tắc CHẮC, ưu tiên độ chính xác hơn độ phủ:
//   d   khớp DOI (bản ghi STI trùng DOI với một công trình của hồ sơ);
//   t   họ tên chuẩn hóa trùng (bỏ dấu; chỉ cho phép xoay vòng thứ tự tiếng) VÀ cơ quan của bản ghi chỉ gồm đơn vị này VÀ năm nằm trong [năm đầu - 5, năm cuối + 1] VÀ ngành chính của hồ sơ là một ngành chủ yếu của đơn vị,
//       VÀ nhan đề bản ghi trùng nhan đề một công trình đã có của hồ sơ (bằng chứng độc lập về danh tính, dùng được cả với tên phổ biến);
//   ni  như điều kiện tên + cơ quan + năm + ngành ở trên, cộng ISSN trùng ISSN một công trình khác của hồ sơ, và tên KHÔNG phổ biến;
//   n   chỉ tên + cơ quan + năm + ngành, và tên KHÔNG phổ biến (dưới 5 hồ sơ cùng tên trong toàn ProFind; tên như "Nguyễn Thị Hiền" quá dễ nhầm người).
// KHÔNG khớp chỉ theo tên. Bỏ qua: hồ sơ có ngành chính lệch hẳn ngành chủ yếu của đơn vị (thường là người trùng tên hoặc hồ sơ gộp); tên dưới 3 tiếng hoặc có chữ viết tắt; tên trùng nhau giữa các hồ sơ cùng đơn vị; hồ sơ không dấu mà STI có nhiều cách viết có dấu cho cùng tên; hồ sơ có dấu mà dấu khác STI;
// bản ghi có cơ quan khác ngoài đơn vị (STI chỉ cho danh sách cơ quan chung của bản ghi, không gắn từng tác giả, nên không thể chắc tác giả thuộc cơ quan nào).
// Quyền riêng tư: chỉ chọn tường minh các trường công bố (id, DOI, nhan đề, năm, ISSN, tên tạp chí, trích dẫn, danh sách tên tác giả và cơ quan công khai của công bố);
// KHÔNG đọc, lưu hay in trường pCccd hay bất kỳ dữ liệu cá nhân nhạy cảm nào. Dữ liệu STI chưa có điều khoản tái sử dụng: chỉ lưu tham chiếu tối thiểu.
// Ghi: data/sti-pubs-pilot.json (đầy đủ, đọc được) và public/data/sti-pilot.json (gọn, tải khi cần ở hồ sơ của đơn vị thí điểm).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { arg, tmpFile } from "./lib/cli.mjs";
import { readWorks } from "./_works-io.mjs";

const API = "https://sti.gov.vn/api/public/publications/advanced-search-es", UNIT = arg("unit", "hmu"), DELAY = Number(arg("delay", 700)), REFRESH = process.argv.includes("--refresh");
const UA = "ProFind-STI-pilot (+https://profind.isavn.edu.vn)";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const COMMON = 5; // từ ngần này hồ sơ cùng tên trong toàn ProFind trở lên là tên phổ biến

// ---- chuẩn hóa tên ----
export const fold = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Xoay vòng nhỏ nhất theo thứ tự chữ: hai tên trùng khi các tiếng giống nhau và giữ nguyên thứ tự vòng (cho phép "Minh-Triet Tran", "Chu Thị Chi" và "Thị Chi Chu", nhưng không cho đảo "Phúc Hoàn" thành "Hoàn Phúc"). */
const canon = (t) => (t.length ? t.map((_, i) => [...t.slice(i), ...t.slice(0, i)].join(" ")).sort()[0] : "");
/** Khóa tên không dấu, bất biến khi xoay vòng các tiếng (OpenAlex hay đảo họ ra đầu hoặc cuối). */
export const nameKey = (s) => canon(fold(s).split(" ").filter(Boolean));
/** Khóa tên có dấu (NFC, thường), cũng bất biến khi xoay vòng. */
export const dKey = (s) => canon(String(s ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ").filter(Boolean));
export const hasMarks = (s) => /[^\u0000-\u007F]/.test(s);
export const normDoi = (d) => String(d ?? "").trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");
export const normIssn = (s) => { const m = String(s ?? "").toUpperCase().replace(/[^\dX]/g, ""); return m.length === 8 ? `${m.slice(0, 4)}-${m.slice(4)}` : ""; };
/** Tên đủ dài và không viết tắt thì mới đủ phân biệt (từ 3 tiếng, mỗi tiếng từ 2 chữ cái). */
export const usableName = (s) => { const t = fold(s).split(" ").filter(Boolean); return t.length >= 3 && t.every((x) => x.length >= 2); };

/** Khớp chắc một bản ghi STI với hồ sơ. Hàm thuần để kiểm thử. Trả về mã lý do ("d", "n", "ni") hoặc { skip: lý do }. */
export function decide({ pub, profile, nameOk, orgOnly, issns, dois, fieldOk = true, titleSame = false, common = false }) {
  const doi = normDoi(pub.doi);
  if (doi && dois.has(doi)) return "d";
  if (!nameOk) return { skip: "ten" };
  if (!fieldOk) return { skip: "nganh-lech" };
  if (!orgOnly) return { skip: "nhieu-co-quan" };
  const y = Number(pub.y);
  if (!Number.isFinite(y) || !y) return { skip: "nam" };
  if (y < (profile.firstYear ?? 0) - 5 || y > (profile.lastYear ?? 9999) + 1) return { skip: "nam" };
  if (titleSame) return "t";
  if (common) return { skip: "ten-pho-bien" };
  const is = [normIssn(pub.issn), normIssn(pub.eissn)].filter(Boolean);
  return is.some((i) => issns.has(i)) ? "ni" : "n";
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), inst = P.institutions.find((i) => i.id === UNIT);
  if (!inst) throw new Error(`Không thấy đơn vị ${UNIT}`);
  const unitName = { vi: inst.name, en: inst.en || inst.name };
  // Mẫu nhận diện đơn vị trong danh sách cơ quan của bản ghi STI.
  const aliases = [inst.name, inst.en, inst.abbr, ...process.argv.flatMap((a, i, v) => (a === "--alias" ? [v[i + 1]] : []))].filter(Boolean).map((x) => fold(x.replace(/^Trường\s+/i, ""))).filter((x) => x.length >= 8 || x === fold(inst.abbr ?? ""));
  const isUnitOrg = (e) => { const f = fold(e); return aliases.some((a) => ` ${f} `.includes(` ${a} `)); };
  const queries = [...new Set([inst.name.replace(/^Trường\s+/i, ""), inst.en, ...process.argv.flatMap((a, i, v) => (a === "--alias" ? [v[i + 1]] : []))].filter(Boolean))];

  // ---- 1. quét bản ghi STI ----
  const cacheF = tmpFile(`sti-scan-${UNIT}.json`);
  let scan;
  if (!REFRESH && existsSync(cacheF)) { scan = JSON.parse(readFileSync(cacheF, "utf8")); console.log(`dùng bản quét đã lưu: ${scan.recs.length} bản ghi (${cacheF})`); }
  else {
    const recs = new Map(); let requests = 0;
    for (const q of queries) {
      for (let page = 1; ; page++) {
        let r;
        for (let k = 0; k < 3; k++) {
          try {
            const res = await fetch(`${API}?page=${page}&size=100`, { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify({ conditions: [{ field: "ALL", value: q, operator: "AND" }] }) });
            if (res.ok) { r = await res.json(); break; }
            if (res.status === 429 || res.status >= 500) await wait(4000 * (k + 1)); else throw new Error(`HTTP ${res.status}`);
          } catch (e) { if (k === 2) throw e; await wait(4000 * (k + 1)); }
        }
        requests++;
        for (const c of r.content ?? []) recs.set(c.id, { id: c.id, doi: c.doi ?? null, t: c.tenTaiLieu ?? "", y: c.namXuatBan ?? null, issn: c.issn ?? null, eissn: c.eissn ?? null, j: c.tenTapChi || c.nTenTapChi || null, c: c.citationCount ?? 0, org: c.nCoQuanTacGia ?? "", names: c.nTacGiaCaNhan ?? "" });
        console.log(`quét "${q}" trang ${page}: ${recs.size} bản ghi (tổng ${r.totalElements})`);
        if (r.last || !(r.content ?? []).length || page * 100 >= r.totalElements) break;
        await wait(DELAY);
      }
    }
    scan = { fetched: new Date().toISOString().slice(0, 10), queries, requests, recs: [...recs.values()] };
    writeFileSync(cacheF, JSON.stringify(scan));
  }

  // ---- 2. hồ sơ ProFind của đơn vị (đang công tác, không nghi gộp) ----
  const people = P.authors.filter((a) => a.institutions.includes(UNIT) && !(a.instPast ?? []).includes(UNIT) && !a.suspect && !a.demo);
  const byKey = new Map();
  for (const a of people) { if (!usableName(a.name)) continue; const k = nameKey(a.name); (byKey.get(k) ?? byKey.set(k, []).get(k)).push(a); }
  const skipStat = { "ten-ngan-hoac-viet-tat": people.filter((a) => !usableName(a.name)).length, "trung-ten-trong-don-vi": 0, "dau-khong-ro": 0, "dau-khac": 0, "nhieu-co-quan": 0, "nganh-lech": 0, "ten-pho-bien": 0, nam: 0 };
  // Ngành chủ yếu của đơn vị: ngành chiếm từ 5% số hồ sơ trở lên.
  const dc = new Map(); for (const a of people) for (const d of a.disciplines ?? []) dc.set(d, (dc.get(d) ?? 0) + 1);
  const dominant = new Set([...dc].filter(([, n]) => n >= 0.05 * people.length).map(([d]) => d));
  const gcount = new Map(); for (const a of P.authors) if (usableName(a.name)) { const k = nameKey(a.name); gcount.set(k, (gcount.get(k) ?? 0) + 1); }
  const info = new Map();
  const infoOf = (a) => { let v = info.get(a.id); if (!v) { const ws = readWorks(a.id); v = { titles: new Set(ws.map((w) => fold(w.title)).filter((x) => x.length >= 20)), dois: new Set(ws.map((w) => normDoi(w.doi)).filter(Boolean)), issns: new Set(ws.map((w) => normIssn(w.issn)).filter(Boolean)) }; info.set(a.id, v); } return v; };

  // Số cách viết có dấu của cùng một khóa tên trong các bản ghi thuộc đơn vị (để loại hồ sơ không dấu có thể trùng nhiều người).
  const unitRecs = scan.recs.filter((p) => (p.org || "").split(";").some(isUnitOrg));
  const variants = new Map();
  for (const p of unitRecs) for (const n of (p.names || "").split(";").map((x) => x.trim()).filter(Boolean)) { const k = nameKey(n); (variants.get(k) ?? variants.set(k, new Set()).get(k)).add(dKey(n)); }

  // ---- 3. khớp ----
  const out = {}, reasonCount = { d: 0, t: 0, ni: 0, n: 0 }, considered = { pairs: 0 };
  for (const p of unitRecs) {
    const orgs = (p.org || "").split(";").map((x) => x.trim()).filter(Boolean), orgOnly = orgs.length > 0 && orgs.every(isUnitOrg);
    const names = (p.names || "").split(";").map((x) => x.trim()).filter(Boolean), seenA = new Set();
    const cands = new Set(); // hồ sơ có thể khớp theo DOI (không cần tên)
    for (const a of people) if (p.doi && infoOf(a).dois.has(normDoi(p.doi))) cands.add(a);
    for (const n of names) for (const a of byKey.get(nameKey(n)) ?? []) cands.add(a);
    for (const a of cands) {
      if (seenA.has(a.id)) continue; seenA.add(a.id);
      const { dois, issns, titles } = infoOf(a); considered.pairs++;
      // kiểm tên (chỉ để loại khi không phải khớp DOI)
      let nameOk = false;
      const group = byKey.get(nameKey(a.name)) ?? [];
      const hit = names.find((n) => nameKey(n) === nameKey(a.name));
      if (hit) {
        if (group.length > 1) skipStat["trung-ten-trong-don-vi"]++;
        else if (hasMarks(a.name) ? dKey(a.name) !== dKey(hit) : (variants.get(nameKey(a.name))?.size ?? 1) > 1) skipStat[hasMarks(a.name) ? "dau-khac" : "dau-khong-ro"]++;
        else nameOk = true;
      }
      const r = decide({ pub: p, profile: a, nameOk, orgOnly, issns, dois, fieldOk: dominant.has((a.disciplines ?? [])[0]), titleSame: titles.has(fold(p.t)), common: (gcount.get(nameKey(a.name)) ?? 0) >= COMMON });
      if (typeof r === "object") { if (hit && nameOk) skipStat[r.skip]++; continue; }
      reasonCount[r]++;
      (out[a.id] ??= []).push({ id: p.id, title: p.t, year: Number(p.y) || null, issn: normIssn(p.issn) || normIssn(p.eissn) || null, journal: p.j, citations: p.c ?? 0, why: r });
    }
  }
  for (const k of Object.keys(out)) out[k].sort((x, y) => (y.year ?? 0) - (x.year ?? 0) || y.citations - x.citations);

  const matched = Object.values(out).reduce((t, v) => t + v.length, 0);
  const meta = {
    unit: UNIT, unitName, dominantFields: [...dominant], source: "STI.gov.vn (Hệ thống thông tin quốc gia về KH,CN&ĐMST), API công khai", fetched: scan.fetched, queries: scan.queries, requests: scan.requests ?? null,
    status: "chưa xác thực; không tính vào PRO-SCORE1000™ và hạng; STI chưa có điều khoản tái sử dụng (đang xin phép)",
    commonNameThreshold: COMMON,
    rules: { d: "khớp DOI", t: "như n, cộng nhan đề trùng một công trình đã có của hồ sơ", n: "họ tên chuẩn hóa (chỉ xoay vòng thứ tự tiếng) + cơ quan của bản ghi chỉ gồm đơn vị + năm trong [năm đầu - 5, năm cuối + 1] + ngành chính là ngành chủ yếu của đơn vị + tên không phổ biến", ni: "như n, cộng ISSN trùng một công trình khác của hồ sơ (chỉ khi tên không phổ biến)" },
    stats: { scanned: scan.recs.length, mentionUnit: unitRecs.length, profiles: people.length, matchedPubs: matched, authorsWithMatch: Object.keys(out).length, byReason: reasonCount, skipped: skipStat },
  };
  const full = { meta, byAuthor: out };
  // ---- 4. ghi (kiểm không có trường nhạy cảm) ----
  const text = JSON.stringify(full, null, 1) + "\n";
  if (/cccd/i.test(text)) throw new Error("Tệp có chữ 'cccd': dừng, không ghi.");
  writeFileSync("data/sti-pubs-pilot.json", text);
  const by = {}; for (const [id, v] of Object.entries(out)) by[id] = v.map((r) => [r.id, r.title, r.year ?? 0, r.issn ?? "", r.journal ?? "", r.citations, r.why]);
  writeFileSync("public/data/sti-pilot.json", JSON.stringify({ meta: { unit: UNIT, unitName, fetched: scan.fetched }, by }));
  console.log(JSON.stringify(meta.stats, null, 1));
}
