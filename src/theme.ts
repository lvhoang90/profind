export type Theme = "auto" | "light" | "dark";
const KEY = "profind.theme";
export const getTheme = (): Theme => { try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : "auto"; } catch { return "auto"; } };
export function setTheme(t: Theme) {
  try { if (t === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* chế độ riêng tư: chỉ áp dụng cho phiên này */ }
  const r = document.documentElement; if (t === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", t);
}
