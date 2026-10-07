// Gửi email dùng chung cho các hàm Edge của ProFind (account.js). Biến môi trường: xem đầu api/account.js.
export const mailProvider = () => {
  const p = String(process.env.MAIL_PROVIDER || "").toLowerCase(), e = process.env;
  if (p === "console") return "console";
  if ((p === "brevo" || (!p && e.BREVO_API_KEY)) && e.BREVO_API_KEY && from()) return "brevo";
  if ((p === "resend" || !p) && e.RESEND_API_KEY && from()) return "resend";
  return null;
};
const from = () => process.env.MAIL_FROM || process.env.CORRECTION_FROM || "";
const parseFrom = (s) => { const m = String(s).match(/^\s*(.*?)\s*<([^>]+)>\s*$/); return m ? { name: m[1].replace(/^"|"$/g, ""), email: m[2] } : { name: "", email: String(s).trim() }; };

export async function sendMail(to, mail) {
  const prov = mailProvider(), e = process.env;
  if (prov === "console") { console.log(`[mail] tới ${to}: ${mail.subject}\n${mail.text}`); return; }
  if (prov === "resend") {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: from(), to: [to], subject: mail.subject, html: mail.html, text: mail.text }) });
    if (!r.ok) { let m = ""; try { m = String((await r.json()).message || "").slice(0, 200); } catch { /* bỏ qua */ } throw new Error(`Resend ${r.status}${m ? ": " + m : ""}`); }
    return;
  }
  if (prov === "brevo") {
    const f = parseFrom(from());
    const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": e.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: { name: f.name || "ProFind", email: f.email }, to: [{ email: to }], subject: mail.subject, htmlContent: mail.html, textContent: mail.text }) });
    if (!r.ok) { let m = ""; try { m = String((await r.json()).message || "").slice(0, 200); } catch { /* bỏ qua */ } throw new Error(`Brevo ${r.status}${m ? ": " + m : ""}`); }
    return;
  }
  throw new Error("Chưa cấu hình gửi email.");
}

const escH = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function codeMail(code, lang) {
  const en = lang === "en";
  const subject = en ? `Your ProFind verification code: ${code}` : `Mã xác thực ProFind của bạn: ${code}`;
  const text = en ? `Your ProFind verification code is ${code}.\nIt expires in 10 minutes. If you did not request it, ignore this email.\n\nProFind is free forever for every account with a verified email.`
    : `Mã xác thực ProFind của bạn là ${code}.\nMã có hiệu lực 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua thư này.\n\nProFind miễn phí vĩnh viễn cho mọi tài khoản đã xác thực email.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f2a3d"><p>${en ? "Your verification code" : "Mã xác thực của bạn"}:</p><p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:12px 0;color:#17688f">${code}</p><p style="color:#51677a;font-size:13px">${en ? "It expires in 10 minutes. If you did not request it, ignore this email." : "Mã có hiệu lực 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua thư này."}</p><p style="color:#51677a;font-size:13px">${en ? "Free forever for every account with a verified email." : "Miễn phí vĩnh viễn cho mọi tài khoản đã xác thực email."}</p></div>`;
  return { subject, text, html };
}

/** Thư chào mừng (một lần khi tạo tài khoản): ba việc nhỏ để bắt đầu và ba công cụ nối tiếp trong hệ sinh thái ISA. */
export function welcomeMail({ lang, u }) {
  const en = lang === "en";
  const T = en ? {
    subject: "Welcome to ProFind", hi: "Hi, welcome to ProFind!",
    lead: "Thank you for signing up. Your saved researchers, searches and history now follow you on every device, and ProFind is free for you, always.",
    h: "Three things to try",
    steps: [["Open My space", "your saved researchers, saved searches and recently viewed works.", u.account, "Open"], ["Find a researcher", "search by name, ORCID, journal or ISSN and star the people you follow.", u.start, "Search"], ["Complete your profile", "so researchers can reach you and we can suggest better.", u.profile, "Complete"]],
    next: "Your next step in the ISA ecosystem",
    apps: [["EduFind", "pick the right journal for your field, with scores and quartiles.", u.edufind, "Open EduFind"], ["Ami", "read sources with you and make the citations.", u.ami, "Meet Ami"], ["Mây", "format your manuscript to the journal's template.", u.may, "Meet Mây"]],
    bye: "Wishing you smooth, happy research!", by: "ProFind · ISA Vietnam", stop: "Stop these emails",
  } : {
    subject: "Chào mừng bạn đến với ProFind", hi: "Chào bạn, chào mừng bạn đến với ProFind!",
    lead: "Cảm ơn bạn đã đăng ký. Các nhà nghiên cứu bạn lưu, tìm kiếm đã lưu và lịch sử xem sẽ đi cùng bạn trên mọi thiết bị, và ProFind miễn phí với bạn, mãi mãi.",
    h: "Ba việc nhỏ để bắt đầu",
    steps: [["Vào Không gian của tôi", "nơi giữ các tác giả đã lưu, tìm kiếm đã lưu và công trình đã xem.", u.account, "Vào xem"], ["Tìm một nhà nghiên cứu", "tìm theo tên, ORCID, tạp chí hoặc ISSN rồi bấm sao để theo dõi.", u.start, "Bắt đầu tìm"], ["Hoàn thiện hồ sơ", "để mọi người liên hệ được và chúng tôi gợi ý đúng hơn.", u.profile, "Hoàn thiện"]],
    next: "Bước tiếp theo trong hệ sinh thái ISA",
    apps: [["EduFind", "chọn đúng tạp chí cho ngành của bạn, có điểm và hạng Q.", u.edufind, "Mở EduFind"], ["Ami", "đọc tài liệu cùng bạn và tạo trích dẫn.", u.ami, "Gặp Ami"], ["Mây", "chỉnh bản thảo đúng thể thức của tạp chí.", u.may, "Gặp Mây"]],
    bye: "Chúc bạn nghiên cứu thật suôn sẻ và nhiều niềm vui!", by: "ProFind · ISA Việt Nam", stop: "Không nhận thư này nữa",
  };
  const text = `${T.hi}\n\n${T.lead}\n\n${T.h}:\n${T.steps.map((s, i) => `${i + 1}. ${s[0]}: ${s[1]}\n   ${s[2]}`).join("\n")}\n\n${T.next}:\n${T.apps.map((a) => `- ${a[0]}: ${a[1]}\n  ${a[2]}`).join("\n")}\n\n${T.bye}\n${T.by}\n${T.stop}: ${u.unsub}`;
  const btn = (href, label) => `<a href="${escH(href)}" style="display:inline-block;background:#17688f;color:#fff;text-decoration:none;font-weight:700;padding:8px 14px;border-radius:8px;font-size:14px;margin-top:6px">${escH(label)}</a>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;color:#0f2a3d;line-height:1.55"><h2 style="margin:0 0 8px;font-size:20px">${escH(T.hi)}</h2><p style="margin:0 0 16px">${escH(T.lead)}</p><h3 style="margin:18px 0 8px;font-size:16px">${escH(T.h)}</h3>${T.steps.map((s, i) => `<div style="margin:0 0 12px;padding:10px 12px;border:1px solid #d9e2ea;border-radius:10px"><b>${i + 1}. ${escH(s[0])}</b><br><span style="color:#51677a">${escH(s[1])}</span><br>${btn(s[2], s[3])}</div>`).join("")}<h3 style="margin:18px 0 8px;font-size:16px">${escH(T.next)}</h3>${T.apps.map((a) => `<p style="margin:0 0 8px"><b>${escH(a[0])}</b> ${escH(a[1])} <a href="${escH(a[2])}">${escH(a[3])}</a></p>`).join("")}<p style="margin:16px 0 4px">${escH(T.bye)}</p><p style="margin:0;color:#51677a">${escH(T.by)}</p><p style="margin:18px 0 0;font-size:12px;color:#51677a"><a href="${escH(u.unsub)}" style="color:#51677a">${escH(T.stop)}</a></p></div>`;
  return { subject: T.subject, text, html };
}
