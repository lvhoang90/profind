import { useState, type FormEvent } from "react";
import { useT } from "./i18n";
import { DISC, dName } from "./disciplines";
import { evt } from "./analytics";
import { Icon } from "./icons";

type LG = "vi" | "en";
const L = {
  vi: {
    title: "Hợp tác với ISA", lead: "Nhà trường và doanh nghiệp có thể gửi nhu cầu tới Viện ISA. ISA đọc yêu cầu, đối chiếu với dữ liệu ProFind và liên hệ lại với bạn qua email.",
    forSchool: "Dành cho nhà trường", forBiz: "Dành cho doanh nghiệp",
    schoolItems: ["Tra cứu đội ngũ theo lĩnh vực và đơn vị", "Xem năng lực nghiên cứu của từng khoa, viện", "Tìm nhà khoa học phù hợp cho đề tài hoặc hội đồng", "Theo dõi công bố theo đơn vị"],
    bizItems: ["Tìm chuyên gia tư vấn theo lĩnh vực", "Tìm nhóm nghiên cứu phù hợp", "Tìm đối tác chuyển giao công nghệ", "Tìm diễn giả hoặc cố vấn chuyên môn"],
    free: "Hồ sơ công khai trên ProFind luôn miễn phí. Chỉ báo cáo riêng làm theo yêu cầu của đơn vị (ví dụ báo cáo năng lực nghiên cứu của một trường) có tính phí; ISA báo giá trước khi thực hiện.",
    privacy: "Yêu cầu chỉ gửi tới ISA, không gửi trực tiếp tới nhà khoa học nào. ISA chỉ chuyển thông tin cho nhà khoa học khi bạn đồng ý.",
    orgType: "Bạn là", types: { school: "Nhà trường, viện nghiên cứu", biz: "Doanh nghiệp", other: "Tổ chức khác" },
    org: "Tên tổ chức", name: "Người liên hệ", email: "Email liên hệ", need: "Nhu cầu",
    needs: { expert: "Tìm chuyên gia tư vấn", team: "Tìm nhóm nghiên cứu", transfer: "Tìm đối tác chuyển giao công nghệ", speaker: "Tìm diễn giả hoặc cố vấn", panel: "Tìm nhà khoa học cho đề tài hoặc hội đồng", report: "Báo cáo riêng theo yêu cầu (có phí)", other: "Khác" },
    field: "Lĩnh vực (không bắt buộc)", anyField: "Chưa xác định", msg: "Mô tả nhu cầu", msgHint: "Mục tiêu, thời gian dự kiến, quy mô. Không gửi thông tin bí mật.",
    consent: "Tôi đồng ý để ISA lưu và dùng thông tin này để liên hệ về yêu cầu của tôi.", send: "Gửi yêu cầu", sending: "Đang gửi…",
    ok: "Đã gửi yêu cầu tới ISA. Chúng tôi sẽ phản hồi qua email của bạn.", okAgain: "Gửi yêu cầu khác", err: "Chưa gửi được yêu cầu. Hãy kiểm tra thông tin rồi thử lại, hoặc viết trực tiếp tới vienisavietnam@gmail.com.", rate: "Bạn gửi quá nhiều yêu cầu. Hãy thử lại sau một giờ.",
    interest: "Bạn đang quan tâm tới nhà khoa học", viewProfile: "Xem hồ sơ", interestNote: "Nhà khoa học này không nhận được yêu cầu của bạn. Yêu cầu chỉ gửi tới ISA; ISA xem xét và chỉ chuyển thông tin cho nhà khoa học khi phù hợp và sau khi bạn đồng ý.", secOrg: "Về tổ chức của bạn", secNeed: "Nhu cầu của bạn", okNote: "ISA là nơi nhận yêu cầu này. Nhà khoa học chưa nhận được gì.",
  },
  en: {
    title: "Partner with ISA", lead: "Schools and companies can send their needs to ISA. ISA reads each request, checks it against ProFind data and replies by email.",
    forSchool: "For schools", forBiz: "For companies",
    schoolItems: ["Find staff by field and unit", "See the research capacity of each faculty or institute", "Find scientists for a project or a committee", "Track publications by unit"],
    bizItems: ["Find consultants by field", "Find a suitable research group", "Find technology transfer partners", "Find speakers or technical advisors"],
    free: "Public profiles on ProFind stay free. Only custom reports prepared on request (for example a research capacity report for a university) are paid; ISA quotes a price before starting.",
    privacy: "Requests go to ISA only, never directly to a scientist. ISA shares your details with a scientist only with your consent.",
    orgType: "You are", types: { school: "School or research institute", biz: "Company", other: "Other organisation" },
    org: "Organisation", name: "Contact person", email: "Contact email", need: "What you need",
    needs: { expert: "Find a consultant", team: "Find a research group", transfer: "Find technology transfer partners", speaker: "Find a speaker or advisor", panel: "Find scientists for a project or committee", report: "Custom report on request (paid)", other: "Other" },
    field: "Field (optional)", anyField: "Not decided", msg: "Describe your need", msgHint: "Goal, expected timing, scale. Do not send confidential information.",
    consent: "I agree that ISA stores and uses this information to contact me about my request.", send: "Send request", sending: "Sending…",
    ok: "Your request has been sent to ISA. We will reply by email.", okAgain: "Send another request", err: "The request could not be sent. Check the details and try again, or write directly to vienisavietnam@gmail.com.", rate: "Too many requests. Please try again in an hour.",
    interest: "You are interested in the scientist", viewProfile: "View profile", interestNote: "This scientist does not receive your request. It goes to ISA only; ISA reviews it and passes your details to the scientist only when appropriate and with your consent.", secOrg: "About your organisation", secNeed: "What you need", okNote: "ISA receives this request. The scientist has not been contacted.",
  },
};

/** Trang #/hop-tac: nhà trường, doanh nghiệp gửi nhu cầu hợp tác tới ISA (qua /api/correction, kind=collab; thư về hộp thư ISA). Có thể kèm hồ sơ nhà khoa học (?a=<mã>&n=<tên>) để ISA biết người được quan tâm. */
export function CollabPage({ query }: { query: string }) {
  const { lang } = useT(), l = L[lang as LG] ?? L.vi, q = new URLSearchParams(query);
  const aid = /^A\d{6,12}$/.test(q.get("a") ?? "") ? q.get("a")! : "", an = (q.get("n") ?? "").slice(0, 120);
  const org0 = (q.get("org") ?? "").slice(0, 160), need0 = Object.keys(l.needs).includes(q.get("need") ?? "") ? q.get("need")! : "expert";
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err" | "rate">("idle");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setState("sending");
    const f = new FormData(e.currentTarget);
    f.set("lang", lang); f.set("kind", "collab"); f.set("author", aid); f.set("authorName", an);
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 15000);
    try {
      const r = await fetch("/api/correction", { method: "POST", body: f, signal: ac.signal });
      const j = await r.json().catch(() => null) as { ok?: boolean } | null;
      if (r.ok && j?.ok === true) { setState("ok"); evt("collab_sent"); } else setState(r.status === 429 ? "rate" : "err");
    } catch { setState("err"); } finally { clearTimeout(to); }
  };
  const li = (a: string[]) => <ul className="collab-list">{a.map((x) => <li key={x}>{x}</li>)}</ul>;
  return (
    <section className="collab" aria-labelledby="collab-h">
      <header className="collab-head"><h1 id="collab-h">{l.title}</h1><p>{l.lead}</p></header>
      <div className="collab-cols">
        <div className="collab-card"><h2>{l.forSchool}</h2>{li(l.schoolItems)}</div>
        <div className="collab-card"><h2>{l.forBiz}</h2>{li(l.bizItems)}</div>
      </div>
      <p className="banner" role="note">{l.free}</p>
      {aid && <div className="collab-interest" role="note"><Icon n="user" size={20} /><div><small>{l.interest}</small><b>{an || aid}</b> <a href={`#/tac-gia/${encodeURIComponent(aid)}`}>{l.viewProfile} →</a><p>{l.interestNote}</p></div></div>}
      {state === "ok" ? <div role="status" className="banner collab-ok"><p><b>{l.ok}</b></p>{aid && <p>{l.okNote}</p>}<button type="button" className="ghost" onClick={() => setState("idle")}>{l.okAgain}</button></div> : (
        <form onSubmit={submit} className="collab-form">
          <input type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
          <h2 className="collab-sec">{l.secOrg}</h2>
          <div className="collab-grid">
            <label className="sel"><span>{l.orgType}</span><select id="co-type" name="orgType" defaultValue="school">{Object.entries(l.types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="sel"><span>{l.org}</span><input id="co-org" name="org" type="text" maxLength={160} required defaultValue={org0} /></label>
            <label className="sel"><span>{l.name}</span><input id="co-name" name="name" type="text" maxLength={120} required autoComplete="name" /></label>
            <label className="sel"><span>{l.email}</span><input id="co-email" name="email" type="email" maxLength={160} required autoComplete="email" /></label>
          </div>
          <h2 className="collab-sec">{l.secNeed}</h2>
          <div className="collab-grid">
            <label className="sel"><span>{l.need}</span><select id="co-need" name="need" defaultValue={need0}>{Object.entries(l.needs).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="sel"><span>{l.field}</span><select id="co-field" name="field" defaultValue=""><option value="">{l.anyField}</option>{Object.keys(DISC).map((k) => <option key={k} value={k}>{dName(k, lang as LG)}</option>)}</select></label>
            <label className="sel wide"><span>{l.msg}</span><textarea id="co-msg" name="msg" rows={5} maxLength={4000} required placeholder={l.msgHint} /></label>
          </div>
          <label className="chk consent"><input id="co-consent" type="checkbox" name="consent" value="1" required /> {l.consent}</label>
          <div className="collab-act"><button className="btn" type="submit" disabled={state === "sending"}>{state === "sending" ? l.sending : l.send}</button><p className="meta">{l.privacy}</p></div>
          {(state === "err" || state === "rate") && <p className="banner demo" role="alert">{state === "rate" ? l.rate : l.err}</p>}
        </form>
      )}
    </section>
  );
}
