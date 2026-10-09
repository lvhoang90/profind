// Xác thực hồ sơ nhà khoa học ("Đây là tôi"): kiểm tra tự động, thư phản hồi. Dùng chung cho api/account.js (tên bắt đầu bằng "_" nên không phải một API riêng).
// Chính sách: xác thực bằng EMAIL TỔ CHỨC (đã nhập mã 6 số); email miễn phí (Gmail...) chỉ được chấp nhận khi quản trị viên cho phép riêng.
// Tick vàng có hiệu lực 2 năm rồi xem xét lại. Tự động duyệt khi: email tổ chức + ORCID trùng hồ sơ OpenAlex + tên tương thích + không xung đột.

export const VERIFY_YEARS = 2;
const FREE = new Set(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.vn", "ymail.com", "rocketmail.com", "outlook.com", "outlook.com.vn", "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "aol.com", "zoho.com", "yandex.com", "yandex.ru", "mail.ru", "qq.com", "163.com", "126.com", "gmx.com", "gmx.net", "vnn.vn", "fpt.vn", "hn.vnn.vn", "hcm.vnn.vn", "vnpt.vn", "viettel.vn", "mail.com", "tutanota.com"]);
export const emailDomain = (e) => String(e ?? "").split("@")[1]?.toLowerCase().trim() ?? "";
export const isFreeMail = (e) => { const d = emailDomain(e); return !d || FREE.has(d) || /^(yahoo|outlook|hotmail|live|gmx|yandex)\./.test(d); };

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
/** Tên tương thích: mọi từ đầy đủ của tên ngắn hơn có trong tên kia, chữ viết tắt (1 ký tự) khớp chữ cái đầu của một từ còn lại. */
export function nameCompat(a, b) {
  const ta = norm(a).split(" ").filter(Boolean), tb = norm(b).split(" ").filter(Boolean);
  if (!ta.length || !tb.length) return false;
  const run = (x, y) => {
    const pool = [...y]; let full = 0;
    for (const t of x.filter((t) => t.length > 1)) { const i = pool.indexOf(t); if (i < 0) return false; pool.splice(i, 1); full++; }
    for (const t of x.filter((t) => t.length === 1)) { const i = pool.findIndex((p) => p[0] === t); if (i < 0) return false; pool.splice(i, 1); }
    return full >= 1 && x.length >= 2;
  };
  return run(ta, tb) || run(tb, ta);
}
export const normOrcid = (o) => { const s = String(o ?? "").replace(/^https?:\/\/orcid\.org\//i, "").replace(/[\s-]/g, "").toUpperCase(); return /^\d{15}[\dX]$/.test(s) ? s.replace(/(.{4})(?=.)/g, "$1-") : ""; };
/** Mã kiểm tra ORCID (ISO 7064 mod 11-2). */
export const orcidValid = (o) => { const s = normOrcid(o).replace(/-/g, ""); if (!s) return false; let t = 0; for (let i = 0; i < 15; i++) t = (t + Number(s[i])) * 2; const r = (12 - (t % 11)) % 11; return s[15] === (r === 10 ? "X" : String(r)); };

const fetchJson = async (url, headers = {}, ms = 6000) => { const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms); try { const r = await fetch(url, { headers, signal: ac.signal }); return r.ok ? await r.json() : null; } catch { return null; } finally { clearTimeout(to); } };

/** Chạy các kiểm tra tự động. `vf` = { byAuthor: record|null, byOrcid: record|null } các xác thực đang có. Trả { checks, oa, auto }. */
export async function runChecks({ authorId, name, email, orcid, vf = {}, allowedFree = false, emailVerified = true }) {
  const checks = [], add = (k, ok, label, detail = "") => checks.push({ k, ok, label, detail });
  const o = normOrcid(orcid);
  const oa = await fetchJson(`https://api.openalex.org/authors/${encodeURIComponent(authorId)}?select=id,display_name,orcid,last_known_institutions,works_count,cited_by_count&mailto=luongviethoang.hcm@gmail.com`);
  const oaOrcid = normOrcid(oa?.orcid);
  const orc = o ? await fetchJson(`https://pub.orcid.org/v3.0/${o}/person`, { accept: "application/json" }) : null;
  const orcName = orc?.name ? `${orc.name["given-names"]?.value ?? ""} ${orc.name["family-name"]?.value ?? ""}`.trim() : "";
  const free = isFreeMail(email);
  add("email", free ? (allowedFree ? null : false) : true, "Email tổ chức", free ? (allowedFree ? "Email miễn phí, quản trị viên đã cho phép riêng" : `Email miễn phí (${emailDomain(email)}), cần đề nghị riêng`) : emailDomain(email));
  add("otp", emailVerified ? true : null, "Quyền sử dụng email", emailVerified ? "Đã nhập mã xác thực gửi tới email" : "Chưa có mã xác thực (quản trị viên nhập tay)");
  add("orcidFormat", o ? orcidValid(o) : null, "ORCID hợp lệ", o ? (orcidValid(o) ? o : "Sai mã kiểm tra") : "Chưa cung cấp ORCID");
  add("orcidMatch", !o ? null : !oaOrcid ? null : o === oaOrcid, "ORCID trùng hồ sơ OpenAlex", !oa ? "Không tra được OpenAlex" : !oaOrcid ? "Hồ sơ OpenAlex chưa ghi ORCID" : o === oaOrcid ? oaOrcid : `Hồ sơ OpenAlex ghi ${oaOrcid}`);
  add("orcidName", orcName ? nameCompat(orcName, name) : null, "Tên trong ORCID khớp tên người gửi", orcName ? `ORCID: ${orcName}` : "Không đọc được bản ghi ORCID công khai");
  add("nameMatch", oa?.display_name ? nameCompat(oa.display_name, name) : null, "Tên người gửi khớp tên hồ sơ", oa?.display_name ? `Hồ sơ: ${oa.display_name}` : "Không tra được tên hồ sơ");
  const inst = (oa?.last_known_institutions ?? []).map((i) => i.display_name).filter(Boolean);
  add("domain", null, "Tên miền email và đơn vị trong hồ sơ", `${emailDomain(email)} · hồ sơ: ${inst.join("; ") || "chưa ghi đơn vị"}`);
  const conflict = (vf.byAuthor && vf.byAuthor.email !== email) || (vf.byOrcid && vf.byOrcid.authorId !== authorId);
  add("conflict", !conflict, "Chưa có xác thực khác trùng hồ sơ hoặc ORCID", conflict ? "Đã có người xác thực hồ sơ hoặc ORCID này" : "Không xung đột");
  const ok = (k) => checks.find((c) => c.k === k)?.ok;
  const auto = ok("email") === true && ok("orcidMatch") === true && ok("nameMatch") === true && ok("orcidName") !== false && ok("orcidFormat") !== false && ok("conflict") === true;
  return { checks, oa: oa ? { name: oa.display_name, orcid: oaOrcid, institutions: inst, works: oa.works_count, cited: oa.cited_by_count } : null, auto };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dmy = (ms) => { const d = new Date(ms + 7 * 3600e3); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; };
/** Thư gửi tác giả: approved | received | rejected | info. */
export function claimMail(kind, { name, authorName, origin, authorId, until, reason }) {
  const link = `${origin}/#/tac-gia/${authorId}`;
  const T = {
    approved: [`ProFind: hồ sơ của bạn đã được xác thực`, `Hồ sơ "${authorName}" trên ProFind đã được xác thực là của bạn. Tick vàng "Nhà khoa học đã xác thực" hiện cạnh tên trong 2 năm (đến ${dmy(until)}), sau đó ProFind sẽ xem xét lại. Bạn có thể xem hồ sơ tại ${link}.`],
    received: [`ProFind: đã nhận yêu cầu`, `ProFind đã nhận yêu cầu xác thực hồ sơ "${authorName}". Hệ thống đã kiểm tra tự động và chuyển quản trị viên xem xét; kết quả sẽ được gửi qua email này.`],
    rejected: [`ProFind: yêu cầu xác thực hồ sơ chưa được chấp nhận`, `Yêu cầu xác thực hồ sơ "${authorName}" chưa được chấp nhận${reason ? `. Lý do: ${reason}` : ""}. Bạn có thể gửi lại kèm thông tin bổ sung (ví dụ ORCID, đường dẫn Google Scholar) hoặc trả lời email này.`],
    hidden: [`ProFind: đã ẩn điểm và xếp hạng`, `Theo đề nghị của bạn, điểm PRO-SCORE1000™ và huy hiệu xếp hạng của hồ sơ "${authorName}" đã được ẩn trên ProFind. Thông tin công trình khoa học vẫn hiển thị. Bạn có thể yêu cầu hiển thị lại bất cứ lúc nào.`],
    removed: [`ProFind: hồ sơ đã được ẩn`, `Theo đề nghị của bạn, hồ sơ "${authorName}" đã được ẩn khỏi ProFind và sẽ được gỡ hẳn trong lần cập nhật dữ liệu kế tiếp. Lưu ý: việc gỡ chỉ áp dụng trên ProFind; dữ liệu gốc ở OpenAlex và ORCID vẫn còn, bạn có thể chỉnh sửa tại các hệ thống đó.`],
    info: [`ProFind: cần bổ sung thông tin xác thực hồ sơ`, `Để xác thực hồ sơ "${authorName}", ProFind cần thêm thông tin${reason ? `: ${reason}` : ""}. Bạn trả lời email này hoặc gửi lại yêu cầu trên trang hồ sơ.`],
  }[kind];
  const text = `Chào ${name || "bạn"},\n\n${T[1]}\n\nTrân trọng,\nProFind · Viện ISA`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f2a3d;line-height:1.55"><p>Chào ${esc(name || "bạn")},</p><p>${esc(T[1])}</p>${kind === "approved" ? `<p><a href="${esc(link)}" style="display:inline-block;background:#17688f;color:#fff;text-decoration:none;font-weight:700;padding:9px 16px;border-radius:8px">Xem hồ sơ đã xác thực</a></p>` : ""}<p style="color:#5b7284;font-size:13px">Trân trọng,<br>ProFind · Viện ISA</p></div>`;
  return { subject: T[0], text, html };
}
export function adminMail({ claim, origin }) {
  const rows = claim.checks.map((c) => `${c.ok === true ? "✅" : c.ok === false ? "❌" : "⚠️"} ${c.label}${c.detail ? `: ${c.detail}` : ""}`);
  const text = `Yêu cầu xác thực hồ sơ cần duyệt\n\nHồ sơ: ${claim.authorName} (${claim.authorId})\nNgười gửi: ${claim.name} <${claim.email}>\nORCID: ${claim.orcid || "-"}\nGoogle Scholar: ${claim.scholar || "-"}\n\nKết quả kiểm tra tự động:\n${rows.join("\n")}\n\nDuyệt tại: ${origin}/#/quan-tri/xac-thuc`;
  return { subject: `[ProFind] Cần duyệt xác thực hồ sơ: ${claim.authorName}`, text, html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${esc(text)}</pre>` };
}

/** Chuẩn hóa DOI ("https://doi.org/10.x/y" → "10.x/y"); "" nếu sai. */
export const normDoi = (d) => { const s = String(d ?? "").trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:)/i, "").toLowerCase(); return /^10\.\d{4,9}\/\S{1,200}$/.test(s) ? s : ""; };
/** Tra công trình tự bổ sung theo DOI: Crossref (nhan đề, năm, tác giả, ORCID) + OpenAlex (đã ghi nhận chưa). matched = tên hoặc ORCID của tác giả có trong danh sách tác giả công trình. */
export async function lookupWork(doi, { name, orcid }) {
  const cr = (await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=luongviethoang.hcm@gmail.com`, {}, 8000))?.message;
  const oa = await fetchJson(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?select=id,cited_by_count&mailto=luongviethoang.hcm@gmail.com`);
  if (!cr) return { found: false, oa: oa ? oa.id : "" };
  const o = normOrcid(orcid), au = cr.author ?? [];
  const byOrcid = !!o && au.some((x) => normOrcid(x.ORCID) === o);
  const byName = au.some((x) => nameCompat(`${x.given ?? ""} ${x.family ?? ""}`, name));
  const y = cr.issued?.["date-parts"]?.[0]?.[0] ?? cr.published?.["date-parts"]?.[0]?.[0] ?? 0;
  return { found: true, title: String((cr.title ?? [])[0] ?? "").slice(0, 400), venue: String((cr["container-title"] ?? [])[0] ?? "").slice(0, 200), year: y, type: cr.type ?? "", authors: au.length, matched: byOrcid || byName, byOrcid, oa: oa ? oa.id : "" };
}

const fold = (x) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Độ giống nhau của hai nhan đề (0..1): tỉ lệ từ chung trên từ của nhan đề dài hơn. */
export function titleSim(a, b) {
  const x = fold(a).split(" ").filter(Boolean), y = new Set(fold(b).split(" ").filter(Boolean));
  if (!x.length || !y.size) return 0;
  const common = x.filter((w) => y.has(w)).length;
  return common / Math.max(x.length, y.size);
}
/** Khớp danh sách nhan đề (dán từ Google Scholar) với DOI trong Crossref. Mỗi nhan đề: ứng viên tốt nhất có độ giống >= 0.75, kèm cờ tên tác giả khớp. */
export async function matchTitles(titles, { name, orcid }) {
  const o = normOrcid(orcid), out = [];
  for (let i = 0; i < titles.length; i += 5) {
    out.push(...(await Promise.all(titles.slice(i, i + 5).map(async (t) => {
      const j = await fetchJson(`https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(t)}&rows=3&select=DOI,title,author,issued,container-title,type&mailto=luongviethoang.hcm@gmail.com`, {}, 8000);
      let best = null;
      for (const c of j?.message?.items ?? []) {
        const ct = String((c.title ?? [])[0] ?? ""), sim = titleSim(t, ct);
        if (sim >= 0.75 && (!best || sim > best.sim)) {
          const au = c.author ?? [], y = c.issued?.["date-parts"]?.[0]?.[0] ?? 0;
          best = { doi: normDoi(c.DOI), title: ct.slice(0, 300), venue: String((c["container-title"] ?? [])[0] ?? "").slice(0, 160), year: y, sim: Math.round(sim * 100) / 100, name: au.some((x) => nameCompat(`${x.given ?? ""} ${x.family ?? ""}`, name)) || (!!o && au.some((x) => normOrcid(x.ORCID) === o)) };
        }
      }
      return { q: t, hit: best && best.doi ? best : null };
    }))));
  }
  return out;
}
