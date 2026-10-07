// Nạp danh sách cơ sở giáo dục đại học / cao đẳng / viện từ nguồn công khai vào data/institutions.candidates.json (CHỜ DUYỆT, không ghi đè institutions.json).
//   node scripts/import-institutions.mjs [--wikipedia] [--moet]
// Nguồn: (1) Bộ GD&ĐT https://moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc  (chính thức, ưu tiên)
//        (2) Wikipedia vi "Danh sách trường đại học, học viện và cao đẳng tại Việt Nam" (đối chiếu, bổ sung loại hình, tên tiếng Anh).
// Cần mạng cho phép moet.gov.vn và vi.wikipedia.org. Bộ phân tích bảng HTML dùng quy tắc chung (mỗi <tr> có ≥ 2 ô); cấu trúc trang có thể đổi,
// nên luôn xem file ứng viên trước khi gộp. Mỗi bản ghi mang `source` (url) để truy nguồn. Loại hình suy từ tiêu đề mục/ô chứa "công lập", "tư thục", "dân lập"...
import { writeFileSync } from "node:fs";
const SRC = {
  moet: "https://moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc",
  wikipedia: "https://vi.wikipedia.org/wiki/Danh_s%C3%A1ch_tr%C6%B0%E1%BB%9Dng_%C4%91%E1%BA%A1i_h%E1%BB%8Dc,_h%E1%BB%8Dc_vi%E1%BB%87n_v%C3%A0_cao_%C4%91%E1%BA%B3ng_t%E1%BA%A1i_Vi%E1%BB%87t_Nam",
};
const want = ["moet", "wikipedia"].filter((k) => process.argv.includes(`--${k}`));
if (!want.length) want.push("moet", "wikipedia");
const strip = (h) => h.replace(/<sup[\s\S]*?<\/sup>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
const kind = (s) => (/tư thục|dân lập|ngoài công lập/i.test(s) ? "private-univ" : /công lập/i.test(s) ? "public-univ" : /viện/i.test(s) && !/đại học/i.test(s) ? "institute" : null);
const out = [];
for (const k of want) {
  const r = await fetch(SRC[k], { headers: { "User-Agent": "ProFind/0.1 (+https://github.com/lvhoang90/profind)" } });
  if (!r.ok) { console.error(`${k}: HTTP ${r.status}`); continue; }
  const html = await r.text();
  let section = "";
  for (const part of html.split(/(?=<h[23][ >])/)) {
    const head = strip((part.match(/<h[23][\s\S]*?<\/h[23]>/) ?? [""])[0]); if (head) section = head;
    for (const tr of part.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
      const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/g) ?? []).map(strip);
      if (cells.length < 2 || /^(STT|TT|Tên|Trường)$/i.test(cells[0]) || /^(STT|TT)$/i.test(cells[0]) && /Tên/i.test(cells[1])) continue;
      const name = cells.find((c) => /^(Trường|Đại học|Học viện|Viện|Phân hiệu|Cao đẳng)/i.test(c)) ?? cells[1];
      if (!name || name.length > 140) continue;
      out.push({ name, type: kind(cells.join(" ") + " " + section), section, cells, source: SRC[k], via: k });
    }
  }
  console.log(`${k}: ${out.filter((o) => o.via === k).length} dòng`);
}
writeFileSync("data/institutions.candidates.json", JSON.stringify({ meta: { fetched: new Date().toISOString().slice(0, 10), status: "unreviewed" }, rows: out }, null, 1));
console.log(`Ghi data/institutions.candidates.json (${out.length}). Duyệt, gộp trùng, gắn mã ROR rồi cập nhật data/institutions.json.`);
