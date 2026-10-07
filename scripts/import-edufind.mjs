// Gộp danh mục tạp chí trong nước của TẤT CẢ ngành EduFind thành data/journals.json (khóa theo ISSN).
// Dùng: node scripts/import-edufind.mjs [đường-dẫn-tới-kho-edufind-khgd]
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
const root = path.resolve(process.argv[2] ?? "../edufind-khgd");
const dd = path.join(root, "disciplines");
if (!existsSync(dd)) throw new Error(`Không thấy ${dd}. Truyền đường dẫn kho edufind-khgd.`);
const byIssn = {}; const journals = [];
for (const slug of readdirSync(dd)) {
  const cfgP = path.join(dd, slug, "config.json"), cP = path.join(dd, slug, "data", "council.json");
  if (!existsSync(cfgP) || !existsSync(cP)) continue;
  const cfg = JSON.parse(readFileSync(cfgP, "utf8")), c = JSON.parse(readFileSync(cP, "utf8"));
  for (const j of c.journals ?? []) {
    const issn = j.issn.map((i) => i.value);
    const rec = { id: `${cfg.site.path}:${j.stt}`, discipline: cfg.site.path, name: j.name, publisher: j.publisher, issn, scoreTiers: j.scoreTiers, scope: j.scope ?? null };
    journals.push(rec);
    for (const i of issn) (byIssn[i] ??= []).push(rec.id);
  }
}
writeFileSync("data/journals.json", JSON.stringify({ meta: { source: "EduFind (HĐGSNN)", imported: new Date().toISOString().slice(0, 10), count: journals.length }, journals, byIssn }));
console.log(`journals.json: ${journals.length} tạp chí, ${Object.keys(byIssn).length} ISSN`);
