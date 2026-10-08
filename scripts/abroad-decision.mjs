// Quy tắc quyết định ngưỡng "liên kết chính" từ ba lần mô phỏng hội đồng (xem trang phương pháp PRO-SCORE1000).
//   node scripts/abroad-decision.mjs   -> public/data/abroad-decision.json và cập nhật maxVnShare trong data/abroad-rule.json
// Quy tắc (đặt trước khi áp dụng, tham số alpha là phán đoán của quản trị viên, không phải kết quả thực nghiệm):
//  1) Điểm tham chiếu R = trung vị của các trung vị đồng thuận của ba lần mô phỏng độc lập.
//  2) Ràng buộc thận trọng C (kiểm soát sai sót loại I, Neyman–Pearson 1933): ngưỡng cao nhất mà số hồ sơ thuộc cụm Việt Nam bị loại nhầm KỲ VỌNG
//     không vượt alpha × số hồ sơ kỳ vọng thuộc cụm Việt Nam. alpha = 1%.
//  3) Ngưỡng áp dụng = làm tròn XUỐNG bội số của 5 của min(R, C): không bao giờ cao hơn mức đồng thuận, và không vượt ràng buộc thận trọng.
import { readFileSync, writeFileSync } from "node:fs";
const ALPHA = 0.01, STEP = 5;
const runs = ["abroad-panel", "abroad-panel-2", "abroad-panel-3"].map((f) => JSON.parse(readFileSync(`public/data/${f}.json`, "utf8")));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const R = med(runs.map((r) => r.consensus.median));
const g = runs[0].grid, nVn = runs[0].mixture.piVn * runs[0].profiles;
const cOf = (alpha) => { let c = 0; g.FE.forEach((v, t) => { if (v <= alpha * nVn) c = t; }); return c; };
const C = cOf(ALPHA), floorStep = (x) => Math.floor(x / STEP) * STEP, threshold = floorStep(Math.min(R, C));
const at = (t) => ({ t, expectedWronglyExcluded: Math.round(g.FE[t]), expectedWronglyAdmitted: Math.round(g.FI[t]), tagged: runs[0].sens?.find?.((x) => x.t === t)?.n ?? null });
const tagged = (t) => runs[0].curve.find((c) => c.t === t)?.tagged ?? null;
const out = { _note: "Sinh bởi scripts/abroad-decision.mjs", built: runs[0].built, alpha: ALPHA, step: STEP, vnClusterExpected: Math.round(nVn), reference: { R, from: runs.map((r) => ({ run: r.run ?? 1, n: r.n, seed: r.seed, fields: !!r.fields, median: r.consensus.median, p25: r.consensus.p25, p75: r.consensus.p75 })) }, constraint: { C, allowedWronglyExcluded: Math.round(ALPHA * nVn * 10) / 10 }, threshold, atThreshold: { ...at(threshold), tagged: tagged(threshold) }, atPrevious: { ...at(20), tagged: tagged(20) }, alphaSensitivity: [0.005, 0.01, 0.02, 0.05].map((a) => ({ alpha: a, C: cOf(a), threshold: floorStep(Math.min(R, cOf(a))) })), verification: runs[1].verification ?? null, fields: runs[2].byField ?? null };
writeFileSync("public/data/abroad-decision.json", JSON.stringify(out) + "\n");
const rule = JSON.parse(readFileSync("data/abroad-rule.json", "utf8")); rule.maxVnShare = threshold / 100; rule.decidedBy = "scripts/abroad-decision.mjs (tham chiếu R = trung vị đồng thuận 3 lần mô phỏng; ràng buộc loại nhầm kỳ vọng ≤ 1% cụm Việt Nam; làm tròn xuống bội 5)";
writeFileSync("data/abroad-rule.json", JSON.stringify(rule, null, 2) + "\n");
console.log(JSON.stringify({ R, C, threshold, allowed: out.constraint.allowedWronglyExcluded, atThreshold: out.atThreshold, atPrevious: out.atPrevious, alphaSensitivity: out.alphaSensitivity }, null, 1));
