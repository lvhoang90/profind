import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons";
import { api, useAccount, type User } from "./accountStore";
import { useHidden } from "./hidden";
import { evt } from "./analytics";
import { useMine } from "./Verified";

// Bước "Nhà khoa học này có phải bạn?" ngay sau khi đăng ký: so tên, email, đơn vị người dùng với chỉ mục công khai và đề xuất tối đa 3 hồ sơ.
// Chọn gợi ý KHÔNG tự cấp xác thực: yêu cầu vẫn đi qua claim-submit như cũ (kiểm tra tự động hoặc quản trị viên duyệt).
type Row = [string, string, string[], number, number, number, string, number, number | null]; // id, tên, đơn vị, công trình, trích dẫn, năm cuối, orcid, top2, pro
type Idx = { i: Record<string, [string, string]>; d: Record<string, string[]>; a: Row[] };
export type Cand = { id: string; name: string; units: string[]; works: number; cites: number; last: number; orcid: string; top2: boolean; score: number; why: [string, string][] };

const fold = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const PART = new Set(["thi", "van", "huu", "duc", "ngoc", "minh"]); // đệm thường bị bỏ khi viết tên không dấu
const FREE = /@(gmail|yahoo|outlook|hotmail|icloud|live|msn|proton(mail)?|me)\./i;
export const isFree = (email: string) => FREE.test(email);

/** Mức giống nhau của hai họ tên (0..1): cùng bộ chữ sau khi bỏ dấu, chấp nhận đảo thứ tự (Nguyễn Phi Hùng = Phi-Hung Nguyen). */
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

export function suggest(idx: Idx, user: Pick<User, "name" | "email" | "org">, hidden: Set<string>, orcid = ""): Cand[] {
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
    if (byOrcid) { score = 100; why.push(["ok", "ORCID trùng khớp"]); }
    else {
      score += 40 * sim; why.push([sim === 1 ? "ok" : "mid", sim === 1 ? "Tên khớp hoàn toàn (bỏ dấu)" : sim >= 0.9 ? "Tên khớp, khác phần đệm" : "Tên gần giống"]);
      const hit = unitIds.length ? r[2].some((x) => unitIds.includes(x)) : false;
      if (hit) { score += 30; why.push(["ok", "Đơn vị khớp tên miền email"]); }
      else if (unitIds.length) why.push(["no", "Khác đơn vị theo email"]);
      const names = r[2].map((x) => fold(`${idx.i[x]?.[0] ?? ""} ${idx.i[x]?.[1] ?? ""}`).split(" "));
      if (orgTok.size && names.some((n) => n.filter((x) => orgTok.has(x)).length >= 2 || (idx.i[r[2][0]]?.[1] && orgTok.has(fold(idx.i[r[2][0]][1]))))) { score += 15; why.push(["ok", "Khớp đơn vị bạn khai"]); }
      if (r[5] >= year - 2) { score += 10; why.push(["ok", "Có công bố gần đây"]); }
      if (!hit && !unitIds.length) why.push(["no", "Chưa rõ đơn vị từ email"]);
    }
    out.push({ id: r[0], name: r[1], units: r[2], works: r[3], cites: r[4], last: r[5], orcid: r[6], top2: !!r[7], score: Math.round(score), why });
  }
  return out.sort((x, y) => y.score - x.score || y.works - x.works).slice(0, 30);
}
const band = (x: number): [string, string] => x >= 70 ? ["Rất có thể là bạn", ""] : x >= 45 ? ["Có thể là bạn", "mid"] : ["Ít khả năng", "low"];
const ini = (n: string) => { const w = n.split(/[\s-]+/).filter(Boolean); return ((w[0]?.[0] ?? "") + (w[w.length - 1]?.[0] ?? "")).toUpperCase(); };
const HUES = ["#17688f", "#7a5cff", "#c2417f", "#0e8a5f", "#b36b00"];

function CandCard({ c, idx, sel, gone, onPick, onNo, onUndo }: { c: Cand; idx: Idx; sel: boolean; gone: boolean; onPick: () => void; onNo: () => void; onUndo: () => void }) {
  const [lbl, cls] = band(c.score), h = HUES[c.id.length % HUES.length];
  return (
    <div className="sg-card" data-sel={sel} data-gone={gone}>
      <div className="sg-row"><span className="sg-av" style={{ background: h }}>{ini(c.name)}</span><div className="sg-who"><b>{c.name}</b>{c.top2 && <span className="sg-t2">★ Top 2%</span>}<small>{c.units.map((u) => idx.i[u]?.[0] ?? u).slice(0, 2).join(", ") || "Chưa rõ đơn vị"}</small></div></div>
      <p className="sg-stats"><span><b>{c.works}</b> công trình</span><span><b>{c.cites.toLocaleString("vi-VN")}</b> trích dẫn</span>{c.last > 0 && <span>công bố gần nhất {c.last}</span>}</p>
      <div className={`sg-conf ${cls}`}><span>{lbl}</span><i><u style={{ width: `${Math.min(100, c.score)}%` }} /></i><span>{c.score}</span></div>
      <p className="sg-chips">{c.why.map(([t, x]) => <span key={x} className={`sg-chip ${t}`}>{x}</span>)}</p>
      {gone ? <button type="button" className="linkb" onClick={onUndo}>Hoàn tác</button> : <div className="sg-btns"><button type="button" className={sel ? "primary" : "ghost"} aria-pressed={sel} onClick={onPick}>{sel ? "✓ Đã chọn" : "Đúng là tôi"}</button><button type="button" className="ghost" onClick={onNo}>Không phải</button><a className="linkb" href={`#/tac-gia/${c.id}`} target="_blank" rel="noopener">Xem hồ sơ</a></div>}
    </div>
  );
}

export function SuggestPage({ user }: { user: User }) {
  const hid = useHidden(), { list: mine } = useMine();
  const [idx, setIdx] = useState<Idx | null>(null), [err, setErr] = useState(false);
  const [step, setStep] = useState(0), [sel, setSel] = useState<string | null>(null), [gone, setGone] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState(false), [q, setQ] = useState(""), [orcid, setOrcid] = useState(""), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [res, setRes] = useState<{ status: string; until: number | null } | null>(null);
  const back = () => { let b = "#/tai-khoan"; try { b = sessionStorage.getItem("profind.sgback") || b; sessionStorage.removeItem("profind.sgback"); } catch { /* bỏ qua */ } location.hash = b; };
  useEffect(() => { fetch("./data/suggest.json").then((r) => r.json()).then(setIdx).catch(() => setErr(true)); }, []);
  const cands = useMemo(() => (idx ? suggest(idx, user, hid.profile, orcid) : []), [idx, user, hid, orcid]);
  const vis = cands.filter((c) => c.score >= 45).slice(0, 3);
  const found = useMemo(() => { const t = fold(q); if (!idx || t.length < 3) return []; const oc = q.replace(/[^0-9X]/gi, ""); return idx.a.filter((r) => !hid.profile.has(r[0]) && (fold(r[1]).includes(t) || (oc.length >= 8 && r[6].replace(/[^0-9X]/gi, "").includes(oc)))).sort((a, b) => b[3] - a[3]).slice(0, 6); }, [idx, q, hid]);
  useEffect(() => { if (idx) evt("sg_show", String(vis.length)); }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (mine && mine.length) return <section className="card"><h2>Bạn đã có hồ sơ khoa học được xác thực</h2><p className="meta">Quản lý hồ sơ của bạn ở tab Hồ sơ.</p><p><a className="primary" href="#/tai-khoan">Vào hồ sơ của tôi</a></p></section>;
  const free = isFree(user.email);
  const picked = cands.find((c) => c.id === sel) ?? (sel && idx ? (() => { const r = idx.a.find((x) => x[0] === sel); return r ? ({ id: r[0], name: r[1], units: r[2], works: r[3], cites: r[4], last: r[5], orcid: r[6], top2: !!r[7], score: 0, why: [] } as Cand) : undefined; })() : undefined);
  const pickManual = (r: Row) => { setSel(r[0]); setManual(false); setStep(1); };
  const rank = picked ? vis.findIndex((c) => c.id === picked.id) + 1 : 0;
  const note = picked ? (picked.score >= 45 && rank ? `Nguồn: chọn từ gợi ý của hệ thống (điểm ${picked.score}/100, gợi ý số ${rank}). ${picked.why.map((w) => w[1]).join("; ")}.` : "Nguồn: người dùng tự tìm hồ sơ ở bước nhận diện sau đăng ký.") : "";
  const send = async () => {
    if (!picked) return; setBusy(true); setMsg(""); evt("sg_send", picked.id);
    try { setRes(await api("claim-submit", { authorId: picked.id, authorName: picked.name, kind: "claim", name: user.name, orcid, scholar: "", note })); setStep(2); }
    catch (x) { setMsg((x as Error).message === "freemail" ? "freemail" : (x as Error).message); } finally { setBusy(false); }
  };
  const draft = picked ? `Xin chào ProFind, tôi là ${user.name} (${user.email}). Tôi đề nghị xác thực hồ sơ ${picked.name} (${location.origin}/#/tac-gia/${picked.id}) là của tôi.${orcid ? ` ORCID: ${orcid}.` : ""} Tôi dùng email cá nhân nên gửi đề nghị này để quản trị viên xem xét.` : "";
  const bars = <div className="sg-steps" aria-hidden="true">{[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>;
  if (err) return <section className="card"><p className="banner demo">Chưa tải được dữ liệu gợi ý. Bạn vẫn có thể tìm hồ sơ của mình và bấm "Đây là tôi".</p><p><a className="primary" href="#/">Tìm hồ sơ của tôi</a></p></section>;
  if (!idx) return <p className="empty" role="status">Đang tìm hồ sơ gần với thông tin của bạn…</p>;

  if (step === 2 && picked) {
    const ok = res?.status === "approved";
    return <section className="card sg">{bars}<h2>{ok ? "Đã xác thực hồ sơ" : "Đã gửi yêu cầu"}</h2>
      <ol className="sg-tl"><li><em>✓</em><span><b>Đăng ký xong</b><small>Email đã nhập mã xác nhận</small></span></li><li><em>✓</em><span><b>Chọn hồ sơ</b><small>{picked.name}</small></span></li><li className={ok ? "" : "wait"}><em>{ok ? "✓" : "…"}</em><span><b>{ok ? "Duyệt tự động" : "Chờ quản trị viên duyệt"}</b><small>{ok ? "Các kiểm tra đều đạt" : "Kết quả gửi qua email của bạn"}</small></span></li></ol>
      <p className="banner" role="status"><Icon n="check" />{ok ? "Tick vàng đã hiện cạnh tên bạn. Hãy thêm ảnh đại diện và giới thiệu ngắn." : "Bạn vẫn dùng ProFind bình thường trong lúc chờ."}</p>
      <p><button type="button" className="primary" onClick={back}>Vào tài khoản của tôi</button></p></section>;
  }
  if (step === 1 && picked) {
    return <section className="card sg">{bars}<span className="kic-l">Bước 2 trên 3</span><h2>Xác nhận hồ sơ</h2>
      <div className="sg-card"><div className="sg-row"><span className="sg-av" style={{ background: HUES[picked.id.length % 5] }}>{ini(picked.name)}</span><div className="sg-who"><b>{picked.name}</b><small>{picked.units.map((u) => idx.i[u]?.[0] ?? u).slice(0, 2).join(", ") || "Chưa rõ đơn vị"}</small></div></div></div>
      <label className="sel"><span>Mã ORCID (không bắt buộc, giúp duyệt nhanh hơn)</span><input value={orcid} onChange={(e) => setOrcid(e.target.value)} maxLength={40} placeholder={picked.orcid || "0000-0000-0000-0000"} /></label>
      <ul className="sg-check"><li className={free ? "w" : "y"}><em>{free ? "!" : "✓"}</em>{free ? "Email cá nhân, chưa chứng minh được đơn vị" : "Email của trường/viện"}</li><li className="y"><em>✓</em>Tên tài khoản được đối chiếu với tên hồ sơ</li></ul>
      {free ? <div className="sg-verdict manual"><b>Email cá nhân chưa gửi yêu cầu tự động được</b>Bạn hãy đăng nhập lại bằng email trường/viện, hoặc sao chép nội dung dưới đây gửi tới vienisavietnam@gmail.com để quản trị viên xem xét. Hồ sơ bạn chọn đã được ghi trong nội dung.<textarea readOnly rows={4} value={draft} onFocus={(e) => e.currentTarget.select()} aria-label="Nội dung đề nghị" /><button type="button" className="ghost" onClick={() => void navigator.clipboard?.writeText(draft)}>Sao chép nội dung</button></div>
        : <div className="sg-verdict auto"><b>Sau khi gửi, hệ thống kiểm tra như thường lệ</b>Email tổ chức, ORCID, tên và xung đột. Đạt hết thì xác thực ngay, còn lại chuyển quản trị viên.</div>}
      <div role="alert">{msg && msg !== "freemail" && <p className="banner demo">{msg}</p>}{msg === "freemail" && <p className="banner demo">Email này chưa dùng được để gửi yêu cầu tự động. Hãy dùng email trường/viện hoặc gửi đề nghị riêng như hướng dẫn.</p>}</div>
      <div className="sg-btns"><button type="button" className="ghost" onClick={() => setStep(0)}>Quay lại</button><button type="button" className="primary" disabled={busy || free} onClick={() => void send()}>{busy ? "Đang gửi…" : "Gửi yêu cầu xác thực"}</button></div></section>;
  }
  return (
    <section className="card sg">{bars}
      <span className="kic-l">Bước 1 trên 3</span><h2>Nhà khoa học này có phải bạn?</h2>
      <p className="meta">{vis.length ? `ProFind tìm thấy ${vis.length} hồ sơ gần với thông tin bạn khai (${user.name}${user.email ? `, ${user.email}` : ""}). Chọn đúng hồ sơ của bạn; việc xác thực vẫn kiểm tra như thường lệ.` : "ProFind chưa thấy hồ sơ nào đủ gần với thông tin bạn khai. Hệ thống không đoán bừa để tránh nhận nhầm người."}</p>
      {vis.map((c) => <CandCard key={c.id} c={c} idx={idx} sel={sel === c.id} gone={gone.has(c.id)} onPick={() => { setSel(c.id); evt("sg_pick", c.id); }} onNo={() => { setGone(new Set([...gone, c.id])); if (sel === c.id) setSel(null); }} onUndo={() => { const n = new Set(gone); n.delete(c.id); setGone(n); }} />)}
      <div className="sg-card dash"><b>Không thấy mình trong danh sách?</b>
        {manual && <><label className="sel"><span>Tìm theo tên hoặc ORCID</span><input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Ví dụ: tên của bạn hoặc 0000-0002-…" /></label>
          {found.length > 0 && <ul className="sg-found">{found.map((r) => <li key={r[0]}><button type="button" onClick={() => pickManual(r)}><b>{r[1]}</b><small>{r[2].slice(0, 1).map((u) => idx.i[u]?.[0] ?? u).join("") || "Chưa rõ đơn vị"} · {r[3]} công trình</small></button></li>)}</ul>}
          {q.length >= 3 && !found.length && <p className="meta">Chưa thấy hồ sơ phù hợp. Bạn có thể đề xuất thêm nhà nghiên cứu ở chân trang.</p>}</>}
        <button type="button" className="linkb" onClick={() => setManual(!manual)}>{manual ? "Đóng ô tìm" : "Tìm bằng tên hoặc ORCID"}</button></div>
      <div className="sg-btns"><button type="button" className="ghost" onClick={back}>Để sau</button><button type="button" className="primary" disabled={!sel} onClick={() => setStep(1)}>Tiếp tục</button></div>
      <p className="meta sg-fine">Chỉ dùng dữ liệu công khai (OpenAlex, ORCID). Không hiển thị email hay số điện thoại của người khác.</p>
    </section>
  );
}
