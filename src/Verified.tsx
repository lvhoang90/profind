// Tick vàng "Nhà khoa học đã xác thực" + hộp yêu cầu xác thực hồ sơ ("Đây là tôi").
import { DISC } from "./disciplines";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { api, useAccount } from "./accountStore";
import { Icon } from "./icons";

let cache: Map<string, number> | null = null, pending: Promise<void> | null = null;
const subs = new Set<() => void>();
function load() {
  if (cache || pending) return;
  pending = api<{ items: [string, number][] }>("verified").then((j) => { cache = new Map(j.items); }).catch(() => { cache = new Map(); }).finally(() => { pending = null; subs.forEach((f) => f()); });
}
export function useVerified(id: string): number | null {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); load(); return () => { subs.delete(f); }; }, []);
  const u = cache?.get(id);
  return u && u > Date.now() ? u : null;
}
const dmy = (ms: number) => new Date(ms).toLocaleDateString("vi-VN");
const LBL = "Nhà khoa học đã xác thực";

/** Con dấu "đã xác thực": hoa 8 cánh vàng, dấu tích trắng (thay cho vòng tròn phẳng cũ). */
export function VerifiedSeal({ size = 18 }: { size?: number }) {
  const g = `vs${useId().replace(/:/g, "")}`;
  return (
    <svg className="vseal" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset=".55" stopColor="#f5b301" /><stop offset="1" stopColor="#d98a00" /></linearGradient></defs>
      <rect x="4" y="4" width="16" height="16" rx="4.5" fill={`url(#${g})`} /><rect x="4" y="4" width="16" height="16" rx="4.5" transform="rotate(45 12 12)" fill={`url(#${g})`} />
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth=".8" />
      <path d="M8.2 12.4l2.6 2.6 5-5.4" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function VerifiedTick({ id, size = 16 }: { id: string; size?: number }) {
  const until = useVerified(id);
  if (!until) return null;
  return <span className="vtick" title={`${LBL} · hiệu lực đến ${dmy(until)}`} role="img" aria-label={LBL}><VerifiedSeal size={size} /></span>;
}
/** Người đang đăng nhập có phải chủ hồ sơ đã xác thực này không (so theo email xác thực). */
export function useIsMine(id: string): boolean {
  const { user } = useAccount(); const [mine, setMine] = useState(false);
  useEffect(() => { setMine(false); if (user) api<{ verified: { authorId: string; until: number }[] }>("claim-status").then((j) => setMine(j.verified.some((v) => v.authorId === id && v.until > Date.now()))).catch(() => {}); }, [user, id]);
  return mine;
}
export function VerifiedBadge({ id }: { id: string }) {
  const until = useVerified(id);
  if (!until) return null;
  return <span className="badge vbadge"><VerifiedSeal size={18} /><span><b>{LBL}</b><small>hiệu lực đến {dmy(until)}</small></span></span>;
}

type Row = { id: string; authorId: string; status: string; until: number | null; reason: string };
export function ClaimBox({ authorId, authorName, mode = "claim" }: { authorId: string; authorName: string; mode?: "claim" | "remove" | "hide" }) {
  const rm = mode === "remove", hd = mode === "hide";
  const { user } = useAccount();
  const until = useVerified(authorId);
  const [st, setSt] = useState<"idle" | "sending" | "done">("idle"), [err, setErr] = useState(""), [res, setRes] = useState<{ status: string; until: number | null } | null>(null);
  const [mine, setMine] = useState<Row[]>([]);
  useEffect(() => { if (user) api<{ claims: Row[] }>("claim-status").then((j) => setMine(j.claims.filter((c) => c.authorId === authorId))).catch(() => {}); }, [user, authorId, st]);
  if (until && !rm && !hd) return <p className="banner"><Icon n="check" />Hồ sơ này đã được xác thực, hiệu lực đến {dmy(until)}.</p>;
  if (!user) return <p className="banner demo">Để gửi yêu cầu, hãy <a href="#/tai-khoan">đăng nhập bằng email tổ chức</a> (đuôi của trường/viện) rồi quay lại trang này.</p>;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSt("sending"); setErr("");
    const f = new FormData(e.currentTarget);
    try { setRes(await api("claim-submit", { authorId, authorName, kind: mode, name: f.get("name"), orcid: f.get("orcid"), scholar: f.get("scholar"), note: f.get("note") })); setSt("done"); }
    catch (x) { setErr((x as Error).message === "freemail" ? "Email miễn phí (Gmail, Yahoo…) không dùng được cho yêu cầu này. Hãy đăng nhập bằng email của trường/viện, hoặc gửi thư đề nghị riêng tới vienisavietnam@gmail.com để quản trị viên xem xét." : (x as Error).message); setSt("idle"); }
  };
  if (st === "done" && res) return <p className="banner" role="status"><Icon n="check" />{res.status === "approved" ? `Đã xác thực! Tick vàng hiện cạnh tên bạn đến ${dmy(res.until!)}.` : "Đã nhận yêu cầu. Hệ thống đã kiểm tra tự động, quản trị viên sẽ xem xét và gửi kết quả qua email."}</p>;
  const last = mine[0];
  return (
    <section className="card claimbox">
      <h2>{rm ? "Đề nghị gỡ hồ sơ" : hd ? "Ẩn điểm và huy hiệu xếp hạng" : "Đây là tôi — xác thực hồ sơ"}</h2>
      <p className="meta">{hd ? `Đăng nhập bằng email tổ chức (${user.email}). Sau khi kiểm tra danh tính, điểm PRO-SCORE1000™ và huy hiệu xếp hạng của hồ sơ này sẽ được ẩn; công trình khoa học vẫn hiển thị. Bạn có thể yêu cầu hiển thị lại bất cứ lúc nào.` : rm ? `Đăng nhập bằng email tổ chức (${user.email}). Yêu cầu gỡ được quản trị viên xem xét sau khi hệ thống kiểm tra danh tính (ORCID, tên, email). Việc gỡ chỉ áp dụng trên ProFind, dữ liệu gốc ở OpenAlex/ORCID vẫn còn.` : `Đăng nhập bằng email tổ chức (${user.email}). Hồ sơ được xác thực khi email tổ chức, ORCID và tên khớp với hồ sơ OpenAlex; nếu chưa đủ, quản trị viên sẽ xem xét. Tick vàng có hiệu lực 2 năm.`}</p>
      {last && last.status !== "approved" && <p className="meta" role="status">Yêu cầu gần nhất: {last.status === "review" ? "đang chờ duyệt" : last.status === "rejected" ? `chưa được chấp nhận${last.reason ? " — " + last.reason : ""}` : `cần bổ sung${last.reason ? " — " + last.reason : ""}`}.</p>}
      <form onSubmit={submit} className="form">
        <label className="sel"><span>Họ tên đầy đủ</span><input name="name" required maxLength={80} defaultValue={user.name} autoComplete="name" /></label>
        <label className="sel"><span>ORCID</span><input name="orcid" maxLength={40} placeholder="0000-0000-0000-0000" /></label>
        <label className="sel"><span>Google Scholar</span><input name="scholar" type="url" maxLength={300} placeholder="https://scholar.google.com/citations?user=…" /></label>
        <label className="sel"><span>{rm ? "Lý do đề nghị gỡ (bắt buộc)" : "Ghi chú (tuỳ chọn)"}</span><textarea name="note" rows={3} maxLength={1000} required={rm} /></label>
        <p><button className="primary" disabled={st === "sending"}>{st === "sending" ? "Đang gửi…" : rm ? "Gửi đề nghị gỡ hồ sơ" : hd ? "Gửi đề nghị ẩn điểm" : "Gửi yêu cầu xác thực"}</button></p>
        <div role="alert">{err && <p className="banner demo">{err}</p>}</div>
      </form>
    </section>
  );
}

// ---------- Dữ liệu công khai do chủ hồ sơ đã xác thực khai báo ----------
export interface AuthorPub { verified: boolean; xw?: string[]; profile?: { disc?: string[]; orcid: string; scholar: string; site: string; bio: string; hasAvatar: boolean | number; email: string; phone: string }; works?: { doi: string; title: string; venue: string; year: number; oa: string; status: string }[] }
export function useAuthorPub(id: string): AuthorPub | null {
  const ok = useVerified(id); const [d, setD] = useState<AuthorPub | null>(null);
  useEffect(() => { setD(null); if (ok) api<AuthorPub>("author-public", undefined, `&id=${encodeURIComponent(id)}`).then(setD).catch(() => {}); }, [id, ok]);
  return d?.verified ? d : null;
}
/** Phần bổ sung trên trang hồ sơ: giới thiệu, liên hệ công khai, công trình tự bổ sung (chưa tính vào PRO-SCORE). */
export function AuthorExtras({ id }: { id: string }) {
  const d = useAuthorPub(id); if (!d?.profile) return null;
  const p = d.profile, ws = d.works ?? [];
  if (!p.bio && !p.site && !p.email && !p.phone && !ws.length) return null;
  return (
    <section className="card claimbox" aria-label="Thông tin do nhà khoa học tự khai báo">
      <h2>Thông tin do nhà khoa học tự khai báo</h2>
      {p.bio && <p>{p.bio}</p>}
      {(p.site || p.email || p.phone) && <p className="meta">{p.site && <><a href={p.site} target="_blank" rel="noopener nofollow">Trang cá nhân</a> · </>}{p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}{p.phone && <> · {p.phone}</>}</p>}
      {ws.length > 0 && <>
        <h3>Công trình tự bổ sung ({ws.length})</h3>
        <p className="meta">Đã đối chiếu DOI với Crossref. Các công trình này chưa tính vào PRO-SCORE cho tới khi OpenAlex ghi nhận.</p>
        <ul>{ws.map((w) => <li key={w.doi}><a href={`https://doi.org/${w.doi}`} target="_blank" rel="noopener">{w.title || w.doi}</a>{w.venue && <> · {w.venue}</>}{w.year ? ` · ${w.year}` : ""}{w.oa && <span className="badge"> đã có trong OpenAlex</span>}</li>)}</ul></>}
    </section>
  );
}
export function AvatarImg({ id, fallback }: { id: string; fallback: ReactNode }) {
  const d = useAuthorPub(id);
  return d?.profile?.hasAvatar ? <img className="avimg" src={`/api/account?op=avatar&id=${encodeURIComponent(id)}&v=${d.profile.hasAvatar}`} alt="" width={96} height={96} /> : <>{fallback}</>;
}

// ---------- Tab "Hồ sơ khoa học" trong không gian tài khoản ----------
type Mine = { authorId: string; name: string; until: number; hide?: string; xw?: string[]; profile: { disc?: string[]; orcid?: string; scholar?: string; site?: string; bio?: string; email?: string; phone?: string; showContact?: boolean; av?: number | boolean }; works: { doi: string; title: string; year: number; status: string; why: string; oa: string }[] };
// Đọc tệp thành data: URL (CSP của trang chỉ cho img-src 'self' data:, không cho blob:), rồi cắt vuông 256 px.
const shrink = (f: File) => new Promise<string>((res, rej) => {
  const fr = new FileReader();
  fr.onerror = () => rej(new Error("Không đọc được ảnh."));
  fr.onload = () => {
    const img = new Image();
    img.onload = () => { const s = 256, c = document.createElement("canvas"), k = Math.min(img.width, img.height); c.width = c.height = s; c.getContext("2d")!.drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, s, s); res(c.toDataURL("image/jpeg", 0.82)); };
    img.onerror = () => rej(new Error("Không đọc được ảnh. Hãy dùng tệp JPG, PNG hoặc WebP."));
    img.src = String(fr.result);
  };
  fr.readAsDataURL(f);
});
export function ScholarConsole() {
  const [list, setList] = useState<Mine[] | null>(null), [v, setV] = useState(0);
  useEffect(() => { api<{ authors: Mine[] }>("author-mine").then((j) => setList(j.authors)).catch(() => setList([])); }, [v]);
  if (!list) return <p className="empty" role="status">Đang tải…</p>;
  if (!list.length) return <section className="card"><h2>Hồ sơ khoa học của tôi</h2><p className="meta">Bạn chưa có hồ sơ nào được xác thực. Mở trang hồ sơ của mình trong ProFind, chọn "Đây là tôi" và gửi yêu cầu bằng email tổ chức.</p></section>;
  return <>{list.map((m) => <One key={m.authorId} m={m} reload={() => setV((x) => x + 1)} />)}</>;
}
function One({ m, reload }: { m: Mine; reload: () => void }) {
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), p = m.profile;
  const run = async (op: string, body: object, ok: string) => { setBusy(true); setMsg(""); try { await api(op, { authorId: m.authorId, ...body }); setMsg(ok); reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  const save = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run("author-save", { orcid: f.get("orcid"), scholar: f.get("scholar"), disc: f.getAll("disc"), site: f.get("site"), bio: f.get("bio"), email: f.get("email"), phone: f.get("phone"), showContact: f.get("showContact") === "on" }, "Đã lưu."); };
  const addDoi = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const el = e.currentTarget, f = new FormData(el); void run("author-work-add", { doi: f.get("doi") }, "Đã thêm công trình.").then(() => el.reset()); };
  const [pend, setPend] = useState<string | null>(null), [avMsg, setAvMsg] = useState("");
  const pick = async (f: File | undefined) => { setAvMsg(""); setPend(null); if (!f) return; try { setPend(await shrink(f)); } catch (e) { setAvMsg((e as Error).message); } };
  const upload = async () => { if (!pend) return; setBusy(true); setAvMsg(""); try { await api("author-avatar", { authorId: m.authorId, image: pend }); setPend(null); setAvMsg("Đã cập nhật ảnh đại diện. Trang hồ sơ công khai có thể mất vài phút để hiện ảnh mới."); reload(); } catch (e) { setAvMsg((e as Error).message); } finally { setBusy(false); } };
  return (
    <section className="card claimbox">
      <h2><a href={`#/tac-gia/${m.authorId}`}>{m.name}</a> <VerifiedTick id={m.authorId} /></h2>
      <p className="meta">Xác thực còn hiệu lực đến {dmy(m.until)}. Thông tin bên dưới hiện công khai trên hồ sơ (trừ liên hệ nếu bạn không bật chia sẻ).</p>
      <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}</div>
      <form onSubmit={save} className="form">
        <label className="sel"><span>ORCID</span><input name="orcid" defaultValue={p.orcid} maxLength={40} placeholder="0000-0000-0000-0000" /></label>
        <label className="sel"><span>Google Scholar</span><input name="scholar" type="url" defaultValue={p.scholar} maxLength={300} placeholder="https://scholar.google.com/citations?user=…" /></label>
        <fieldset className="discpick"><legend>Ngành của tôi (chọn tối đa 3; để trống thì dùng ngành hệ thống suy ra)</legend>
          <div className="discgrid">{Object.entries(DISC).map(([k, [vi]]) => <label key={k} className="chk"><input type="checkbox" name="disc" value={k} defaultChecked={p.disc?.includes(k)} onChange={(e) => { const f = e.currentTarget.form; if (f && f.querySelectorAll('input[name="disc"]:checked').length > 3) { e.currentTarget.checked = false; } }} />{vi}</label>)}</div>
          <p className="meta">Ngành bạn chọn hiện trên trang hồ sơ. Bộ lọc ngành và cách chấm PRO-SCORE vẫn dùng ngành suy ra từ tạp chí.</p>
        </fieldset>
        <label className="sel"><span>Trang cá nhân</span><input name="site" type="url" defaultValue={p.site} maxLength={200} /></label>
        <label className="sel"><span>Giới thiệu ngắn (tối đa 600 ký tự)</span><textarea name="bio" rows={3} defaultValue={p.bio} maxLength={600} /></label>
        <label className="sel"><span>Email liên hệ</span><input name="email" type="email" defaultValue={p.email} maxLength={160} /></label>
        <label className="sel"><span>Số điện thoại</span><input name="phone" defaultValue={p.phone} maxLength={20} /></label>
        <label className="chk"><input type="checkbox" name="showContact" defaultChecked={p.showContact} />Hiện email/số điện thoại công khai trên hồ sơ</label>
        <p><button className="primary" disabled={busy}>Lưu thông tin</button></p>
      </form>
      <h3>Quyền riêng tư</h3>
      <p className="meta">Theo Luật Bảo vệ dữ liệu cá nhân bạn có quyền phản đối và hạn chế xử lý. Các thay đổi áp dụng ngay.</p>
      <p>
        <label className="chk"><input type="radio" name={`hide-${m.authorId}`} checked={!m.hide} onChange={() => void run("author-privacy", {}, "Đã hiển thị đầy đủ.")} />Hiển thị đầy đủ hồ sơ, điểm và huy hiệu</label><br />
        <label className="chk"><input type="radio" name={`hide-${m.authorId}`} checked={m.hide === "score"} onChange={() => void run("author-privacy", { hideScore: true }, "Đã ẩn điểm và huy hiệu xếp hạng.")} />Ẩn điểm PRO-SCORE1000™ và huy hiệu xếp hạng (vẫn hiện công trình)</label><br />
        <label className="chk"><input type="radio" name={`hide-${m.authorId}`} checked={m.hide === "profile"} onChange={() => void run("author-privacy", { hideProfile: true }, "Đã tạm ẩn toàn bộ hồ sơ.")} />Tạm ẩn toàn bộ hồ sơ khỏi ProFind</label>
      </p>
      <h3>Ảnh đại diện</h3>
      <div className="avedit">
        {(pend || p.av) && <img className="avprev" src={pend ?? `/api/account?op=avatar&id=${encodeURIComponent(m.authorId)}&v=${p.av}`} alt={pend ? "Xem trước ảnh mới" : "Ảnh đại diện hiện tại"} width={96} height={96} />}
        <div>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void pick(e.target.files?.[0])} aria-label="Chọn ảnh đại diện" />
          {pend && <p className="meta">Ảnh sẽ được cắt vuông và thu nhỏ. Bấm "Dùng ảnh này" để đăng lên hồ sơ công khai của bạn.</p>}
          <p>{pend && <><button type="button" className="primary" disabled={busy} onClick={() => void upload()}>Dùng ảnh này</button> <button type="button" disabled={busy} onClick={() => { setPend(null); setAvMsg(""); }}>Hủy</button> </>}{!pend && p.av ? <button type="button" disabled={busy} onClick={() => void run("author-avatar", { image: null }, "Đã gỡ ảnh.")}>Gỡ ảnh</button> : null}</p>
          <div role="status" aria-live="polite">{avMsg && <p className="banner"><Icon n="check" />{avMsg}</p>}</div>
        </div>
      </div>
      <h3>Công trình bị gán nhầm</h3>
      <p className="meta">Nếu OpenAlex gán nhầm bài của người trùng tên vào hồ sơ của bạn, mở trang hồ sơ công khai của bạn và bấm "Không phải bài của tôi" ở bài đó. Bài sẽ ẩn ngay khỏi danh sách; điểm được tính lại ở lần cập nhật dữ liệu kế tiếp.</p>
      {(m.xw ?? []).length > 0 && <ul>{(m.xw ?? []).map((w) => <li key={w}><code>{w.split("-").pop()}</code> đã báo không phải của bạn <button type="button" disabled={busy} onClick={() => void run("author-work-not", { workId: w, undo: true }, "Đã hoàn tác.")}>Hoàn tác</button></li>)}</ul>}
      <h3>Thêm công trình theo DOI</h3>
      <p className="meta">DOI được đối chiếu với Crossref: tên hoặc ORCID của bạn phải có trong danh sách tác giả, nếu không sẽ chờ quản trị viên duyệt. Công trình tự bổ sung chưa tính vào PRO-SCORE cho tới khi OpenAlex ghi nhận.</p>
      <form onSubmit={addDoi} className="form"><label className="sel"><span>DOI</span><input name="doi" required placeholder="10.1234/abcd" maxLength={220} /></label><p><button className="primary" disabled={busy}>Thêm công trình</button></p></form>
      {m.works.length > 0 && <ul>{m.works.map((w) => <li key={w.doi}><a href={`https://doi.org/${w.doi}`} target="_blank" rel="noopener">{w.title || w.doi}</a>{w.year ? ` · ${w.year}` : ""} · <b>{w.status === "ok" ? "đã hiển thị" : "chờ duyệt"}</b>{w.oa ? " · đã có trong OpenAlex" : ""} <button type="button" onClick={() => void run("author-work-del", { doi: w.doi }, "Đã xóa.")}>Xóa</button></li>)}</ul>}
    </section>
  );
}

/** Ngành do chủ hồ sơ đã xác thực tự chọn (ưu tiên hơn ngành hệ thống suy ra khi hiển thị). */
export function useOwnDisc(id: string): string[] | null { const d = useAuthorPub(id); return d?.profile?.disc?.length ? d.profile.disc : null; }

/** Công trình chủ hồ sơ đã báo "không phải của tôi" (ẩn khỏi danh sách; điểm tính lại ở lần dựng dữ liệu sau). */
export function useNotMine(id: string, local: string[]): Set<string> { const d = useAuthorPub(id); return new Set([...(d?.xw ?? []), ...local]); }
export function reportNotMine(authorId: string, workId: string): Promise<unknown> { return api("author-work-not", { authorId, workId }); }
