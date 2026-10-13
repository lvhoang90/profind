// Phần thuần của lệnh thêm hồ sơ theo yêu cầu (scripts/add-author.mjs): kiểm tra đầu vào, ghi data/manual-authors.json và data/scholar.json. Tách riêng để có test.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export const ID_RE = /^A\d{6,12}$/, ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, SCHOLAR_RE = /^[\w-]{12}$/;

/** Rút mã Scholar từ đường dẫn hoặc chính mã (tham số user=). Trả null nếu không hợp lệ. */
export const scholarId = (s) => {
  if (!s) return null; const t = String(s).trim();
  const m = t.match(/[?&]user=([\w-]{12})(?:&|$)/); const id = m ? m[1] : t;
  return SCHOLAR_RE.test(id) ? id : null;
};

const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);

/** Thêm tác giả vào manual-authors (idempotent). Trả { added, entry }. */
export function addManual(list, id, unit) {
  if (!ID_RE.test(id)) throw new Error(`Mã OpenAlex không hợp lệ: ${id}`);
  const old = list.find((x) => x.id === id);
  if (old) { if (old.unit !== unit) throw new Error(`${id} đã có trong manual-authors với đơn vị ${old.unit}; muốn đổi đơn vị hãy dùng corrections.setInstitutions`); return { added: false, entry: old }; }
  const entry = { id, unit }; list.push(entry); return { added: true, entry };
}

/** Ghi Scholar (và số trích dẫn tự khai, tùy chọn) cho tác giả. Không ghi đè mã Scholar khác nếu chưa có --force. */
export function setScholar(map, id, scholar, { citations, asOf, by, force } = {}) {
  const cur = map[id];
  if (cur?.id && cur.id !== scholar && !force) throw new Error(`${id} đã có Scholar ${cur.id}; dùng --force để thay`);
  const e = { id: scholar }; if (citations != null) { e.citations = +citations; e.asOf = asOf; } e.by = by;
  map[id] = { ...(cur ?? {}), ...e }; return map[id];
}

export const load = (p, d) => readJson(p, d);
export const save = (p, v, indent) => writeFileSync(p, JSON.stringify(v, null, indent) + "\n");
