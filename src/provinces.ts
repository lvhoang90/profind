// Tên tỉnh/thành theo ngôn ngữ giao diện (dữ liệu đơn vị ghi tên tiếng Việt). Tên không có trong bảng giữ nguyên.
const EN: Record<string, string> = {
  "An Giang": "An Giang", "Bắc Ninh": "Bac Ninh", "Cà Mau": "Ca Mau", "Cần Thơ": "Can Tho", "Gia Lai": "Gia Lai", "Huế": "Hue", "Hà Nội": "Hanoi", "Hà Tĩnh": "Ha Tinh",
  "Hưng Yên": "Hung Yen", "Hải Phòng": "Hai Phong", "Khánh Hòa": "Khanh Hoa", "Lâm Đồng": "Lam Dong", "Lạng Sơn": "Lang Son", "Nghệ An": "Nghe An", "Ninh Bình": "Ninh Binh",
  "Phú Thọ": "Phu Tho", "Quảng Ngãi": "Quang Ngai", "Quảng Ninh": "Quang Ninh", "Quảng Trị": "Quang Tri", "Sơn La": "Son La", "TP. Hồ Chí Minh": "Ho Chi Minh City",
  "Thanh Hóa": "Thanh Hoa", "Thái Nguyên": "Thai Nguyen", "Tuyên Quang": "Tuyen Quang", "Tây Ninh": "Tay Ninh", "Vĩnh Long": "Vinh Long", "Đà Nẵng": "Da Nang",
  "Đắk Lắk": "Dak Lak", "Đồng Nai": "Dong Nai", "Đồng Tháp": "Dong Thap", "Điện Biên": "Dien Bien", "Cao Bằng": "Cao Bang", "Lai Châu": "Lai Chau", "Lào Cai": "Lao Cai",
};
export const provName = (c: string | null | undefined, lang: "vi" | "en") => (c ? (lang === "en" ? EN[c] ?? c : c) : "");
