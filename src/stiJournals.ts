import { useEffect, useState } from "react";
import { useT } from "./i18n";

/** public/data/sti-journals.json (scripts/build-sti-journals.mjs): ISSN (in hoặc điện tử) -> [số công bố 5 năm, số trích dẫn 5 năm, IF, CiteScore, mã STI]. Chỉ là chỉ số tham khảo, không dùng chấm điểm. */
export type StiJournals = { by: Record<string, [number | null, number | null, number | null, number | null, number]> };
let cache: Promise<StiJournals> | null = null;
const load = () => (cache ??= fetch("./data/sti-journals.json").then((r) => { if (!r.ok) throw new Error("sti"); return r.json() as Promise<StiJournals>; }).catch((e) => { cache = null; throw e; }));
/** Tải một lần khi `on` bật (tệp nhỏ, khoảng 13 KB); lỗi thì bỏ qua vì đây chỉ là phần thêm. */
export function useStiJournals(on = true) {
  const [d, setD] = useState<StiJournals | null>(null);
  useEffect(() => { if (!on || d) return; let live = true; load().then((x) => live && setD(x)).catch(() => { /* bỏ qua */ }); return () => { live = false; }; }, [on, d]);
  return d;
}
/** Dòng "STI: N công bố, M trích dẫn trong nước (5 năm)" nếu ISSN khớp tạp chí STI; "" nếu không. */
export function useStiLine(d: StiJournals | null) {
  const { t, num } = useT();
  return (issn: string | undefined | null) => { const r = issn ? d?.by[issn] : undefined; return r ? t("stiJ", { n: r[0] == null ? "?" : num(r[0]), m: r[1] == null ? "?" : num(r[1]) }) : ""; };
}
