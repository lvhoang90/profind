// Phần thuần của import-wos.mjs: đọc CSV danh sách tạp chí Web of Science (Clarivate Master Journal List) và gộp ISSN -> chỉ mục. Tách riêng để có test.
export const INDEXES = ["SCIE", "SSCI", "AHCI", "ESCI"];
const ISSN_RE = /^\d{4}-\d{3}[\dX]$/;

/** Tách CSV có ngoặc kép, dấu phẩy và xuống dòng trong ô. */
export function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false; const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x !== "")) rows.push(row); row = []; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); if (row.some((x) => x !== "")) rows.push(row); }
  return rows;
}

/** Chỉ mục từ tên tệp ("scie.csv", "WoS-ESCI-2026.csv"...). null nếu không nhận ra. */
export const indexOfFile = (name) => INDEXES.find((i) => new RegExp(i, "i").test(name)) ?? null;

/** ISSN và eISSN (nếu hợp lệ) của một dòng; tìm cột theo tiêu đề không phân biệt hoa thường. */
export function issnsOf(header, row) {
  const col = (re) => header.findIndex((h) => re.test(h.trim()));
  const a = col(/^issn$/i), b = col(/^e-?issn$/i);
  return [a, b].filter((i) => i > -1).map((i) => (row[i] ?? "").trim().toUpperCase()).filter((x) => ISSN_RE.test(x));
}

/** Gộp nhiều danh sách: [{ index, text }] -> { issn: ["SCIE","ESCI"] } (giữ thứ tự INDEXES), chỉ ISSN trong tập `keep` nếu có. */
export function mergeLists(lists, keep) {
  const by = new Map();
  for (const { index, text } of lists) {
    const rows = parseCsv(text); if (rows.length < 2) continue; const header = rows[0];
    for (const row of rows.slice(1)) for (const s of issnsOf(header, row)) { if (keep && !keep.has(s)) continue; (by.get(s) ?? by.set(s, new Set()).get(s)).add(index); }
  }
  return Object.fromEntries([...by].map(([k, v]) => [k, INDEXES.filter((i) => v.has(i))]));
}
