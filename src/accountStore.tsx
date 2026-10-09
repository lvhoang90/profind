// Tài khoản người dùng (đăng ký bằng email + số điện thoại, mã xác thực 6 số), dữ liệu đã lưu và lịch sử xem. Giao tiếp với api/account.js.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { evt } from "./analytics";

export interface User { email: string; name: string; phone: string; job: string; org: string; address: string; createdAt: string; lastSeen: string; isAdmin: boolean; profilePct: number; noMail: boolean; hops: { edufind: number; ami: number; may: number }; counts: { visits: number; days: number; login: number; views: number; searches: number; streak: number; best: number; invited: number; invitedVerified: number; today: boolean }; ref: string }
export interface Fav { k: string; t: string; s?: string; sc?: number; rk?: number; u?: string; at: string }
export interface SavedSearch { k: string; q: string; d: string; ty: string; i: string; sc: "vn" | "all"; label?: string; at: string }
export interface Viewed { k: string; t: string; s?: string; at: number; n: number; u?: string }
type Cfg = { enabled: boolean; pledge?: { vi: string; en: string }; adminConfigured?: boolean; persistent?: boolean };

const LV = "profind.views", MAXV = 60;
const readViews = (): Viewed[] => { try { const a = JSON.parse(localStorage.getItem(LV) || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
const writeViews = (v: Viewed[]) => { try { localStorage.setItem(LV, JSON.stringify(v.slice(0, MAXV))); } catch { /* bỏ qua */ } };

export async function api<T = any>(op: string, body?: unknown, qs = ""): Promise<T> {
  const r = await fetch(`/api/account?op=${op}${qs}`, body === undefined ? { credentials: "same-origin" } : { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j.error || `HTTP ${r.status}`) + (j.detail ? ` [${j.detail}]` : "")), { status: r.status, retry: j.retry as number | undefined });
  return j as T;
}

interface Ctx {
  cfg: Cfg | null; user: User | null | undefined; favs: Map<string, Fav>; searches: SavedSearch[]; views: Viewed[];
  refresh: () => Promise<void>; setUser: (u: User | null) => void;
  toggleFav: (k: string, meta: { t: string; s?: string; sc?: number; rk?: number; u?: string }) => Promise<boolean>;
  saveSearch: (f: Omit<SavedSearch, "k" | "at">) => Promise<void>; removeSearch: (k: string) => Promise<void>;
  recordView: (v: { k: string; t: string; s?: string; u?: string }) => void; clearViews: (k?: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AccCtx = createContext<Ctx | null>(null);
export const useAccount = () => { const c = useContext(AccCtx); if (!c) throw new Error("AccountProvider thiếu"); return c; };

export function AccountProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<Cfg | null>(null), [user, setUser] = useState<User | null | undefined>(undefined);
  const [favs, setFavs] = useState<Map<string, Fav>>(new Map()), [searches, setSearches] = useState<SavedSearch[]>([]), [views, setViews] = useState<Viewed[]>(readViews);
  const pending = useRef<Viewed[]>([]), timer = useRef<number>(0);
  const load = useCallback(async () => {
    try {
      const [f, s, v] = await Promise.all([api<{ items: Fav[] }>("favs"), api<{ items: SavedSearch[] }>("ss"), api<{ items: any[] }>("rv")]);
      setFavs(new Map(f.items.map((x) => [x.k, x]))); setSearches(s.items);
      const merged = new Map<string, Viewed>(); for (const x of [...readViews(), ...v.items.map((i: any) => ({ k: i.k, t: i.t, s: i.s, at: Number(i.at), n: i.n || 1, u: i.u }))]) { const o = merged.get(x.k); if (!o || x.at > o.at) merged.set(x.k, { ...x, n: Math.max(x.n, o?.n || 0) }); }
      const all = [...merged.values()].sort((a, b) => b.at - a.at); setViews(all.slice(0, MAXV)); writeViews(all);
    } catch { /* bỏ qua */ }
  }, []);
  const refresh = useCallback(async () => {
    try { // cấu hình và thông tin người dùng gọi song song (trước đây nối tiếp: thêm một vòng chờ mạng)
      const [c, me] = await Promise.all([api<Cfg>("config"), api<{ user: User | null }>("me").catch(() => ({ user: null }))]); setCfg(c); if (!c.enabled) { setUser(null); return; } const u = me.user; setUser(u); if (u) { await load(); if (!sessionStorage.getItem("profind.tracked")) { sessionStorage.setItem("profind.tracked", "1"); api("track", {}).catch(() => {}); } } else { setFavs(new Map()); setSearches([]); } }
    catch { setCfg({ enabled: false }); setUser(null); }
  }, [load]);
  useEffect(() => { void refresh(); }, [refresh]);

  const flush = useCallback(() => { const items = pending.current.splice(0); if (items.length) api("rvput", { items: items.map((x) => ({ ...x, n: x.n })) }).catch(() => {}); }, []);
  const recordView = useCallback((v: { k: string; t: string; s?: string; u?: string }) => {
    setViews((cur) => { const o = cur.find((x) => x.k === v.k), item: Viewed = { ...v, at: Date.now(), n: (o?.n || 0) + 1 }; const next = [item, ...cur.filter((x) => x.k !== v.k)].slice(0, MAXV); writeViews(next); if (user) { pending.current.push(item); window.clearTimeout(timer.current); timer.current = window.setTimeout(flush, 1500); } return next; });
  }, [user, flush]);
  const clearViews = useCallback(async (k?: string) => { setViews((cur) => { const next = k ? cur.filter((x) => x.k !== k) : []; writeViews(next); return next; }); if (user) await api("rvdel", k ? { k } : { all: true }).catch(() => {}); }, [user]);

  const toggleFav = useCallback(async (k: string, meta: { t: string; s?: string; sc?: number; rk?: number; u?: string }) => {
    const on = !favs.has(k);
    setFavs((m) => { const n = new Map(m); if (on) n.set(k, { k, ...meta, at: new Date().toISOString() }); else n.delete(k); return n; });
    try { await api("fav", { k, on, ...meta }); if (on) evt(k.startsWith("w|") ? "save_work" : "save_author"); return on; } catch (e) { setFavs((m) => { const n = new Map(m); if (on) n.delete(k); else n.set(k, { k, ...meta, at: new Date().toISOString() }); return n; }); throw e; }
  }, [favs]);
  const saveSearch = useCallback(async (f: Omit<SavedSearch, "k" | "at">) => { await api("ssave", f); evt("save_search"); setSearches((await api<{ items: SavedSearch[] }>("ss")).items); }, []);
  const removeSearch = useCallback(async (k: string) => { const s = searches.find((x) => x.k === k); setSearches((c) => c.filter((x) => x.k !== k)); if (s) await api("ssave", { ...s, on: false }).catch(() => {}); }, [searches]);
  const logout = useCallback(async () => { await api("logout", {}).catch(() => {}); setUser(null); setFavs(new Map()); setSearches([]); sessionStorage.removeItem("profind.tracked"); }, []);
  const value = useMemo(() => ({ cfg, user, favs, searches, views, refresh, setUser, toggleFav, saveSearch, removeSearch, recordView, clearViews, logout }), [cfg, user, favs, searches, views, refresh, toggleFav, saveSearch, removeSearch, recordView, clearViews, logout]);
  return <AccCtx.Provider value={value}>{children}</AccCtx.Provider>;
}
