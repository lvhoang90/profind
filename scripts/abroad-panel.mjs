// Mô phỏng hội đồng 1000 chuyên gia để cân nhắc ngưỡng "% công trình có liên kết tại Việt Nam" (xem trang phương pháp PRO-SCORE1000).
//   node scripts/abroad-panel.mjs                       -> public/data/abroad-panel.json (lần 1: 1000 chuyên gia)
//   node scripts/abroad-panel.mjs --run 2 --n 500 --seed 20261010 --out public/data/abroad-panel-2.json   (lần 2 kiểm định lại: 500 chuyên gia, hạt giống khác, thêm bootstrap và các cơ cấu lập trường khác)
// ĐÂY LÀ MÔ PHỎNG, không phải ý kiến của 1000 chuyên gia thật. Phần bằng chứng lấy từ dữ liệu thật (phân bố vnShare của các hồ sơ);
// phần giả định là mức đánh đổi giữa hai loại sai sót của từng "chuyên gia" mô phỏng (hạt giống cố định, tái lập được).
import { readFileSync, writeFileSync } from "node:fs";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const RUN = +arg("run", 1), SEED = +arg("seed", 20261009), N = +arg("n", 1000), OUT = arg("out", "public/data/abroad-panel.json"), ROUNDS = 3, RULE = JSON.parse(readFileSync("data/abroad-rule.json", "utf8")), POLICY = Math.round(RULE.maxVnShare * 100);
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8"));
const xs = P.authors.filter((a) => a.vnShare != null && !a.suspect).map((a) => Math.min(0.995, Math.max(0.005, a.vnShare / 100)));
// 1) Mô hình hai nhóm (Beta trộn, EM): nhóm "liên kết chính ở nước ngoài" và nhóm "liên kết chính tại Việt Nam"
const lgam = (z) => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const v of c) s += v / ++y; return -t + Math.log(2.5066282746310005 * s / x); };
const lbeta = (a, b) => lgam(a) + lgam(b) - lgam(a + b);
const bpdf = (x, a, b) => Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lbeta(a, b));
const fitBeta = (w) => { const sw = w.reduce((s, v) => s + v, 0); let m = 0; xs.forEach((x, i) => (m += w[i] * x)); m /= sw; let v = 0; xs.forEach((x, i) => (v += w[i] * (x - m) ** 2)); v = Math.max(v / sw, 1e-4); const k = Math.max((m * (1 - m)) / v - 1, 0.2); return [m * k, (1 - m) * k]; };
let pi = 0.5, A = [0.6, 5], B = [5, 0.6]; // A: thấp (nước ngoài), B: cao (Việt Nam)
for (let it = 0; it < 200; it++) {
  const r = xs.map((x) => { const a = (1 - pi) * bpdf(x, ...A), b = pi * bpdf(x, ...B); return b / (a + b); });
  pi = r.reduce((s, v) => s + v, 0) / r.length; B = fitBeta(r); A = fitBeta(r.map((v) => 1 - v));
}
const post = (x) => { const a = (1 - pi) * bpdf(x, ...A), b = pi * bpdf(x, ...B); return b / (a + b); }; // P(chính tại VN | x)
// 2) Đường sai sót theo ngưỡng t (lưới 0..60%): FE = kỳ vọng số hồ sơ tại VN bị loại nhầm; FI = kỳ vọng số hồ sơ nước ngoài được đưa vào nhầm
const T = Array.from({ length: 61 }, (_, i) => i), pv = xs.map(post);
const FE = T.map((t) => xs.reduce((s, x, i) => s + (x < t / 100 ? pv[i] : 0), 0)), FI = T.map((t) => xs.reduce((s, x, i) => s + (x >= t / 100 ? 1 - pv[i] : 0), 0));
const argminW = (w) => { let b = 0, bl = Infinity; T.forEach((t, i) => { const l = w * FE[i] + (1 - w) * FI[i]; if (l < bl - 1e-9) { bl = l; b = t; } }); return b; };
// 3) Hội đồng mô phỏng: mỗi người có "trọng số sai sót" w = mức coi trọng việc loại nhầm người làm việc tại VN (so với việc đưa nhầm người nước ngoài vào bảng)
let s = SEED >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gam = (k) => { if (k < 1) return gam(k + 1) * Math.pow(rnd(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { const u1 = rnd(), u2 = rnd(); x = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0); v = v ** 3; const u = rnd(); if (Math.log(u + 1e-12) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v; } };
const beta = (a, b) => { const x = gam(a), y = gam(b); return x / (x + y); };
const STANCES = [{ id: "inclusive", vi: "Bao trùm (ưu tiên không bỏ sót người Việt công tác nước ngoài, nhà khoa học đa liên kết)", share: 0.3, a: 6, b: 3 }, { id: "balanced", vi: "Cân bằng (hai loại sai sót nặng như nhau)", share: 0.4, a: 5, b: 5 }, { id: "strict", vi: "Chặt chẽ (ưu tiên bảng chỉ gồm người có liên kết chính tại Việt Nam)", share: 0.3, a: 3, b: 6 }];
const experts = []; for (const st of STANCES) for (let i = 0; i < Math.round(N * st.share); i++) experts.push({ st: st.id, w: beta(st.a, st.b) });
let th = experts.map((e) => argminW(e.w)); const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const rounds = [{ round: 0, label: "Ý kiến ban đầu", median: q(th, 0.5), p25: q(th, 0.25), p75: q(th, 0.75) }];
const lam = experts.map(() => 0.3 + 0.4 * rnd());
for (let r = 1; r <= ROUNDS; r++) { const m = q(th, 0.5); th = th.map((t, i) => (1 - lam[i]) * t + lam[i] * m); rounds.push({ round: r, label: `Vòng ${r} (sau khi biết trung vị của hội đồng)`, median: Math.round(q(th, 0.5) * 10) / 10, p25: Math.round(q(th, 0.25) * 10) / 10, p75: Math.round(q(th, 0.75) * 10) / 10 }); }
const byStance = STANCES.map((st) => { const v = experts.map((e, i) => (e.st === st.id ? argminW(e.w) : null)).filter((x) => x != null); return { id: st.id, vi: st.vi, n: v.length, median: q(v, 0.5), p25: q(v, 0.25), p75: q(v, 0.75) }; });
const hist = Array.from({ length: 20 }, (_, i) => P.authors.filter((a) => a.vnShare != null && !a.suspect && (i === 19 ? a.vnShare >= 95 : a.vnShare >= i * 5 && a.vnShare < i * 5 + 5)).length);
const total = xs.length, sens = [5, 10, 15, 20, 25, 30, 40, 50].map((t) => ({ t, n: P.authors.filter((a) => a.vnShare != null && !a.suspect && a.vnShare < t).length }));
const at = (t) => ({ t, expectedWronglyExcluded: Math.round(FE[t]), expectedWronglyIncluded: Math.round(FI[t]) });
const curve = T.filter((t) => t % 5 === 0).map((t) => ({ t, excluded: Math.round(FE[t]), admitted: Math.round(FI[t]), tagged: P.authors.filter((a) => a.vnShare != null && !a.suspect && a.vnShare < t).length }));
// Hệ số đánh đổi k = (mức nặng của việc loại nhầm người tại VN) / (mức nặng của việc đưa nhầm người nước ngoài) mà tại đó ngưỡng t là tối ưu
const implied = []; for (const t of [10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) { let lo = 1, hi = 0; for (let w = 0.001; w < 1; w += 0.001) { let bt = 0, bl = Infinity; T.forEach((tt, i) => { const l = w * FE[i] + (1 - w) * FI[i]; if (l < bl - 1e-9) { bl = l; bt = tt; } }); if (bt === t) { lo = Math.min(lo, w); hi = Math.max(hi, w); } } if (lo <= hi) implied.push({ t, kFrom: Math.round((lo / (1 - lo)) * 10) / 10, kTo: Math.round((hi / (1 - hi)) * 10) / 10 }); }
const out = { run: RUN, curve, impliedCostRatio: implied, _note: "Mô phỏng, không phải ý kiến chuyên gia thật. Sinh bởi scripts/abroad-panel.mjs.", built: P.meta.built, seed: SEED, n: N, rounds: ROUNDS, profiles: total, mixture: { piVn: Math.round(pi * 1000) / 1000, foreignBeta: A.map((v) => Math.round(v * 100) / 100), vnBeta: B.map((v) => Math.round(v * 100) / 100), bayesEqualCostThreshold: argminW(0.5) }, stances: byStance, rounds_: rounds, consensus: { median: rounds[rounds.length - 1].median, p25: rounds[rounds.length - 1].p25, p75: rounds[rounds.length - 1].p75 }, policy: POLICY, errorsAtPolicy: at(POLICY), errorsAtConsensus: at(Math.round(rounds[rounds.length - 1].median)), hist, sens };
writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(JSON.stringify({ mixture: out.mixture, stances: byStance.map((s) => `${s.id}:${s.median} [${s.p25}-${s.p75}]`), rounds: rounds.map((r) => `${r.round}:${r.median} [${r.p25}-${r.p75}]`), consensus: out.consensus, policy: POLICY, errPolicy: out.errorsAtPolicy, errCons: out.errorsAtConsensus, total, sens: sens.map((x) => `${x.t}:${x.n}`).join(" ") }, null, 1));

// Kiểm định lại (chỉ lần 2): (a) bootstrap 200 lần trên các hồ sơ -> khoảng tin cậy 95% của ngưỡng Bayes (hai loại sai sót nặng như nhau) và của trung vị hội đồng;
// (b) hội đồng với các cơ cấu lập trường khác để xem kết luận có phụ thuộc giả định 30/40/30 không.
if (RUN >= 2) {
  const consensusFor = (mix, FEb, FIb, xsb) => { const ex = []; for (const [a, b, share] of mix) for (let i = 0; i < Math.round(N * share); i++) ex.push(beta(a, b)); const arg = (w) => { let bt = 0, bl = Infinity; T.forEach((t, i) => { const l = w * FEb[i] + (1 - w) * FIb[i]; if (l < bl - 1e-9) { bl = l; bt = t; } }); return bt; }; let v = ex.map(arg); const ll = ex.map(() => 0.3 + 0.4 * rnd()); for (let r = 0; r < ROUNDS; r++) { const m = q(v, 0.5); v = v.map((t, i) => (1 - ll[i]) * t + ll[i] * m); } return q(v, 0.5); };
  const fitMix = (data) => { let pi_ = 0.5, A_ = [0.6, 5], B_ = [5, 0.6]; const fit = (w) => { const sw = w.reduce((s_, v) => s_ + v, 0); let m = 0; data.forEach((x, i) => (m += w[i] * x)); m /= sw; let v = 0; data.forEach((x, i) => (v += w[i] * (x - m) ** 2)); v = Math.max(v / sw, 1e-4); const k = Math.max((m * (1 - m)) / v - 1, 0.2); return [m * k, (1 - m) * k]; }; for (let it = 0; it < 60; it++) { const r = data.map((x) => { const a = (1 - pi_) * bpdf(x, ...A_), b = pi_ * bpdf(x, ...B_); return b / (a + b); }); pi_ = r.reduce((s_, v) => s_ + v, 0) / r.length; B_ = fit(r); A_ = fit(r.map((v) => 1 - v)); } return { pi_, A_, B_ }; };
  const curves = (data, m) => { const pv_ = data.map((x) => { const a = (1 - m.pi_) * bpdf(x, ...m.A_), b = m.pi_ * bpdf(x, ...m.B_); return b / (a + b); }); return { FE_: T.map((t) => data.reduce((s_, x, i) => s_ + (x < t / 100 ? pv_[i] : 0), 0)), FI_: T.map((t) => data.reduce((s_, x, i) => s_ + (x >= t / 100 ? 1 - pv_[i] : 0), 0)) }; };
  const B = 200, bayes = [], cons = [];
  for (let b = 0; b < B; b++) { const sample = xs.map(() => xs[Math.floor(rnd() * xs.length)]); const m = fitMix(sample), { FE_, FI_ } = curves(sample, m); let bt = 0, bl = Infinity; T.forEach((t, i) => { const l = 0.5 * FE_[i] + 0.5 * FI_[i]; if (l < bl - 1e-9) { bl = l; bt = t; } }); bayes.push(bt); cons.push(consensusFor([[6, 3, 0.3], [5, 5, 0.4], [3, 6, 0.3]], FE_, FI_, sample)); }
  const ci = (arr) => ({ median: q(arr, 0.5), lo95: q(arr, 0.025), hi95: q(arr, 0.975) });
  const MIXES = [["30/40/30 (như lần 1)", [[6, 3, 0.3], [5, 5, 0.4], [3, 6, 0.3]]], ["25/50/25 (nhiều cân bằng hơn)", [[6, 3, 0.25], [5, 5, 0.5], [3, 6, 0.25]]], ["50/30/20 (thiên về bao trùm)", [[6, 3, 0.5], [5, 5, 0.3], [3, 6, 0.2]]], ["20/30/50 (thiên về chặt chẽ)", [[6, 3, 0.2], [5, 5, 0.3], [3, 6, 0.5]]], ["100% bao trùm", [[6, 3, 1]]], ["100% chặt chẽ", [[3, 6, 1]]]];
  out.verification = { bootstrap: { resamples: B, bayesEqualCost: ci(bayes), panelConsensus: ci(cons) }, mixes: MIXES.map(([label, mix]) => ({ label, median: Math.round(consensusFor(mix, FE, FI, xs) * 10) / 10 })) };
  writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log(JSON.stringify(out.verification, null, 1));
}
