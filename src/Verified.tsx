// Tick vàng "Nhà khoa học đã xác thực" + hộp yêu cầu xác thực hồ sơ ("Đây là tôi").
import { dName, DISC } from "./disciplines";
import { useT } from "./i18n";
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
// Từ điển cục bộ vi/en cho mọi chuỗi hiển thị trong tệp này (khóa trùng nhau hai bên).
const L = {
  vi: {
    lbl: "Nhà khoa học đã xác thực",
    until: (d: string) => `hiệu lực đến ${d}`,
    claimVerified: (d: string) => `Hồ sơ này đã được xác thực, hiệu lực đến ${d}.`,
    loginA: "Để gửi yêu cầu, hãy ", loginLink: "đăng nhập bằng email tổ chức", loginB: " (đuôi của trường/viện) rồi quay lại trang này.",
    freemail: "Email miễn phí (Gmail, Yahoo…) không dùng được cho yêu cầu này. Hãy đăng nhập bằng email của trường/viện, hoặc gửi thư đề nghị riêng tới vienisavietnam@gmail.com để quản trị viên xem xét.",
    doneApproved: (d: string) => `Đã xác thực! Tick vàng hiện cạnh tên bạn đến ${d}.`,
    doneReceived: "Đã nhận yêu cầu. Hệ thống đã kiểm tra tự động, quản trị viên sẽ xem xét và gửi kết quả qua email.",
    hRemove: "Đề nghị gỡ hồ sơ", hHide: "Ẩn điểm và huy hiệu xếp hạng", hClaim: "Đây là tôi — xác thực hồ sơ",
    mHide: (e: string) => `Đăng nhập bằng email tổ chức (${e}). Sau khi kiểm tra danh tính, điểm PRO-SCORE1000™ và huy hiệu xếp hạng của hồ sơ này sẽ được ẩn; công trình khoa học vẫn hiển thị. Bạn có thể yêu cầu hiển thị lại bất cứ lúc nào.`,
    mRemove: (e: string) => `Đăng nhập bằng email tổ chức (${e}). Yêu cầu gỡ được quản trị viên xem xét sau khi hệ thống kiểm tra danh tính (ORCID, tên, email). Việc gỡ chỉ áp dụng trên ProFind™, dữ liệu gốc ở OpenAlex/ORCID vẫn còn.`,
    mClaim: (e: string) => `Đang đăng nhập bằng ${e}. Hồ sơ được xác thực tự động khi email trường/viện (đuôi edu, gov, ac…), ORCID và tên khớp với hồ sơ OpenAlex; còn lại, kể cả email cá nhân như Gmail, quản trị viên sẽ xem xét. Tick vàng có hiệu lực 2 năm.`,
    lastReq: (s: string, r: string) => `Yêu cầu gần nhất: ${s === "review" ? "đang chờ duyệt" : s === "rejected" ? `chưa được chấp nhận${r ? " — " + r : ""}` : `cần bổ sung${r ? " — " + r : ""}`}.`,
    fName: "Họ tên đầy đủ", orcidHint: "(nên điền để được duyệt nhanh hơn)",
    orcidKnown: (o: string) => `Hồ sơ này đang ghi ORCID ${o} (lấy từ OpenAlex). Nếu đúng là của bạn, giữ nguyên; nếu không phải, hãy sửa hoặc xoá. `,
    orcidNone: "Hồ sơ này chưa ghi ORCID. ",
    orcidInfo: "ORCID là mã định danh nhà nghiên cứu, giúp ProFind™ đối chiếu tên và công trình của bạn. Chưa có thì đăng ký miễn phí tại orcid.org, hoặc để trống và quản trị viên sẽ xét thủ công.",
    noteRm: "Lý do đề nghị gỡ (bắt buộc)", noteOpt: "Ghi chú (tuỳ chọn)",
    sending: "Đang gửi…", sendRm: "Gửi đề nghị gỡ hồ sơ", sendHide: "Gửi đề nghị ẩn điểm", sendClaim: "Gửi yêu cầu xác thực",
    selfTitle: "Thông tin do nhà khoa học tự khai báo", personal: "Trang cá nhân",
    addedWorks: (n: number) => `Công trình tự bổ sung (${n})`,
    crossref: "Đã đối chiếu DOI với Crossref. Các công trình này chưa tính vào PRO-SCORE cho tới khi OpenAlex ghi nhận.",
    inOA: " đã có trong OpenAlex",
    imgErr: "Không đọc được ảnh.", imgErr2: "Không đọc được ảnh. Hãy dùng tệp JPG, PNG hoặc WebP.",
    loading: "Đang tải…", myProfile: "Hồ sơ khoa học của tôi",
    none: "Bạn chưa xác thực hồ sơ nào. Nhà khoa học đã xác thực có tick vàng, ảnh đại diện, giới thiệu, liên kết ORCID/Google Scholar và được ProFind™ hiển thị nổi bật.",
    step1: "Tìm tên bạn trên ProFind™", step2a: "Mở hồ sơ, chọn ", step2q: "Đây là tôi", step3: "Gửi yêu cầu bằng email của trường/viện; thường duyệt trong ít ngày",
    suggest: "Gợi ý hồ sơ cho tôi", selfFind: "Tự tìm hồ sơ",
    added: (ok: number, bad: number) => `Đã thêm ${ok} công trình${bad ? `, ${bad} công trình không thêm được (đã có hoặc quá giới hạn)` : ""}.`,
    mTitle: "Dán danh sách từ Google Scholar để khớp DOI",
    mHelp: "Mở hồ sơ Google Scholar của bạn, chép các nhan đề bài (mỗi dòng một bài) rồi dán vào đây. ProFind™ tra DOI trong Crossref; bài nào có tên bạn trong danh sách tác giả được chọn sẵn, bạn xem lại rồi bấm thêm. Bài không có DOI (nhiều tạp chí trong nước) không thêm được bằng cách này.",
    mPh: "Mỗi dòng một nhan đề, tối đa 40 bài mỗi lần", mAria: "Danh sách nhan đề",
    searching: "Đang tra…", lookup: "Tra DOI",
    found: (a: number, b: number) => `Tìm thấy DOI cho ${a}/${b} nhan đề.`,
    have: "đã có", nameOk: "tên bạn khớp", nameNo: "tên bạn chưa khớp, sẽ chờ quản trị viên duyệt",
    noDoi: "Chưa thấy DOI: ", addPicked: (n: number) => `Thêm ${n} công trình đã chọn`,
    shareTitle: (n: string) => `${n} trên ProFind™`,
    heroSub: (d: string) => ` Nhà khoa học đã xác thực · còn hiệu lực đến ${d}`,
    viewPublic: "Xem hồ sơ công khai", copied: "Đã sao chép", copyLink: "Sao chép liên kết", share: "Chia sẻ", editProfile: "Chỉnh sửa hồ sơ",
    saved: "Đã lưu.", workAdded: "Đã thêm công trình.",
    editSummary: "Chỉnh sửa hồ sơ khoa học, quyền riêng tư, ảnh đại diện và công trình",
    legend: "Ngành của tôi (chọn tối đa 3; để trống thì dùng ngành hệ thống suy ra)",
    discNote: "Ngành bạn chọn hiện trên trang hồ sơ. Bộ lọc ngành và cách chấm PRO-SCORE vẫn dùng ngành suy ra từ tạp chí.",
    fBio: "Giới thiệu ngắn (tối đa 600 ký tự)", fEmail: "Email liên hệ", fPhone: "Số điện thoại",
    showContact: "Hiện email/số điện thoại công khai trên hồ sơ", saveInfo: "Lưu thông tin",
    privacy: "Quyền riêng tư", privacyNote: "Theo Luật Bảo vệ dữ liệu cá nhân bạn có quyền phản đối và hạn chế xử lý. Các thay đổi áp dụng ngay.",
    pFull: "Hiển thị đầy đủ hồ sơ, điểm và huy hiệu", pFullMsg: "Đã hiển thị đầy đủ.",
    pScore: "Ẩn điểm PRO-SCORE1000™ và huy hiệu xếp hạng (vẫn hiện công trình)", pScoreMsg: "Đã ẩn điểm và huy hiệu xếp hạng.",
    pProfile: "Tạm ẩn toàn bộ hồ sơ khỏi ProFind™", pProfileMsg: "Đã tạm ẩn toàn bộ hồ sơ.",
    avatar: "Ảnh đại diện", avNew: "Xem trước ảnh mới", avCur: "Ảnh đại diện hiện tại", avChoose: "Chọn ảnh đại diện",
    avCrop: "Ảnh sẽ được cắt vuông và thu nhỏ. Bấm \"Dùng ảnh này\" để đăng lên hồ sơ công khai của bạn.",
    avUse: "Dùng ảnh này", cancel: "Hủy", avRemove: "Gỡ ảnh", avRemoved: "Đã gỡ ảnh.",
    avDone: "Đã cập nhật ảnh đại diện. Trang hồ sơ công khai có thể mất vài phút để hiện ảnh mới.",
    wrongTitle: "Công trình bị gán nhầm",
    wrongText: "Nếu OpenAlex gán nhầm bài của người trùng tên vào hồ sơ của bạn, mở trang hồ sơ công khai của bạn và bấm \"Không phải bài của tôi\" ở bài đó. Bài sẽ ẩn ngay khỏi danh sách; điểm được tính lại ở lần cập nhật dữ liệu kế tiếp.",
    reported: " đã báo không phải của bạn ", undo: "Hoàn tác", undone: "Đã hoàn tác.",
    doiTitle: "Thêm công trình theo DOI",
    doiText: "DOI được đối chiếu với Crossref: tên hoặc ORCID của bạn phải có trong danh sách tác giả, nếu không sẽ chờ quản trị viên duyệt. Công trình tự bổ sung chưa tính vào PRO-SCORE cho tới khi OpenAlex ghi nhận.",
    addWork: "Thêm công trình", shown: "đã hiển thị", pending: "chờ duyệt", inOA2: " · đã có trong OpenAlex", del: "Xóa", deleted: "Đã xóa.",
    unitTitle: "Đơn vị công tác", uA: "Hệ thống suy đơn vị từ cơ quan ghi trên công trình nên có thể sai khi bạn chuyển nơi làm việc hoặc OpenAlex gộp nhầm hồ sơ. Chọn đơn vị ", uCur: "hiện tại", uB: " (hiện trước) và ", uPast: "trước đây", uC: " (hiện mờ).",
    locked: "Đơn vị của hồ sơ này do quản trị viên xác nhận; hãy liên hệ ProFind™ nếu cần thay đổi.",
    colUnit: "Đơn vị", colNow: "Hiện tại", colPast: "Trước đây",
    nowAria: (n: string) => `${n}: hiện tại`, pastAria: (n: string) => `${n}: trước đây`,
    addUnit: "Thêm đơn vị (gõ tên)", unitPh: "Đại học Đồng Tháp", saveUnit: "Lưu đơn vị", clearMine: "Bỏ lựa chọn của tôi",
    unitSaved: "Đã lưu đơn vị. Trang công khai cập nhật trong vài chục giây.", unitCleared: "Đã bỏ lựa chọn, hồ sơ quay về đơn vị do hệ thống suy ra.",
  },
  en: {
    lbl: "Verified scientist",
    until: (d: string) => `valid until ${d}`,
    claimVerified: (d: string) => `This profile is verified, valid until ${d}.`,
    loginA: "To submit a request, ", loginLink: "sign in with your institutional email", loginB: " (your school or institute domain), then return to this page.",
    freemail: "Free email addresses (Gmail, Yahoo…) can't be used for this request. Sign in with your school or institute email, or send a separate request to vienisavietnam@gmail.com for an administrator to review.",
    doneApproved: (d: string) => `Verified! The gold tick will appear next to your name until ${d}.`,
    doneReceived: "Request received. It has passed the automatic check; an administrator will review it and email you the result.",
    hRemove: "Request profile removal", hHide: "Hide score and ranking badge", hClaim: "This is me — verify profile",
    mHide: (e: string) => `Signed in with institutional email (${e}). After identity checks, this profile's PRO-SCORE1000™ and ranking badge will be hidden; the scientific works stay visible. You can ask to show them again at any time.`,
    mRemove: (e: string) => `Signed in with institutional email (${e}). An administrator reviews removal requests after the system checks your identity (ORCID, name, email). Removal applies only on ProFind™; the source data in OpenAlex/ORCID remains.`,
    mClaim: (e: string) => `Signed in as ${e}. A profile is verified automatically when your school or institute email (edu, gov, ac… domain), ORCID and name match the OpenAlex profile; otherwise, including personal emails such as Gmail, an administrator will review it. The gold tick is valid for 2 years.`,
    lastReq: (s: string, r: string) => `Latest request: ${s === "review" ? "awaiting review" : s === "rejected" ? `not accepted${r ? " — " + r : ""}` : `more information needed${r ? " — " + r : ""}`}.`,
    fName: "Full name", orcidHint: "(recommended, for faster approval)",
    orcidKnown: (o: string) => `This profile lists ORCID ${o} (from OpenAlex). If it is yours, keep it; if not, edit or clear it. `,
    orcidNone: "This profile lists no ORCID. ",
    orcidInfo: "ORCID is a researcher identifier that helps ProFind™ match your name and works. If you don't have one, register for free at orcid.org, or leave it blank and an administrator will check manually.",
    noteRm: "Reason for removal (required)", noteOpt: "Note (optional)",
    sending: "Sending…", sendRm: "Submit removal request", sendHide: "Submit request to hide score", sendClaim: "Submit verification request",
    selfTitle: "Information provided by the scientist", personal: "Personal website",
    addedWorks: (n: number) => `Self-added works (${n})`,
    crossref: "DOIs were checked against Crossref. These works are not counted in PRO-SCORE until OpenAlex records them.",
    inOA: " already in OpenAlex",
    imgErr: "Could not read the image.", imgErr2: "Could not read the image. Use a JPG, PNG or WebP file.",
    loading: "Loading…", myProfile: "My scientific profile",
    none: "You haven't verified any profile yet. Verified scientists get a gold tick, a profile photo, a bio, ORCID/Google Scholar links, and are featured on ProFind™.",
    step1: "Find your name on ProFind™", step2a: "Open your profile and choose ", step2q: "This is me", step3: "Send the request from your school or institute email; usually reviewed within a few days",
    suggest: "Suggest profiles for me", selfFind: "Search myself",
    added: (ok: number, bad: number) => `Added ${ok} ${ok === 1 ? "work" : "works"}${bad ? `, ${bad} could not be added (already added or over the limit)` : ""}.`,
    mTitle: "Paste a Google Scholar list to match DOIs",
    mHelp: "Open your Google Scholar profile, copy the paper titles (one per line) and paste them here. ProFind™ looks up DOIs in Crossref; papers that list your name among the authors are pre-selected, then review and click Add. Papers without a DOI (many domestic journals) can't be added this way.",
    mPh: "One title per line, up to 40 per batch", mAria: "List of titles",
    searching: "Searching…", lookup: "Look up DOIs",
    found: (a: number, b: number) => `Found DOIs for ${a}/${b} titles.`,
    have: "already added", nameOk: "your name matches", nameNo: "your name doesn't match; will await administrator review",
    noDoi: "No DOI found: ", addPicked: (n: number) => `Add ${n} selected ${n === 1 ? "work" : "works"}`,
    shareTitle: (n: string) => `${n} on ProFind™`,
    heroSub: (d: string) => ` Verified scientist · valid until ${d}`,
    viewPublic: "View public profile", copied: "Copied", copyLink: "Copy link", share: "Share", editProfile: "Edit profile",
    saved: "Saved.", workAdded: "Work added.",
    editSummary: "Edit scientific profile, privacy, photo and works",
    legend: "My fields (choose up to 3; leave empty to use the fields inferred by the system)",
    discNote: "The fields you choose appear on your profile page. The field filter and PRO-SCORE scoring still use the field inferred from journals.",
    fBio: "Short bio (max 600 characters)", fEmail: "Contact email", fPhone: "Phone number",
    showContact: "Show email/phone publicly on the profile", saveInfo: "Save information",
    privacy: "Privacy", privacyNote: "Under the Personal Data Protection Law you have the right to object to and restrict processing. Changes apply immediately.",
    pFull: "Show full profile, score and badge", pFullMsg: "Fully visible.",
    pScore: "Hide PRO-SCORE1000™ and ranking badge (works stay visible)", pScoreMsg: "Score and ranking badge hidden.",
    pProfile: "Temporarily hide the whole profile from ProFind™", pProfileMsg: "Whole profile temporarily hidden.",
    avatar: "Profile photo", avNew: "Preview of new photo", avCur: "Current profile photo", avChoose: "Choose profile photo",
    avCrop: "The photo will be cropped square and resized. Click \"Use this photo\" to post it to your public profile.",
    avUse: "Use this photo", cancel: "Cancel", avRemove: "Remove photo", avRemoved: "Photo removed.",
    avDone: "Profile photo updated. The public profile page may take a few minutes to show the new photo.",
    wrongTitle: "Wrongly attributed works",
    wrongText: "If OpenAlex wrongly attributes a namesake's paper to your profile, open your public profile and click \"Not my paper\" on that paper. It is hidden from the list immediately; the score is recalculated at the next data update.",
    reported: " reported as not yours ", undo: "Undo", undone: "Undone.",
    doiTitle: "Add a work by DOI",
    doiText: "The DOI is checked against Crossref: your name or ORCID must appear in the author list, otherwise it awaits administrator review. Self-added works are not counted in PRO-SCORE until OpenAlex records them.",
    addWork: "Add work", shown: "shown", pending: "pending review", inOA2: " · already in OpenAlex", del: "Delete", deleted: "Deleted.",
    unitTitle: "Affiliation", uA: "The system infers affiliations from the institutions listed on works, so it can be wrong if you changed workplace or OpenAlex wrongly merged profiles. Choose your ", uCur: "current", uB: " affiliation (shown first) and ", uPast: "former", uC: " ones (shown dimmed).",
    locked: "This profile's affiliations were confirmed by an administrator; contact ProFind™ if a change is needed.",
    colUnit: "Affiliation", colNow: "Current", colPast: "Former",
    nowAria: (n: string) => `${n}: current`, pastAria: (n: string) => `${n}: former`,
    addUnit: "Add an affiliation (type a name)", unitPh: "Dong Thap University", saveUnit: "Save affiliations", clearMine: "Clear my selection",
    unitSaved: "Affiliations saved. The public page updates within a minute.", unitCleared: "Selection cleared; the profile reverts to the system-inferred affiliations.",
  },
};
type Lang = "vi" | "en";
const dmy = (ms: number, lang: Lang) => new Date(ms).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", lang === "vi" ? undefined : { day: "numeric", month: "short", year: "numeric" });

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
  const until = useVerified(id), { lang } = useT(), l = L[lang];
  if (!until) return null;
  return <span className="vtick" title={`${l.lbl} · ${l.until(dmy(until, lang))}`} role="img" aria-label={l.lbl}><VerifiedSeal size={size} /></span>;
}
/** Người đang đăng nhập có phải chủ hồ sơ đã xác thực này không (so theo email xác thực). */
export function useIsMine(id: string): boolean {
  const { user } = useAccount(); const [mine, setMine] = useState(false);
  useEffect(() => { setMine(false); if (user) api<{ verified: { authorId: string; until: number }[] }>("claim-status").then((j) => setMine(j.verified.some((v) => v.authorId === id && v.until > Date.now()))).catch(() => {}); }, [user, id]);
  return mine;
}
export function VerifiedBadge({ id }: { id: string }) {
  const until = useVerified(id), { lang } = useT(), l = L[lang];
  if (!until) return null;
  return <span className="badge vbadge"><VerifiedSeal size={18} /><span><b>{l.lbl}</b><small>{l.until(dmy(until, lang))}</small></span></span>;
}

type Row = { id: string; authorId: string; status: string; until: number | null; reason: string };
export function ClaimBox({ authorId, authorName, mode = "claim", knownOrcid = "" }: { authorId: string; authorName: string; mode?: "claim" | "remove" | "hide"; knownOrcid?: string }) {
  const rm = mode === "remove", hd = mode === "hide";
  const { user } = useAccount(), { lang } = useT(), l = L[lang];
  const until = useVerified(authorId);
  const [st, setSt] = useState<"idle" | "sending" | "done">("idle"), [err, setErr] = useState(""), [res, setRes] = useState<{ status: string; until: number | null } | null>(null);
  const [mine, setMine] = useState<Row[]>([]);
  useEffect(() => { if (user) api<{ claims: Row[] }>("claim-status").then((j) => setMine(j.claims.filter((c) => c.authorId === authorId))).catch(() => {}); }, [user, authorId, st]);
  if (until && !rm && !hd) return <p className="banner"><Icon n="check" />{l.claimVerified(dmy(until, lang))}</p>;
  if (!user) return <p className="banner demo">{l.loginA}<a href="#/tai-khoan">{l.loginLink}</a>{l.loginB}</p>;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setSt("sending"); setErr("");
    const f = new FormData(e.currentTarget);
    try { setRes(await api("claim-submit", { authorId, authorName, kind: mode, name: f.get("name"), orcid: f.get("orcid"), scholar: f.get("scholar"), note: f.get("note") })); setSt("done"); }
    catch (x) { setErr((x as Error).message === "freemail" ? l.freemail : (x as Error).message); setSt("idle"); }
  };
  if (st === "done" && res) return <p className="banner" role="status"><Icon n="check" />{res.status === "approved" ? l.doneApproved(dmy(res.until!, lang)) : l.doneReceived}</p>;
  const last = mine[0];
  return (
    <section className="card claimbox">
      <h2>{rm ? l.hRemove : hd ? l.hHide : l.hClaim}</h2>
      <p className="meta">{hd ? l.mHide(user.email) : rm ? l.mRemove(user.email) : l.mClaim(user.email)}</p>
      {last && last.status !== "approved" && <p className="meta" role="status">{l.lastReq(last.status, last.reason)}</p>}
      <form onSubmit={submit} className="form">
        <label className="sel"><span>{l.fName}</span><input name="name" required maxLength={80} defaultValue={user.name} autoComplete="name" /></label>
        <label className="sel"><span>ORCID {!rm && <small>{l.orcidHint}</small>}</span><input name="orcid" maxLength={40} defaultValue={knownOrcid} placeholder="0000-0000-0000-0000" /></label>
        {!rm && <p className="meta">{knownOrcid ? l.orcidKnown(knownOrcid) : l.orcidNone}{l.orcidInfo}</p>}
        <label className="sel"><span>Google Scholar</span><input name="scholar" type="url" maxLength={300} placeholder="https://scholar.google.com/citations?user=…" /></label>
        <label className="sel"><span>{rm ? l.noteRm : l.noteOpt}</span><textarea name="note" rows={3} maxLength={1000} required={rm} /></label>
        <p><button className="primary" disabled={st === "sending"}>{st === "sending" ? l.sending : rm ? l.sendRm : hd ? l.sendHide : l.sendClaim}</button></p>
        <div role="alert">{err && <p className="banner demo">{err}</p>}</div>
      </form>
    </section>
  );
}

// ---------- Dữ liệu công khai do chủ hồ sơ đã xác thực khai báo ----------
export interface AuthorPub { verified: boolean; xw?: string[]; cf?: string[]; cr?: string[]; profile?: { disc?: string[]; orcid: string; scholar: string; site: string; bio: string; hasAvatar: boolean | number; email: string; phone: string }; works?: { doi: string; title: string; venue: string; year: number; oa: string; status: string }[] }
export function useAuthorPub(id: string): AuthorPub | null {
  const ok = useVerified(id); const [d, setD] = useState<AuthorPub | null>(null);
  useEffect(() => { setD(null); if (ok) api<AuthorPub>("author-public", undefined, `&id=${encodeURIComponent(id)}`).then(setD).catch(() => {}); }, [id, ok]);
  return d?.verified ? d : null;
}
/** Phần bổ sung trên trang hồ sơ: giới thiệu, liên hệ công khai, công trình tự bổ sung (chưa tính vào PRO-SCORE). */
export function AuthorExtras({ id }: { id: string }) {
  const d = useAuthorPub(id), { lang } = useT(), l = L[lang]; if (!d?.profile) return null;
  const p = d.profile, ws = d.works ?? [];
  if (!p.bio && !p.site && !p.email && !p.phone && !ws.length) return null;
  return (
    <section className="card claimbox" aria-label={l.selfTitle}>
      <h2>{l.selfTitle}</h2>
      {p.bio && <p>{p.bio}</p>}
      {(p.site || p.email || p.phone) && <p className="meta">{p.site && <><a href={p.site} target="_blank" rel="noopener nofollow">{l.personal}</a> · </>}{p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}{p.phone && <> · {p.phone}</>}</p>}
      {ws.length > 0 && <>
        <h3>{l.addedWorks(ws.length)}</h3>
        <p className="meta">{l.crossref}</p>
        <ul>{ws.map((w) => <li key={w.doi}><a href={`https://doi.org/${w.doi}`} target="_blank" rel="noopener">{w.title || w.doi}</a>{w.venue && <> · {w.venue}</>}{w.year ? ` · ${w.year}` : ""}{w.oa && <span className="badge">{l.inOA}</span>}</li>)}</ul></>}
    </section>
  );
}
export function AvatarImg({ id, fallback }: { id: string; fallback: ReactNode }) {
  const d = useAuthorPub(id);
  return d?.profile?.hasAvatar ? <img className="avimg" src={`/api/account?op=avatar&id=${encodeURIComponent(id)}&v=${d.profile.hasAvatar}`} alt="" width={96} height={96} /> : <>{fallback}</>;
}

// ---------- Tab "Hồ sơ khoa học" trong không gian tài khoản ----------
export type Mine = { authorId: string; name: string; until: number; hide?: string; xw?: string[]; profile: { disc?: string[]; orcid?: string; scholar?: string; site?: string; bio?: string; email?: string; phone?: string; showContact?: boolean; av?: number | boolean }; works: { doi: string; title: string; year: number; status: string; why: string; oa: string }[] };
// Đọc tệp thành data: URL (CSP của trang chỉ cho img-src 'self' data:, không cho blob:), rồi cắt vuông 256 px.
const shrink = (f: File, l: { imgErr: string; imgErr2: string }) => new Promise<string>((res, rej) => {
  const fr = new FileReader();
  fr.onerror = () => rej(new Error(l.imgErr));
  fr.onload = () => {
    const img = new Image();
    img.onload = () => { const s = 256, c = document.createElement("canvas"), k = Math.min(img.width, img.height); c.width = c.height = s; c.getContext("2d")!.drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, s, s); res(c.toDataURL("image/jpeg", 0.82)); };
    img.onerror = () => rej(new Error(l.imgErr2));
    img.src = String(fr.result);
  };
  fr.readAsDataURL(f);
});
export function useMine() {
  const [list, setList] = useState<Mine[] | null>(null), [v, setV] = useState(0);
  useEffect(() => { api<{ authors: Mine[] }>("author-mine").then((j) => setList(j.authors)).catch(() => setList([])); }, [v]);
  return { list, reload: () => setV((x) => x + 1) };
}
export function ScholarConsole({ list, reload }: { list: Mine[] | null; reload: () => void }) {
  const { lang } = useT(), l = L[lang];
  if (!list) return <p className="empty" role="status">{l.loading}</p>;
  if (!list.length) return (
    <section className="card sh-empty"><h2>{l.myProfile}</h2>
      <p className="meta">{l.none}</p>
      <ol className="sh-steps"><li>{l.step1}</li><li>{l.step2a}<b>"{l.step2q}"</b></li><li>{l.step3}</li></ol>
      <p className="sh-act"><a className="primary" href="#/tai-khoan/nhan-dien"><Icon n="spark" size={16} />{l.suggest}</a><a className="ghost-link" href="#/"><Icon n="search" size={16} />{l.selfFind}</a></p>
    </section>
  );
  return <>{list.map((m) => <One key={m.authorId} m={m} reload={reload} />)}</>;
}
type MatchRes = { q: string; have: boolean; hit: { doi: string; title: string; venue: string; year: number; sim: number; name: boolean } | null };
/** Dán danh sách nhan đề từ Google Scholar (mỗi dòng một bài) -> tra DOI trong Crossref -> tick chọn rồi thêm. */
function MatchTitles({ authorId, reload }: { authorId: string; reload: () => void }) {
  const [txt, setTxt] = useState(""), [res, setRes] = useState<MatchRes[] | null>(null), [pick, setPick] = useState<Set<string>>(new Set()), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), { lang } = useT(), l = L[lang];
  const find = async () => {
    // Scholar chép ra thường kèm dòng tác giả/tạp chí/năm: chỉ giữ dòng đủ dài, người dùng nên dán riêng nhan đề.
    const titles = txt.split(/\n+/).map((x) => x.trim()).filter((x) => x.length >= 12);
    setBusy(true); setMsg(""); setRes(null);
    try { const r = await api<{ results: MatchRes[] }>("author-work-match", { authorId, titles }); setRes(r.results); setPick(new Set(r.results.filter((x) => x.hit && x.hit.name && !x.have).map((x) => x.hit!.doi))); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const add = async () => {
    setBusy(true); setMsg(""); let ok = 0, bad = 0;
    for (const doi of pick) { try { await api("author-work-add", { authorId, doi }); ok++; } catch { bad++; } }
    setMsg(l.added(ok, bad)); setRes(null); setPick(new Set()); setTxt(""); setBusy(false); reload();
  };
  const hits = res?.filter((x) => x.hit && !x.have) ?? [];
  return (
    <>
      <h3>{l.mTitle}</h3>
      <p className="meta">{l.mHelp}</p>
      <textarea rows={6} value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={20000} placeholder={l.mPh} aria-label={l.mAria} />
      <p><button type="button" className="primary" disabled={busy || txt.trim().length < 12} onClick={() => void find()}>{busy && !res ? l.searching : l.lookup}</button></p>
      <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}</div>
      {res && <>
        <p className="meta">{l.found(res.filter((x) => x.hit).length, res.length)}</p>
        <ul>{res.map((x) => <li key={x.q}>
          {x.hit ? <label className="chk"><input type="checkbox" disabled={x.have} checked={pick.has(x.hit.doi)} onChange={(e) => setPick((p) => { const n = new Set(p); if (e.target.checked) n.add(x.hit!.doi); else n.delete(x.hit!.doi); return n; })} /><span><a href={`https://doi.org/${x.hit.doi}`} target="_blank" rel="noopener">{x.hit.title}</a>{x.hit.year ? ` · ${x.hit.year}` : ""}{x.hit.venue ? ` · ${x.hit.venue}` : ""} · {x.have ? <b>{l.have}</b> : x.hit.name ? <b>{l.nameOk}</b> : <i>{l.nameNo}</i>}</span></label>
            : <span className="meta">{l.noDoi}{x.q}</span>}
        </li>)}</ul>
        {hits.length > 0 && <p><button type="button" className="primary" disabled={busy || !pick.size} onClick={() => void add()}>{l.addPicked(pick.size)}</button></p>}
      </>}
    </>
  );
}
const ini2 = (n: string) => { const w = n.replace(/[^\p{L}\s-]/gu, " ").split(/[\s-]+/).filter(Boolean); return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase() || "P"; };
/** Thẻ hồ sơ khoa học của chủ hồ sơ đã xác thực: ảnh bìa, ảnh đại diện, tên, ngành, liên kết học thuật, giới thiệu, chia sẻ (kiểu ORCID, Google Scholar, ResearchGate). */
function ScholarHero({ m, onEdit }: { m: Mine; onEdit: () => void }) {
  const p = m.profile, link = `${location.origin}/#/tac-gia/${m.authorId}`, [copied, setCopied] = useState(false), { lang } = useT(), l = L[lang];
  const copy = () => { void navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); };
  const share = () => { if (navigator.share) void navigator.share({ title: l.shareTitle(m.name), url: link }).catch(() => {}); else copy(); };
  const orcid = p.orcid ? `https://orcid.org/${p.orcid}` : "";
  return (
    <header className="sh">
      <div className="sh-cover" aria-hidden="true" />
      <div className="sh-body">
        <div className="sh-av">{p.av ? <img src={`/api/account?op=avatar&id=${encodeURIComponent(m.authorId)}&v=${p.av}`} alt="" width={112} height={112} /> : <span>{ini2(m.name)}</span>}<i title={l.lbl}><Icon n="check" size={16} /></i></div>
        <div className="sh-main">
          <h2><a href={`#/tac-gia/${m.authorId}`}>{m.name}</a></h2>
          <p className="sh-sub"><VerifiedTick id={m.authorId} />{l.heroSub(dmy(m.until, lang))}</p>
          {!!p.disc?.length && <p className="sh-chips">{p.disc.map((k) => <span key={k}>{dName(k, lang)}</span>)}</p>}
          {p.bio && <p className="sh-bio">{p.bio}</p>}
          <p className="sh-links">
            {orcid && <a href={orcid} target="_blank" rel="noopener"><Icon n="scholar" size={14} />ORCID {p.orcid}</a>}
            {p.scholar && <a href={p.scholar} target="_blank" rel="noopener"><Icon n="book" size={14} />Google Scholar</a>}
            {p.site && <a href={p.site} target="_blank" rel="noopener"><Icon n="link" size={14} />{l.personal}</a>}
          </p>
          <p className="sh-act"><a className="primary" href={`#/tac-gia/${m.authorId}`}><Icon n="eye" size={16} />{l.viewPublic}</a><button type="button" className="ghost" onClick={copy}><Icon n="link" size={16} />{copied ? l.copied : l.copyLink}</button><button type="button" className="ghost" onClick={share}><Icon n="external" size={16} />{l.share}</button><button type="button" className="ghost" onClick={onEdit}><Icon n="user" size={16} />{l.editProfile}</button></p>
        </div>
      </div>
    </header>
  );
}
function One({ m, reload }: { m: Mine; reload: () => void }) {
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [edit, setEdit] = useState(false), p = m.profile, { lang } = useT(), l = L[lang];
  const run = async (op: string, body: object, ok: string) => { setBusy(true); setMsg(""); try { await api(op, { authorId: m.authorId, ...body }); setMsg(ok); reload(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  const save = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void run("author-save", { orcid: f.get("orcid"), scholar: f.get("scholar"), disc: f.getAll("disc"), site: f.get("site"), bio: f.get("bio"), email: f.get("email"), phone: f.get("phone"), showContact: f.get("showContact") === "on" }, l.saved); };
  const addDoi = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const el = e.currentTarget, f = new FormData(el); void run("author-work-add", { doi: f.get("doi") }, l.workAdded).then(() => el.reset()); };
  const [pend, setPend] = useState<string | null>(null), [avMsg, setAvMsg] = useState("");
  const pick = async (f: File | undefined) => { setAvMsg(""); setPend(null); if (!f) return; try { setPend(await shrink(f, l)); } catch (e) { setAvMsg((e as Error).message); } };
  const upload = async () => { if (!pend) return; setBusy(true); setAvMsg(""); try { await api("author-avatar", { authorId: m.authorId, image: pend }); setPend(null); setAvMsg(l.avDone); reload(); } catch (e) { setAvMsg((e as Error).message); } finally { setBusy(false); } };
  return (
    <section className="card claimbox">
      <ScholarHero m={m} onEdit={() => { setEdit(true); setTimeout(() => document.getElementById(`edit-${m.authorId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }} />
      <details id={`edit-${m.authorId}`} className="sh-edit" open={edit} onToggle={(e) => setEdit(e.currentTarget.open)}><summary>{l.editSummary}</summary>
      <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}</div>
      <form onSubmit={save} className="form">
        <label className="sel"><span>ORCID</span><input name="orcid" defaultValue={p.orcid} maxLength={40} placeholder="0000-0000-0000-0000" /></label>
        <label className="sel"><span>Google Scholar</span><input name="scholar" type="url" defaultValue={p.scholar} maxLength={300} placeholder="https://scholar.google.com/citations?user=…" /></label>
        <fieldset className="discpick"><legend>{l.legend}</legend>
          <div className="discgrid">{Object.keys(DISC).map((k) => <label key={k} className="chk"><input type="checkbox" name="disc" value={k} defaultChecked={p.disc?.includes(k)} onChange={(e) => { const f = e.currentTarget.form; if (f && f.querySelectorAll('input[name="disc"]:checked').length > 3) { e.currentTarget.checked = false; } }} />{dName(k, lang)}</label>)}</div>
          <p className="meta">{l.discNote}</p>
        </fieldset>
        <label className="sel"><span>{l.personal}</span><input name="site" type="url" defaultValue={p.site} maxLength={200} /></label>
        <label className="sel"><span>{l.fBio}</span><textarea name="bio" rows={3} defaultValue={p.bio} maxLength={600} /></label>
        <label className="sel"><span>{l.fEmail}</span><input name="email" type="email" defaultValue={p.email} maxLength={160} /></label>
        <label className="sel"><span>{l.fPhone}</span><input name="phone" defaultValue={p.phone} maxLength={20} /></label>
        <label className="chk"><input type="checkbox" name="showContact" defaultChecked={p.showContact} />{l.showContact}</label>
        <p><button className="primary" disabled={busy}>{l.saveInfo}</button></p>
      </form>
      <h3>{l.privacy}</h3>
      <p className="meta">{l.privacyNote}</p>
      <p>
        <label className="chk"><input type="radio" name={`hide-${m.authorId}`} checked={!m.hide} onChange={() => void run("author-privacy", {}, l.pFullMsg)} />{l.pFull}</label><br />
        <label className="chk"><input type="radio" name={`hide-${m.authorId}`} checked={m.hide === "score"} onChange={() => void run("author-privacy", { hideScore: true }, l.pScoreMsg)} />{l.pScore}</label><br />
        <label className="chk"><input type="radio" name={`hide-${m.authorId}`} checked={m.hide === "profile"} onChange={() => void run("author-privacy", { hideProfile: true }, l.pProfileMsg)} />{l.pProfile}</label>
      </p>
      <UnitPicker authorId={m.authorId} onSaved={() => void 0} />
      <h3>{l.avatar}</h3>
      <div className="avedit">
        {(pend || p.av) && <img className="avprev" src={pend ?? `/api/account?op=avatar&id=${encodeURIComponent(m.authorId)}&v=${p.av}`} alt={pend ? l.avNew : l.avCur} width={96} height={96} />}
        <div>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void pick(e.target.files?.[0])} aria-label={l.avChoose} />
          {pend && <p className="meta">{l.avCrop}</p>}
          <p>{pend && <><button type="button" className="primary" disabled={busy} onClick={() => void upload()}>{l.avUse}</button> <button type="button" disabled={busy} onClick={() => { setPend(null); setAvMsg(""); }}>{l.cancel}</button> </>}{!pend && p.av ? <button type="button" disabled={busy} onClick={() => void run("author-avatar", { image: null }, l.avRemoved)}>{l.avRemove}</button> : null}</p>
          <div role="status" aria-live="polite">{avMsg && <p className="banner"><Icon n="check" />{avMsg}</p>}</div>
        </div>
      </div>
      <h3>{l.wrongTitle}</h3>
      <p className="meta">{l.wrongText}</p>
      {(m.xw ?? []).length > 0 && <ul>{(m.xw ?? []).map((w) => <li key={w}><code>{w.split("-").pop()}</code>{l.reported}<button type="button" disabled={busy} onClick={() => void run("author-work-not", { workId: w, undo: true }, l.undone)}>{l.undo}</button></li>)}</ul>}
      <MatchTitles authorId={m.authorId} reload={reload} />
      <h3>{l.doiTitle}</h3>
      <p className="meta">{l.doiText}</p>
      <form onSubmit={addDoi} className="form"><label className="sel"><span>DOI</span><input name="doi" required placeholder="10.1234/abcd" maxLength={220} /></label><p><button className="primary" disabled={busy}>{l.addWork}</button></p></form>
      {m.works.length > 0 && <ul>{m.works.map((w) => <li key={w.doi}><a href={`https://doi.org/${w.doi}`} target="_blank" rel="noopener">{w.title || w.doi}</a>{w.year ? ` · ${w.year}` : ""} · <b>{w.status === "ok" ? l.shown : l.pending}</b>{w.oa ? l.inOA2 : ""} <button type="button" onClick={() => void run("author-work-del", { doi: w.doi }, l.deleted)}>{l.del}</button></li>)}</ul>}
      </details>
    </section>
  );
}

/** Ngành do chủ hồ sơ đã xác thực tự chọn (ưu tiên hơn ngành hệ thống suy ra khi hiển thị). */
export function useOwnDisc(id: string): string[] | null { const d = useAuthorPub(id); return d?.profile?.disc?.length ? d.profile.disc : null; }

/** Công trình chủ hồ sơ đã báo "không phải của tôi" (ẩn khỏi danh sách; điểm tính lại ở lần dựng dữ liệu sau). */
export function useNotMine(id: string, local: string[]): Set<string> { const d = useAuthorPub(id); return new Set([...(d?.xw ?? []), ...local]); }
export function reportNotMine(authorId: string, workId: string): Promise<unknown> { return api("author-work-not", { authorId, workId }); }
/** Kỷ yếu quốc tế có ISBN và phản biện do chủ hồ sơ khai (hiện điểm "kỷ yếu" ngay, chưa vào PRO-SCORE và hạng). Mã công trình dạng A…-W…. */
export function useConf(id: string): { ids: Set<string>; mark: (w: string, on: boolean) => Promise<void> } {
  const d = useAuthorPub(id), [over, setOver] = useState<Record<string, boolean>>({});
  useEffect(() => { setOver({}); }, [id]);
  const ids = new Set([...(d?.cf ?? []), ...Object.keys(over).filter((w) => over[w])].filter((w) => over[w] !== false));
  return { ids, mark: (w, on) => (on ? api("author-work-conf", { authorId: id, workId: w, confirm: true }) : api("author-work-conf", { authorId: id, workId: w, undo: true })).then(() => setOver((o) => ({ ...o, [w]: on }))) };
}
/** Bài chủ hồ sơ khai mình là tác giả liên hệ (OpenAlex thiếu dấu liên hệ): chỉ hiện nhãn "tác giả khai", chưa vào PRO-SCORE và hạng. Mã công trình dạng A…-W…. */
export function useRoleDecl(id: string): { ids: Set<string>; mark: (w: string, on: boolean) => Promise<void> } {
  const d = useAuthorPub(id), [over, setOver] = useState<Record<string, boolean>>({});
  useEffect(() => { setOver({}); }, [id]);
  const ids = new Set([...(d?.cr ?? []), ...Object.keys(over).filter((w) => over[w])].filter((w) => over[w] !== false));
  return { ids, mark: (w, on) => (on ? api("author-work-role", { authorId: id, workId: w, confirm: true }) : api("author-work-role", { authorId: id, workId: w, undo: true })).then(() => setOver((o) => ({ ...o, [w]: on }))) };
}
let confPts: Promise<{ default: number; points: Record<string, number> }> | null = null;
/** Điểm một kỷ yếu theo ngành (quy tắc HĐGSNN, public/data/conf-points.json do build-index.mjs ghi); chưa biết ngành thì mức mặc định 0,5. */
export function useConfPoints(disc: string | undefined): number {
  const [p, setP] = useState(0.5);
  useEffect(() => { let on = true; confPts ??= fetch("./data/conf-points.json").then((r) => r.json()).catch(() => ({ default: 0.5, points: {} })); void confPts.then((c) => { if (on) setP((disc && c.points[disc]) || c.default); }); return () => { on = false; }; }, [disc]);
  return p;
}

// ---------- Chủ hồ sơ tự chọn đơn vị hiện tại / trước đây ----------
type UD = { units: { id: string; name: string; en: string }[]; mine: string[]; past: string[] };
const udCache = new Map<string, Promise<{ units: UD["units"]; byId: Map<string, { institutions: string[]; instPast?: string[] }> }>>();
function loadUnits() { if (!udCache.has("d")) udCache.set("d", fetch("./data/profind-lite.json").then((r) => r.json()).then((j: { institutions: UD["units"]; authors: { id: string; institutions: string[]; instPast?: string[] }[] }) => ({ units: j.institutions, byId: new Map(j.authors.map((a) => [a.id, a])) }))); return udCache.get("d")!; }
function UnitPicker({ authorId, onSaved }: { authorId: string; onSaved: () => void }) {
  const [ud, setUd] = useState<UD | null>(null), [now, setNow] = useState<Set<string>>(new Set()), [past, setPast] = useState<Set<string>>(new Set()), [q, setQ] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [custom, setCustom] = useState(false), { lang } = useT(), l = L[lang];
  useEffect(() => {
    let on = true;
    Promise.all([loadUnits(), api<{ map: Record<string, { now: string[]; past?: string[]; src?: string }> }>("inst").catch(() => ({ map: {} as Record<string, { now: string[]; past?: string[]; src?: string }> }))]).then(([d, o]) => {
      if (!on) return; const a = d.byId.get(authorId), ov = o.map[authorId];
      const pastIds = ov ? ov.past ?? [] : a?.instPast ?? [], nowIds = ov ? ov.now : (a?.institutions ?? []).filter((u) => !pastIds.includes(u));
      setUd({ units: d.units, mine: [...new Set([...nowIds, ...pastIds])], past: pastIds }); setNow(new Set(nowIds)); setPast(new Set(pastIds)); setLocked(ov?.src === "admin"); setCustom(!!ov);
    }).catch(() => {});
    return () => { on = false; };
  }, [authorId]);
  if (!ud) return null;
  const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase(), name = (id: string) => ud.units.find((u) => u.id === id)?.name ?? id;
  const shown = [...new Set([...ud.mine, ...now, ...past])], cand = q.trim().length >= 2 ? ud.units.filter((u) => (fold(u.name).includes(fold(q.trim())) || fold(u.en ?? "").includes(fold(q.trim()))) && !shown.includes(u.id)).slice(0, 8) : [];
  const toggle = (u: string, which: "now" | "past") => { const [a, sa, sb] = which === "now" ? [now, setNow, setPast] : [past, setPast, setNow]; const n = new Set(a); if (n.has(u)) n.delete(u); else { n.add(u); sb((o) => { const m = new Set(o); m.delete(u); return m; }); } sa(n); };
  const save = async () => { setBusy(true); setMsg(""); try { await api("author-inst", { authorId, now: [...now], past: [...past] }); setMsg(l.unitSaved); setCustom(true); onSaved(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  const clear = async () => { setBusy(true); setMsg(""); try { await api("author-inst", { authorId, clear: true }); setMsg(l.unitCleared); setCustom(false); onSaved(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  return (
    <>
      <h3>{l.unitTitle}</h3>
      <p className="meta">{l.uA}<b>{l.uCur}</b>{l.uB}<b>{l.uPast}</b>{l.uC}</p>
      {locked ? <p className="banner demo">{l.locked}</p> : <>
        <table className="adm-t"><thead><tr><th>{l.colUnit}</th><th>{l.colNow}</th><th>{l.colPast}</th></tr></thead><tbody>{shown.map((u) => <tr key={u}><td>{name(u)}</td><td><input type="checkbox" checked={now.has(u)} onChange={() => toggle(u, "now")} aria-label={l.nowAria(name(u))} /></td><td><input type="checkbox" checked={past.has(u)} onChange={() => toggle(u, "past")} aria-label={l.pastAria(name(u))} /></td></tr>)}</tbody></table>
        <label className="sel"><span>{l.addUnit}</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={l.unitPh} /></label>
        {cand.length > 0 && <ul className="mxlist">{cand.map((u) => <li key={u.id}><button type="button" className="linkbtn" onClick={() => { setNow(new Set([...now, u.id])); setQ(""); }}>{lang === "en" && u.en ? u.en : u.name}</button></li>)}</ul>}
        <p><button type="button" className="primary" disabled={busy || !now.size} onClick={() => void save()}>{l.saveUnit}</button>{custom && <> <button type="button" disabled={busy} onClick={() => void clear()}>{l.clearMine}</button></>}</p></>}
      <div role="status" aria-live="polite">{msg && <p className="banner"><Icon n="check" />{msg}</p>}</div>
    </>
  );
}
