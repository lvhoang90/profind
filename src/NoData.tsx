// Đơn vị chưa có dữ liệu mở: hiển thị trung thực thay vì để trống (xem scripts/build-nodata.mjs).
import { useEffect, useMemo, useState } from "react";
import { useT } from "./i18n";

export interface NDRow { id: string; name: string; en: string | null; type: string; city: string | null; why: "no-record" | "empty" | "pending" | "candidate" }
export interface ND { built: string; total: number; withData: number; rows: NDRow[] }
let cache: ND | null = null, pending: Promise<void> | null = null;
const subs = new Set<() => void>();
const fold = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function useNoData(enabled = true): ND | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!enabled) return; const f = () => tick((n) => n + 1); subs.add(f);
    if (!cache && !pending) pending = fetch("./data/no-data.json").then((r) => r.json()).then((j: ND) => { cache = j; }).catch(() => {}).finally(() => { pending = null; subs.forEach((g) => g()); });
    return () => { subs.delete(f); };
  }, [enabled]);
  return cache;
}
const WHY: Record<string, [string, string]> = {
  "no-record": ["OpenAlex chưa có bản ghi cho đơn vị này", "OpenAlex has no record for this unit"],
  empty: ["Có bản ghi nhưng chưa có nhà nghiên cứu gắn với đơn vị", "A record exists but no researcher is linked to the unit"],
  pending: ["Đang chờ nạp dữ liệu", "Waiting to be loaded"],
  candidate: ["Có bài báo ghi tên đơn vị, đang chờ duyệt để nạp", "Papers mention this unit; awaiting review before loading"],
};
/** Ghi chú khi tìm kiếm không ra kết quả và từ khóa khớp tên một đơn vị chưa có dữ liệu mở. */
export function NoDataHint({ q }: { q: string }) {
  const { lang } = useT(); const vi = lang === "vi"; const nd = useNoData(!!q.trim());
  const hits = useMemo(() => { const n = fold(q); if (!nd || n.length < 3) return []; return nd.rows.filter((r) => fold(r.name).includes(n) || fold(r.en ?? "").includes(n)).slice(0, 3); }, [nd, q]);
  if (!hits.length) return null;
  return (
    <div className="banner" role="note">
      <div>{hits.map((h) => <p key={h.id}><b>{h.name}</b>: {vi ? "chưa có dữ liệu mở" : "no open data yet"}. <span className="meta">{WHY[h.why][vi ? 0 : 1]}.</span></p>)}
        <p className="meta">{vi ? "Nhà khoa học của đơn vị này có thể " : "Researchers at this unit can "}<a href="#/dinh-chinh">{vi ? "đề nghị bổ sung hồ sơ" : "ask to be added"}</a>{vi ? ", rồi xác thực bằng email tổ chức để thêm công trình theo DOI." : ", then verify with an organisational email to add works by DOI."} <a href="#/gioi-thieu?m=chua-du-lieu">{vi ? "Vì sao?" : "Why?"}</a></p></div>
    </div>
  );
}
