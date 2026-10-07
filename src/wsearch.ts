import { useEffect, useRef, useState } from "react";

// Tìm theo tên công trình: chỉ mục ngược chia mảnh theo băm từ (public/data/wsearch/p*.json) + bản ghi chia khối theo trích dẫn giảm dần (r*.json).
// Mỗi lượt tìm chỉ tải vài mảnh nhỏ; mã công trình càng nhỏ thì trích dẫn càng cao nên giao các danh sách đã sắp sẵn theo mức nổi bật.
export type WorkHit = { title: string; year: number; journal: string; cit: number; doi: string; authorId: string; author: string; id: string };
const norm = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[‐-―−_.,;:()/\\-]+/g, " ").replace(/[  -​  　]/g, " ").replace(/\s+/g, " ").trim();
const shardOf = (t: string, n: number) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0; return h % n; };
const cache = new Map<string, Promise<any>>();
const get = (u: string) => { let p = cache.get(u); if (!p) { p = fetch(u).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }); p.catch(() => cache.delete(u)); cache.set(u, p); } return p; };
const B = "./data/wsearch/";

async function findIds(q: string): Promise<number[]> {
  const toks = [...new Set(norm(q).split(" ").filter((w) => w.length > 1))].slice(0, 6);
  if (!toks.length) return [];
  const meta = await get(`${B}meta.json`);
  const lists = await Promise.all(toks.map(async (w) => {
    const sh = await get(`${B}p${shardOf(w, meta.ns)}.json`); const d: number[] | undefined = sh[w]; if (!d) return [] as number[];
    let p = 0; return d.map((v) => (p += v));
  }));
  lists.sort((a, b) => a.length - b.length);
  let cur = lists[0];
  for (let i = 1; i < lists.length && cur.length; i++) { const s = new Set(lists[i]); cur = cur.filter((x) => s.has(x)); }
  return cur;
}
async function records(ids: number[]): Promise<WorkHit[]> {
  const meta = await get(`${B}meta.json`);
  return Promise.all(ids.map(async (id) => {
    const ch: any[][] = await get(`${B}r${Math.floor(id / meta.ch)}.json`); const r = ch[id % meta.ch];
    return { title: r[0], year: r[1], journal: r[2], cit: r[3], doi: r[4], authorId: r[5], author: r[6], id: r[7] ?? "" };
  }));
}

/** Tìm công trình theo tên (từ nguyên vẹn, không phân biệt dấu/hoa thường). Kết quả theo trích dẫn giảm dần. */
export function useWorks(query: string, page = 20) {
  const [st, setSt] = useState<{ q: string; ids: number[]; items: WorkHit[]; busy: boolean; err: boolean }>({ q: "", ids: [], items: [], busy: false, err: false });
  const tok = useRef(0);
  useEffect(() => {
    const q = query.trim(); const my = ++tok.current;
    if (norm(q).replace(/\s/g, "").length < 3) { setSt({ q, ids: [], items: [], busy: false, err: false }); return; }
    setSt((s) => ({ ...s, q, busy: true, err: false }));
    const h = setTimeout(() => { findIds(q).then(async (ids) => { const items = await records(ids.slice(0, page)); if (my === tok.current) setSt({ q, ids, items, busy: false, err: false }); }).catch(() => { if (my === tok.current) setSt({ q, ids: [], items: [], busy: false, err: true }); }); }, 250);
    return () => clearTimeout(h);
  }, [query, page]);
  const more = async () => { const my = tok.current, n = st.items.length; const add = await records(st.ids.slice(n, n + page)); if (my === tok.current) setSt((s) => ({ ...s, items: [...s.items, ...add] })); };
  return { total: st.ids.length, items: st.items, busy: st.busy, err: st.err, more, forQ: st.busy ? "" : st.q };
}
