import { createContext, useContext } from "react";
export type Lang = "vi" | "en";
export const KEY = "edufind.lang"; // dùng chung với EduFind (cùng ngôn ngữ khi chuyển ứng dụng trong hệ sinh thái)
const vi = {
  title: "ProFind", sub: "Tra cứu tác giả và công trình nghiên cứu", tagline: "Ngành · Đơn vị · Công trình · Tạp chí · ISSN · Điểm tham khảo (HĐGSNN)",
  demo: "DỮ LIỆU MẪU: tác giả và công trình là hư cấu, chỉ để chạy thử giao diện. Dữ liệu thật được nạp bằng scripts/ingest-openalex.mjs.",
  notRank: "Thứ hạng chỉ để tham khảo, không có ý nghĩa xếp hạng chính thức. Điểm là mức tối đa theo quy tắc của HĐGSNN: tạp chí trong nước theo năm đăng, tạp chí Scopus theo hạng Q và quy tắc của ngành (chưa xác định được SCIE/SSCI, kỷ yếu hội nghị, nên là mức tham khảo thấp hơn thực tế). Chỉ tính cho tác giả chính (tác giả đứng đầu hoặc tác giả liên hệ duy nhất; có từ 2 tác giả liên hệ thì chỉ tính tác giả đứng đầu).",
  search: "Tìm theo tên, ORCID, tên tạp chí hoặc ISSN", all: "Tất cả", discipline: "Ngành", instType: "Loại đơn vị", inst: "Đơn vị", sort: "Sắp xếp theo", byScore: "Tổng điểm", byWorks: "Số bài", byCit: "Trích dẫn",
  rank: "Hạng", author: "Tác giả", unit: "Đơn vị", works: "Số bài", score: "Tổng điểm", cit: "Trích dẫn", years: "Năm đăng", shown: "Hiển thị {n} / {t} tác giả",
  back: "← Danh sách", year: "Năm", paper: "Công trình", journal: "Tạp chí", issn: "ISSN", pts: "Điểm", role: "Vai trò", lead: "Chính", co: "Đồng tác giả", unmatched: "Chưa xác định điểm", kDom: "Tạp chí trong nước (HĐGSNN)", kScopus: "Scopus", notLead: "Không tính (không phải tác giả chính)", counted: "Công trình được tính điểm / tổng", lookup: "Tra tạp chí trên EduFind",
  matched: "Tỷ lệ công trình khớp tạp chí HĐGSNN", csv: "Tải CSV", cite: "Điểm theo danh mục HĐGSNN (mức tối đa)", none: "Không có kết quả.", loading: "Đang tải dữ liệu…", err: "Không tải được dữ liệu.",
  eco: "Hệ sinh thái ISA cho người làm khoa học", e1: "Tìm tác giả (ProFind)", e2: "Chọn tạp chí (EduFind)", e3: "Đọc và trích dẫn (Ami)", here: "Bạn đang ở đây",
  lic: "Mã nguồn MIT · Dữ liệu do dự án biên soạn CC BY 4.0 · Bản quyền © 2026 Lương Việt Hoàng (ISA Vietnam). Dữ liệu bên thứ ba theo điều khoản của nguồn (OpenAlex, ORCID, HĐGSNN).",
  fix: "Báo sai sót hoặc yêu cầu đính chính / gỡ hồ sơ", theme: "Giao diện",
  scope: "Phạm vi", scopeVn: "Đơn vị tại Việt Nam", scopeAll: "Kể cả có đơn vị nước ngoài", foreignTag: "Có đơn vị ngoài Việt Nam",
  suspectTag: "Hồ sơ có thể gộp nhầm nhiều người", suspectNote: "Số công trình bất thường so với một người; hồ sơ OpenAlex này có thể gộp nhầm nhiều tác giả. Điểm và thứ hạng chưa đáng tin; tác giả có thể yêu cầu đính chính.",
  claimedBadge: "Đã được tác giả xác nhận", corrLink: "Đây là tôi / đính chính / gỡ hồ sơ", corrTitle: "Xác nhận, đính chính hoặc gỡ hồ sơ", corrLead: "ProFind chỉ dùng dữ liệu công khai (OpenAlex, ORCID, danh mục HĐGSNN). Người được nêu tên có quyền yêu cầu xác nhận, đính chính hoặc gỡ hồ sơ. Yêu cầu gỡ hồ sơ luôn được thực hiện; các yêu cầu khác được kiểm tra (ORCID, email cơ quan) trước khi áp dụng.",
  kClaim: "Đây là hồ sơ của tôi (xác nhận)", kCorrect: "Đính chính thông tin hoặc công trình", kRemove: "Gỡ hồ sơ khỏi ProFind", fName: "Họ và tên người gửi", fEmail: "Email (bắt buộc, để phản hồi)", fOrcid: "ORCID của bạn (nếu có)", fMsg: "Nội dung (vd. công trình nào sai, tên đúng là gì)", send: "Gửi yêu cầu", sending: "Đang gửi…", sent: "Đã gửi. Chúng tôi sẽ phản hồi qua email.", sendErr: "Không gửi được. Vui lòng gửi email trực tiếp:", moreRows: "Hiển thị thêm", instPh: "Gõ tên đơn vị (vd. Đại học Cần Thơ)", source: "Nguồn dữ liệu", srcLine: "OpenAlex (CC0), cập nhật {d}. Danh mục tạp chí và quy tắc điểm: HĐGSNN qua EduFind.",
};
const en: typeof vi = {
  title: "ProFind", sub: "Find researchers and their publications", tagline: "Field · Institution · Works · Journal · ISSN · Reference score (State Professorship Council)",
  demo: "SAMPLE DATA: authors and works are fictional, for interface testing only. Load real data with scripts/ingest-openalex.mjs.",
  notRank: "Rankings are for reference only and have no official ranking meaning. Score is the maximum under Council rules: domestic journals by publication year, Scopus journals by quartile and field rule (SCIE/SSCI and conference proceedings cannot be determined, so it is a lower reference value); counted only for the lead author (first author, or the sole corresponding author; with two or more corresponding authors only the first author counts).",
  search: "Search by name, ORCID, journal title or ISSN", all: "All", discipline: "Field", instType: "Institution type", inst: "Institution", sort: "Sort by", byScore: "Total score", byWorks: "Papers", byCit: "Citations",
  rank: "Rank", author: "Author", unit: "Institution", works: "Papers", score: "Total score", cit: "Citations", years: "Years", shown: "Showing {n} of {t} authors",
  back: "← List", year: "Year", paper: "Work", journal: "Journal", issn: "ISSN", pts: "Score", role: "Role", lead: "Lead", co: "Co-author", unmatched: "Score not determined", kDom: "Domestic journal (Council)", kScopus: "Scopus", notLead: "Not counted (not lead author)", counted: "Works scored / total", lookup: "Look up journal on EduFind",
  matched: "Share of works matched to a Council journal", csv: "Download CSV", cite: "Score per Council catalogue (maximum level)", none: "No results.", loading: "Loading data…", err: "Could not load data.",
  eco: "The ISA ecosystem for researchers", e1: "Find researchers (ProFind)", e2: "Choose a journal (EduFind)", e3: "Read and cite (Ami)", here: "You are here",
  lic: "Code MIT · Project-compiled data CC BY 4.0 · © 2026 Luong Viet Hoang (ISA Vietnam). Third-party data under each source's terms (OpenAlex, ORCID, State Professorship Council).",
  fix: "Report an error or request correction / removal", theme: "Theme",
  scope: "Scope", scopeVn: "Vietnam-based only", scopeAll: "Include foreign-affiliated", foreignTag: "Also affiliated outside Vietnam",
  suspectTag: "Profile may merge several people", suspectNote: "Unusually many works for one person; this OpenAlex profile may merge several authors. Score and rank are unreliable; the author may request a correction.",
  claimedBadge: "Verified by the author", corrLink: "This is me / correct / remove profile", corrTitle: "Claim, correct or remove a profile", corrLead: "ProFind uses public data only (OpenAlex, ORCID, Council catalogue). Named persons may ask to claim, correct or remove their profile. Removal requests are always honoured; other requests are verified (ORCID, institutional email) before being applied.",
  kClaim: "This is my profile (claim)", kCorrect: "Correct information or works", kRemove: "Remove my profile from ProFind", fName: "Your full name", fEmail: "Email (required, for our reply)", fOrcid: "Your ORCID (if any)", fMsg: "Details (e.g. which work is wrong, the correct name)", send: "Send request", sending: "Sending…", sent: "Sent. We will reply by email.", sendErr: "Could not send. Please email directly:", moreRows: "Show more", instPh: "Type an institution name (e.g. Can Tho University)", source: "Data source", srcLine: "OpenAlex (CC0), updated {d}. Journal catalogue and scoring rules: State Professorship Council via EduFind.",
};
export const DICT = { vi, en };
export type Key = keyof typeof vi;
export const Ctx = createContext<{ lang: Lang; t: (k: Key, v?: Record<string, string | number>) => string }>({ lang: "vi", t: (k) => k });
export const useT = () => useContext(Ctx);
export const initialLang = (): Lang => { try { const s = localStorage.getItem(KEY); if (s === "vi" || s === "en") return s; } catch { /* bỏ qua */ } return navigator.language.startsWith("vi") ? "vi" : "en"; };
