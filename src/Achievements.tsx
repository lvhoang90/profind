import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons";
import { useAccount, type User } from "./accountStore";
import { type Mine } from "./Verified";
import { evt } from "./analytics";

// Cơ chế điểm danh, sao và huy hiệu (học từ Mây/EduFind): chỉ ghi nhận, không có quyền lợi hay hạn mức đi kèm; mọi người vẫn miễn phí.
// Sao: 1 mỗi ngày có mặt, 5 mỗi bạn đăng ký qua mã của bạn, 20 mỗi bạn được mời xác thực thành công, 20 mỗi hồ sơ khoa học đã xác thực của chính bạn, 10 khi khai đủ hồ sơ.
export type Stats = { days: number; streak: number; best: number; invited: number; invitedVerified: number; verified: number; profilePct: number; saved: number; views: number; avatar: number; bio: number; orcid: number; scholar: number };
export const statsOf = (u: User, mine: Mine[] | null, saved: number, views: number): Stats => ({ days: u.counts.days, streak: u.counts.streak, best: u.counts.best, invited: u.counts.invited, invitedVerified: u.counts.invitedVerified, verified: mine?.length ?? 0, profilePct: u.profilePct, saved, views, avatar: mine?.some((m) => m.profile.av) ? 1 : 0, bio: mine?.some((m) => m.profile.bio) ? 1 : 0, orcid: mine?.some((m) => m.profile.orcid) ? 1 : 0, scholar: mine?.some((m) => m.profile.scholar) ? 1 : 0 });
export const starsOf = (c: Stats) => c.days + c.invited * 5 + c.invitedVerified * 20 + c.verified * 20 + (c.profilePct >= 100 ? 10 : 0);
export const LEVELS: [number, string][] = [[0, "Hạt mầm"], [10, "Chồi non"], [30, "Nụ hoa"], [80, "Đóa hoa"], [200, "Bách hoa"]];
export const levelOf = (stars: number) => { let i = 0; LEVELS.forEach(([n], k) => { if (stars >= n) i = k; }); return { i, name: LEVELS[i][1], from: LEVELS[i][0], next: LEVELS[i + 1] ?? null }; };

type Tier = "bronze" | "silver" | "gold" | "diamond" | "legend";
/** Năm cánh của logo Bách hoa tri thức, mỗi cánh một màu và một ý nghĩa; huy hiệu thắp sáng đúng cánh của mình. */
const PETALS = [
  { name: "Khám phá", color: "#35e0ff", sub: "Tìm tòi, xem và chọn lọc tri thức" },
  { name: "Dung mạo", color: "#7a5cff", sub: "Tự kể câu chuyện học thuật của mình" },
  { name: "Lan tỏa", color: "#ff4f9a", sub: "Rủ thêm đồng nghiệp vào khu vườn" },
  { name: "Bền bỉ", color: "#ffa21f", sub: "Quay lại đều đặn, chăm khu vườn mỗi ngày" },
  { name: "Uy tín", color: "#2fd3a6", sub: "Gắn tên mình với danh tính học thuật thật" },
];
type Badge = { id: string; petal: number; tier: Tier; mark: string; name: string; hint: string; meaning: string; need: (c: Stats) => [number, number] };
const BADGES: Badge[] = [
  { id: "d1", petal: 3, tier: "bronze", mark: "1", name: "Hạt giống đầu mùa", hint: "Có mặt lần đầu", meaning: "Mọi khu vườn tri thức đều bắt đầu từ một hạt giống: bạn vừa gieo hạt đầu tiên.", need: (c) => [c.days, 1] },
  { id: "s3", petal: 3, tier: "bronze", mark: "3", name: "Nụ chớm nở", hint: "Điểm danh 3 ngày liên tiếp", meaning: "Ba ngày liền chăm chút, nụ hoa bắt đầu hé.", need: (c) => [Math.max(c.streak, c.best), 3] },
  { id: "s7", petal: 3, tier: "silver", mark: "7", name: "Tuần hoa nở", hint: "Điểm danh 7 ngày liên tiếp", meaning: "Bảy ngày không gián đoạn: sự đều đặn làm nên mùa hoa.", need: (c) => [Math.max(c.streak, c.best), 7] },
  { id: "s30", petal: 3, tier: "gold", mark: "30", name: "Xuân bất tận", hint: "Điểm danh 30 ngày liên tiếp", meaning: "Ba mươi ngày không nghỉ: với bạn, mùa nào cũng là mùa xuân.", need: (c) => [Math.max(c.streak, c.best), 30] },
  { id: "d30", petal: 3, tier: "diamond", mark: "30", name: "Người giữ vườn", hint: "Có mặt 30 ngày khác nhau", meaning: "Quay lại qua nhiều mùa để chăm khu vườn: bạn đã thành người giữ vườn.", need: (c) => [c.days, 30] },
  { id: "e1", petal: 0, tier: "bronze", mark: "10", name: "Lữ khách tò mò", hint: "Xem 10 hồ sơ nhà khoa học", meaning: "Tò mò là bước chân đầu tiên của người đi tìm tri thức.", need: (c) => [c.views, 10] },
  { id: "e2", petal: 0, tier: "silver", mark: "5", name: "Người hái hoa", hint: "Lưu 5 tác giả hoặc tìm kiếm", meaning: "Biết chọn những bông hoa đáng giữ lại giữa cả khu vườn.", need: (c) => [c.saved, 5] },
  { id: "e3", petal: 0, tier: "gold", mark: "50", name: "Hoa tiêu tri thức", hint: "Xem 50 hồ sơ nhà khoa học", meaning: "Đi qua nhiều hồ sơ đến mức chỉ đường được cho người khác.", need: (c) => [c.views, 50] },
  { id: "p100", petal: 1, tier: "bronze", mark: "✓", name: "Dung mạo trọn vẹn", hint: "Khai đủ thông tin tài khoản", meaning: "Một chân dung đủ nét để đồng nghiệp nhận ra và tin cậy.", need: (c) => [c.profilePct, 100] },
  { id: "av", petal: 1, tier: "silver", mark: "◉", name: "Gương mặt học giả", hint: "Đặt ảnh đại diện cho hồ sơ khoa học", meaning: "Sau mỗi công trình là một con người: gương mặt của bạn làm hồ sơ có hồn.", need: (c) => [c.avatar, 1] },
  { id: "bio", petal: 1, tier: "silver", mark: "✎", name: "Lời tự sự", hint: "Viết giới thiệu ngắn cho hồ sơ khoa học", meaning: "Bạn tự kể về hướng nghiên cứu của mình thay vì để con số nói hộ.", need: (c) => [c.bio, 1] },
  { id: "i1", petal: 2, tier: "bronze", mark: "1", name: "Người gieo mầm", hint: "Mời 1 bạn đăng ký", meaning: "Bạn đã trao hạt giống đầu tiên cho một đồng nghiệp.", need: (c) => [c.invited, 1] },
  { id: "iv1", petal: 2, tier: "gold", mark: "✓", name: "Người đỡ đầu", hint: "1 bạn do bạn mời đã xác thực hồ sơ", meaning: "Người bạn mời đã có tên được xác nhận: bạn là người đỡ đầu của họ.", need: (c) => [c.invitedVerified, 1] },
  { id: "i5", petal: 2, tier: "silver", mark: "5", name: "Người ươm vườn", hint: "Mời 5 bạn đăng ký", meaning: "Năm mầm non được bạn ươm: khu vườn bắt đầu thành rừng hoa.", need: (c) => [c.invited, 5] },
  { id: "i10", petal: 2, tier: "diamond", mark: "10", name: "Sứ giả Bách hoa", hint: "Mời 10 bạn đăng ký", meaning: "Mười đồng nghiệp theo chân bạn: bạn mang Bách hoa tri thức đến nhiều ngả đường.", need: (c) => [c.invited, 10] },
  { id: "orcid", petal: 4, tier: "silver", mark: "iD", name: "Hộ chiếu ORCID", hint: "Gắn mã ORCID vào hồ sơ khoa học", meaning: "Mã định danh quốc tế đưa tên bạn đi qua mọi cơ sở dữ liệu khoa học.", need: (c) => [c.orcid, 1] },
  { id: "gs", petal: 4, tier: "silver", mark: "G", name: "Cầu nối Scholar", hint: "Gắn liên kết Google Scholar vào hồ sơ", meaning: "Nối hồ sơ ProFind với nơi công trình của bạn được trích dẫn.", need: (c) => [c.scholar, 1] },
  { id: "v1", petal: 4, tier: "gold", mark: "✓", name: "Dấu ấn học giả", hint: "Xác thực thành công một hồ sơ khoa học", meaning: "ProFind xác nhận hồ sơ này đúng là của bạn: dấu ấn đầu tiên của một học giả có tên có tuổi.", need: (c) => [c.verified, 1] },
];
const CROWN = { id: "bach-hoa", name: "Bách hoa tri thức", hint: "Có ít nhất một huy hiệu ở cả 5 cánh: Khám phá, Dung mạo, Lan tỏa, Bền bỉ, Uy tín", meaning: "Trăm hoa đua nở: bạn đã làm cả năm cánh của khu vườn tri thức cùng nở rộ." };
const TIER: Record<Tier, string> = { bronze: "Đồng", silver: "Bạc", gold: "Vàng", diamond: "Kim cương", legend: "Huyền thoại" };
const TIER_COL: Record<Tier, [string, string]> = { bronze: ["#e0a36a", "#a55f26"], silver: ["#f1f5fb", "#8c9bb3"], gold: ["#ffe27a", "#d99a00"], diamond: ["#b6ecff", "#3fa9f5"], legend: ["#fff3b0", "#ff8a1f"] };
const PETAL_PATH = "M256 172C326 160 336 84 256 40C176 84 186 160 256 172Z";
const GRAD: [string, string][] = [["#35e0ff", "#0a8cff"], ["#5b7bff", "#7a3cff"], ["#ff5fb8", "#ff2f7a"], ["#ffb52e", "#ff8a1f"], ["#7bf0b0", "#17c5a0"]];
/** Khai báo gradient dùng chung cho mọi huy hiệu (một lần trong trang). */
function BadgeDefs() {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false"><defs>
    {GRAD.map(([a, b], i) => <linearGradient key={i} id={`bp${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>)}
    {(Object.keys(TIER_COL) as Tier[]).map((t) => <linearGradient key={t} id={`bt-${t}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={TIER_COL[t][0]} /><stop offset="1" stopColor={TIER_COL[t][1]} /></linearGradient>)}
    <radialGradient id="bbg" cx=".3" cy=".2" r="1"><stop offset="0" stopColor="#2b2f8f" /><stop offset=".6" stopColor="#14164a" /><stop offset="1" stopColor="#0b0c2e" /></radialGradient></defs></svg>;
}
/** Huy hiệu hình bông hoa của logo ProFind: cánh của nhóm sáng rực, bốn cánh còn lại mờ; vành theo hạng; tâm ghi dấu mốc. Bách hoa: cả 5 cánh rực rỡ. */
function BadgeArt({ petal, tier, mark, done }: { petal: number | "all"; tier: Tier; mark: string; done: boolean }) {
  return (
    <svg className={`bart${done ? "" : " off"}`} viewBox="0 0 512 512" role="img" aria-hidden="true">
      <circle cx="256" cy="256" r="246" fill="url(#bbg)" /><circle cx="256" cy="256" r="236" fill="none" stroke={`url(#bt-${tier})`} strokeWidth="20" />
      {[0, 1, 2, 3, 4].map((i) => { const on = petal === "all" || petal === i; return <g key={i} transform={`rotate(${i * 72} 256 256)`}><path d={PETAL_PATH} fill={on ? `url(#bp${i})` : "#ffffff"} fillOpacity={on ? 1 : 0.12} />{on && <path d="M256 172C326 160 336 84 256 40Z" fill="#fff" fillOpacity=".2" />}</g>; })}
      <circle cx="256" cy="256" r="72" fill="#fff" /><circle cx="256" cy="256" r="72" fill="none" stroke={`url(#bt-${tier})`} strokeWidth="8" />
      <text x="256" y="256" textAnchor="middle" dominantBaseline="central" fontSize={mark.length > 2 ? 44 : mark.length > 1 ? 58 : 72} fontWeight="800" fill="#14164a" fontFamily="Inter,system-ui,sans-serif">{mark}</text>
    </svg>
  );
}
const status = (c: Stats) => {
  const base = BADGES.map((b) => { const [have, want] = b.need(c); return { ...b, have: Math.min(have, want), want, done: have >= want, pct: Math.min(1, have / want) }; });
  const bloomed = new Set(base.filter((b) => b.done).map((b) => b.petal));
  return { base, bloomed, crown: bloomed.size === 5 };
};

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
function Week({ streak, today }: { streak: number; today: boolean }) {
  // 7 ô gần nhất (cũ -> mới), suy ra từ chuỗi hiện tại; ô cuối là hôm nay.
  const on = Array(7).fill(false); for (let i = 0; i < Math.min(7, streak); i++) on[(today ? 6 : 5) - i] = true;
  const dow = (new Date().getDay() + 6) % 7; // 0 = T2
  return <ol className="dweek" aria-label="7 ngày gần nhất">{on.map((v, i) => <li key={i} className={`${v ? "on" : ""}${i === 6 ? " now" : ""}`}><i>{v ? "★" : ""}</i><span>{dayLabels[(dow - (6 - i) + 7 * 2) % 7]}</span></li>)}</ol>;
}

const SHARE_TEXT = "Mình đang dùng ProFind để tra cứu, xếp hạng nhà khoa học Việt Nam và quản lý hồ sơ khoa học. Bạn thử tìm hồ sơ của mình và xác thực miễn phí nhé:";
export function InviteCard({ user, compact = false }: { user: User; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const link = user.ref ? `${location.origin}/?ref=${user.ref}&utm_source=ref&utm_medium=invite&utm_campaign=referral` : "";
  if (!link) return null;
  const u = encodeURIComponent(link), t = encodeURIComponent(SHARE_TEXT);
  const copy = () => { void navigator.clipboard?.writeText(`${SHARE_TEXT} ${link}`).then(() => { setCopied(true); evt("invite_copy"); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); };
  const native = () => { evt("invite_share"); void navigator.share?.({ title: "ProFind", text: SHARE_TEXT, url: link }).catch(() => {}); };
  const nets: [string, string][] = [["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`], ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`], ["WhatsApp", `https://wa.me/?text=${t}%20${u}`], ["Telegram", `https://t.me/share/url?url=${u}&text=${t}`], ["Email", `mailto:?subject=${encodeURIComponent("Mời bạn dùng ProFind")}&body=${t}%20${u}`]];
  return (
    <section className={`card invite${compact ? " compact" : ""}`}>
      <h2><Icon n="users" size={20} />Mời đồng nghiệp cùng dùng ProFind</h2>
      <p className="meta">Mỗi bạn đăng ký qua liên kết của bạn: <b>+5 ★</b>. Bạn đó xác thực hồ sơ khoa học thành công: <b>+20 ★</b> nữa. Chỉ ghi nhận thành tích; ProFind vẫn miễn phí vĩnh viễn cho tất cả.</p>
      <div className="inv-box"><input readOnly value={link} aria-label="Liên kết mời của bạn" onFocus={(e) => e.currentTarget.select()} /><button type="button" className="primary" onClick={copy}>{copied ? "Đã sao chép ✓" : "Sao chép lời mời"}</button></div>
      <p className="inv-nets">{typeof navigator !== "undefined" && "share" in navigator && <button type="button" className="ghost" onClick={native}><Icon n="external" size={14} />Chia sẻ…</button>}{nets.map(([n, h]) => <a key={n} className="ghost-link" href={h} target="_blank" rel="noopener" onClick={() => evt("invite_" + n.toLowerCase())}>{n}</a>)}</p>
      <ul className="inv-stats"><li><b>{user.counts.invited}</b><span>bạn đã đăng ký</span></li><li><b>{user.counts.invitedVerified}</b><span>bạn đã xác thực</span></li><li><b>{user.counts.invited * 5 + user.counts.invitedVerified * 20}</b><span>★ nhờ lan tỏa</span></li></ul>
    </section>
  );
}

/** Dải điểm danh, sao và cấp độ gọn ở đầu tài khoản. */
export function StarStrip({ user, mine, saved }: { user: User; mine: Mine[] | null; saved: number }) {
  const c = statsOf(user, mine, saved, 0), stars = starsOf(c), lv = levelOf(stars);
  return <div className="strip" role="group" aria-label="Thành tích"><span className="chip fire" title="Chuỗi ngày liên tiếp">🔥 <b>{c.streak}</b> ngày</span><span className="chip star" title="Tổng số sao">★ <b>{stars}</b></span><span className="chip lv" title={lv.next ? `Còn ${lv.next[0] - stars} ★ nữa lên "${lv.next[1]}"` : "Cấp cao nhất"}>{lv.name}</span></div>;
}

type Earned = { id: string; name: string; meaning: string; petal: number | "all"; tier: Tier; mark: string };
export function Achievements({ user, mine }: { user: User; mine: Mine[] | null }) {
  const { favs, searches, views } = useAccount();
  const c = useMemo(() => statsOf(user, mine, favs.size + searches.length, views.length), [user, mine, favs, searches, views]);
  const stars = starsOf(c), lv = levelOf(stars), st = status(c), all = st.base, got = all.filter((b) => b.done).length + (st.crown ? 1 : 0);
  const next = all.filter((b) => !b.done).sort((a, b) => b.pct - a.pct)[0];
  const [fresh, setFresh] = useState<Earned[]>([]);
  useEffect(() => { // trao huy hiệu mới nhận kể từ lần xem trước (lần đầu chỉ ghi nhận, không trao hàng loạt)
    if (!mine) return;
    try {
      const raw = localStorage.getItem("profind.badges"), seen: string[] = raw ? JSON.parse(raw) : [], now = [...all.filter((b) => b.done).map((b) => b.id), ...(st.crown ? [CROWN.id] : [])];
      if (raw) setFresh([...all.filter((b) => b.done && !seen.includes(b.id)).map((b) => ({ id: b.id, name: b.name, meaning: b.meaning, petal: b.petal as number | "all", tier: b.tier, mark: b.mark })), ...(st.crown && !seen.includes(CROWN.id) ? [{ id: CROWN.id, name: CROWN.name, meaning: CROWN.meaning, petal: "all" as const, tier: "legend" as Tier, mark: "✿" }] : [])]);
      localStorage.setItem("profind.badges", JSON.stringify(now));
    } catch { /* bỏ qua */ }
  }, [got, mine]); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = lv.next ? Math.min(100, Math.round(((stars - lv.from) / (lv.next[0] - lv.from)) * 100)) : 100;
  return (
    <>
      <BadgeDefs />
      {fresh.slice(0, 3).map((b) => <section key={b.id} className="award" role="status"><BadgeArt petal={b.petal} tier={b.tier} mark={b.mark} done /><div><p className="aw-k">Huy hiệu mới · {TIER[b.tier]}</p><h2>{b.name}</h2><p>{b.meaning}</p></div><button type="button" className="ghost" onClick={() => setFresh((f) => f.filter((x) => x.id !== b.id))} aria-label="Đóng">✕</button></section>)}
      {fresh.length > 3 && <p className="banner" role="status"><Icon n="star" />Và {fresh.length - 3} huy hiệu mới khác trong bộ sưu tập bên dưới.</p>}
      <section className="card streak">
        <div className="flame" aria-hidden="true">🔥</div>
        <div className="sinfo"><h2>{c.streak ? `${c.streak} ngày liên tiếp` : "Bắt đầu chuỗi ngày của bạn"}</h2>
          <p className="meta">{user.counts.today ? "Hôm nay bạn đã điểm danh rồi (mở ProFind khi đã đăng nhập là tính một ngày). Hẹn gặp lại ngày mai!" : "Mở ProFind khi đã đăng nhập là tự điểm danh một ngày."} Kỷ lục: <b>{Math.max(c.best, c.streak)} ngày</b>.</p>
          <Week streak={c.streak} today={user.counts.today} /></div>
        <div className="starbox"><b>★ {stars}</b><span>sao</span></div>
      </section>
      <section className="card lvl"><div className="lvl-top"><h2>{lv.name}</h2><span className="meta">{lv.next ? `Còn ${lv.next[0] - stars} ★ nữa lên "${lv.next[1]}"` : "Bạn đã đạt cấp cao nhất"}</span></div><div className="lbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <p className="meta">Cấp độ theo sao: Hạt mầm, Chồi non, Nụ hoa, Đóa hoa, Bách hoa. Sao: 1 mỗi ngày có mặt · 5 mỗi bạn mời đăng ký · 20 mỗi bạn mời xác thực thành công · 20 mỗi hồ sơ khoa học đã xác thực · 10 khi khai đủ hồ sơ.{next && <> Mục tiêu gần nhất: <b>{next.name}</b> ({next.have}/{next.want}).</>}</p></section>
      <InviteCard user={user} />
      <section className="card"><h2>Bách hoa tri thức <span className="meta">{got}/{all.length + 1} huy hiệu</span></h2>
        <p className="meta">Logo ProFind là một bông hoa năm cánh. Mỗi cánh là một con đường: {PETALS.map((p) => p.name).join(", ")}. Nhận huy hiệu ở cánh nào, cánh ấy sáng lên; sáng đủ cả năm cánh, bạn nhận danh hiệu <b>Bách hoa tri thức</b>.</p>
        <ul className="bloom">{PETALS.map((p, i) => <li key={p.name} className={st.bloomed.has(i) ? "on" : ""} style={{ ["--pc" as string]: p.color }}><i aria-hidden="true" /><b>{p.name}</b></li>)}</ul>
        <div className="crown"><BadgeArt petal="all" tier="legend" mark="✿" done={st.crown} /><div><h3>{CROWN.name}{st.crown && <span className="tag">Đã đạt</span>}</h3><p className="meta">{CROWN.hint}</p><p>{st.crown ? CROWN.meaning : `Đã sáng ${st.bloomed.size}/5 cánh.`}</p></div></div>
        {PETALS.map((p, i) => <div key={p.name} className="bgroup" style={{ ["--pc" as string]: p.color }}><h3><i className="pdot" aria-hidden="true" />Cánh {p.name}<small>{p.sub}</small></h3>
          <ul className="bdg-grid">{all.filter((b) => b.petal === i).map((b) => <li key={b.id} className={`${b.tier}${b.done ? " done" : ""}`}><BadgeArt petal={b.petal} tier={b.tier} mark={b.mark} done={b.done} /><b>{b.name}</b><small>{b.done ? `${TIER[b.tier]} · đã đạt` : `${b.have}/${b.want} · ${b.hint}`}</small>{b.done ? <em>{b.meaning}</em> : <i className="pg"><u style={{ width: `${b.pct * 100}%` }} /></i>}</li>)}</ul></div>)}
      </section>
    </>
  );
}
