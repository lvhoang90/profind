// So khớp tên tác giả của hồ sơ với chữ ký trên công trình, chịu được cách viết khác của tên Việt:
// "Nguyen Van Dung" ~ "Dung Van Nguyen" ~ "N.V. Dung" ~ "Dung van" ~ "Nguyễn Văn Dũng" (đảo thứ tự, viết tắt chữ lót/họ, bỏ bớt từ).
const fold = (x) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const COMMON = new Set("nguyen tran le pham hoang huynh phan vu vo dang bui do ho ngo duong ly van thi huu duc minh quoc thanh ngoc xuan anh hong kim thu".split(" "));
export const nameKey = (x) => fold(x).split(" ").sort().join(" ");
/** Trả về mức khớp: "exact" (cùng bộ từ), "variant" (viết tắt/bớt từ/đảo thứ tự mà vẫn có từ tên riêng khớp đầy đủ), hoặc null. */
/** Tách chữ ký thành các từ; cụm chữ HOA 2-3 ký tự ("PC", "NT") là viết tắt liền nhau -> tách thành từng chữ cái. */
const parts = (raw, split = true) => String(raw ?? "").normalize("NFC").split(/[\s.,-]+/).filter(Boolean).flatMap((w) => (split && /^[A-ZĐ]{2,3}$/.test(w) ? w.toLowerCase().split("") : [fold(w)])).filter(Boolean);
/** Trả về mức khớp: "exact" (cùng bộ từ), "variant" (viết tắt/bớt từ/đảo thứ tự, viết tắt ở cả hai phía) hoặc null; luôn cần một từ tên riêng khớp đầy đủ. */
export function nameMatch(authorName, sig) {
  // "TO" có thể là họ viết hoa hoặc hai chữ cái viết tắt: thử cả hai cách tách
  const r1 = match(parts(authorName), parts(sig)); if (r1 === "exact") return r1;
  const r2 = match(parts(authorName, false), parts(sig, false)); return r2 === "exact" || (r2 && !r1) ? r2 : r1;
}
function match(A, S) {
  if (!A.length || !S.length) return null;
  if (A.length === S.length && [...A].sort().join(" ") === [...S].sort().join(" ")) return "exact";
  // tên hồ sơ ngắn hơn chữ ký: "Cuong Nguyen" ~ "Huu Cuong Nguyen"
  if (A.length >= 2 && A.every((t) => S.includes(t)) && A.some((t) => t.length > 1 && !COMMON.has(t))) return "variant";
  if (S.length < 2) return null;
  const used = new Set(); let distinctive = false;
  for (const t of S) {
    const full = A.findIndex((a, i) => !used.has(i) && a === t);
    if (full >= 0) { used.add(full); if (t.length > 1 && !COMMON.has(t)) distinctive = true; continue; }
    // viết tắt ở chữ ký ("N", "V") hoặc ở tên hồ sơ ("Toan T. Nguyen" ~ "Nguyen The Toan")
    const ini = A.findIndex((a, i) => !used.has(i) && ((t.length === 1 && a[0] === t) || (a.length === 1 && t[0] === a)));
    if (ini >= 0) { used.add(ini); continue; }
    return null;
  }
  return distinctive ? "variant" : null;
}
