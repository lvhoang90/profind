// Mô phỏng hội đồng chuyên gia để quyết định ngưỡng "% công trình có liên kết tại Việt Nam" (xem trang phương pháp PRO-SCORE1000).
//   node scripts/abroad-panel.mjs --factor recent|overall --run 1 --n 1000 --seed S            -> public/data/abroad/<yếu tố>-<lần>.json
//   thêm --run 2 --n 500 (kèm kiểm định bootstrap trên mẫu ORCID) hoặc --run 3 --n 100 --fields (nhiều lĩnh vực)
// Yếu tố recent: tỉ lệ công trình có liên kết VN, lấy giá trị THẤP NHẤT theo năm trong 3 năm gần nhất (hồ sơ có đủ bằng chứng gần đây).
// Yếu tố overall: tỉ lệ dài hạn trên toàn bộ công trình (chỉ cho hồ sơ KHÔNG đủ bằng chứng gần đây).
// Bằng chứng thật: mẫu đối chiếu ORCID (data/abroad-orcid-sample.json, scripts/abroad-orcid-validate.mjs) cho xác suất "hiện làm việc tại Việt Nam" theo từng mức tỉ lệ (hồi quy đơn điệu, PAV).
// ĐÂY LÀ MÔ PHỎNG hội đồng, không phải ý kiến chuyên gia thật; phần giả định là cơ cấu lập trường và mức đánh đổi giữa hai loại sai sót (hạt giống cố định, tái lập được).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const FIELDS = process.argv.includes("--fields"), RUN = +arg("run", 1), SEED = +arg("seed", 20261021), N = +arg("n", 1000), FACTOR = arg("factor", "recent"), ROUNDS = 3;
const OUT = arg("out", `public/data/abroad/${FACTOR}-${RUN}.json`);
const P = JSON.parse(readFileSync("public/data/profind.json", "utf8")), SAMPLE = JSON.parse(readFileSync("data/abroad-orcid-sample.json", "utf8")).rows.filter((r) => r.factor === FACTOR && (r.label === "vn" || r.label === "foreign"));
const val = (a) => (FACTOR === "recent" ? a.vnRecent : a.vnShare);
const prof = P.authors.filter((a) => !a.suspect && (FACTOR === "recent" ? a.vnRecent != null : a.vnRecent == null && a.vnShare != null)); // hồ sơ thuộc yếu tố này
const xs = prof.map((a) => val(a)); // đơn vị %
// 1) Hiệu chuẩn P(hiện làm việc tại VN | x) bằng hồi quy đơn điệu tăng (PAV) trên mẫu ORCID; mỗi khối được làm trơn (k+0,5)/(n+1)
const iso = (rows) => { const pts = rows.map((r) => ({ x: r.x, y: r.label === "vn" ? 1 : 0 })).sort((a, b) => a.x - b.x); const blocks = []; for (const p of pts) { blocks.push({ x0: p.x, x1: p.x, n: 1, k: p.y }); while (blocks.length > 1) { const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2]; if (a.k / a.n <= b.k / b.n) break; blocks.splice(blocks.length - 2, 2, { x0: a.x0, x1: b.x1, n: a.n + b.n, k: a.k + b.k }); } } return blocks.map((b) => ({ ...b, p: (b.k + 0.5) / (b.n + 1) })); };
const pAt = (blocks, x) => { if (x <= blocks[0].x1) return blocks[0].p; for (let i = 1; i < blocks.length; i++) if (x <= blocks[i].x1) return x < blocks[i].x0 ? (blocks[i - 1].p + blocks[i].p) / 2 : blocks[i].p; return blocks[blocks.length - 1].p; };
const blocks = iso(SAMPLE), pv = xs.map((x) => pAt(blocks, x));
// 2) Đường sai sót theo ngưỡng t (lưới 0..100%): FE = kỳ vọng số hồ sơ làm việc tại VN bị loại nhầm; FI = kỳ vọng số hồ sơ không làm việc tại VN được đưa vào nhầm
const T = Array.from({ length: 101 }, (_, i) => i);
const curvesOf = (xv, pvv) => ({ FE: T.map((t) => xv.reduce((s, x, i) => s + (x < t ? pvv[i] : 0), 0)), FI: T.map((t) => xv.reduce((s, x, i) => s + (x >= t ? 1 - pvv[i] : 0), 0)) });
const { FE, FI } = curvesOf(xs, pv);
const argminOn = (FEc, FIc, w) => { let b = 0, bl = Infinity; T.forEach((t, i) => { const l = w * FEc[i] + (1 - w) * FIc[i]; if (l < bl - 1e-9) { bl = l; b = t; } }); return b; };
const argminW = (w) => argminOn(FE, FI, w);
const FIELD_OF = { "y-hoc": "med", duoc: "med", "sinh-hoc": "life", "chan-nuoi": "life", "nong-lam": "life", cntt: "eng", "co-khi": "eng", "dien-tu": "eng", "giao-thong": "eng", "luyen-kim": "eng", "thuy-loi": "eng", "xay-dung": "eng", "co-hoc": "eng", "toan-hoc": "nat", "vat-ly": "nat", "hoa-thuc-pham": "nat", "trai-dat-mo": "nat", "kinh-te": "soc", "giao-duc": "soc", luat: "soc", "tam-ly": "soc", "triet-xhh": "soc", "an-ninh": "soc", "quan-su": "soc", "ngon-ngu": "hum", "su-hoc": "hum", "van-hoa": "hum", "van-hoc": "hum" };
const GROUPS = { life: "Khoa học sự sống", eng: "Kỹ thuật, công nghệ", nat: "Khoa học tự nhiên", soc: "Xã hội, giáo dục", hum: "Nhân văn, nghệ thuật", med: "Y dược" };
const FC = {}; for (const g of Object.keys(GROUPS)) { const idx = prof.map((a, i) => (FIELD_OF[a.disciplines?.[0]] === g ? i : -1)).filter((i) => i >= 0); FC[g] = { n: idx.length, ...curvesOf(idx.map((i) => xs[i]), idx.map((i) => pv[i])) }; }
// 3) Hội đồng mô phỏng: mỗi người có "trọng số sai sót" w = mức coi trọng việc loại nhầm người làm việc tại VN (so với việc đưa nhầm người không làm việc tại VN vào bảng)
let s = SEED >>> 0; const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gam = (k) => { if (k < 1) return gam(k + 1) * Math.pow(rnd(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { const u1 = rnd(), u2 = rnd(); x = Math.sqrt(-2 * Math.log(u1 + 1e-12)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0); v = v ** 3; const u = rnd(); if (Math.log(u + 1e-12) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v; } };
const beta = (a, b) => { const x = gam(a), y = gam(b); return x / (x + y); };
const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const STANCES = [{ id: "inclusive", vi: "Bao trùm (ưu tiên không bỏ sót người Việt công tác nước ngoài, nhà khoa học đa liên kết)", share: 0.3, a: 6, b: 3 }, { id: "balanced", vi: "Cân bằng (hai loại sai sót nặng như nhau)", share: 0.4, a: 5, b: 5 }, { id: "strict", vi: "Chặt chẽ (ưu tiên bảng chỉ gồm người có liên kết chính tại Việt Nam)", share: 0.3, a: 3, b: 6 }];
const makeExperts = (mix, n) => { const ex = []; for (const [a, b, share, id] of mix) for (let i = 0; i < Math.round(n * share); i++) ex.push({ st: id, w: beta(a, b) }); return ex; };
const MIX0 = STANCES.map((x) => [x.a, x.b, x.share, x.id]);
const experts = makeExperts(MIX0, N);
if (FIELDS) { for (let i = experts.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [experts[i], experts[k]] = [experts[k], experts[i]]; } const ids = Object.keys(GROUPS); experts.forEach((e, i) => { e.g = ids[i % ids.length]; }); }
const own = (e) => (FIELDS ? argminOn(FC[e.g].FE, FC[e.g].FI, e.w) : argminW(e.w));
const deliberate = (th, rnds) => { let v = th.slice(); const lam = v.map(() => 0.3 + 0.4 * rnd()); for (let r = 0; r < rnds; r++) { const m = q(v, 0.5); v = v.map((t, i) => (1 - lam[i]) * t + lam[i] * m); } return v; };
const th0 = experts.map(own);
const rounds = [{ round: 0, median: q(th0, 0.5), p25: q(th0, 0.25), p75: q(th0, 0.75) }]; { let th = th0.slice(); const lam = th.map(() => 0.3 + 0.4 * rnd()); for (let r = 1; r <= ROUNDS; r++) { const m = q(th, 0.5); th = th.map((t, i) => (1 - lam[i]) * t + lam[i] * m); rounds.push({ round: r, median: Math.round(q(th, 0.5) * 10) / 10, p25: Math.round(q(th, 0.25) * 10) / 10, p75: Math.round(q(th, 0.75) * 10) / 10 }); } }
const byStance = STANCES.map((st) => { const v = th0.filter((_, i) => experts[i].st === st.id); return { id: st.id, vi: st.vi, n: v.length, median: q(v, 0.5), p25: q(v, 0.25), p75: q(v, 0.75) }; });
const hist = Array.from({ length: 20 }, (_, i) => xs.filter((x) => (i === 19 ? x >= 95 : x >= i * 5 && x < i * 5 + 5)).length);
const at = (t) => ({ t, expectedWronglyExcluded: Math.round(FE[t]), expectedWronglyIncluded: Math.round(FI[t]) });
const curve = T.filter((t) => t % 5 === 0).map((t) => ({ t, excluded: Math.round(FE[t]), admitted: Math.round(FI[t]), tagged: xs.filter((x) => x < t).length }));
const implied = []; for (const t of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90]) { let lo = 1, hi = 0; for (let w = 0.001; w < 1; w += 0.001) if (argminW(w) === t) { lo = Math.min(lo, w); hi = Math.max(hi, w); } if (lo <= hi) implied.push({ t, kFrom: Math.round((lo / (1 - lo)) * 10) / 10, kTo: Math.round((hi / (1 - hi)) * 10) / 10 }); }
const byField = FIELDS ? Object.keys(GROUPS).map((g) => { const v = th0.filter((_, i) => experts[i].g === g); return { id: g, vi: GROUPS[g], experts: v.length, profiles: FC[g].n, bayesEqualCost: argminOn(FC[g].FE, FC[g].FI, 0.5), initialMedian: q(v, 0.5), p25: q(v, 0.25), p75: q(v, 0.75) }; }) : null;
// hiệu chuẩn: tóm tắt theo tầng mẫu ORCID
const strata = [...new Set(SAMPLE.map((r) => `${r.lo}-${r.hi}`))].map((k) => { const rs = SAMPLE.filter((r) => `${r.lo}-${r.hi}` === k); return { lo: rs[0].lo, hi: Math.min(100, rs[0].hi), n: rs.length, vnShare: Math.round((100 * rs.filter((r) => r.label === "vn").length) / rs.length) }; }).sort((a, b) => a.lo - b.lo);
const out = { run: RUN, factor: FACTOR, fields: FIELDS, byField, built: P.meta.built, seed: SEED, n: N, rounds: ROUNDS, profiles: xs.length, expectedVn: Math.round(pv.reduce((s_, v) => s_ + v, 0)), calibration: { labeled: SAMPLE.length, strata, blocks: blocks.map((b) => ({ x0: b.x0, x1: b.x1, n: b.n, p: Math.round(b.p * 1000) / 1000 })) }, stances: byStance, rounds_: rounds, consensus: { median: rounds[rounds.length - 1].median, p25: rounds[rounds.length - 1].p25, p75: rounds[rounds.length - 1].p75 }, bayesEqualCost: argminW(0.5), errorsAtConsensus: at(Math.round(rounds[rounds.length - 1].median)), hist, curve, impliedCostRatio: implied, grid: { FE: FE.map((v) => Math.round(v * 10) / 10), FI: FI.map((v) => Math.round(v * 10) / 10) }, _note: "Mô phỏng, không phải ý kiến chuyên gia thật. Sinh bởi scripts/abroad-panel.mjs." };
// Kiểm định lại (từ lần 2): (a) bootstrap 200 lần trên MẪU ORCID (hiệu chuẩn lại mỗi lần) -> khoảng tin cậy 95% của ngưỡng tối ưu (hai loại sai sót nặng như nhau) và của trung vị hội đồng;
// (b) hội đồng với các cơ cấu lập trường khác để xem kết luận có phụ thuộc giả định 30/40/30 không.
if (RUN >= 2) {
  const consensusOf = (mix, FEb, FIb) => { const ex = makeExperts(mix, N); return q(deliberate(ex.map((e) => argminOn(FEb, FIb, e.w)), ROUNDS), 0.5); };
  const B = 200, bayes = [], cons = [];
  for (let b = 0; b < B; b++) { const rs = SAMPLE.map(() => SAMPLE[Math.floor(rnd() * SAMPLE.length)]), bl = iso(rs), c = curvesOf(xs, xs.map((x) => pAt(bl, x))); bayes.push(argminOn(c.FE, c.FI, 0.5)); cons.push(consensusOf(MIX0, c.FE, c.FI)); }
  const ci = (arr) => ({ median: q(arr, 0.5), lo95: q(arr, 0.025), hi95: q(arr, 0.975) });
  const MIXES = [["30/40/30 (như lần 1)", MIX0], ["25/50/25 (nhiều cân bằng hơn)", [[6, 3, 0.25, "i"], [5, 5, 0.5, "b"], [3, 6, 0.25, "s"]]], ["50/30/20 (thiên về bao trùm)", [[6, 3, 0.5, "i"], [5, 5, 0.3, "b"], [3, 6, 0.2, "s"]]], ["20/30/50 (thiên về chặt chẽ)", [[6, 3, 0.2, "i"], [5, 5, 0.3, "b"], [3, 6, 0.5, "s"]]], ["100% bao trùm", [[6, 3, 1, "i"]]], ["100% chặt chẽ", [[3, 6, 1, "s"]]]];
  out.verification = { bootstrap: { resamples: B, labeled: SAMPLE.length, bayesEqualCost: ci(bayes), panelConsensus: ci(cons) }, mixes: MIXES.map(([label, mix]) => ({ label, median: Math.round(consensusOf(mix, FE, FI) * 10) / 10 })) };
}
mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(JSON.stringify({ factor: FACTOR, run: RUN, profiles: out.profiles, labeled: SAMPLE.length, strata: strata.map((x) => `${x.lo}-${x.hi}:${x.vnShare}%(n${x.n})`).join(" "), stances: byStance.map((x) => `${x.id}:${x.median}`).join(" "), rounds: rounds.map((r) => `${r.median}[${r.p25}-${r.p75}]`).join(" "), consensus: out.consensus, bayes: out.bayesEqualCost, errCons: out.errorsAtConsensus, verification: out.verification ? { bootstrap: out.verification.bootstrap, mixes: out.verification.mixes.map((m) => m.median).join(",") } : null, fields: byField?.map((f) => `${f.id}:${f.profiles}:${f.bayesEqualCost}`).join(" ") }, null, 0));
