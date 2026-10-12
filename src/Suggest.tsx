import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons";
import { api, useAccount, type User } from "./accountStore";
import { useHidden } from "./hidden";
import { evt } from "./analytics";
import { useMine } from "./Verified";
import { useT } from "./i18n";

type LG = "vi" | "en";
// Từ điển cục bộ của màn hình này (vi/en); chuỗi chung của ứng dụng nằm ở i18n.ts.
const L = {
  vi: {
    orcidMatch: "ORCID trùng khớp", nameFull: "Tên khớp hoàn toàn (bỏ dấu)", nameMid: "Tên khớp, khác phần đệm", nameNear: "Tên gần giống",
    unitHit: "Đơn vị khớp tên miền email", unitDiff: "Khác đơn vị theo email", unitOrg: "Khớp đơn vị bạn khai", recent: "Có công bố gần đây", unitUnknownMail: "Chưa rõ đơn vị từ email",
    ribbon: "★ Đề xuất chính", top2: "★ Top 2%", noUnit: "Chưa rõ đơn vị", pctTitle: "Ước tính theo quy tắc so khớp tên, email, đơn vị và hoạt động; không phải xác suất thống kê", pctLabel: "khả năng là bạn",
    works: "công trình", cites: "trích dẫn", last: "công bố gần nhất", undo: "Hoàn tác", chosen: "✓ Đã chọn", itsMe: "Đúng là tôi", pick: "Chọn hồ sơ này", notMe: "Không phải", view: "Xem hồ sơ",
    nudgeLabel: "Gợi ý hồ sơ", nudgeQ: "Có phải bạn trong ProFind?", nudgeNo: "Nhận tick xác thực cho hồ sơ của bạn",
    nudgeYes: (n: number) => `ProFind tìm thấy ${n} hồ sơ có thể là bạn. Chọn đúng hồ sơ để xác thực, mất chưa tới một phút.`,
    nudgeNone: "Tìm hồ sơ của bạn trong hơn 17.000 nhà khoa học, rồi gửi yêu cầu xác thực.", seeSug: "Xem gợi ý", findMine: "Tìm hồ sơ của tôi", later: "Nhắc sau",
    haveProfile: "Bạn đã có hồ sơ khoa học được xác thực", manageIn: "Quản lý hồ sơ của bạn ở tab Hồ sơ.", goProfile: "Vào hồ sơ của tôi",
    noteSug: (sc: number, rank: number, why: string) => `Nguồn: chọn từ gợi ý của hệ thống (điểm ${sc}/100, gợi ý số ${rank}). ${why}.`, noteSelf: "Nguồn: người dùng tự tìm hồ sơ ở bước nhận diện sau đăng ký.",
    sendFail: "Chưa gửi được yêu cầu. Hãy kiểm tra thông tin rồi thử lại.", tooMany: "Bạn gửi quá nhiều yêu cầu, hãy thử lại sau.",
    loadFail: "Chưa tải được dữ liệu gợi ý. Bạn vẫn có thể tìm hồ sơ của mình và bấm \"Đây là tôi\".", loading: "Đang tìm hồ sơ gần với thông tin của bạn…",
    doneOk: "Đã xác thực hồ sơ", doneSent: "Đã gửi yêu cầu", tl1: "Đăng ký xong", tl1s: "Email đã nhập mã xác nhận", tl2: "Chọn hồ sơ", tlAuto: "Duyệt tự động", tlWait: "Chờ quản trị viên duyệt",
    tlOk: "Các kiểm tra đều đạt", tlFree: "Email cá nhân nên cần người xem; kết quả gửi qua email", tlMail: "Kết quả gửi qua email của bạn",
    bnOk: "Tick vàng đã hiện cạnh tên bạn. Hãy thêm ảnh đại diện và giới thiệu ngắn.", bnWait: "Bạn vẫn dùng ProFind bình thường trong lúc chờ.", goAcc: "Vào tài khoản của tôi",
    step2: "Bước 2 trên 3", confirm: "Xác nhận hồ sơ", orcidLbl: "Mã ORCID (không bắt buộc, giúp duyệt nhanh hơn)",
    chkFree: "Email cá nhân: không tự duyệt, chuyển quản trị viên xem xét", chkDom: (d: string, k: string) => `Tên miền ${d} thuộc ${k}`, chkMail: (d: string) => `Email ${d}`, chkName: "Tên tài khoản được đối chiếu với tên hồ sơ",
    kinds: { "giáo dục": "giáo dục", "cơ quan nhà nước": "cơ quan nhà nước", "học thuật": "học thuật" } as Record<string, string>,
    vManT: "Sẽ chuyển quản trị viên xem xét", vManB: "Bạn dùng email cá nhân nên yêu cầu không được duyệt tự động. Bạn không phải làm gì thêm; kết quả gửi qua email, thường trong vài ngày. Thêm ORCID hoặc dùng email trường/viện sẽ giúp duyệt nhanh hơn.",
    vAutoT: "Sau khi gửi, hệ thống kiểm tra như thường lệ", vAutoB: "Email tổ chức, ORCID, tên và xung đột. Đạt hết thì xác thực ngay, còn lại chuyển quản trị viên.",
    back: "Quay lại", sending: "Đang gửi…", send: "Gửi yêu cầu xác thực", step1: "Bước 1 trên 3", h1: "Nhà khoa học này có phải bạn?",
    intro: (n: number, name: string, email: string) => `ProFind tìm thấy ${n} hồ sơ gần với thông tin bạn khai (${name}${email ? `, ${email}` : ""}). Chọn đúng hồ sơ của bạn; việc xác thực vẫn kiểm tra như thường lệ.`,
    introNone: "ProFind chưa thấy hồ sơ nào đủ gần với thông tin bạn khai. Hệ thống không đoán bừa để tránh nhận nhầm người.",
    notFound: "Không thấy mình trong danh sách?", searchLbl: "Tìm theo tên hoặc ORCID", searchPh: "Ví dụ: tên của bạn hoặc 0000-0002-…", noMatch: "Chưa thấy hồ sơ phù hợp. Bạn có thể đề xuất thêm nhà nghiên cứu ở chân trang.",
    closeSearch: "Đóng ô tìm", openSearch: "Tìm bằng tên hoặc ORCID", later2: "Để sau", next: "Tiếp tục",
    fine: "Tỉ lệ % là ước tính theo quy tắc so khớp tên, email, đơn vị và hoạt động, không phải xác suất thống kê. Chỉ dùng dữ liệu công khai (OpenAlex, ORCID); không hiển thị email hay số điện thoại của người khác.",
  },
  en: {
    orcidMatch: "ORCID matches", nameFull: "Name matches exactly (ignoring accents)", nameMid: "Name matches, middle name differs", nameNear: "Similar name",
    unitHit: "Affiliation matches email domain", unitDiff: "Different affiliation by email", unitOrg: "Matches the affiliation you entered", recent: "Recent publications", unitUnknownMail: "Affiliation unclear from email",
    ribbon: "★ Top suggestion", top2: "★ Top 2%", noUnit: "Affiliation unknown", pctTitle: "An estimate from rules matching name, email, affiliation and activity; not a statistical probability", pctLabel: "chance it is you",
    works: "works", cites: "citations", last: "latest publication", undo: "Undo", chosen: "✓ Selected", itsMe: "This is me", pick: "Select this profile", notMe: "Not me", view: "View profile",
    nudgeLabel: "Profile suggestions", nudgeQ: "Is this you on ProFind?", nudgeNo: "Get the verified tick for your profile",
    nudgeYes: (n: number) => `ProFind found ${n} profile${n > 1 ? "s" : ""} that may be you. Pick the right one to verify; it takes under a minute.`,
    nudgeNone: "Find your profile among more than 17,000 scientists, then send a verification request.", seeSug: "See suggestions", findMine: "Find my profile", later: "Remind me later",
    haveProfile: "You already have a verified scientist profile", manageIn: "Manage your profile in the Profile tab.", goProfile: "Go to my profile",
    noteSug: (sc: number, rank: number, why: string) => `Source: picked from the system's suggestions (score ${sc}/100, suggestion #${rank}). ${why}.`, noteSelf: "Source: the user searched for the profile at the post-registration identification step.",
    sendFail: "Could not send the request. Please check your details and try again.", tooMany: "You have sent too many requests. Please try again later.",
    loadFail: "Could not load suggestions. You can still search for your profile and click \"This is me\".", loading: "Looking for profiles close to your details…",
    doneOk: "Profile verified", doneSent: "Request sent", tl1: "Registration done", tl1s: "Email confirmed with a code", tl2: "Profile selected", tlAuto: "Approved automatically", tlWait: "Waiting for admin approval",
    tlOk: "All checks passed", tlFree: "Personal email, so a person must review; the result is sent by email", tlMail: "The result is sent to your email",
    bnOk: "The gold tick now appears next to your name. Add a profile photo and a short bio.", bnWait: "You can keep using ProFind as usual while you wait.", goAcc: "Go to my account",
    step2: "Step 2 of 3", confirm: "Confirm profile", orcidLbl: "ORCID iD (optional, speeds up review)",
    chkFree: "Personal email: not auto-approved, sent to an admin for review", chkDom: (d: string, k: string) => `Domain ${d} belongs to ${k}`, chkMail: (d: string) => `Email ${d}`, chkName: "Your account name is checked against the profile name",
    kinds: { "giáo dục": "an education institution", "cơ quan nhà nước": "a government agency", "học thuật": "an academic institution" } as Record<string, string>,
    vManT: "Will go to an admin for review", vManB: "You use a personal email, so the request is not approved automatically. You need do nothing more; the result is sent by email, usually within a few days. Adding an ORCID iD or using a school/institute email speeds this up.",
    vAutoT: "After you send, the system runs the usual checks", vAutoB: "Organisation email, ORCID, name and conflicts. If all pass you are verified right away; otherwise it goes to an admin.",
    back: "Back", sending: "Sending…", send: "Send verification request", step1: "Step 1 of 3", h1: "Is this scientist you?",
    intro: (n: number, name: string, email: string) => `ProFind found ${n} profile${n > 1 ? "s" : ""} close to the details you gave (${name}${email ? `, ${email}` : ""}). Pick your profile; verification still runs the usual checks.`,
    introNone: "ProFind found no profile close enough to your details. The system does not guess, to avoid matching the wrong person.",
    notFound: "Can't find yourself in the list?", searchLbl: "Search by name or ORCID iD", searchPh: "E.g. your name or 0000-0002-…", noMatch: "No matching profile yet. You can suggest adding a researcher in the footer.",
    closeSearch: "Close search", openSearch: "Search by name or ORCID iD", later2: "Later", next: "Continue",
    fine: "The % is an estimate from rules matching name, email, affiliation and activity, not a statistical probability. Only public data is used (OpenAlex, ORCID); other people's email or phone numbers are never shown.",
  },
};

// Bước "Nhà khoa học này có phải bạn?" ngay sau khi đăng ký: so tên, email, đơn vị người dùng với chỉ mục công khai và đề xuất tối đa 3 hồ sơ.
// Chọn gợi ý KHÔNG tự cấp xác thực: yêu cầu vẫn đi qua claim-submit như cũ (kiểm tra tự động hoặc quản trị viên duyệt).
type Row = [string, string, string[], number, number, number, string, number, number | null]; // id, tên, đơn vị, công trình, trích dẫn, năm cuối, orcid, top2, pro
type Idx = { i: Record<string, [string, string]>; d: Record<string, string[]>; a: Row[] };
export type Cand = { id: string; name: string; units: string[]; works: number; cites: number; last: number; orcid: string; top2: boolean; score: number; why: [string, string][] };

const fold = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const PART = new Set(["thi", "van", "huu", "duc", "ngoc", "minh"]); // đệm thường bị bỏ khi viết tên không dấu
const FREE_DOM = new Set(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.vn", "ymail.com", "rocketmail.com", "outlook.com", "outlook.com.vn", "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "aol.com", "zoho.com", "yandex.com", "yandex.ru"]);
const domainOf = (email: string) => (email.split("@")[1] ?? "").toLowerCase().trim();
export const isFree = (email: string) => { const d = domainOf(email); return !d || FREE_DOM.has(d) || /^(yahoo|outlook|hotmail|live|gmx|yandex)\./.test(d); };
/** Tên miền có nhãn edu hoặc gov (edu.vn, edu.au, gov.vn…) hoặc ac (ac.uk…) được hiểu là tên miền tổ chức, ở bất kỳ quốc gia nào. */
export const orgKind = (email: string) => { const l = domainOf(email).split("."); return l.includes("edu") ? "giáo dục" : l.includes("gov") ? "cơ quan nhà nước" : l.slice(0, -1).includes("ac") ? "học thuật" : ""; };

/** Mức giống nhau của hai họ tên (0..1): cùng bộ chữ sau khi bỏ dấu, chấp nhận đảo thứ tự (Nguyễn Văn An = An Van Nguyen). */
function nameSim(u: string[], a: string[]): number {
  if (!u.length || !a.length) return 0;
  const su = [...u].sort().join(" "), sa = [...a].sort().join(" ");
  if (su === sa) return 1;
  const cu = u.filter((x) => !PART.has(x)), ca = a.filter((x) => !PART.has(x));
  if (cu.length >= 2 && [...cu].sort().join(" ") === [...ca].sort().join(" ")) return 0.9;
  const first = u[0], last = u[u.length - 1], common = u.filter((x) => a.includes(x)).length;
  if (common >= 2 && a.includes(last) && a.includes(first) && common / Math.max(u.length, a.length) >= 0.6) return 0.6; // tên riêng (cuối) và họ (đầu) phải có mặt
  return 0;
}

export function suggest(idx: Idx, user: Pick<User, "name" | "email" | "org">, hidden: Set<string>, orcid = "", lang: LG = "vi"): Cand[] {
  const w = L[lang];
  const nameTok = fold(user.name).split(" ").filter(Boolean), dom = (user.email.split("@")[1] ?? "").toLowerCase();
  // tên miền: khớp đúng hoặc khớp phần sau (mail.ute.udn.vn -> ute.udn.vn)
  const parts = dom.split("."); let unitIds: string[] = [];
  for (let k = 0; k < parts.length - 1 && !unitIds.length; k++) unitIds = idx.d[parts.slice(k).join(".")] ?? [];
  const orgTok = new Set(fold(user.org).split(" ").filter((x) => x.length > 1)), year = new Date().getFullYear(), oc = orcid.replace(/[^0-9X]/gi, "").toUpperCase();
  const out: Cand[] = [];
  for (const r of idx.a) {
    if (hidden.has(r[0])) continue;
    const byOrcid = !!oc && r[6].replace(/[^0-9X]/gi, "").toUpperCase() === oc;
    const sim = nameSim(nameTok, fold(r[1]).split(" ").filter(Boolean));
    if (!byOrcid && sim === 0) continue;
    const why: [string, string][] = []; let score = 0;
    if (byOrcid) { score = 100; why.push(["ok", w.orcidMatch]); }
    else {
      score += 40 * sim; why.push([sim === 1 ? "ok" : "mid", sim === 1 ? w.nameFull : sim >= 0.9 ? w.nameMid : w.nameNear]);
      const hit = unitIds.length ? r[2].some((x) => unitIds.includes(x)) : false;
      if (hit) { score += 30; why.push(["ok", w.unitHit]); }
      else if (unitIds.length) why.push(["no", w.unitDiff]);
      const names = r[2].map((x) => fold(`${idx.i[x]?.[0] ?? ""} ${idx.i[x]?.[1] ?? ""}`).split(" "));
      if (orgTok.size && names.some((n) => n.filter((x) => orgTok.has(x)).length >= 2 || (idx.i[r[2][0]]?.[1] && orgTok.has(fold(idx.i[r[2][0]][1]))))) { score += 15; why.push(["ok", w.unitOrg]); }
      if (r[5] >= year - 2) { score += 10; why.push(["ok", w.recent]); }
      if (!hit && !unitIds.length) why.push(["no", w.unitUnknownMail]);
    }
    out.push({ id: r[0], name: r[1], units: r[2], works: r[3], cites: r[4], last: r[5], orcid: r[6], top2: !!r[7], score: Math.round(score), why });
  }
  return out.sort((x, y) => y.score - x.score || y.works - x.works).slice(0, 30);
}
const band = (x: number): [string, string] => x >= 70 ? ["", ""] : x >= 45 ? ["", "mid"] : ["", "low"]; // chỉ lấy lớp màu; nhãn chữ nằm trong từ điển L
const ini = (n: string) => { const w = n.split(/[\s-]+/).filter(Boolean); return ((w[0]?.[0] ?? "") + (w[w.length - 1]?.[0] ?? "")).toUpperCase(); };
const HUES = ["#17688f", "#7a5cff", "#c2417f", "#0e8a5f", "#b36b00"];

/** Tỉ lệ dự đoán hiển thị cho người dùng: ước tính theo quy tắc so khớp (tên, email, đơn vị, hoạt động), tối đa 99% trừ khi ORCID trùng. */
const pctOf = (c: Cand) => (c.score >= 100 ? 100 : Math.min(99, c.score));
/** Đề xuất chính: điểm từ 70 trở lên và hơn đề xuất kế tiếp ít nhất 15 điểm (hoặc là đề xuất duy nhất). */
export const mainPick = (vis: Cand[]) => (vis[0] && vis[0].score >= 70 && (!vis[1] || vis[0].score - vis[1].score >= 15) ? vis[0].id : null);
function CandCard({ c, idx, main, sel, gone, onPick, onNo, onUndo }: { c: Cand; idx: Idx; main: boolean; sel: boolean; gone: boolean; onPick: () => void; onNo: () => void; onUndo: () => void }) {
  const { lang } = useT(), w = L[lang], [, cls] = band(c.score), h = HUES[c.id.length % HUES.length], pct = pctOf(c);
  return (
    <div className={`sg-card${main ? " main" : ""}`} data-sel={sel} data-gone={gone}>
      {main && <span className="sg-ribbon">{w.ribbon}</span>}
      <div className="sg-row"><span className="sg-av" style={{ background: h }}>{ini(c.name)}</span><div className="sg-who"><b>{c.name}</b>{c.top2 && <span className="sg-t2">{w.top2}</span>}<small>{c.units.map((u) => idx.i[u]?.[0] ?? u).slice(0, 2).join(", ") || w.noUnit}</small></div>
        <div className={`sg-pct ${cls}`} title={w.pctTitle}><b>{pct}%</b><small>{w.pctLabel}</small></div></div>
      <p className="sg-stats"><span><b>{c.works}</b> {w.works}</span><span><b>{c.cites.toLocaleString(lang === "en" ? "en-US" : "vi-VN")}</b> {w.cites}</span>{c.last > 0 && <span>{w.last} {c.last}</span>}</p>
      <div className={`sg-conf ${cls}`}><i><u style={{ width: `${pct}%` }} /></i></div>
      <p className="sg-chips">{c.why.map(([t, x]) => <span key={x} className={`sg-chip ${t}`}>{x}</span>)}</p>
      {gone ? <button type="button" className="linkb" onClick={onUndo}>{w.undo}</button> : <div className="sg-btns"><button type="button" className={sel || main ? "primary" : "ghost"} aria-pressed={sel} onClick={onPick}>{sel ? w.chosen : main ? w.itsMe : w.pick}</button><button type="button" className="ghost" onClick={onNo}>{w.notMe}</button><a className="linkb" href={`#/tac-gia/${c.id}`} target="_blank" rel="noopener">{w.view}</a></div>}
    </div>
  );
}

let idxCache: Promise<Idx> | null = null;
const loadIdx = () => (idxCache ??= fetch("./data/suggest.json").then((r) => r.json()).catch((e) => { idxCache = null; throw e; }));
const SNOOZE = "profind.sgsnooze", DAYS7 = 7 * 864e5;

/** Thẻ nhắc ở đầu tab Hồ sơ cho người chưa có hồ sơ xác thực (kể cả người đăng ký từ trước khi có tính năng): bấm vào để xem gợi ý lúc nào cũng được. */
export function SuggestNudge({ user }: { user: User }) {
  const { lang } = useT(), w = L[lang], hid = useHidden(), [idx, setIdx] = useState<Idx | null>(null), [hide, setHide] = useState(() => { try { return Date.now() - Number(localStorage.getItem(SNOOZE)) < DAYS7; } catch { return false; } });
  useEffect(() => { if (!hide) loadIdx().then(setIdx).catch(() => {}); }, [hide]);
  const vis = useMemo(() => (idx ? suggest(idx, user, hid.profile, "", lang).filter((c) => c.score >= 45).slice(0, 3) : []), [idx, user, hid, lang]);
  if (hide || !idx) return null;
  const snooze = () => { try { localStorage.setItem(SNOOZE, String(Date.now())); } catch { /* bỏ qua */ } setHide(true); };
  return (
    <section className="card sg-nudge" aria-label={w.nudgeLabel}>
      <div className="sg-nudge-top"><span className="kic" aria-hidden="true"><Icon n="scholar" size={20} /></span>
        <div><h2>{vis.length ? w.nudgeQ : w.nudgeNo}</h2>
          <p className="meta">{vis.length ? w.nudgeYes(vis.length) : w.nudgeNone}</p></div></div>
      {vis.length > 0 && <ul className="sg-nudge-list">{vis.map((c) => <li key={c.id}><span className="sg-av" style={{ background: HUES[c.id.length % HUES.length], width: 34, height: 34, fontSize: ".8rem" }}>{ini(c.name)}</span><span><b>{c.name}</b><small>{c.units.map((u) => idx.i[u]?.[0] ?? u).slice(0, 1).join("") || w.noUnit} · {pctOf(c)}%</small></span></li>)}</ul>}
      <div className="sg-btns"><a className="primary" href="#/tai-khoan/nhan-dien" onClick={() => evt("sg_nudge_open")}>{vis.length ? w.seeSug : w.findMine}</a><button type="button" className="ghost" onClick={snooze}>{w.later}</button></div>
    </section>
  );
}

export function SuggestPage({ user }: { user: User }) {
  const { lang } = useT(), w = L[lang], hid = useHidden(), { list: mine } = useMine();
  const [idx, setIdx] = useState<Idx | null>(null), [err, setErr] = useState(false);
  const pick0 = (() => { try { const v = sessionStorage.getItem("profind.sgpick") || ""; sessionStorage.removeItem("profind.sgpick"); return /^A\d{5,12}$/.test(v) ? v : null; } catch { return null; } })(); // hồ sơ Mây đã gợi ý và người dùng đã đồng ý
  const [step, setStep] = useState(pick0 ? 1 : 0), [sel, setSel] = useState<string | null>(pick0), [gone, setGone] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState(false), [q, setQ] = useState(""), [orcid, setOrcid] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [res, setRes] = useState<{ status: string; until: number | null } | null>(null);
  const back = () => { let b = "#/tai-khoan"; try { b = sessionStorage.getItem("profind.sgback") || b; sessionStorage.removeItem("profind.sgback"); } catch { /* bỏ qua */ } location.hash = b; };
  useEffect(() => { loadIdx().then(setIdx).catch(() => setErr(true)); }, []);
  const cands = useMemo(() => (idx ? suggest(idx, user, hid.profile, orcid, lang) : []), [idx, user, hid, orcid, lang]);
  const vis = cands.filter((c) => c.score >= 45).slice(0, 3), main = mainPick(vis.filter((c) => !gone.has(c.id)));
  const found = useMemo(() => { const t = fold(q); if (!idx || t.length < 3) return []; const oc = q.replace(/[^0-9X]/gi, ""); return idx.a.filter((r) => !hid.profile.has(r[0]) && (fold(r[1]).includes(t) || (oc.length >= 8 && r[6].replace(/[^0-9X]/gi, "").includes(oc)))).sort((a, b) => b[3] - a[3]).slice(0, 6); }, [idx, q, hid]);
  useEffect(() => { if (idx) evt("sg_show", String(vis.length)); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (mine && mine.length) return <section className="card"><h2>{w.haveProfile}</h2><p className="meta">{w.manageIn}</p><p><a className="primary" href="#/tai-khoan">{w.goProfile}</a></p></section>;
  const free = isFree(user.email), kind = orgKind(user.email);
  const picked = cands.find((c) => c.id === sel) ?? (sel && idx ? (() => { const r = idx.a.find((x) => x[0] === sel); return r ? ({ id: r[0], name: r[1], units: r[2], works: r[3], cites: r[4], last: r[5], orcid: r[6], top2: !!r[7], score: 0, why: [] } as Cand) : undefined; })() : undefined);
  const pickManual = (r: Row) => { setSel(r[0]); setManual(false); setStep(1); };
  const rank = picked ? vis.findIndex((c) => c.id === picked.id) + 1 : 0;
  const note = picked ? (picked.score >= 45 && rank ? L.vi.noteSug(picked.score, rank, picked.why.map((x) => x[1]).join("; ")) : L.vi.noteSelf) : "";
  const send = async () => {
    if (!picked) return; setBusy(true); setMsg(""); evt("sg_send", picked.id);
    try { setRes(await api("claim-submit", { authorId: picked.id, authorName: picked.name, kind: "claim", name: user.name, orcid, scholar: "", note, lang })); setStep(2); }
    catch (x) { const e = x as Error & { status?: number }; setMsg(lang === "vi" ? e.message : e.status === 429 ? w.tooMany : w.sendFail); } finally { setBusy(false); }
  };
  const bars = <div className="sg-steps" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>;
  if (err) return <section className="card"><p className="banner demo">{w.loadFail}</p><p><a className="primary" href="#/">{w.findMine}</a></p></section>;
  if (!idx) return <p className="empty" role="status">{w.loading}</p>;

  if (step === 2 && picked) {
    const ok = res?.status === "approved";
    return <section className="card sg">{bars}<h2>{ok ? w.doneOk : w.doneSent}</h2>
      <ol className="sg-tl"><li><em>✓</em><span><b>{w.tl1}</b><small>{w.tl1s}</small></span></li><li><em>✓</em><span><b>{w.tl2}</b><small>{picked.name}</small></span></li><li className={ok ? "" : "wait"}><em>{ok ? "✓" : "…"}</em><span><b>{ok ? w.tlAuto : w.tlWait}</b><small>{ok ? w.tlOk : free ? w.tlFree : w.tlMail}</small></span></li></ol>
      <p className="banner" role="status"><Icon n="check" />{ok ? w.bnOk : w.bnWait}</p>
      <p><button type="button" className="primary" onClick={back}>{w.goAcc}</button></p></section>;
  }
  if (step === 1 && picked) {
    return <section className="card sg">{bars}<span className="kic-l">{w.step2}</span><h2>{w.confirm}</h2>
      <div className="sg-card"><div className="sg-row"><span className="sg-av" style={{ background: HUES[picked.id.length % 5] }}>{ini(picked.name)}</span><div className="sg-who"><b>{picked.name}</b><small>{picked.units.map((u) => idx.i[u]?.[0] ?? u).slice(0, 2).join(", ") || w.noUnit}</small></div></div></div>
      <label className="sel"><span>{w.orcidLbl}</span><input value={orcid} onChange={(e) => setOrcid(e.target.value)} maxLength={40} placeholder={picked.orcid || "0000-0000-0000-0000"} /></label>
      <ul className="sg-check"><li className={free ? "w" : "y"}><em>{free ? "!" : "✓"}</em>{free ? w.chkFree : kind ? w.chkDom(domainOf(user.email), w.kinds[kind] ?? kind) : w.chkMail(domainOf(user.email))}</li><li className="y"><em>✓</em>{w.chkName}</li></ul>
      {free ? <div className="sg-verdict manual"><b>{w.vManT}</b>{w.vManB}</div>
        : <div className="sg-verdict auto"><b>{w.vAutoT}</b>{w.vAutoB}</div>}
      <div role="alert">{msg && <p className="banner demo">{msg}</p>}</div>
      <div className="sg-btns"><button type="button" className="ghost" onClick={() => setStep(0)}>{w.back}</button><button type="button" className="primary" disabled={busy} onClick={() => void send()}>{busy ? w.sending : w.send}</button></div></section>;
  }
  return (
    <section className="card sg">{bars}
      <span className="kic-l">{w.step1}</span><h2>{w.h1}</h2>
      <p className="meta">{vis.length ? w.intro(vis.length, user.name, user.email) : w.introNone}</p>
      {vis.map((c) => <CandCard key={c.id} c={c} idx={idx} main={c.id === main} sel={sel === c.id} gone={gone.has(c.id)} onPick={() => { setSel(c.id); evt("sg_pick", c.id); }} onNo={() => { setGone(new Set([...gone, c.id])); if (sel === c.id) setSel(null); }} onUndo={() => { const n = new Set(gone); n.delete(c.id); setGone(n); }} />)}
      <div className="sg-card dash"><b>{w.notFound}</b>
        {manual && <><label className="sel"><span>{w.searchLbl}</span><input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder={w.searchPh} /></label>
          {found.length > 0 && <ul className="sg-found">{found.map((r) => <li key={r[0]}><button type="button" onClick={() => pickManual(r)}><b>{r[1]}</b><small>{r[2].slice(0, 1).map((u) => idx.i[u]?.[0] ?? u).join("") || w.noUnit} · {r[3]} {w.works}</small></button></li>)}</ul>}
          {q.length >= 3 && !found.length && <p className="meta">{w.noMatch}</p>}</>}
        <button type="button" className="linkb" onClick={() => setManual(!manual)}>{manual ? w.closeSearch : w.openSearch}</button></div>
      <div className="sg-btns"><button type="button" className="ghost" onClick={back}>{w.later2}</button><button type="button" className="primary" disabled={!sel} onClick={() => setStep(1)}>{w.next}</button></div>
      <p className="meta sg-fine">{w.fine}</p>
    </section>
  );
}
