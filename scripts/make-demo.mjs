// Sinh DỮ LIỆU MẪU (nhân vật hư cấu) để chạy thử giao diện khi chưa nạp dữ liệu thật. Mọi bản ghi mang cờ demo:true.
// Tạp chí lấy thật từ data/journals.json (EduFind); tác giả, bài báo là hư cấu.
import { readFileSync, writeFileSync } from "node:fs";
const J = JSON.parse(readFileSync("data/journals.json", "utf8")).journals.filter((j) => j.issn.length);
let seed = 42; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const inst = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions;
const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi"], dem = ["Văn", "Thị", "Minh", "Quốc", "Thanh", "Hữu"], ten = ["An", "Bình", "Chi", "Dũng", "Hà", "Khoa", "Lan", "Nam", "Phúc", "Quân", "Sơn", "Trang"];
const authors = [], works = [];
for (let i = 1; i <= 60; i++) {
  const id = `demo-${String(i).padStart(3, "0")}`, disc = pick([...new Set(J.map((j) => j.discipline))]);
  const pool = J.filter((j) => j.discipline === disc);
  authors.push({ id, name: `${pick(ho)} ${pick(dem)} ${pick(ten)} (mẫu)`, orcid: null, institutions: [pick(inst).id], disciplines: [disc], demo: true });
  const n = 1 + Math.floor(rnd() * 14);
  for (let k = 0; k < n; k++) {
    const j = pick(pool);
    works.push({ id: `${id}-w${k}`, authorId: id, title: `Công trình mẫu ${i}.${k + 1}`, year: 2016 + Math.floor(rnd() * 10), journal: j.name, issn: j.issn[0], citations: Math.floor(rnd() * 30), role: rnd() < 0.5 ? "lead" : "co", demo: true });
  }
}
writeFileSync("data/raw-authors.json", JSON.stringify({ meta: { demo: true }, authors, works }));
console.log(`demo: ${authors.length} tác giả, ${works.length} công trình`);
