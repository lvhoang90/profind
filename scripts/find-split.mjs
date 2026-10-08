// Tìm các cặp hồ sơ có thể là CÙNG MỘT người bị OpenAlex tách đôi (khác mã, không mâu thuẫn ORCID). Chỉ ĐỀ XUẤT; việc gộp thật qua data/corrections.json (merge).
//   node scripts/find-split.mjs            -> data/split-candidates.json (A: gộp chắc, B: cần người duyệt) + public/data/_split-review.json (cho trang duyệt ở quản trị)
// Tầng A: tên trùng (cùng bộ từ), cùng đơn vị, đúng một hồ sơ có ORCID, cùng ngành, KHÔNG có công trình chung (DOI/nhan đề), năm công bố bổ sung nhau, và không còn người thứ ba trùng tên trong toàn bộ dữ liệu.
// Công trình chung nghĩa là hai người khác nhau (một người không thể là hai tác giả của cùng một bài) nên loại khỏi cả A lẫn B.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const D = JSON.parse(readFileSync("public/data/profind.json", "utf8")), C = JSON.parse(readFileSync("data/corrections.json", "utf8"));
const done = new Set(C.merge.flatMap((m) => [m.into, ...m.from])), rej = new Set(existsSync("data/split-rejected.json") ? JSON.parse(readFileSync("data/split-rejected.json", "utf8")).map((p) => [...p].sort().join("|")) : []);
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
const key = (n) => [...norm(n).split(" ").filter(Boolean)].sort().join(" ");
const normT = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const all = new Map(); for (const a of D.authors) { const k = key(a.name); if (k.split(" ").length >= 2) (all.get(k) ?? all.set(k, []).get(k)).push(a); }
const wcache = new Map(), works = (id) => { if (!wcache.has(id)) { let w = []; try { w = JSON.parse(readFileSync(`public/data/works/${id}.json`, "utf8")); } catch { /* không có */ } wcache.set(id, w); } return wcache.get(id); };
const iName = new Map(D.institutions.map((i) => [i.id, i.name]));
const side = (a) => { const w = works(a.id); return { id: a.id, name: a.name, orcid: a.orcid, inst: a.institutions.map((i) => iName.get(i) ?? i).slice(0, 3), works: a.worksCount, cites: a.citations, years: [a.firstYear, a.lastYear], pro: a.pro, top: [...w].sort((x, y) => y.citations - x.citations).slice(0, 3).map((x) => ({ t: String(x.title ?? "").slice(0, 140), y: x.year, d: x.doi })) }; };
const hold = new Set(existsSync("data/split-hold.json") ? JSON.parse(readFileSync("data/split-hold.json", "utf8")).map((h) => [...h.pair].sort().join("|")) : []); // cặp đã xem xét thủ công và giữ ở tầng B
// Độ giống chủ đề giữa công trình của hai hồ sơ: cosine TF-IDF trên từ trong nhan đề (bỏ từ ngắn và từ dừng), cùng với số tạp chí (ISSN) chung.
const STOP = new Set("with from that this have been were their which using study analysis between among based effect effects results case review during under after about within through into than also more most other some such these those both each however while where when what based approach method methods model models novel high low new"
  .split(" ").concat("nghien cuu cua cac mot nhung trong cho voi duoc nguoi tren phan tich danh gia thuc trang giai phap xay dung phat trien nang cao ung dung hieu qua tai viet nam khi sau truoc nam".split(" ")));
const tok = (t) => norm(String(t ?? "")).split(" ").filter((w) => w.length >= 4 && !STOP.has(w));
const profile = (id) => { const w = works(id), tf = new Map(); for (const x of w) for (const t of tok(x.title)) tf.set(t, (tf.get(t) ?? 0) + 1); return { tf, issn: new Set(w.map((x) => x.issn).filter(Boolean)), n: w.length }; };
const pf = new Map(), prof = (id) => (pf.has(id) ? pf.get(id) : pf.set(id, profile(id)).get(id));
let idf = null;
const buildIdf = (ids) => { const df = new Map(); for (const id of ids) for (const t of prof(id).tf.keys()) df.set(t, (df.get(t) ?? 0) + 1); idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + ids.length / n)])); };
const cos = (a, b) => { let dot = 0, na = 0, nb = 0; for (const [t, f] of a) { const w = f * (idf.get(t) ?? 1); na += w * w; const g = b.get(t); if (g) dot += w * g * (idf.get(t) ?? 1); } for (const [t, f] of b) { const w = f * (idf.get(t) ?? 1); nb += w * w; } return na && nb ? dot / Math.sqrt(na * nb) : 0; };
// Phân loại ngành thô theo từ khóa song ngữ (không dấu) để so được hai hồ sơ có nhan đề khác ngôn ngữ.
const FIELDS = { y: "patient clinical disease treatment cancer hospital therapy surgery diagnos virus infect drug medic health cardio diabet benh dieu tri lam sang nguoi benh ung thu thuoc y_hoc suc khoe phau thuat chan doan nhiem sinh phu nu", hoa: "synthesis catalyst nanoparticle polymer extraction compound adsorption spectro oxide electrode crystal alkaloid terpen phenol tong hop xuc tac vat lieu chiet xuat hap phu hop chat dien cuc", tin: "learning neural network algorithm deep detection classification software cloud blockchain internet sensor wireless prediction thuat toan hoc may mang du lieu phan mem nhan dang", ky: "structure concrete energy power solar signal optical laser circuit thermal turbine battery vibration beam soil mechanic ket cau be tong nang luong dien quang nhiet co khi", nong: "soil plant crop rice fish shrimp forest species ecosystem water climate biodiversity fungi bacteria gene genome dat cay lua thuy san rung loai nuoc moi truong khi hau vi sinh", gd: "student teach curriculum education school pedagog university graduate learning outcome giao duc hoc sinh sinh vien giang day dao tao truong chuong trinh giao vien", kt: "economic firm bank financ invest market manag law legal tourism business consumer policy kinh te doanh nghiep ngan hang tai chinh quan ly phap luat du lich chinh sach", toan: "theorem equation algebra differential matrix topolog geometry integral toan phuong trinh dinh ly dai so ma tran" };
const FKEYS = Object.keys(FIELDS), FWORDS = FKEYS.map((k) => FIELDS[k].split(" "));
const fieldVec = (id) => { const v = FKEYS.map(() => 0); for (const x of works(id)) { const t = " " + norm(x.title ?? "") + " "; FWORDS.forEach((ws, i) => { if (ws.some((w) => t.includes(" " + w))) v[i]++; }); } return v; };
const cosv = (a, b) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return na && nb ? d / Math.sqrt(na * nb) : null; };
const out = [];
for (const g of all.values()) { const eligible = g.filter((a) => !a.suspect && !a.demo && !done.has(a.id));
  for (let i = 0; i < eligible.length; i++) for (let j = i + 1; j < eligible.length; j++) {
    const x = eligible[i], y = eligible[j]; if (rej.has([x.id, y.id].sort().join("|"))) continue;
    if (x.orcid && y.orcid && x.orcid !== y.orcid) continue;
    const inst = x.institutions.filter((s) => y.institutions.includes(s)); if (!inst.length) continue;
    const wx = works(x.id), wy = works(y.id), dx = new Set(wx.map((w) => w.doi).filter(Boolean)), tx = new Set(wx.map((w) => normT(w.title)).filter((t) => t.length > 12));
    const sharedDoi = wy.filter((w) => w.doi && dx.has(w.doi)).length, sharedTitle = wy.filter((w) => tx.has(normT(w.title))).length;
    if (sharedDoi || sharedTitle) continue; // có bài chung => hai người khác nhau
    const yx = new Set(wx.map((w) => w.year)), yy = new Set(wy.map((w) => w.year)), small = Math.min(yx.size, yy.size) || 1;
    const overlap = [...yx].filter((v) => yy.has(v)).length / small; // 0 = hoàn toàn bổ sung, 1 = trùng hết
    const sameName = key(x.name) === key(y.name) && norm(x.name) === norm(y.name);
    const exactlyOneOrcid = !!x.orcid !== !!y.orcid;
    const third = g.length > 2;
    const tier = !hold.has([x.id, y.id].sort().join("|")) && !third && sameName && exactlyOneOrcid && overlap <= 0.5 && wx.length >= 2 && wy.length >= 2 && norm(x.name).split(" ").length >= 3 && x.disciplines.some((d) => y.disciplines.includes(d)) ? "A" : "B"; // đủ bằng chứng (≥2 công trình mỗi bên) tên đủ đặc trưng (≥3 từ) và cùng ngành
    out.push({ tier, _x: x, _y: y, inst, a: x.id, b: y.id, name: x.name === y.name ? x.name : `${x.name} / ${y.name}`, groupSize: g.length, overlap: Math.round(overlap * 100) / 100, sameName, exactlyOneOrcid, shared: inst.map((s) => iName.get(s) ?? s), A: side(x), B: side(y) });
  } }
// Điểm nghi trùng 0-100 và nhóm: 4 mức để duyệt theo cụm.
buildIdf([...new Set(out.flatMap((p) => [p.a, p.b]))]);
for (const p of out) {
  const x = p._x, y = p._y, px = prof(p.a), py = prof(p.b), have = px.n > 0 && py.n > 0;
  const topic = have ? cos(px.tf, py.tf) : null, jr = [...px.issn].filter((i) => py.issn.has(i)).length;
  const fs = have ? cosv(fieldVec(p.a), fieldVec(p.b)) : null;
  const sc = (p.sameName ? 20 : 8) + (p.groupSize === 2 ? 12 : p.groupSize === 3 ? 6 : 0) + (p.exactlyOneOrcid ? 12 : !x.orcid && !y.orcid ? 5 : 0) + 8 + (x.disciplines.some((d) => y.disciplines.includes(d)) ? 5 : 0) + Math.round(8 * (1 - p.overlap)) + (topic == null ? 0 : Math.round(10 * Math.min(1, topic / 0.3))) + (fs == null ? 0 : Math.round(22 * fs * fs)) + (jr ? 5 : 0);
  p.field = fs == null ? null : Math.round(fs * 100) / 100;
  p.score = Math.min(100, sc); p.topic = topic == null ? null : Math.round(topic * 100) / 100; p.journals = jr; p.noWorks = !have;
  p.band = p.tier === "A" ? "A" : p.score >= 75 ? "1" : p.score >= 60 ? "2" : p.score >= 45 ? "3" : "4";
  delete p._x; delete p._y; delete p.inst;
}
out.sort((p, q) => p.tier.localeCompare(q.tier) || q.score - p.score || p.groupSize - q.groupSize || p.groupSize - q.groupSize || (q.A.works + q.B.works) - (p.A.works + p.B.works));
writeFileSync("data/split-candidates.json", JSON.stringify(out, null, 1));
writeFileSync("public/data/_split-review.json", JSON.stringify({ built: new Date().toISOString().slice(0, 10), pairs: out.filter((p) => p.tier === "B") }));
console.log(`Tầng A (gộp chắc): ${out.filter((p) => p.tier === "A").length}; tầng B (cần duyệt): ${out.filter((p) => p.tier === "B").length}; theo nhóm:`, JSON.stringify(out.reduce((m, p) => ((m[p.band] = (m[p.band] ?? 0) + 1), m), {})));
