// Tên ngành lấy từ EduFind (đường dẫn trang ngành = mã ngành). Đồng bộ với disciplines/<slug>/config.json ở kho edufind-khgd.
export const DISC: Record<string, [string, string]> = {
  "giao-duc": ["Khoa học Giáo dục", "Education Science"], "kinh-te": ["Kinh tế", "Economics"], "toan-hoc": ["Toán học", "Mathematics"], "y-hoc": ["Y học", "Medicine"],
  "triet-xhh": ["Triết học - Chính trị - Xã hội học", "Philosophy, Politics & Sociology"], "cntt": ["Công nghệ thông tin", "Information Technology"], "ngon-ngu": ["Ngôn ngữ học", "Linguistics"],
  "su-hoc": ["Sử học - Khảo cổ học", "History & Archaeology"], "vat-ly": ["Vật lý", "Physics"], "dien-tu": ["Điện - Điện tử", "Electrical & Electronic Eng."], "van-hoa": ["Văn hóa - Thể thao", "Culture & Sports"],
  "tam-ly": ["Tâm lý học", "Psychology"], "luat": ["Luật học", "Law"], "van-hoc": ["Văn học", "Literature"], "sinh-hoc": ["Sinh học", "Biology"], "duoc": ["Dược học", "Pharmacy"],
  "hoa-thuc-pham": ["Hóa học - Công nghệ thực phẩm", "Chemistry & Food Tech"], "xay-dung": ["Xây dựng - Kiến trúc", "Construction & Architecture"], "co-khi": ["Cơ khí - Động lực", "Mechanical Eng."],
  "co-hoc": ["Cơ học", "Mechanics"], "nong-lam": ["Nông nghiệp - Lâm nghiệp", "Agriculture & Forestry"], "thuy-loi": ["Thủy lợi", "Hydraulics"], "trai-dat-mo": ["Khoa học Trái đất - Mỏ", "Earth Science & Mining"],
  "giao-thong": ["Giao thông vận tải", "Transport"], "luyen-kim": ["Luyện kim", "Metallurgy"], "chan-nuoi": ["Chăn nuôi - Thú y - Thủy sản", "Animal Science, Vet. & Fisheries"], "quan-su": ["Khoa học quân sự", "Military Science"], "an-ninh": ["Khoa học an ninh", "Security Science"],
};
export const dName = (s: string, lang: "vi" | "en") => (DISC[s] ?? [s, s])[lang === "vi" ? 0 : 1];

// Tên lĩnh vực của bộ dữ liệu Top 2% (Elsevier/Scopus) sang tiếng Việt.
const TOP2_VI: Record<string, string> = {
  "Engineering": "Kỹ thuật", "Enabling & Strategic Technologies": "Công nghệ nền tảng và chiến lược", "Information & Communication Technologies": "Công nghệ thông tin và truyền thông",
  "Physics & Astronomy": "Vật lý và thiên văn", "Clinical Medicine": "Y học lâm sàng", "Biomedical Research": "Nghiên cứu y sinh", "Chemistry": "Hóa học", "Mathematics & Statistics": "Toán học và thống kê",
  "Agriculture, Fisheries & Forestry": "Nông, ngư và lâm nghiệp", "Biology": "Sinh học", "Earth & Environmental Sciences": "Khoa học Trái đất và môi trường", "Economics & Business": "Kinh tế và kinh doanh",
  "Social Sciences": "Khoa học xã hội", "Psychology & Cognitive Sciences": "Tâm lý và khoa học nhận thức", "Public Health & Health Services": "Y tế công cộng", "Built Environment & Design": "Môi trường xây dựng và thiết kế",
  "Energy": "Năng lượng", "Visual & Performing Arts": "Nghệ thuật", "Philosophy & Theology": "Triết học và thần học", "Historical Studies": "Sử học", "Communication & Textual Studies": "Truyền thông và văn bản học", "General Science & Technology": "Khoa học và công nghệ chung",
};
export const fieldName = (f: string, lang: "vi" | "en") => (lang === "vi" ? TOP2_VI[f] ?? f : f);
