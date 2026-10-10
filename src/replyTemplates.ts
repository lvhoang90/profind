/** Thư báo cho người gửi đề nghị (bổ sung, xác nhận, đính chính, gỡ hồ sơ) khi quản trị viên bấm "Đã xử lý". Soạn sẵn, quản trị viên sửa được trước khi gửi.
 *  Ngôn ngữ theo người gửi: có chữ tiếng Việt (dấu) thì thư tiếng Việt, ngược lại tiếng Anh. Phần chân thư (ProFind · Viện ISA · địa chỉ) do trình gửi thư thêm. */
export type ReqLang = "vi" | "en";
export type ReqKind = "add" | "claim" | "correct" | "remove";
const VI_CHARS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

export const detectLang = (...texts: string[]): ReqLang => (VI_CHARS.test(texts.join(" ")) ? "vi" : "en");
export const profileUrl = (id: string) => `https://profind.isavn.edu.vn/#/tac-gia/${id}`;

export function replyTemplate(kind: ReqKind, lang: ReqLang, o: { name: string; email: string; id: string }): { subject: string; body: string } {
  const link = o.id ? profileUrl(o.id) : "";
  const vi = lang === "vi", hi = vi ? `Chào ${o.name || "bạn"},` : `Hello ${o.name || ""}`.trim().replace(/$/, ","), sign = vi ? "Trân trọng,\nNhóm ProFind™" : "Kind regards,\nThe ProFind™ team";
  const T: Record<ReqKind, Record<ReqLang, { subject: string; lines: string[] }>> = {
    add: {
      vi: { subject: "ProFind: hồ sơ của bạn đã được bổ sung", lines: [
        "Cảm ơn bạn đã gửi đề nghị bổ sung nhà nghiên cứu. Hồ sơ của bạn đã được thêm vào ProFind" + (link ? `:\n${link}` : "."),
        "Vài điều nên biết:\n• ProFind chỉ tính điểm bài tạp chí có ISSN (chủ yếu từ năm 2021). Kỷ yếu hội nghị, sách và bài không có ISSN không tính điểm.\n• Để xác nhận hồ sơ là của bạn, mở trang hồ sơ, bấm \"Đây là tôi / đính chính / gỡ hồ sơ\" và chọn \"Đây là hồ sơ của tôi\" (dùng email " + (o.email || "của bạn") + " và mã ORCID). Email cơ quan cùng ORCID khớp thường được duyệt ngay; email cá nhân sẽ do quản trị viên xem xét.\n• Hồ sơ đã xác thực có thêm mục \"Công trình khác (không tính điểm)\" (kỷ yếu, sách, bài không ISSN) ở lần cập nhật dữ liệu kế tiếp, và bạn có thể tự thêm công trình theo DOI.",
        "Dữ liệu lấy từ nguồn công khai (OpenAlex, ORCID...) nên có thể chưa đủ hoặc có sai sót. Bạn xem lại và trả lời thư này nếu cần chỉnh." ] },
      en: { subject: "ProFind: your profile has been added", lines: [
        "Thank you for asking us to add a researcher profile. Your profile is now on ProFind" + (link ? `:\n${link}` : "."),
        "A few things to know:\n• ProFind scores only journal articles with an ISSN (mostly from 2021). Conference papers, books and items without an ISSN are not scored.\n• To confirm the profile is yours, open it, choose \"This is me / correct / remove\" and then \"This is my profile\" (use " + (o.email || "your email") + " and your ORCID). An institutional email with a matching ORCID is usually approved right away; a personal email is reviewed by an administrator.\n• A verified profile also gets an \"Other works (not scored)\" section (conference papers, books, items without an ISSN) at the next data update, and you can add works yourself by DOI.",
        "The data comes from public sources (OpenAlex, ORCID...) and may be incomplete or contain mistakes. Please review it and reply to this email if anything needs fixing." ] },
    },
    claim: {
      vi: { subject: "ProFind: yêu cầu xác nhận hồ sơ của bạn đã được xử lý", lines: [
        "Yêu cầu xác nhận hồ sơ của bạn đã được xử lý" + (link ? `. Hồ sơ của bạn:\n${link}` : "."),
        "Đăng nhập ProFind bằng email này để tự quản lý hồ sơ: thêm công trình theo DOI, chọn ngành, ảnh đại diện, báo bài không phải của bạn.",
        "Nếu bạn thấy thông tin chưa đúng, trả lời thư này kèm chi tiết để chúng tôi chỉnh." ] },
      en: { subject: "ProFind: your profile confirmation request has been processed", lines: [
        "Your profile confirmation request has been processed" + (link ? `. Your profile:\n${link}` : "."),
        "Sign in to ProFind with this email to manage your profile: add works by DOI, choose your fields, add an avatar, and flag works that are not yours.",
        "If anything looks wrong, reply to this email with the details and we will fix it." ] },
    },
    correct: {
      vi: { subject: "ProFind: đề nghị đính chính của bạn đã được xử lý", lines: [
        "Cảm ơn bạn đã gửi đề nghị đính chính" + (link ? `. Chúng tôi đã xem xét và xử lý trên hồ sơ:\n${link}` : ". Chúng tôi đã xem xét và xử lý."),
        "Thay đổi sẽ hiện đầy đủ sau lần cập nhật dữ liệu kế tiếp (có thể mất vài ngày). Với công trình thiếu: ProFind chỉ tính điểm bài tạp chí có ISSN (chủ yếu từ 2021); các công trình khác của hồ sơ đã xác thực nằm ở mục \"Công trình khác (không tính điểm)\".",
        "Nếu bạn vẫn thấy chưa đúng, trả lời thư này kèm tên công trình hoặc DOI cụ thể." ] },
      en: { subject: "ProFind: your correction request has been processed", lines: [
        "Thank you for your correction request" + (link ? `. We have reviewed and handled it on your profile:\n${link}` : ". We have reviewed and handled it."),
        "The change will show in full after the next data update (it can take a few days). About missing works: ProFind scores only journal articles with an ISSN (mostly from 2021); other works of a verified profile appear under \"Other works (not scored)\".",
        "If anything is still wrong, reply to this email with the title or DOI of the work." ] },
    },
    remove: {
      vi: { subject: "ProFind: đề nghị gỡ hồ sơ của bạn đã được xử lý", lines: [
        "Đề nghị gỡ hồ sơ của bạn đã được xử lý. Hồ sơ sẽ không còn hiển thị trên ProFind sau lần cập nhật dữ liệu kế tiếp.",
        "Thông tin gốc trên OpenAlex, ORCID do các nền tảng đó quản lý; nếu muốn chỉnh ở nguồn, bạn liên hệ trực tiếp với họ.",
        "Nếu bạn đổi ý hoặc cần hỗ trợ thêm, trả lời thư này." ] },
      en: { subject: "ProFind: your removal request has been processed", lines: [
        "Your profile removal request has been processed. The profile will no longer be shown on ProFind after the next data update.",
        "The original data on OpenAlex and ORCID is managed by those platforms; to change it at the source, please contact them directly.",
        "If you change your mind or need more help, reply to this email." ] },
    },
  };
  const t = T[kind][lang];
  return { subject: t.subject, body: [hi, ...t.lines, sign].join("\n\n") };
}
