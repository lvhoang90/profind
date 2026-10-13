import { useT } from "./i18n";

/** Quy tắc toàn trang: mỗi trang kết quả tối đa 25 mục; muốn xem tiếp thì chuyển trang. */
export const PAGE = 25;

/** Chuyển trang: Trước, các số trang (gọn bằng dấu …), Sau. Không hiện khi chỉ có một trang. */
export function Pager({ page, total, set, top = false }: { page: number; total: number; set: (p: number) => void; top?: boolean }) {
  const { t, num } = useT();
  const pages = Math.ceil(total / PAGE); if (pages <= 1) return null;
  const nums = [...new Set([0, 1, page - 1, page, page + 1, pages - 2, pages - 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b);
  const go = (p: number) => { set(p); if (top) window.scrollTo({ top: 0 }); };
  return (
    <nav className="pager" aria-label={t("pages")}>
      <button className="ghost" disabled={page === 0} onClick={() => go(page - 1)}>‹ {t("prev")}</button>
      {nums.map((p, i) => <span key={p}>{i > 0 && p - nums[i - 1] > 1 && <span className="gap" aria-hidden="true">…</span>}<button className={p === page ? "ghost cur" : "ghost"} aria-current={p === page ? "page" : undefined} aria-label={`${t("page")} ${p + 1}`} onClick={() => go(p)}>{num(p + 1)}</button></span>)}
      <button className="ghost" disabled={page >= pages - 1} onClick={() => go(page + 1)}>{t("next")} ›</button>
    </nav>
  );
}
