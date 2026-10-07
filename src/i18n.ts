import { createContext, useContext } from "react";
export type Lang = "vi" | "en";
export const KEY = "edufind.lang"; // dùng chung với EduFind (cùng ngôn ngữ khi chuyển ứng dụng trong hệ sinh thái)
const vi = {
  title: "ProFind", sub: "Tra cứu tác giả và công trình nghiên cứu", tagline: "Ngành · Đơn vị · Công trình · Tạp chí · ISSN · Điểm tham khảo (HĐGSNN)",
  docTitle: "ProFind | Tra cứu tác giả và công trình nghiên cứu", metaDesc: "ProFind: tra cứu tác giả, nhà nghiên cứu Việt Nam theo ngành, đơn vị, công trình, tạp chí, ISSN và điểm tham khảo theo danh mục HĐGSNN. Mã nguồn mở, thuộc hệ sinh thái ISA.",
  skip: "Bỏ qua, tới nội dung chính", langLabel: "Ngôn ngữ", langVi: "Tiếng Việt", langEn: "English",
  demo: "DỮ LIỆU MẪU: tác giả và công trình là hư cấu, chỉ để chạy thử giao diện.",
  notRankShort: "Thứ hạng và điểm chỉ để tham khảo, không phải xếp hạng chính thức.", details: "Chi tiết",
  notRank: "Điểm theo quy tắc của HĐGSNN, chỉ tính cho tác giả chính (đứng đầu, hoặc là tác giả liên hệ duy nhất; có từ 2 tác giả liên hệ thì chỉ tính tác giả đứng đầu). Tạp chí trong nước tính theo năm đăng; tạp chí Scopus tính theo hạng Q và quy tắc từng ngành. Chưa tính được SCIE/SSCI và kỷ yếu hội nghị, nên điểm có thể thấp hơn thực tế. Thứ hạng chỉ so sánh trong nhóm tác giả đã nạp, không có ý nghĩa xếp hạng chính thức.",
  search: "Tìm theo tên, ORCID, tên tạp chí hoặc ISSN", all: "Tất cả", discipline: "Ngành", instType: "Loại đơn vị", inst: "Đơn vị", sort: "Sắp xếp theo", byScore: "Tổng điểm", byWorks: "Số bài", byCit: "Trích dẫn",
  rank: "Hạng", rankTip: "Hạng theo tiêu chí đang sắp xếp, trong nhóm tác giả đã nạp ở Việt Nam (đồng hạng cùng số).", rankNone: "chưa xếp hạng", rankNoneTip: "Chưa xếp hạng: hồ sơ có đơn vị ngoài Việt Nam, nghi gộp nhầm nhiều người, chưa xác định đơn vị, hoặc chưa có công trình.", rankOf: "trên {n} tác giả",
  author: "Tác giả", unit: "Đơn vị", works: "Số bài", score: "Tổng điểm", cit: "Trích dẫn", years: "Năm đăng", shown: "Hiển thị {n} / {t} tác giả",
  back: "← Danh sách", year: "Năm", paper: "Công trình", journal: "Tạp chí", issn: "ISSN", pts: "Điểm", role: "Vai trò", lead: "Tác giả chính", co: "Đồng tác giả",
  unmatched: "Chưa xác định điểm", roleUnknown: "Chưa xác định vai trò (OpenAlex thiếu tác giả liên hệ)", kDom: "Tạp chí trong nước (HĐGSNN)", kScopus: "Scopus", notLead: "Không tính (không phải tác giả chính)", counted: "Công trình được tính điểm / tổng", lookup: "Tra tạp chí trên EduFind",
  matched: "Tỷ lệ công trình khớp tạp chí HĐGSNN", csv: "Tải CSV", cite: "Điểm theo danh mục HĐGSNN (mức tối đa)", none: "Không có kết quả.", loading: "Đang tải dữ liệu…", err: "Không tải được dữ liệu. Kiểm tra kết nối rồi thử lại.", retry: "Thử lại",
  notFound: "Không tìm thấy hồ sơ này. Hồ sơ có thể đã được gỡ hoặc đường dẫn sai.", noWorks: "Hồ sơ chưa có công trình nào trong dữ liệu đã nạp (từ 2021).", workErr: "Không tải được danh sách công trình.",
  eco: "Hệ sinh thái ISA cho người làm khoa học", e1: "Tìm tác giả (ProFind)", e2: "Chọn tạp chí (EduFind)", e3: "Đọc và trích dẫn (Ami)", here: "Bạn đang ở đây",
  lic: "Mã nguồn MIT · Dữ liệu do dự án biên soạn CC BY 4.0 · Bản quyền © 2026 Lương Việt Hoàng (ISA Vietnam). Dữ liệu bên thứ ba theo điều khoản của nguồn (OpenAlex, ORCID, HĐGSNN). ProFind độc lập, không trực thuộc Elsevier, Scopus, Clarivate hay ORCID.",
  fix: "Báo sai sót hoặc yêu cầu đính chính / gỡ hồ sơ", theme: "Giao diện", newTab: "(mở tab mới)",
  scope: "Phạm vi", scopeVn: "Đơn vị tại Việt Nam", scopeAll: "Kể cả có đơn vị nước ngoài", foreignTag: "Có đơn vị ngoài Việt Nam",
  suspectTag: "Hồ sơ có thể gộp nhầm nhiều người", suspectNote: "Số công trình hoặc số đơn vị bất thường so với một người; hồ sơ OpenAlex này có thể gộp nhầm nhiều tác giả. Điểm chưa đáng tin và hồ sơ không được xếp hạng; tác giả có thể yêu cầu đính chính.",
  top2Tag: "Top 2% thế giới", top2Tip: "Có trong danh sách 2% nhà khoa học được trích dẫn nhiều nhất thế giới (Ioannidis và cộng sự, Elsevier; tính cả sự nghiệp, không tính tự trích dẫn). Lĩnh vực: {f}. Số thứ tự {r} là của bộ dữ liệu gốc, không phải hạng của ProFind.",
  top2Credit: "Nhãn Top 2% thế giới: Ioannidis J.P.A., Baas J., Klavans R., Boyack K.W. (2025), \"Updated science-wide author databases of standardized citation indicators\", phiên bản 8, Elsevier BV, dựa trên dữ liệu Scopus. Giấy phép CC BY-NC 3.0 (phi thương mại). Không có trong danh sách không có nghĩa là ít được trích dẫn.", top2Lic: "Giấy phép CC BY-NC 3.0",
  claimedBadge: "Đã được tác giả xác nhận", claimedSr: "(hồ sơ đã được tác giả xác nhận)", corrLink: "Đây là tôi / đính chính / gỡ hồ sơ", corrTitle: "Xác nhận, đính chính hoặc gỡ hồ sơ",
  corrLead: "ProFind chỉ dùng dữ liệu công khai (OpenAlex, ORCID, danh mục HĐGSNN). Người được nêu tên có quyền yêu cầu xác nhận, đính chính hoặc gỡ hồ sơ. Để tránh gỡ nhầm hoặc bị lợi dụng, chúng tôi xác minh người yêu cầu (trả lời email, ORCID hoặc email cơ quan) rồi mới áp dụng; yêu cầu gỡ hồ sơ được ưu tiên xử lý.",
  corrPrivacy: "Thông tin bạn nhập (họ tên, email, nội dung) chỉ dùng để xử lý yêu cầu này và phản hồi bạn, được gửi tới người quản trị ProFind qua email, không công bố.",
  kClaim: "Đây là hồ sơ của tôi (xác nhận)", kCorrect: "Đính chính thông tin hoặc công trình", kRemove: "Gỡ hồ sơ khỏi ProFind", fRef: "Hồ sơ cần xử lý (tên hoặc đường dẫn hồ sơ)", fName: "Họ và tên người gửi", fEmail: "Email (bắt buộc, để phản hồi)", fOrcid: "ORCID của bạn (nếu có)", fMsg: "Nội dung (vd. công trình nào sai, tên đúng là gì)",
  send: "Gửi yêu cầu", sending: "Đang gửi…", sent: "Đã gửi. Chúng tôi sẽ phản hồi qua email.", sendErr: "Không gửi được. Vui lòng gửi email trực tiếp:", eRate: "Bạn đã gửi quá nhiều yêu cầu, vui lòng thử lại sau một giờ.", eConf: "Dịch vụ nhận yêu cầu chưa sẵn sàng.", eNet: "Mất kết nối hoặc quá thời gian chờ.", eBad: "Thông tin chưa hợp lệ, kiểm tra email và nội dung.",
  moreRows: "Hiển thị thêm", capNote: "Đang hiển thị tối đa {n} hàng. Hãy thêm bộ lọc hoặc từ khóa để thu hẹp kết quả.", instPh: "Gõ tên đơn vị (vd. Đại học Cần Thơ)", instOpt: "Đơn vị có tên chứa", source: "Nguồn dữ liệu", srcLine: "OpenAlex (CC0), cập nhật {d}. Danh mục tạp chí và quy tắc điểm: HĐGSNN qua EduFind.",
};
const en: typeof vi = {
  title: "ProFind", sub: "Find researchers and their publications", tagline: "Field · Institution · Works · Journal · ISSN · Reference score (State Professorship Council)",
  docTitle: "ProFind | Find researchers and their publications", metaDesc: "ProFind: find Vietnamese researchers by field, institution, works, journal, ISSN and a reference score based on the State Professorship Council catalogue. Open source, part of the ISA ecosystem.",
  skip: "Skip to main content", langLabel: "Language", langVi: "Tiếng Việt", langEn: "English",
  demo: "SAMPLE DATA: authors and works are fictional, for interface testing only.",
  notRankShort: "Rankings and scores are for reference only, not an official ranking.", details: "Details",
  notRank: "Scores follow the State Professorship Council rules and count only for the lead author (first author, or the sole corresponding author; with two or more corresponding authors only the first author counts). Domestic journals are scored by publication year; Scopus journals by quartile and field rule. SCIE/SSCI and conference proceedings cannot be determined, so a score may be lower than the true value. Ranks compare only the authors loaded so far and have no official ranking meaning.",
  search: "Search by name, ORCID, journal title or ISSN", all: "All", discipline: "Field", instType: "Institution type", inst: "Institution", sort: "Sort by", byScore: "Total score", byWorks: "Papers", byCit: "Citations",
  rank: "Rank", rankTip: "Rank by the current sort criterion, among the Vietnam-based authors loaded (ties share a number).", rankNone: "not ranked", rankNoneTip: "Not ranked: profile has non-Vietnam affiliations, may merge several people, has no known affiliation, or has no works yet.", rankOf: "of {n} authors",
  author: "Author", unit: "Institution", works: "Papers", score: "Total score", cit: "Citations", years: "Years", shown: "Showing {n} of {t} authors",
  back: "← List", year: "Year", paper: "Work", journal: "Journal", issn: "ISSN", pts: "Score", role: "Role", lead: "Lead author", co: "Co-author",
  unmatched: "Score not determined", roleUnknown: "Role unknown (OpenAlex lists no corresponding author)", kDom: "Domestic journal (Council)", kScopus: "Scopus", notLead: "Not counted (not lead author)", counted: "Works scored / total", lookup: "Look up journal on EduFind",
  matched: "Share of works matched to a Council journal", csv: "Download CSV", cite: "Score per Council catalogue (maximum level)", none: "No results.", loading: "Loading data…", err: "Could not load data. Check your connection and try again.", retry: "Retry",
  notFound: "Profile not found. It may have been removed, or the link is wrong.", noWorks: "This profile has no works in the loaded data (since 2021).", workErr: "Could not load the list of works.",
  eco: "The ISA ecosystem for researchers", e1: "Find researchers (ProFind)", e2: "Choose a journal (EduFind)", e3: "Read and cite (Ami)", here: "You are here",
  lic: "Code MIT · Project-compiled data CC BY 4.0 · © 2026 Luong Viet Hoang (ISA Vietnam). Third-party data under each source's terms (OpenAlex, ORCID, State Professorship Council). ProFind is independent and not affiliated with Elsevier, Scopus, Clarivate or ORCID.",
  fix: "Report an error or request correction / removal", theme: "Theme", newTab: "(opens in a new tab)",
  scope: "Scope", scopeVn: "Vietnam-based only", scopeAll: "Include foreign-affiliated", foreignTag: "Also affiliated outside Vietnam",
  suspectTag: "Profile may merge several people", suspectNote: "Unusual number of works or affiliations for one person; this OpenAlex profile may merge several authors. The score is unreliable and the profile is not ranked; the author may request a correction.",
  top2Tag: "Top 2% worldwide", top2Tip: "Listed among the world's top 2% most-cited scientists (Ioannidis et al., Elsevier; career-long, excluding self-citations). Field: {f}. The number {r} is the source dataset's own ordinal, not a ProFind rank.",
  top2Credit: "Top 2% label: Ioannidis J.P.A., Baas J., Klavans R., Boyack K.W. (2025), \"Updated science-wide author databases of standardized citation indicators\", version 8, Elsevier BV, based on Scopus data. Licence CC BY-NC 3.0 (non-commercial). Not being listed does not mean few citations.", top2Lic: "CC BY-NC 3.0 licence",
  claimedBadge: "Verified by the author", claimedSr: "(profile verified by the author)", corrLink: "This is me / correct / remove profile", corrTitle: "Claim, correct or remove a profile",
  corrLead: "ProFind uses public data only (OpenAlex, ORCID, Council catalogue). Named persons may ask to claim, correct or remove their profile. To avoid wrong or abusive removals we verify the requester (email reply, ORCID or institutional email) before applying; removal requests are handled first.",
  corrPrivacy: "What you enter (name, email, message) is used only to handle this request and reply to you. It is emailed to the ProFind administrator and not published.",
  kClaim: "This is my profile (claim)", kCorrect: "Correct information or works", kRemove: "Remove my profile from ProFind", fRef: "Profile to handle (name or profile link)", fName: "Your full name", fEmail: "Email (required, for our reply)", fOrcid: "Your ORCID (if any)", fMsg: "Details (e.g. which work is wrong, the correct name)",
  send: "Send request", sending: "Sending…", sent: "Sent. We will reply by email.", sendErr: "Could not send. Please email directly:", eRate: "Too many requests; please try again in an hour.", eConf: "The request service is not ready.", eNet: "Connection lost or timed out.", eBad: "Invalid input; check the email and the message.",
  moreRows: "Show more", capNote: "Showing at most {n} rows. Add a filter or keyword to narrow the results.", instPh: "Type an institution name (e.g. Can Tho University)", instOpt: "Institutions whose name contains", source: "Data source", srcLine: "OpenAlex (CC0), updated {d}. Journal catalogue and scoring rules: State Professorship Council via EduFind.",
};
export const DICT = { vi, en };
export type Key = keyof typeof vi;
export const Ctx = createContext<{ lang: Lang; t: (k: Key, v?: Record<string, string | number>) => string; num: (n: number, d?: number) => string }>({ lang: "vi", t: (k) => k, num: (n) => String(n) });
export const useT = () => useContext(Ctx);
export const initialLang = (): Lang => { try { const s = localStorage.getItem(KEY); if (s === "vi" || s === "en") return s; } catch { /* bỏ qua */ } return (navigator.language || "").toLowerCase().startsWith("vi") ? "vi" : "en"; };
