// Chuẩn hóa thứ tự tên hiển thị: tên Việt viết theo kiểu phương Tây ("Nhat Quang Minh Tran") -> thứ tự Việt ("Tran Nhat Quang Minh").
// Chỉ đổi thứ tự các tiếng của tên OpenAlex, giữ nguyên từng tiếng (dấu, hoa/thường); ORCID và quy tắc chỉ là bằng chứng để biết tiếng nào là họ. Hai nguồn bằng chứng:
//  1) ORCID (data/orcid-names.json, từ fetch-orcid-names.mjs): người dùng tự khai họ (family-name) và tên (given-names). Chỉ áp dụng khi tập các tiếng của họ+tên trên ORCID trùng khớp với tập các tiếng của tên OpenAlex (bỏ dấu), họ là họ người Việt, và tên OpenAlex đang để họ ở cuối.
//  2) Không có ORCID: quy tắc bảo thủ: tiếng cuối là họ Việt phổ biến, tiếng đầu không phải họ Việt, mọi tiếng còn lại thuộc vốn tên đệm/tên lấy từ các hồ sơ đã theo thứ tự Việt; riêng các họ dễ trùng tên riêng (Hoang, Vu, Vo, Le, Do, Dang, Ngo...) cần từ 3 tiếng; họ quá dễ nhầm với tên riêng (Ha, Mai, Lam, Dao, Thai, Van...) chỉ được đổi khi có ORCID xác nhận.
// Kết quả: data/name-order.json { "<mã tác giả>": { from, to, by: "orcid"|"quy-tac" } }; build-index.mjs áp dụng (corrections.rename vẫn thắng).
import { readFileSync, writeFileSync, existsSync } from "fs";
const src = process.argv[2] ?? "data/raw-authors.json"; // tên gốc OpenAlex (chưa qua build-index)
const authors = JSON.parse(readFileSync(src, "utf8")).authors;
const orc = existsSync("data/orcid-names.json") ? JSON.parse(readFileSync("data/orcid-names.json", "utf8")) : {};
const fold = (s) => String(s ?? "").toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9. -]/g, "");
const toks = (s) => fold(s).replace(/-/g, " ").split(/\s+/).filter(Boolean);
const FAM = new Set("nguyen tran le pham hoang huynh phan vu vo dang bui do ho ngo duong ly truong dinh doan luong trinh ha cao lam ton ta quach thai dao mai khuat luu phung vuong".split(" ")); // họ người Việt (bằng chứng ORCID)
const SAFE = new Set("nguyen tran pham huynh phan bui doan luong phung".split(" ")); // đủ chắc chắn kể cả khi tên chỉ có 2 tiếng
const AMBIG = new Set("hoang vu vo le do dang ngo duong truong dinh trinh ly ho".split(" ")); // dễ trùng tên riêng: cần từ 3 tiếng
const RULE_FAM = new Set([...SAFE, ...AMBIG]);
const vocab = new Set();
for (const a of authors) { const t = toks(a.name); if (t.length >= 3 && SAFE.has(t[0])) for (const x of t.slice(1)) if (x.length > 2 && !x.includes(".")) vocab.add(x); }
const initialOk = (x) => /^([a-z]\.?)+$/.test(x);
const out = {}, stat = { orcid: 0, rule: 0, skipFamilyFirst: 0, skipNoMatch: 0 };
const same = (a, b) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
for (const a of authors) {
  const name = String(a.name ?? "").trim(), parts = name.split(/\s+/), pt = parts.map(toks), t = pt.flat();
  if (parts.length < 2 || t.length > 6 || pt.some((x) => !x.length)) continue;
  const o = a.orcid ? orc[a.orcid] : null;
  const move = (k) => [...parts.slice(-k), ...parts.slice(0, -k)].join(" ");
  if (o && o.family) {
    const fam = toks(o.family), giv = toks(o.given);
    if (fam.length && FAM.has(fam[0]) && !fam.slice(1).some((x) => FAM.has(x) || x === "van") && same([...fam, ...giv], t)) { // họ ORCID có thêm tiếng họ khác ("Van Nguyen", "Dinh Le"): ORCID khai lẫn họ/đệm, không dùng
      let k = 0; for (let n = 1; n < parts.length; n++) if (pt.slice(-n).flat().join(" ") === fam.join(" ")) { k = n; break; }
      // tên OpenAlex đã bắt đầu bằng họ Việt (vd. "Nguyễn Văn Lợi") thì coi là đã đúng thứ tự, trừ khi họ ORCID chính là tiếng cuối và là họ chắc chắn ("Vu Hoang Nguyen")
      const startsFam = FAM.has(t[0]), lastSafe = SAFE.has(t[t.length - 1]) && k === 1;
      if (k && pt[0].join(" ") !== fam[0] && (!startsFam || lastSafe)) { const to = move(k); if (to !== name) { out[a.id] = { from: name, to, by: "orcid" }; stat.orcid++; } } else stat.skipNoMatch++;
      continue;
    }
  }
  const last = t[t.length - 1], first = t[0];
  if (!RULE_FAM.has(last) || parts.length !== t.length) continue;
  if (FAM.has(first)) { stat.skipFamilyFirst++; continue; }
  if (AMBIG.has(last) && t.length < 3) continue;
  const mid = t.slice(0, -1);
  if (mid.length === 1 && ["thi", "van", "huu", "duc", "ngoc", "minh"].includes(mid[0])) continue; // chỉ còn một tiếng đệm: không đủ để kết luận
  if (mid.some((x) => FAM.has(x) && x !== "thi")) continue; // có tiếng giống họ ở giữa (vd. "Khởi Trần Đăng"): không biết họ là tiếng nào, chỉ ORCID mới xác nhận được
  if (mid.some((x, i) => (x === "thi" || x === "van") && i > 0)) continue; // "Thị"/"Văn" chỉ đứng ngay sau họ; nếu không, thứ tự gốc không như giả định
  if (!mid.every((x) => vocab.has(x))) continue; // tiếng lạ hoặc viết tắt: không kết luận
  const to = move(1); out[a.id] = { from: name, to, by: "quy-tac" }; stat.rule++;
}
writeFileSync("data/name-order.json", JSON.stringify(out, null, 1));
console.log(`Đổi thứ tự ${Object.keys(out).length} tên (ORCID ${stat.orcid}, quy tắc ${stat.rule}); bỏ qua: họ đã ở đầu ${stat.skipFamilyFirst}, ORCID không khớp thứ tự ${stat.skipNoMatch}.`);
