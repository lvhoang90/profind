import { useEffect, useState } from "react";

/** public/data/scopus.json (scripts/import-scopus.mjs): ISSN -> "A" (đang lập chỉ mục) | "I" (đã ngừng). Chỉ để hiện nhãn, chưa tính điểm. Thiếu tệp thì bỏ qua. */
export type Scopus = { by: Record<string, "A" | "I"> };
let cache: Promise<Scopus | null> | null = null;
const load = () => (cache ??= fetch("./data/scopus.json").then((r) => (r.ok ? (r.json() as Promise<Scopus>) : null)).catch(() => null));
export function useScopus(): Scopus | null {
  const [d, setD] = useState<Scopus | null>(null);
  useEffect(() => { let live = true; void load().then((x) => { if (live && x) setD(x); }); return () => { live = false; }; }, []);
  return d;
}
/** "A" hoặc "I"; "" nếu ISSN không có trong danh sách. */
export const scopusStatus = (d: Scopus | null, issn: string | undefined | null) => (issn ? d?.by[issn] ?? "" : "");
