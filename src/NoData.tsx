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
export function NoDataList() {
  const { lang } = useT(); const vi = lang === "vi"; const nd = useNoData(); const [f, setF] = useState("");
  const rows = useMemo(() => (nd?.rows ?? []).filter((r) => !f.trim() || fold(r.name).includes(fold(f)) || fold(r.en ?? "").includes(fold(f))), [nd, f]);
  if (!nd) return <p className="meta">{vi ? "Đang tải…" : "Loading…"}</p>;
  const by: Record<string, number> = {}; for (const r of nd.rows) by[r.why] = (by[r.why] ?? 0) + 1;
  return (
    <>
      <p>{vi ? <>ProFind™ có <b>{nd.withData}</b> trên {nd.total} đơn vị trong danh sách đã có nhà nghiên cứu. <b>{nd.rows.length}</b> đơn vị còn lại <b>chưa có dữ liệu mở</b>: {by["no-record"] ?? 0} đơn vị OpenAlex chưa có bản ghi, {by.empty ?? 0} có bản ghi nhưng chưa có nhà nghiên cứu gắn, {by.candidate ?? 0} đang chờ duyệt, {by.pending ?? 0} chờ nạp.</> : <>ProFind™ has researchers for <b>{nd.withData}</b> of {nd.total} listed units. The other <b>{nd.rows.length}</b> have <b>no open data yet</b>: {by["no-record"] ?? 0} not recorded in OpenAlex, {by.empty ?? 0} recorded but without linked researchers, {by.candidate ?? 0} awaiting review, {by.pending ?? 0} waiting to load.</>}</p>
      <p>{vi ? "Đây không có nghĩa là đơn vị không có nghiên cứu, chỉ là dữ liệu mở (OpenAlex, ORCID, Crossref) chưa ghi nhận. Nhà khoa học ở các đơn vị này có thể xác thực bằng email tổ chức và thêm công trình theo DOI (chưa tính vào PRO-SCORE cho tới khi OpenAlex ghi nhận). ProFind™ kiểm tra lại định kỳ khi OpenAlex cập nhật." : "This does not mean the unit has no research, only that open sources (OpenAlex, ORCID, Crossref) have not recorded it yet. Researchers at these units can verify with an organisational email and add works by DOI (not counted in PRO-SCORE until OpenAlex records them). ProFind™ re-checks periodically as OpenAlex updates."}</p>
      <label className="sel"><span>{vi ? "Lọc theo tên đơn vị" : "Filter by unit name"}</span><input value={f} onChange={(e) => setF(e.target.value)} maxLength={80} /></label>
      <ul className="nodata">{rows.slice(0, 300).map((r) => <li key={r.id}><b>{r.name}</b>{r.city ? <span className="meta"> · {r.city}</span> : null} <span className="meta">· {WHY[r.why][vi ? 0 : 1]}</span></li>)}</ul>
      {rows.length > 300 && <p className="meta">{vi ? `Còn ${rows.length - 300} đơn vị, hãy lọc theo tên.` : `${rows.length - 300} more, filter by name.`}</p>}
    </>
  );
}
