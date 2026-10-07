import { useT } from "./i18n";

// Huy hiệu PRO-SCORE1000 theo thứ hạng toàn hệ thống; tự cập nhật khi dữ liệu và thứ hạng thay đổi.
export type Tier = "t10" | "t50" | "t100" | "t500" | "t1000";
export const tierOf = (rank: number | null | undefined): Tier | null => rank == null ? null : rank <= 10 ? "t10" : rank <= 50 ? "t50" : rank <= 100 ? "t100" : rank <= 500 ? "t500" : rank <= 1000 ? "t1000" : null;
export const TIERS: Tier[] = ["t10", "t50", "t100", "t500", "t1000"];
const COL: Record<Tier, [string, string, string]> = { t10: ["#fff1a8", "#f5b301", "#b45309"], t50: ["#fde68a", "#f59e0b", "#92400e"], t100: ["#f1f5f9", "#94a3b8", "#475569"], t500: ["#fed7aa", "#d97706", "#7c2d12"], t1000: ["#bae6fd", "#0ea5e9", "#075985"] };
const LAUREL = "M9 38c-5-6-6-14-3-22M12 40C5 34 3 24 7 14M14 41C8 38 5 31 6 25M39 38c5-6 6-14 3-22M36 40c7-6 9-16 5-26M34 41c6-3 9-10 8-16";

export function ProBadge({ rank, size = 40, className = "" }: { rank: number | null | undefined; size?: number; className?: string }) {
  const { t } = useT();
  const tier = tierOf(rank); if (!tier) return null;
  const [a, b, c] = COL[tier], id = `pb-${tier}`, label = t(`tier_${tier}` as "tier_t10");
  return (
    <svg className={`pbadge ${tier} ${className}`} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`${label} · ${t("topN", { n: tier.slice(1) })}`}>
      <title>{`${label} · ${t("topN", { n: tier.slice(1) })}`}</title>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset=".55" stopColor={b} /><stop offset="1" stopColor={c} /></linearGradient></defs>
      {(tier === "t10" || tier === "t50") && <path d={LAUREL} fill="none" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round" opacity=".9" />}
      {tier === "t10" && <path d="M16 8l4 5 4-7 4 7 4-5-2 8H18z" fill={`url(#${id})`} stroke={c} strokeWidth=".8" strokeLinejoin="round" />}
      {tier === "t1000" ? <circle cx="24" cy="26" r="13" fill={`url(#${id})`} stroke={c} strokeWidth="1.4" /> : tier === "t500" ? <path d="M24 12l12 7v14l-12 7-12-7V19z" fill={`url(#${id})`} stroke={c} strokeWidth="1.4" strokeLinejoin="round" /> : tier === "t100" ? <path d="M24 12l11 4v9c0 8-5 12-11 15-6-3-11-7-11-15v-9z" fill={`url(#${id})`} stroke={c} strokeWidth="1.4" strokeLinejoin="round" /> : <circle cx="24" cy="27" r="13.5" fill={`url(#${id})`} stroke={c} strokeWidth="1.6" />}
      <path d="M24 19.5l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5-3.7-3.4 5-.6z" fill="#fff" fillOpacity=".92" />
    </svg>
  );
}

/** Huy hiệu kèm nhãn ngắn (dùng trên trang tác giả). */
export function ProBadgeTag({ rank }: { rank: number | null | undefined }) {
  const { t } = useT(); const tier = tierOf(rank); if (!tier) return null;
  return <span className={`pbtag ${tier}`}><ProBadge rank={rank} size={30} /><span><b>{t(`tier_${tier}` as "tier_t10")}</b><small>{t("topN", { n: tier.slice(1) })}</small></span></span>;
}
