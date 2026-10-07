// Gộp danh mục tạp chí trong nước của TẤT CẢ ngành EduFind thành data/journals.json (khóa theo ISSN).
// Dùng: node scripts/import-edufind.mjs [đường-dẫn-tới-kho-edufind-khgd]
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv[2] ?? "../edufind-khgd");
const dd = path.join(root, "disciplines");
if (!existsSync(dd)) throw new Error(`Không thấy ${dd}. Truyền đường dẫn kho edufind-khgd.`);
const byIssn = {}; const journals = []; const sjrByIssn = {}; const rules = {};
for (const slug of readdirSync(dd)) {
  const cfgP = path.join(dd, slug, "config.json"), cP = path.join(dd, slug, "data", "council.json");
  if (!existsSync(cfgP) || !existsSync(cP)) continue;
  const cfg = JSON.parse(readFileSync(cfgP, "utf8")), c = JSON.parse(readFileSync(cP, "utf8"));
  // Quy tắc điểm quốc tế của ngành (mức tối đa theo loại) + tạp chí SJR (Scopus) với hạng Q trong danh mục của ngành đó.
  rules[cfg.site.path] = Object.fromEntries((c.internationalRules ?? []).map((r) => [r.kind, r.maxScore]));
  const sp = path.join(dd, slug, "data", "sjr.json");
  if (existsSync(sp)) for (const j of JSON.parse(readFileSync(sp, "utf8")).journals ?? []) for (const i of j.issn ?? []) (sjrByIssn[i] ??= []).push([cfg.site.path, j.quartile ?? null, j.hIndex ?? null]);
  for (const j of c.journals ?? []) {
    const issn = j.issn.map((i) => i.value);
    const rec = { id: `${cfg.site.path}:${j.stt}`, discipline: cfg.site.path, name: j.name, publisher: j.publisher, issn, scoreTiers: j.scoreTiers, scope: j.scope ?? null };
    journals.push(rec);
    for (const i of issn) (byIssn[i] ??= []).push(rec.id);
  }
}
writeFileSync("data/sjr-rules.json", JSON.stringify({ meta: { source: "EduFind (SJR/Scopus theo danh mục từng ngành; quy tắc HĐGSNN)", imported: new Date().toISOString().slice(0, 10) }, rules, sjrByIssn }));
writeFileSync("data/journals.json", JSON.stringify({ meta: { source: "EduFind (HĐGSNN)", imported: new Date().toISOString().slice(0, 10), count: journals.length }, journals, byIssn }));
console.log(`sjr-rules.json: ${Object.keys(sjrByIssn).length} ISSN Scopus, ${Object.keys(rules).length} ngành`);
console.log(`journals.json: ${journals.length} tạp chí, ${Object.keys(byIssn).length} ISSN`);
