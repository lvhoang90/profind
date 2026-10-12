import { useSyncExternalStore } from "react";
import type { Author } from "./types";

// Lựa chọn dùng chung toàn trang: xếp hạng gồm cả hồ sơ liên kết quốc tế (proRankAll) hay chỉ nhóm trong nước (proRank). Mặc định bật.
const KEY = "profind.intlRank", subs = new Set<() => void>();
let on = true;
try { on = localStorage.getItem(KEY) !== "0"; } catch { /* chế độ riêng tư: chỉ áp dụng trong phiên */ }
const sub = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const setIntlRank = (v: boolean) => { on = v; try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* bỏ qua */ } subs.forEach((f) => f()); };
export const useIntlRank = (): [boolean, (v: boolean) => void] => [useSyncExternalStore(sub, () => on, () => true), setIntlRank];
export const rankOf = (a: Pick<Author, "proRank" | "proRankAll">, intl: boolean): number | null => (intl ? a.proRankAll : a.proRank) ?? null;
