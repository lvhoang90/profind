import { createContext, useContext } from "react";
export type Lang = "vi" | "en";
export const KEY = "edufind.lang"; // dùng chung với EduFind (cùng ngôn ngữ khi chuyển ứng dụng trong hệ sinh thái)
const vi = {
  title: "ProFind", sub: "Tra cứu tác giả và công trình nghiên cứu", tagline: "Ngành · Đơn vị · Công trình · Tạp chí · ISSN · Điểm tham khảo (HĐGSNN)",
  demo: "DỮ LIỆU MẪU: tác giả và công trình là hư cấu, chỉ để chạy thử giao diện. Dữ liệu thật được nạp bằng scripts/ingest-openalex.mjs.",
  notRank: "Thứ hạng chỉ để tham khảo, không có ý nghĩa xếp hạng chính thức. Điểm là mức tối đa của tạp chí theo năm đăng trong danh mục HĐGSNN, chưa chia theo vai trò tác giả.",
  search: "Tìm theo tên, ORCID, tên tạp chí hoặc ISSN", all: "Tất cả", discipline: "Ngành", instType: "Loại đơn vị", inst: "Đơn vị", sort: "Sắp xếp theo", byScore: "Tổng điểm", byWorks: "Số bài", byCit: "Trích dẫn",
  rank: "Hạng", author: "Tác giả", unit: "Đơn vị", works: "Số bài", score: "Tổng điểm", cit: "Trích dẫn", years: "Năm đăng", shown: "Hiển thị {n} / {t} tác giả",
  back: "← Danh sách", year: "Năm", paper: "Công trình", journal: "Tạp chí", issn: "ISSN", pts: "Điểm", role: "Vai trò", lead: "Chính", co: "Đồng tác giả", unmatched: "Không có trong danh mục", lookup: "Tra tạp chí trên EduFind",
  matched: "Tỷ lệ công trình khớp tạp chí HĐGSNN", csv: "Tải CSV", cite: "Điểm theo danh mục HĐGSNN (mức tối đa)", none: "Không có kết quả.", loading: "Đang tải dữ liệu…", err: "Không tải được dữ liệu.",
  eco: "Hệ sinh thái ISA cho người làm khoa học", e1: "Tìm tác giả (ProFind)", e2: "Chọn tạp chí (EduFind)", e3: "Đọc và trích dẫn (Ami)", here: "Bạn đang ở đây",
  lic: "Mã nguồn MIT · Dữ liệu do dự án biên soạn CC BY 4.0 · Bản quyền © 2026 Lương Việt Hoàng (ISA Vietnam). Dữ liệu bên thứ ba theo điều khoản của nguồn (OpenAlex, ORCID, HĐGSNN).",
  fix: "Báo sai sót hoặc yêu cầu đính chính / gỡ hồ sơ", theme: "Giao diện",
};
const en: typeof vi = {
  title: "ProFind", sub: "Find researchers and their publications", tagline: "Field · Institution · Works · Journal · ISSN · Reference score (State Professorship Council)",
  demo: "SAMPLE DATA: authors and works are fictional, for interface testing only. Load real data with scripts/ingest-openalex.mjs.",
  notRank: "Rankings are for reference only and have no official ranking meaning. Score is the journal's maximum score for the publication year in the Council catalogue, not yet split by author role.",
  search: "Search by name, ORCID, journal title or ISSN", all: "All", discipline: "Field", instType: "Institution type", inst: "Institution", sort: "Sort by", byScore: "Total score", byWorks: "Papers", byCit: "Citations",
  rank: "Rank", author: "Author", unit: "Institution", works: "Papers", score: "Total score", cit: "Citations", years: "Years", shown: "Showing {n} of {t} authors",
  back: "← List", year: "Year", paper: "Work", journal: "Journal", issn: "ISSN", pts: "Score", role: "Role", lead: "Lead", co: "Co-author", unmatched: "Not in catalogue", lookup: "Look up journal on EduFind",
  matched: "Share of works matched to a Council journal", csv: "Download CSV", cite: "Score per Council catalogue (maximum level)", none: "No results.", loading: "Loading data…", err: "Could not load data.",
  eco: "The ISA ecosystem for researchers", e1: "Find researchers (ProFind)", e2: "Choose a journal (EduFind)", e3: "Read and cite (Ami)", here: "You are here",
  lic: "Code MIT · Project-compiled data CC BY 4.0 · © 2026 Luong Viet Hoang (ISA Vietnam). Third-party data under each source's terms (OpenAlex, ORCID, State Professorship Council).",
  fix: "Report an error or request correction / removal", theme: "Theme",
};
export const DICT = { vi, en };
export type Key = keyof typeof vi;
export const Ctx = createContext<{ lang: Lang; t: (k: Key, v?: Record<string, string | number>) => string }>({ lang: "vi", t: (k) => k });
export const useT = () => useContext(Ctx);
export const initialLang = (): Lang => { try { const s = localStorage.getItem(KEY); if (s === "vi" || s === "en") return s; } catch { /* bỏ qua */ } return navigator.language.startsWith("vi") ? "vi" : "en"; };
