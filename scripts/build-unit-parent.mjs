// Quan hệ đơn vị cha - con (data/unit-parent.json: { parent: { "<đơn vị con>": "<đơn vị cha>" } }), dùng để: (1) lọc theo đơn vị cha gồm cả người ở đơn vị con,
// (2) cột đơn vị chỉ hiện đơn vị cụ thể nhất (không hiện cả "Viện Hàn lâm" lẫn "Viện Toán học"), (3) đếm người theo đơn vị cha.
// Nguồn: (a) ROR (api.ror.org, quan hệ parent giữa hai đơn vị đều có trong ProFind), (b) quy tắc mã/tên cho sáu hệ thống đại học đã kiểm chứng thủ công
// (ĐHQGHN, ĐHQG-HCM, ĐH Huế, ĐH Đà Nẵng, ĐH Thái Nguyên, ĐH Cần Thơ) và Học viện Khoa học và Công nghệ (VAST). Bản ghi trùng (unit-alias) bị bỏ qua.
// Chạy: node scripts/build-unit-parent.mjs  (cần mạng để gọi ROR)
import { readFileSync, writeFileSync } from "fs";
const I = JSON.parse(readFileSync("data/institutions.json", "utf8")).institutions;
const AL = JSON.parse(readFileSync("data/unit-alias.json", "utf8")).alias;
const r2u = new Map(I.filter((i) => i.ror).map((i) => [i.ror.split("/").pop(), i.id]));
const parent = {};
let k = 0; const withRor = I.filter((i) => i.ror);
async function w() { while (k < withRor.length) { const i = withRor[k++]; for (let t = 0; t < 4; t++) { try { const r = await fetch(`https://api.ror.org/v2/organizations/${i.ror.split("/").pop()}`); if (r.ok) { for (const rel of (await r.json()).relationships ?? []) if (rel.type === "parent") { const p = r2u.get(String(rel.id).split("/").pop()); if (p && p !== i.id) parent[i.id] = p; } break; } if (r.status === 404) break; } catch { /* thử lại */ } await new Promise((s) => setTimeout(s, 1500 * (t + 1))); } } }
await Promise.all(Array.from({ length: 5 }, w));
const RULES = {
  dhqghn: (i) => i.id.startsWith("vnu-") || /\(ĐHQGHN\)|Đại Học Quốc Gia Hà Nội|Đại học Quốc gia Hà Nội/.test(i.name),
  "dhqg-hcm": (i) => i.id.startsWith("vnuhcm-") || /\(ĐHQG-HCM\)|Đại Học Quốc Gia TP\. Hồ Chí Minh|Đại học Quốc gia TP\. Hồ Chí Minh|ĐHQG TP/.test(i.name),
  hue: (i) => i.id.startsWith("hue-university-") || /Đại Học Huế|Đại học Huế/.test(i.name),
  ud: (i) => i.id.startsWith("danang-university-"),
  tnu: (i) => i.id.startsWith("thai-nguyen-university-") || /Đại Học Thái Nguyên|Đại học Thái Nguyên/.test(i.name),
  ctu: (i) => i.id.startsWith("can-tho-university-"),
};
for (const [p, f] of Object.entries(RULES)) for (const i of I) if (i.id !== p && !(i.id in AL) && !(i.id in parent) && f(i)) parent[i.id] = p;
parent.gust = "vast"; parent["vien-hoa-hoc"] = "vast"; // Học viện KH&CN và Viện Hóa học (website vienhoahoc.ac.vn) là đơn vị trực thuộc Viện Hàn lâm KH&CN Việt Nam; ROR/OpenAlex chưa ghi quan hệ
// (c) website: đơn vị có website là tên miền phụ của đơn vị cha (viện của Viện Hàn lâm: *.vast.vn / *.vast.ac.vn; trường thành viên: *.vnu.edu.vn...). Cần OPENALEX_API_KEY.
const SITE = { vast: ["vast.vn", "vast.ac.vn"], dhqghn: ["vnu.edu.vn"], "dhqg-hcm": ["vnuhcm.edu.vn"], hue: ["hueuni.edu.vn"], ud: ["udn.vn"], tnu: ["tnu.edu.vn"], ctu: ["ctu.edu.vn"] };
const KEY = process.env.OPENALEX_API_KEY;
if (KEY) for (let i = 0; i < withRor.length; i += 40) {
  const b = withRor.slice(i, i + 40), j = await (await fetch(`https://api.openalex.org/institutions?filter=ror:${b.map((x) => x.ror).join("|")}&per-page=50&select=ror,homepage_url&api_key=${KEY}`)).json();
  for (const r of j.results ?? []) { const u = r2u.get(String(r.ror).split("/").pop()); let h = ""; try { h = new URL(r.homepage_url).hostname.replace(/^www\./, ""); } catch { continue; }
    for (const [p, hosts] of Object.entries(SITE)) if (u !== p && !(u in parent) && !(u in AL) && hosts.some((x) => h.endsWith(`.${x}`))) parent[u] = p; }
}
for (const [c, p] of Object.entries(parent)) if (c in AL || p in AL || parent[p] === c) delete parent[c];
writeFileSync("data/unit-parent.json", JSON.stringify({ _note: "Đơn vị con -> đơn vị cha; sinh bởi scripts/build-unit-parent.mjs (ROR + quy tắc đã kiểm chứng cho 6 hệ thống đại học và Học viện KH&CN). Chỉ một cấp.", parent }, null, 1) + "\n");
console.log(`Ghi ${Object.keys(parent).length} quan hệ cha - con.`);
