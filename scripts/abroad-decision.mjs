// Hội đồng mô phỏng quyết định hai ngưỡng của quy tắc "liên kết chính" (xem scripts/lib/abroad.mjs và trang phương pháp PRO-SCORE1000).
//   node scripts/abroad-decision.mjs   -> public/data/abroad-decision.json và cập nhật recentMinShare, maxVnShare trong data/abroad-rule.json
// Quy tắc quyết định: ngưỡng của mỗi yếu tố = TRUNG VỊ của ba trung vị đồng thuận độc lập (lần 1: 1000 chuyên gia, lần 2: 500, lần 3: 100 thuộc nhiều lĩnh vực), làm tròn đến số nguyên gần nhất.
// Không thêm ràng buộc hay phán đoán nào ngoài kết quả của hội đồng.
import { readFileSync, writeFileSync } from "node:fs";
const rd = (f) => JSON.parse(readFileSync(f, "utf8")), med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const P = rd("public/data/profind.json"), rule = rd("data/abroad-rule.json");
const out = { _note: "Sinh bởi scripts/abroad-decision.mjs", built: P.meta.built, factors: {} };
for (const f of ["recent", "overall"]) {
  const runs = [1, 2, 3].map((r) => rd(`public/data/abroad/${f}-${r}.json`)), R = Math.round(med(runs.map((r) => r.consensus.median))), r1 = runs[0], g = r1.grid;
  const prof = P.authors.filter((a) => !a.suspect && (f === "recent" ? a.vnRecent != null : a.vnRecent == null && a.vnShare != null)), v = (a) => (f === "recent" ? a.vnRecent : a.vnShare);
  let lo = 1, hi = 0; for (let w = 0.001; w < 1; w += 0.001) { let bt = 0, bl = Infinity; g.FE.forEach((_, t) => { const l = w * g.FE[t] + (1 - w) * g.FI[t]; if (l < bl - 1e-9) { bl = l; bt = t; } }); if (bt === R) { lo = Math.min(lo, w); hi = Math.max(hi, w); } }
  const kk = lo <= hi ? { kFrom: Math.round((lo / (1 - lo)) * 10) / 10, kTo: Math.round((hi / (1 - hi)) * 10) / 10 } : null;
  out.factors[f] = { threshold: R, profiles: r1.profiles, expectedVn: r1.expectedVn, tagged: prof.filter((a) => v(a) < R).length, atThreshold: { t: R, expectedWronglyExcluded: Math.round(g.FE[R]), expectedWronglyAdmitted: Math.round(g.FI[R]) }, impliedCostRatio: kk ? { from: kk.kFrom, to: kk.kTo } : r1.impliedCostRatio.filter((x) => x.t < R).slice(-1).map((x) => ({ from: x.kFrom, to: x.kTo }))[0] ?? null, runs: runs.map((r) => ({ run: r.run, n: r.n, seed: r.seed, fields: r.fields, median: r.consensus.median, p25: r.consensus.p25, p75: r.consensus.p75 })), stances: r1.stances, calibration: { labeled: r1.calibration.labeled, strata: r1.calibration.strata }, hist: r1.hist, curve: r1.curve, verification: runs[1].verification, fieldsRun: runs[2].byField };
}
rule.recentMinShare = out.factors.recent.threshold / 100; rule.maxVnShare = out.factors.overall.threshold / 100; rule.decidedBy = "scripts/abroad-decision.mjs: trung vị của ba trung vị đồng thuận độc lập của hội đồng mô phỏng, làm tròn đến số nguyên";
out.rule = { years: P.meta.abroad?.window ?? [], window: rule.window, recentMinWorks: rule.recentMinWorks, minWorks: rule.minWorks, recentMinShare: out.factors.recent.threshold, maxVnShare: out.factors.overall.threshold };
writeFileSync("public/data/abroad-decision.json", JSON.stringify(out) + "\n"); writeFileSync("data/abroad-rule.json", JSON.stringify(rule, null, 2) + "\n");
console.log(JSON.stringify({ recent: { R: out.factors.recent.threshold, tagged: out.factors.recent.tagged, of: out.factors.recent.profiles, err: out.factors.recent.atThreshold, k: out.factors.recent.impliedCostRatio }, overall: { R: out.factors.overall.threshold, tagged: out.factors.overall.tagged, of: out.factors.overall.profiles, err: out.factors.overall.atThreshold, k: out.factors.overall.impliedCostRatio } }));
