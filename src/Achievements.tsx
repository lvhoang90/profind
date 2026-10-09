import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons";
import { useAccount, type User } from "./accountStore";
import { type Mine } from "./Verified";
import { evt } from "./analytics";

// Cơ chế điểm danh, sao và huy hiệu (học từ Mây/EduFind): chỉ ghi nhận, không có quyền lợi hay hạn mức đi kèm; mọi người vẫn miễn phí.
// Sao: 1 mỗi ngày có mặt, 5 mỗi bạn đăng ký qua mã của bạn, 20 mỗi bạn được mời xác thực thành công, 20 mỗi hồ sơ khoa học đã xác thực của chính bạn, 10 khi khai đủ hồ sơ.
export type Stats = { days: number; streak: number; best: number; invited: number; invitedVerified: number; verified: number; profilePct: number; saved: number };
export const statsOf = (u: User, verified: number, saved: number): Stats => ({ days: u.counts.days, streak: u.counts.streak, best: u.counts.best, invited: u.counts.invited, invitedVerified: u.counts.invitedVerified, verified, profilePct: u.profilePct, saved });
export const starsOf = (c: Stats) => c.days + c.invited * 5 + c.invitedVerified * 20 + c.verified * 20 + (c.profilePct >= 100 ? 10 : 0);
export const LEVELS: [number, string][] = [[0, "Người mới"], [10, "Nhà thám hiểm"], [30, "Cộng tác viên"], [80, "Đại sứ ProFind"], [200, "Nhà tiên phong"]];
export const levelOf = (stars: number) => { let i = 0; LEVELS.forEach(([n], k) => { if (stars >= n) i = k; }); return { i, name: LEVELS[i][1], from: LEVELS[i][0], next: LEVELS[i + 1] ?? null }; };

type Tier = "bronze" | "silver" | "gold" | "diamond";
type Badge = { id: string; group: string; tier: Tier; name: string; hint: string; need: (c: Stats) => [number, number] };
const GROUPS: Record<string, string> = { back: "Quay lại mỗi ngày", sci: "Hồ sơ khoa học", share: "Lan tỏa" };
const BADGES: Badge[] = [
  { id: "d1", group: "back", tier: "bronze", name: "Xin chào", hint: "Có mặt lần đầu", need: (c) => [c.days, 1] },
  { id: "s3", group: "back", tier: "bronze", name: "Ba ngày liền", hint: "Điểm danh 3 ngày liên tiếp", need: (c) => [Math.max(c.streak, c.best), 3] },
  { id: "s7", group: "back", tier: "silver", name: "Tuần chuyên cần", hint: "Điểm danh 7 ngày liên tiếp", need: (c) => [Math.max(c.streak, c.best), 7] },
  { id: "s30", group: "back", tier: "gold", name: "Tháng bền bỉ", hint: "Điểm danh 30 ngày liên tiếp", need: (c) => [Math.max(c.streak, c.best), 30] },
  { id: "d30", group: "back", tier: "diamond", name: "Cộng sự lâu năm", hint: "Có mặt 30 ngày khác nhau", need: (c) => [c.days, 30] },
  { id: "p100", group: "sci", tier: "bronze", name: "Hồ sơ đầy đủ", hint: "Khai đủ thông tin tài khoản", need: (c) => [c.profilePct, 100] },
  { id: "v1", group: "sci", tier: "gold", name: "Nhà khoa học xác thực", hint: "Xác thực thành công một hồ sơ khoa học", need: (c) => [c.verified, 1] },
  { id: "f5", group: "sci", tier: "silver", name: "Nhà sưu tầm", hint: "Lưu 5 tác giả hoặc tìm kiếm", need: (c) => [c.saved, 5] },
  { id: "i1", group: "share", tier: "bronze", name: "Người truyền cảm hứng", hint: "Mời 1 bạn đăng ký", need: (c) => [c.invited, 1] },
  { id: "i5", group: "share", tier: "silver", name: "Đại sứ", hint: "Mời 5 bạn đăng ký", need: (c) => [c.invited, 5] },
  { id: "iv1", group: "share", tier: "gold", name: "Người dẫn đường", hint: "1 bạn do bạn mời đã xác thực hồ sơ", need: (c) => [c.invitedVerified, 1] },
  { id: "i10", group: "share", tier: "diamond", name: "Người kết nối", hint: "Mời 10 bạn đăng ký", need: (c) => [c.invited, 10] },
];
const TIER: Record<Tier, string> = { bronze: "Đồng", silver: "Bạc", gold: "Vàng", diamond: "Kim cương" };
const status = (c: Stats) => BADGES.map((b) => { const [have, want] = b.need(c); return { ...b, have: Math.min(have, want), want, done: have >= want, pct: Math.min(1, have / want) }; });

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
export function StarStrip({ user, verified, saved }: { user: User; verified: number; saved: number }) {
  const c = statsOf(user, verified, saved), stars = starsOf(c), lv = levelOf(stars);
  return <div className="strip" role="group" aria-label="Thành tích"><span className="chip fire" title="Chuỗi ngày liên tiếp">🔥 <b>{c.streak}</b> ngày</span><span className="chip star" title="Tổng số sao">★ <b>{stars}</b></span><span className="chip lv" title={lv.next ? `Còn ${lv.next[0] - stars} ★ nữa lên "${lv.next[1]}"` : "Cấp cao nhất"}>{lv.name}</span></div>;
}

export function Achievements({ user, mine }: { user: User; mine: Mine[] | null }) {
  const { favs, searches } = useAccount();
  const c = useMemo(() => statsOf(user, mine?.length ?? 0, favs.size + searches.length), [user, mine, favs, searches]);
  const stars = starsOf(c), lv = levelOf(stars), all = status(c), got = all.filter((b) => b.done).length;
  const next = all.filter((b) => !b.done).sort((a, b) => b.pct - a.pct)[0];
  const [fresh, setFresh] = useState<string[]>([]);
  useEffect(() => { // thông báo huy hiệu mới nhận kể từ lần xem trước
    try { const seen: string[] = JSON.parse(localStorage.getItem("profind.badges") || "null") ?? []; const now = all.filter((b) => b.done).map((b) => b.id); if (localStorage.getItem("profind.badges")) setFresh(all.filter((b) => b.done && !seen.includes(b.id)).map((b) => b.name)); localStorage.setItem("profind.badges", JSON.stringify(now)); } catch { /* bỏ qua */ }
  }, [got]); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = lv.next ? Math.min(100, Math.round(((stars - lv.from) / (lv.next[0] - lv.from)) * 100)) : 100;
  return (
    <>
      {fresh.length > 0 && <p className="banner" role="status"><Icon n="star" />Chúc mừng! Bạn vừa nhận huy hiệu: <b>{fresh.join(", ")}</b></p>}
      <section className="card streak">
        <div className="flame" aria-hidden="true">🔥</div>
        <div className="sinfo"><h2>{c.streak ? `${c.streak} ngày liên tiếp` : "Bắt đầu chuỗi ngày của bạn"}</h2>
          <p className="meta">{user.counts.today ? "Hôm nay bạn đã điểm danh rồi (mở ProFind khi đã đăng nhập là tính một ngày). Hẹn gặp lại ngày mai!" : "Mở ProFind khi đã đăng nhập là tự điểm danh một ngày."} Kỷ lục: <b>{Math.max(c.best, c.streak)} ngày</b>.</p>
          <Week streak={c.streak} today={user.counts.today} /></div>
        <div className="starbox"><b>★ {stars}</b><span>sao</span></div>
      </section>
      <section className="card lvl"><div className="lvl-top"><h2>{lv.name}</h2><span className="meta">{lv.next ? `Còn ${lv.next[0] - stars} ★ nữa lên "${lv.next[1]}"` : "Bạn đã đạt cấp cao nhất"}</span></div><div className="lbar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <p className="meta">Sao: 1 mỗi ngày có mặt · 5 mỗi bạn mời đăng ký · 20 mỗi bạn mời xác thực thành công · 20 mỗi hồ sơ khoa học đã xác thực · 10 khi khai đủ hồ sơ.{next && <> Mục tiêu gần nhất: <b>{next.name}</b> ({next.have}/{next.want}).</>}</p></section>
      <InviteCard user={user} />
      <section className="card"><h2>Bộ sưu tập huy hiệu <span className="meta">{got}/{all.length}</span></h2>
        {Object.entries(GROUPS).map(([g, label]) => <div key={g} className="bgroup"><h3>{label}</h3><ul className="bdg-grid">{all.filter((b) => b.group === g).map((b) => <li key={b.id} className={`${b.tier}${b.done ? " done" : ""}`} title={b.hint}><span className="bstar" aria-hidden="true">{b.done ? "★" : "☆"}</span><b>{b.name}</b><small>{b.done ? TIER[b.tier] : `${b.have}/${b.want}`}</small><i><u style={{ width: `${b.pct * 100}%` }} /></i><em>{b.hint}</em></li>)}</ul></div>)}
      </section>
    </>
  );
}
