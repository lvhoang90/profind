// Danh sách hồ sơ đã ẩn điểm/xếp hạng hoặc ẩn toàn bộ theo yêu cầu của chủ thể dữ liệu (Luật BVDLCN 91/2025/QH15, Điều 4, 10, 14).
// Áp dụng ngay khi chạy, không cần dựng lại dữ liệu tĩnh. Lỗi mạng thì coi như không có hồ sơ nào bị ẩn.
import { useEffect, useState } from "react";
import { api } from "./accountStore";

export interface Hidden { score: Set<string>; profile: Set<string> }
const EMPTY: Hidden = { score: new Set(), profile: new Set() };
let cache: Hidden | null = null, pending: Promise<void> | null = null;
const subs = new Set<() => void>();
function load() {
  if (cache || pending) return;
  pending = api<{ score: string[]; profile: string[] }>("hidden").then((j) => { cache = { score: new Set(j.score), profile: new Set(j.profile) }; }).catch(() => { cache = EMPTY; }).finally(() => { pending = null; subs.forEach((f) => f()); });
}
export function useHidden(): Hidden {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); load(); return () => { subs.delete(f); }; }, []);
  return cache ?? EMPTY;
}
