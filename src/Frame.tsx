import type { ReactNode } from "react";
import type { Author } from "./types";
import { ProBadge, tierOf } from "./Badge";
import { VerifiedSeal, useVerified } from "./Verified";

// Khung avatar theo nhóm nhà khoa học (từ thấp đến cao):
//   không khung = chưa xác thực · v = đã xác thực · vt = đã xác thực + có tên trong danh sách Top 2% thế giới
//   p (t10…t1000) = thuộc PRO-SCORE1000™: vòng sáng chạy màu huy hiệu hạng, kèm huy hiệu (Top 10 có thêm vương miện).
export function AvatarFrame({ a, children }: { a: Author; children: ReactNode }) {
  const verified = useVerified(a.id) !== null, tier = tierOf(a.proRank);
  const kind = tier ? `p ${tier}` : verified && a.top2 ? "vt" : verified ? "v" : "n";
  return (
    <div className={`avf ${kind}`} data-kind={kind}>
      {tier === "t10" && <svg className="avf-crown" width="34" height="24" viewBox="0 0 34 24" aria-hidden="true"><path d="M3 20L1 6l8 6 8-10 8 10 8-6-2 14z" fill="url(#crg)" stroke="#b45309" strokeWidth="1.2" strokeLinejoin="round" /><defs><linearGradient id="crg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1a8" /><stop offset="1" stopColor="#f5b301" /></linearGradient></defs></svg>}
      {children}
      {verified && <span className="avf-seal"><VerifiedSeal size={28} /></span>}
      {tier && <span className="avf-medal"><ProBadge rank={a.proRank} size={40} /></span>}
    </div>
  );
}
