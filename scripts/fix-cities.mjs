// Gán lại `city` của đơn vị từ vị trí trong bản ghi ROR (đáng tin hơn cột thành phố của bảng Wikipedia, vốn gộp dòng và bị mang sai sang dòng sau).
// Đơn vị không có mã ROR: để null (không đoán). Không đổi id/ror.   node scripts/fix-cities.mjs
import { readFileSync, writeFileSync } from "node:fs";
const D = JSON.parse(readFileSync("data/institutions.json", "utf8"));
const VN = { "Hanoi": "Hà Nội", "Ho Chi Minh City": "TP. Hồ Chí Minh", "Da Nang": "Đà Nẵng", "Danang": "Đà Nẵng", "Hai Phong": "Hải Phòng", "Haiphong": "Hải Phòng", "Can Tho": "Cần Thơ", "Hue": "Huế", "Thai Nguyen": "Thái Nguyên", "Nha Trang": "Nha Trang", "Vinh": "Vinh", "Da Lat": "Đà Lạt", "Dalat": "Đà Lạt", "Bien Hoa": "Biên Hòa", "Thu Dau Mot": "Thủ Dầu Một", "Hung Yen": "Hưng Yên", "Nam Dinh": "Nam Định", "Quy Nhon": "Quy Nhơn", "Buon Ma Thuot": "Buôn Ma Thuột", "Long Xuyen": "Long Xuyên", "Tra Vinh": "Trà Vinh" };
let n = 0, changed = 0;
for (const i of D.institutions) {
  if (!i.ror) { if (i.city) { i.cityWas = i.city; } i.city = null; continue; }
  let city = null;
  for (let t = 0; t < 3 && !city; t++) { try { const r = await fetch(`https://api.ror.org/v2/organizations/${i.ror.replace("https://ror.org/", "")}`, { headers: { "User-Agent": "ProFind/0.1" } }); if (r.ok) { const o = await r.json(); const nm = o.locations?.[0]?.geonames_details?.name; city = nm ? (VN[nm] ?? nm) : null; break; } } catch { /* thử lại */ } await new Promise((r) => setTimeout(r, 400)); }
  await new Promise((r) => setTimeout(r, 100)); n++;
  if (city !== i.city) { changed++; i.cityWas = i.city; i.city = city; }
}
writeFileSync("data/institutions.json", JSON.stringify(D, null, 1));
console.log(`Đã kiểm ${n} đơn vị có ROR, đổi city ở ${changed}; đơn vị không có ROR đặt city = null (giữ giá trị cũ ở cityWas).`);
