import { useEffect, useState } from "react";

/** public/data/wos.json (scripts/import-wos.mjs): ISSN -> chỉ mục Web of Science ["SCIE","SSCI","AHCI","ESCI"]. Chỉ để hiện nhãn, chưa tính điểm. Thiếu tệp thì bỏ qua. */
export type Wos = { by: Record<string, string[]> };
let cache: Promise<Wos | null> | null = null;
const load = () => (cache ??= fetch("./data/wos.json").then((r) => (r.ok ? (r.json() as Promise<Wos>) : null)).catch(() => null));
export function useWos(): Wos | null {
  const [d, setD] = useState<Wos | null>(null);
  useEffect(() => { let live = true; void load().then((x) => { if (live && x) setD(x); }); return () => { live = false; }; }, []);
  return d;
}
/** Nhãn chỉ mục của một ISSN, ví dụ "ESCI" hoặc "SSCI"; "" nếu không có. Lấy chỉ mục cao nhất (SCIE > SSCI > AHCI > ESCI). */
export const wosLabel = (d: Wos | null, issn: string | undefined | null) => (issn ? d?.by[issn]?.[0] ?? "" : "");
