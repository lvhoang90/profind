// PRO-SCORE1000 (phiên bản 2.0): chỉ số khoa học riêng của ProFind, thang 0-100, được thiết kế sau khi hội đồng giả lập 10 chuyên gia (thư mục học, thống kê,
// y sinh, kỹ thuật, khoa học tự nhiên, khoa học xã hội, quản lý nghiên cứu, nhà khoa học trẻ, liêm chính học thuật, chất lượng dữ liệu) phản biện bản nháp.
// Nguyên tắc: tuân thủ DORA và Leiden Manifesto (nhiều chỉ báo, không dùng hệ số tạp chí làm thước đo chính, minh bạch, chuẩn hóa theo ngành);
// không trùng đếm; không phạt thiếu dữ liệu (dữ liệu ít thì co về trung bình ngành); chống bài nhóm lớn (trần trích dẫn mỗi công trình).
//
//   PRO-SCORE = 100 × [ 0,42·Tác động + 0,10·Sản lượng + 0,10·Chủ đạo + 0,10·Chất lượng + 0,17·Đà phát triển + 0,08·Đều đặn + 0,03·Ghi nhận ]
//   Tác động  = 0,40·pct(log(1+trích dẫn đã cắt trần)) + 0,30·pct(chỉ số h) + 0,30·pct(tỉ lệ công trình ≥ 10 trích dẫn, co về trung bình ngành)
//   Sản lượng = pct(min(log(1+số công trình), P95))
//   Chủ đạo   = pct(tỉ lệ công trình đứng đầu/liên hệ trên công trình xác định được vai trò, làm trơn Bayes k=8, tối đa 0,85)
//   Chất lượng= trung bình hạng Q (Q1=1, Q2=0,75, Q3=0,5, Q4=0,25) trên công trình có hạng, làm trơn k=5 về trung bình ngành
//   Đà phát triển = 0,5·pct(log(1+trích dẫn công trình 5 năm gần nhất)) + 0,5·pct(log(1+số công trình 5 năm gần nhất))
//   Đều đặn   = (số năm có công bố + 2·0,6) / (số năm hoạt động + 2)
//   Ghi nhận  = 1 nếu thuộc Top 2% thế giới (Elsevier), ngược lại 0
// pct = bách phân vị trong ngành chính; ngành ít hơn 50 người được trộn với bách phân vị toàn hệ thống.
// Trọng số cơ sở của v1 (nay là tâm của hội đồng mô phỏng, xem pro-panel.mjs); điểm cuối là trung bình qua 1000 chuyên gia ảo.
const W = { impact: 0.42, output: 0.1, lead: 0.1, quality: 0.1, momentum: 0.17, steady: 0.08, recog: 0.03 };
export const PRO_VERSION = "2.0";
import { makePanel, summarize, KEYS as PKEYS } from "./pro-panel.mjs";
const QV = { Q1: 1, Q2: 0.75, Q3: 0.5, Q4: 0.25 };
const quant = (arr, p) => { if (!arr.length) return Infinity; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
/** Bách phân vị trung điểm (0..1) của từng giá trị trong mảng cùng nhóm. */
function pctMap(items, key) {
  const v = items.map((a) => a[key]).sort((x, y) => x - y), n = v.length, lo = (x) => { let l = 0, h = n; while (l < h) { const m = (l + h) >> 1; if (v[m] < x) l = m + 1; else h = m; } return l; }, hi = (x) => { let l = 0, h = n; while (l < h) { const m = (l + h) >> 1; if (v[m] <= x) l = m + 1; else h = m; } return l; };
  return (x) => (n ? (lo(x) + hi(x)) / 2 / n : 0.5);
}

export function computePro(authors, per, year) {
  const pool = authors.filter((a) => a.rankable && a.worksCount > 0);
  const field = (a) => a.disciplines?.[0] ?? "_";
  // Liên ngành: hồ sơ có phân bố ngành (discShares, từ build-index.mjs) được so sánh với MỌI nhóm ngành của mình theo tỉ trọng, thay vì chỉ ngành đứng đầu,
  // để một phân loại ngành sai lệch hoặc một nhà khoa học liên ngành không bị dồn hẳn vào một nhóm. Nhóm so sánh (byF) vẫn lập theo ngành chính.
  const mix = (a) => { const e = Object.entries(a.discShares ?? {}); return e.length ? e.map(([d, p]) => [d, p / 100]) : [[field(a), 1]]; };
  // Trần trích dẫn mỗi công trình = P99 của ngành, để một bài nhóm lớn không kéo cả hồ sơ.
  const byF = new Map(); for (const a of pool) { const f = field(a); if (!byF.has(f)) byF.set(f, []); byF.get(f).push(a); }
  const cap = new Map(); for (const [f, as] of byF) cap.set(f, Math.max(20, quant(as.flatMap((a) => (per.get(a.id) ?? []).map((w) => w.citations ?? 0)), 0.99)));
  const feat = new Map();
  for (const a of pool) {
    const ws = per.get(a.id) ?? [], c = (() => { let t = 0, w = 0; for (const [d, p] of mix(a)) if (cap.has(d)) { t += p * cap.get(d); w += p; } return w ? t / w : 1e9; })(), yrs = new Set(ws.map((w) => w.year));
    const excess = ws.reduce((s, w) => s + Math.max(0, (w.citations ?? 0) - c), 0);
    const known = ws.filter((w) => !w.ru), lead = known.filter((w) => w.role === "lead").length, qs = ws.filter((w) => QV[w.quartile]);
    const rec = ws.filter((w) => w.year >= year - 4);
    // Tuổi nghề cho "Đều đặn": bỏ năm công bố lẻ loi ở đầu hồ sơ (cách năm kế tiếp trên 5 năm; thường là bài của người khác bị gộp nhầm hoặc bài cũ không liên quan), lặp lại đến khi hết.
    const ys = [...yrs].filter(Number.isFinite).sort((x, y) => x - y); while (ys.length > 1 && ys[1] - ys[0] > 5) ys.shift();
    const span = ys.length ? ys[ys.length - 1] - ys[0] + 1 : 1;
    feat.set(a.id, {
      cites: Math.log1p(Math.max(0, a.citations - excess)), h: a.hIndex ?? 0, hi: ws.filter((w) => (w.citations ?? 0) >= 10).length, n: ws.length,
      out: Math.log1p(ws.length), known: known.length, lead, qn: qs.length, qsum: qs.reduce((s, w) => s + QV[w.quartile], 0),
      rc: Math.log1p(rec.reduce((s, w) => s + (w.citations ?? 0), 0)), rn: Math.log1p(rec.length), act: ys.length || yrs.size, span,
    });
  }
  // Trung bình ngành cho các tỉ lệ cần làm trơn.
  const mean = (as, f) => { const t = as.reduce((s, a) => s + feat.get(a.id)[f], 0); return t; };
  const prior = new Map();
  for (const [f, as] of byF) {
    const n = as.reduce((s, a) => s + feat.get(a.id).n, 0) || 1, kn = as.reduce((s, a) => s + feat.get(a.id).known, 0) || 1, qn = as.reduce((s, a) => s + feat.get(a.id).qn, 0);
    prior.set(f, { hi: mean(as, "hi") / n, lead: Math.min(0.85, mean(as, "lead") / kn), q: qn ? mean(as, "qsum") / qn : 0.6 });
  }
  for (const a of pool) {
    const x = feat.get(a.id), p = (() => { const o = { hi: 0, lead: 0, q: 0 }; let w = 0; for (const [d, q] of mix(a)) { const pr = prior.get(d); if (!pr) continue; o.hi += q * pr.hi; o.lead += q * pr.lead; o.q += q * pr.q; w += q; } return w ? { hi: o.hi / w, lead: o.lead / w, q: o.q / w } : prior.get(field(a)); })();
    x.hiS = (x.hi + 5 * p.hi) / (x.n + 5);
    x.leadS = Math.min(0.85, (x.lead + 8 * p.lead) / (x.known + 8));
    x.qS = (x.qsum + 5 * p.q) / (x.qn + 5);
    x.steady = (x.act + 1.2) / (x.span + 2);
  }
  const KEYS = ["cites", "h", "hiS", "out", "leadS", "rc", "rn"];
  const glob = Object.fromEntries(KEYS.map((k) => [k, pctMap(pool.map((a) => feat.get(a.id)), k)]));
  const loc = new Map(); for (const [f, as] of byF) loc.set(f, Object.fromEntries(KEYS.map((k) => [k, pctMap(as.map((a) => feat.get(a.id)), k)])));
  const out95 = quant(pool.map((a) => feat.get(a.id).out), 0.95);
  for (const a of pool) {
    const x = feat.get(a.id), B = 50, mx = mix(a).filter(([d]) => byF.has(d));
    const pcOne = (d, k, v) => { const n = byF.get(d).length, L = loc.get(d); return (n * L[k](v) + (n < B ? (B - n) : 0) * glob[k](v)) / (n + (n < B ? B - n : 0)); };
    const pc = (k, v = x[k]) => { if (!mx.length) return glob[k](v); const w = mx.reduce((t, [, p]) => t + p, 0); return mx.reduce((t, [d, p]) => t + p * pcOne(d, k, v), 0) / w; };
    const impact = 0.4 * pc("cites") + 0.3 * pc("h") + 0.3 * pc("hiS");
    const output = pc("out", Math.min(x.out, out95));
    const lead = pc("leadS");
    const quality = x.qS, momentum = 0.5 * pc("rc") + 0.5 * pc("rn"), steady = x.steady, recog = a.top2 ? 1 : 0; // có tên trong danh sách Top 2% (sự nghiệp hoặc năm 2025); tự trích dẫn chỉ được nêu ở chú giải nhãn
    const parts = { impact, output, lead, quality, momentum, steady, recog };
    a._s = PKEYS.map((k) => parts[k]);
    a.proParts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 100)]));
    a.proConf = (x.known >= 5 ? 1 : 0) + (x.qn >= 5 ? 1 : 0) + (x.n >= 10 ? 1 : 0); // 0..3: mức đủ dữ liệu của điểm
  }
  // ---- Hội đồng mô phỏng 1000 chuyên gia ảo: mỗi chuyên gia chấm mọi hồ sơ theo trọng số riêng; điểm cuối là trung bình, kèm khoảng P10-P90 và độ vững của hạng.
  const SEED = 20261007, panel = makePanel(1000, SEED), E = panel.length;
  for (const a of pool) {
    const sc = new Float32Array(E);
    for (let e = 0; e < E; e++) { const w = panel[e].w; let t = 0; for (let i = 0; i < 7; i++) t += w[i] * a._s[i]; sc[e] = 100 * t; }
    a._sc = sc; let m = 0; for (let e = 0; e < E; e++) m += sc[e]; a._m = m / E; a.pro = Math.round(a._m * 10) / 10;
    const so = Float32Array.from(sc).sort(); a.proLo = Math.round(so[Math.floor(0.1 * E)] * 10) / 10; a.proHi = Math.round(so[Math.floor(0.9 * E)] * 10) / 10;
  }
  // Xếp hạng toàn hệ thống (đồng hạng cùng số) chỉ trong tập đủ điều kiện: ≥ 10 công trình và hoạt động ≥ 3 năm (hồ sơ quá mỏng không được xếp hạng, tránh điểm ảo). Tự tính lại mỗi lần dữ liệu cập nhật.
  const elig = pool.filter((a) => a.worksCount >= 10 && (a.lastYear ?? 0) - (a.firstYear ?? 0) >= 2).sort((p, q) => q._m - p._m || q.citations - p.citations);
  elig.forEach((a, i, arr) => { a.proRank = i > 0 && arr[i - 1]._m === a._m ? arr[i - 1].proRank : i + 1; });
  // Hạng của từng hồ sơ dưới góc nhìn của từng chuyên gia ảo, để đo độ vững (khoảng hạng P10-P90 và tỉ lệ chuyên gia đồng ý huy hiệu).
  const N = elig.length, rk = new Uint16Array(N * E), order = Array.from({ length: N }, (_, i) => i);
  for (let e = 0; e < E; e++) { order.sort((i, j) => elig[j]._sc[e] - elig[i]._sc[e]); for (let r = 0; r < N; r++) rk[e * N + order[r]] = r + 1; }
  const tierOf = (r) => (r <= 10 ? 10 : r <= 50 ? 50 : r <= 100 ? 100 : r <= 500 ? 500 : r <= 1000 ? 1000 : 0);
  elig.forEach((a, i) => {
    const v = new Uint16Array(E); for (let e = 0; e < E; e++) v[e] = rk[e * N + i]; v.sort();
    a.proR10 = v[Math.floor(0.1 * E)]; a.proR90 = v[Math.floor(0.9 * E)];
    const t = tierOf(a.proRank); let ok = 0; if (t) for (let e = 0; e < E; e++) if (v[e] <= t) ok++; a.proStab = t ? Math.round((100 * ok) / E) : null;
  });
  // Huy hiệu theo hạng: Top 10, 50, 100, 500, 1000 (tự cập nhật mỗi lần dữ liệu đổi).
  for (const a of authors) {
    if (a.proRank == null) { a.proRank = null; a.proTier = null; a.proR10 = a.proR90 = a.proStab = null; if (a.pro == null) { a.pro = null; a.proLo = a.proHi = null; a.proParts = null; a.proConf = null; } continue; }
    const r = a.proRank; a.proTier = r <= 10 ? "t10" : r <= 50 ? "t50" : r <= 100 ? "t100" : r <= 500 ? "t500" : r <= 1000 ? "t1000" : null;
  }
  for (const a of authors) { delete a._s; delete a._sc; delete a._m; }
  return { eligible: elig.length, panel: summarize(panel, SEED) };
}
