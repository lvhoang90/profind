// PRO-SCORE1000: hội đồng MÔ PHỎNG gồm 1000 chuyên gia ẢO. Đây là mô phỏng tính toán, KHÔNG phải khảo sát 1000 người thật.
// Mỗi chuyên gia ảo có một hồ sơ (lĩnh vực, giai đoạn sự nghiệp, khu vực, lập trường đánh giá) và một vectơ trọng số riêng cho 7 chỉ báo.
// Trọng số xuất phát từ bản PRO-SCORE v1 (đã được hội đồng 10 chuyên gia phản biện), được điều chỉnh theo các khuynh hướng đã ghi nhận trong tài liệu
// (DORA, Leiden Manifesto, khác biệt giữa các ngành về trích dẫn và thứ tự tác giả...) rồi lấy mẫu Dirichlet để tạo dị biệt cá nhân.
// Các hệ số điều chỉnh dưới đây là GIẢ ĐỊNH CỦA MÔ HÌNH, công khai để mọi người kiểm tra và phản biện; hạt giống cố định nên kết quả tái lập được.
export const KEYS = ["impact", "output", "lead", "quality", "momentum", "steady", "recog"];
const BASE = [0.42, 0.10, 0.10, 0.10, 0.17, 0.08, 0.03];
const idx = Object.fromEntries(KEYS.map((k, i) => [k, i]));
const DIM = {
  field: { life: [0.2, { lead: 0.8, impact: 1.1 }], eng: [0.18, { quality: 0.8, output: 1.1 }], nat: [0.18, { lead: 0.5 }], soc: [0.22, { quality: 0.7, impact: 0.85, steady: 1.2, lead: 1.1 }], hum: [0.12, { impact: 0.7, output: 0.8, quality: 0.5, steady: 1.4 }], med: [0.1, { impact: 1.1, lead: 0.9 }] },
  stage: { early: [0.3, { impact: 0.75, momentum: 1.6, steady: 0.8 }], mid: [0.4, {}], senior: [0.3, { impact: 1.2, output: 1.1, momentum: 0.7 }] },
  region: { asia: [0.35, { recog: 1.3 }], europe: [0.25, { quality: 0.8 }], americas: [0.25, { impact: 1.1 }], other: [0.15, { momentum: 1.1 }] },
  stance: { biblio: [0.35, { impact: 1.25, quality: 1.5, output: 1.1 }], dora: [0.4, { quality: 0.4, output: 0.7, steady: 1.3, lead: 1.2, recog: 0.5 }], manager: [0.25, { output: 1.3, momentum: 1.2, lead: 1.2 }] },
};
export const LABELS = { field: { life: "Khoa học sự sống", eng: "Kỹ thuật, công nghệ", nat: "Khoa học tự nhiên", soc: "Xã hội, giáo dục", hum: "Nhân văn, nghệ thuật", med: "Y dược" }, stage: { early: "Mới vào nghề", mid: "Giữa sự nghiệp", senior: "Cao niên" }, region: { asia: "Châu Á", europe: "Châu Âu", americas: "Châu Mỹ", other: "Châu Phi, Châu Đại Dương" }, stance: { biblio: "Thư mục học", dora: "Đánh giá có trách nhiệm (DORA)", manager: "Quản lý nghiên cứu" } };
const mulberry = (a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gamma = (k, r) => { // Marsaglia-Tsang
  if (k < 1) return gamma(k + 1, r) * Math.pow(r(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x, v; do { const u1 = r(), u2 = r(); x = Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u || 1e-12) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; }
};
const pick = (dim, r) => { let u = r(), s = 0; const e = Object.entries(DIM[dim]); for (const [k, [p]] of e) { s += p; if (u < s) return k; } return e[e.length - 1][0]; };

/** Sinh hội đồng n chuyên gia ảo (mặc định 1000) với hạt giống cố định. Trả về mảng { field, stage, region, stance, w:[7] } và bản tóm tắt. */
export function makePanel(n = 1000, seed = 20261007, concentration = 60) {
  const r = mulberry(seed), panel = [];
  for (let i = 0; i < n; i++) {
    const e = { field: pick("field", r), stage: pick("stage", r), region: pick("region", r), stance: pick("stance", r) };
    const t = BASE.slice(); for (const d of ["field", "stage", "region", "stance"]) for (const [k, m] of Object.entries(DIM[d][e[d]][1])) t[idx[k]] *= m;
    const s = t.reduce((a, b) => a + b, 0), g = t.map((x) => gamma(Math.max(0.05, (x / s) * concentration), r)), gs = g.reduce((a, b) => a + b, 0);
    e.w = g.map((x) => x / gs); panel.push(e);
  }
  return panel;
}
const mean = (rows) => KEYS.map((_, i) => rows.reduce((s, e) => s + e.w[i], 0) / (rows.length || 1));
export function summarize(panel, seed) {
  const by = {}; for (const d of Object.keys(DIM)) { by[d] = {}; for (const k of Object.keys(DIM[d])) { const rows = panel.filter((e) => e[d] === k); by[d][k] = { n: rows.length, label: LABELS[d][k], w: mean(rows).map((x) => Math.round(x * 1000) / 10) }; } }
  const all = mean(panel), sd = KEYS.map((_, i) => Math.sqrt(panel.reduce((s, e) => s + (e.w[i] - all[i]) ** 2, 0) / panel.length));
  return { version: "2.0", n: panel.length, seed, simulated: true, keys: KEYS, base: BASE.map((x) => x * 100), mean: all.map((x) => Math.round(x * 1000) / 10), sd: sd.map((x) => Math.round(x * 1000) / 10), by };
}
