// Trang riêng về PRO-SCORE1000: phương pháp, công thức, huy hiệu, giới hạn, trích dẫn. Nằm trong web, không dẫn ra ngoài.
import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { Icon, type IconName } from "./icons";
import { ProBadge, TIERS, type Tier } from "./Badge";
import { AbroadRule } from "./AbroadRule";

const CONTACT = "vienisavietnam@gmail.com";
const PILLARS: { k: string; w: number; icon: IconName; color: string }[] = [
  { k: "impact", w: 42, icon: "chart", color: "#0ea5e9" }, { k: "output", w: 10, icon: "scroll", color: "#6366f1" }, { k: "lead", w: 10, icon: "scholar", color: "#8b5cf6" },
  { k: "quality", w: 10, icon: "book", color: "#d946ef" }, { k: "momentum", w: 17, icon: "spark", color: "#f59e0b" }, { k: "steady", w: 8, icon: "clock", color: "#10b981" }, { k: "recog", w: 3, icon: "star", color: "#ef4444" },
];
const RANKS: Record<Tier, number> = { t10: 10, t50: 50, t100: 100, t500: 500, t1000: 1000 };

type Panel = { n: number; seed: number; mean: number[]; sd: number[]; by: Record<string, Record<string, { n: number; label: string; w: number[] }>> };
const DIM_LABEL: Record<string, [string, string]> = { field: ["Lĩnh vực", "Field"], stage: ["Giai đoạn sự nghiệp", "Career stage"], region: ["Khu vực", "Region"], stance: ["Lập trường đánh giá", "Evaluation stance"] };
const COLS = ["impact", "output", "lead", "quality", "momentum", "steady", "recog"] as const;

export function ProScorePage() {
  const { lang, t, num } = useT();
  const vi = lang === "vi";
  const [panel, setPanel] = useState<Panel | null>(null);
  useEffect(() => { fetch("./data/pro-panel.json").then((r) => r.json()).then(setPanel).catch(() => {}); }, []);
  const [copied, setCopied] = useState(false);
  const cite = vi
    ? "Lương Việt Hoàng và Viện Khoa học Giáo dục và Kinh tế Đông Nam Á (ISA Việt Nam) (2026). PRO-SCORE1000 phiên bản 2.0 (mô phỏng 1000 cấu hình trọng số): chỉ số tham khảo đa chiều về tác động và đóng góp của nhà khoa học. ProFind, profind.isavn.edu.vn."
    : "Luong Viet Hoang and Institute of Education Sciences and Economics of Southeast Asia (ISA Vietnam) (2026). PRO-SCORE1000 version 2.0 (simulation of 1000 weighting configurations): a multi-dimensional reference index of scientists’ impact and contribution. ProFind, profind.isavn.edu.vn.";
  const copy = () => { try { void navigator.clipboard.writeText(cite); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* bỏ qua */ } };
  const P: Record<string, [string, string, string]> = vi ? {
    impact: ["Tác động", "Công trình của bạn được giới khoa học dùng đến mức nào.", "40% tổng trích dẫn (mỗi công trình bị cắt trần ở P99 của ngành để một bài nhóm lớn không kéo cả hồ sơ) + 30% chỉ số h + 30% tỉ lệ công trình có từ 10 trích dẫn trở lên (làm trơn về trung bình ngành)."],
    output: ["Sản lượng", "Khối lượng công bố bền bỉ, không thưởng việc chia nhỏ bài.", "Số công trình theo thang log, có trần ở bách phân vị 95."],
    lead: ["Chủ đạo", "Vai trò dẫn dắt: tác giả đứng đầu hoặc liên hệ.", "Tỉ lệ công trình chủ đạo trên các công trình xác định được vai trò; làm trơn Bayes (k = 8) về trung bình ngành, tối đa 0,85. Vai trò chưa rõ không bị tính là kém."],
    quality: ["Chất lượng", "Nơi công bố, nhìn qua hạng tạp chí Scopus (Q1 đến Q4).", "Trung bình hạng Q (Q1 = 1; Q2 = 0,75; Q3 = 0,5; Q4 = 0,25) trên công trình có hạng, làm trơn (k = 5) về trung bình ngành. Chỉ chiếm 10% nên không biến hệ số tạp chí thành thước đo chính (theo DORA)."],
    momentum: ["Đà phát triển", "Đang đóng góp đến đâu trong 5 năm gần nhất.", "50% bách phân vị trích dẫn và 50% bách phân vị số công trình của các công trình 5 năm gần nhất. Giúp nhà khoa học trẻ không bị thâm niên lấn át."],
    steady: ["Đều đặn", "Công bố liên tục chứ không chỉ một vài năm.", "(Số năm có công bố + 1,2) ÷ (số năm hoạt động + 2)."],
    recog: ["Ghi nhận", "Được cộng đồng quốc tế vinh danh.", "Thuộc danh sách Top 2% nhà khoa học thế giới của Elsevier (Ioannidis và cộng sự). Chỉ 3% để không trùng đếm với tác động."],
  } : {
    impact: ["Impact", "How far the scientific community uses your work.", "40% total citations (each work capped at the field’s P99 so a large-consortium paper cannot carry a profile) + 30% h-index + 30% share of works with 10+ citations (shrunk toward the field mean)."],
    output: ["Output", "Sustained volume, without rewarding splitting papers.", "Number of works on a log scale, capped at the 95th percentile."],
    lead: ["Leadership", "Leading role: first or corresponding author.", "Share of lead works among works with a known role; Bayesian-smoothed (k = 8) toward the field mean, at most 0.85. Unknown roles are not treated as poor."],
    quality: ["Quality", "Where the work appears, via Scopus journal quartile (Q1 to Q4).", "Mean quartile score (Q1 = 1; Q2 = 0.75; Q3 = 0.5; Q4 = 0.25) over works with a quartile, shrunk (k = 5) toward the field mean. Only 10%, so a journal-level metric never becomes the main yardstick (per DORA)."],
    momentum: ["Momentum", "How much you contribute in the last 5 years.", "50% percentile of citations and 50% percentile of work count over works from the last 5 years. Early-career researchers are not overshadowed by seniority."],
    steady: ["Consistency", "Publishing continuously, not in a few years only.", "(Active years with output + 1.2) ÷ (career span in years + 2)."],
    recog: ["Recognition", "Honoured by the international community.", "Listed in Elsevier’s world Top 2% scientists (Ioannidis et al.). Only 3% to avoid double counting with impact."],
  };
  const principles: [IconName, string, string][] = vi ? [
    ["chart", "Nhiều chỉ báo, không một con số duy nhất", "Bảy chỉ báo bổ sung nhau, theo tinh thần DORA và Leiden Manifesto."],
    ["discipline", "So cùng ngành", "Mỗi chỉ báo là bách phân vị trong ngành chính, vì mỗi ngành có văn hóa trích dẫn khác nhau."],
    ["shield", "Không phạt khi thiếu dữ liệu", "Dữ liệu ít thì điểm co về trung bình ngành, không rơi xuống đáy."],
    ["check", "Chống thổi phồng", "Cắt trần trích dẫn mỗi công trình, trần sản lượng, loại hồ sơ nghi gộp nhầm khỏi xếp hạng."],
  ] : [
    ["chart", "Several indicators, not one number", "Seven complementary indicators, in the spirit of DORA and the Leiden Manifesto."],
    ["discipline", "Compared within the field", "Each indicator is a percentile within the primary field, since citation cultures differ."],
    ["shield", "No penalty for missing data", "Sparse data shrinks toward the field average instead of falling to the bottom."],
    ["check", "Anti-inflation", "Per-work citation cap, output cap, and profiles suspected of merging are excluded from ranking."],
  ];
  const names: Record<Tier, string> = { t10: t("tier_t10"), t50: t("tier_t50"), t100: t("tier_t100"), t500: t("tier_t500"), t1000: t("tier_t1000") };
  const ex = { impact: 90, output: 80, lead: 70, quality: 60, momentum: 85, steady: 90, recog: 0 };
  const pl = PILLARS.map((q, i) => ({ ...q, w: panel ? panel.mean[i] : q.w }));
  const exScore = Math.round(pl.reduce((s, p) => s + p.w * (ex[p.k as keyof typeof ex] ?? 0), 0)) / 100;
  const roadmap = vi
    ? ["Chia trích dẫn theo số tác giả mỗi công trình (khi có dữ liệu).", "Chuẩn hóa theo thế hệ (năm bắt đầu sự nghiệp) để so công bằng giữa người trẻ và người lâu năm.", "Tính sách, chương sách, kỷ yếu hội nghị hạng cao và bằng sáng chế.", "Khoảng tin cậy cho điểm và hạng; huy hiệu theo ngành và theo thế hệ.", "Thay dần cấu hình mô phỏng bằng ý kiến thật của chuyên gia (khảo sát kiểu Delphi, ẩn danh, có mã thành viên) và công bố tỉ lệ ý kiến thật trong hội đồng.", "Công bố bộ dữ liệu và mã tính điểm để cộng đồng kiểm chứng."]
    : ["Split citations by the number of authors per work (once data is available).", "Cohort normalisation (career-start year) for fair comparison between early-career and senior researchers.", "Count books, chapters, high-ranked proceedings and patents.", "Confidence intervals for scores and ranks; badges by field and by cohort.", "Gradually replace simulated configurations with real expert input (anonymous Delphi-style survey) and publish the share of real opinions on the panel.", "Publish the dataset and scoring code for community verification."];
  return (
    <article className="psp">
      <p><a className="backl" href="#/">{t("back")}</a></p>
      <header className="psp-hero">
        <p className="psp-kick"><Icon n="spark" size={16} />{vi ? "Chỉ số khoa học của ProFind" : "ProFind’s scientific index"}</p>
        <h1>PRO<span>-</span>SCORE<em className="k1000">1000</em><sup className="tm">™</sup></h1>
        <p className="psp-lead">{vi ? "Thước đo tham khảo, minh bạch và đa chiều về tác động và đóng góp của nhà khoa học gắn với các trường, viện Việt Nam, tính tự động từ dữ liệu công khai." : "A transparent, multi-dimensional reference measure of the impact and contribution of scientists affiliated with Vietnamese institutions, computed automatically from open data."}</p>
        <div className="psp-credit">
          <img src="./logo-disc.svg" alt="" width="44" height="44" />
          <p><b>{vi ? "Ý tưởng do Viện ISA và tác giả Lương Việt Hoàng đề xuất" : "Idea proposed by ISA Institute and author Luong Viet Hoang"}</b><span>{vi ? "Viện Khoa học Giáo dục và Kinh tế Đông Nam Á (ISA Việt Nam) · Phiên bản 2.0 · 10/2026" : "Institute of Education Sciences and Economics of Southeast Asia (ISA Vietnam) · Version 2.0 · 10/2026"}</span></p>
        </div>
        <p className="psp-note">{vi ? "PRO-SCORE1000 là chỉ số tham khảo của ProFind, không phải xếp hạng chính thức, không thay thế đánh giá của bất kỳ hội đồng nào và không nên là tiêu chí duy nhất trong tuyển dụng, xét duyệt, bổ nhiệm hay phân bổ nguồn lực. Nhà khoa học có thể yêu cầu ẩn điểm và huy hiệu." : "PRO-SCORE1000 is ProFind’s reference index; it is not an official ranking, does not replace any committee’s evaluation and should not be the sole criterion in hiring, review, appointment or resource allocation. Researchers may ask to hide their score and badge."}</p>
      </header>

      <aside className="psp-disc" role="note"><Icon n="info" size={22} /><div>
        <b>{vi ? "1000 cấu hình trọng số này là MÔ PHỎNG" : "These 1000 weighting configurations are a SIMULATION"}</b>
        <p>{vi ? "PRO-SCORE1000 do một mô phỏng gồm 1000 cấu hình trọng số tạo ra bằng mô hình tính toán, mỗi cấu hình có đặc điểm riêng (lĩnh vực, giai đoạn sự nghiệp, khu vực, lập trường đánh giá) và bộ trọng số riêng. Đây không phải kết quả khảo sát 1000 nhà nghiên cứu thật, và các cấu hình mô phỏng không phải là người có thật. Các giả định của mô hình được công khai bên dưới để cộng đồng kiểm chứng và phản biện." : "PRO-SCORE1000 is produced by a simulated panel of 1000 simulated configurations generated by a computational model; each simulated configuration has its own profile (field, career stage, region, evaluation stance) and its own weights. It is not the result of surveying 1000 real researchers, and the simulated configurations are not real people. The model’s assumptions are published below for verification and challenge."}</p></div></aside>

      <section className="psp-sec"><h2>{vi ? "Nguyên tắc thiết kế" : "Design principles"}</h2>
        <ul className="psp-pr">{principles.map(([ic, h, d]) => <li key={h}><span className="kic"><Icon n={ic} size={20} /></span><b>{h}</b><p>{d}</p></li>)}</ul>
        <p className="meta">{vi ? "Bản nháp công thức được 10 vai trò chuyên môn mô phỏng (thư mục học, thống kê, y sinh, kỹ thuật, khoa học tự nhiên, khoa học xã hội, quản lý nghiên cứu, nhà khoa học trẻ, liêm chính học thuật, chất lượng dữ liệu) phản biện nhiều vòng; phần lớn thay đổi nhằm bỏ trùng đếm, chống thổi phồng và công bằng với dữ liệu thiếu." : "The draft formula was stress-tested by 10 simulated expert roles (bibliometrics, statistics, life sciences, engineering, natural sciences, social sciences, research management, early-career researchers, research integrity, data quality); most changes aimed to remove double counting, curb inflation and treat missing data fairly."}</p></section>

      <section className="psp-sec"><h2>{vi ? "Công thức" : "The formula"}</h2>
        <pre className="formula big">{vi ? "PRO-SCORE1000 = trung bình của 1000 điểm, mỗi điểm do một cấu hình trọng số chấm:\nĐiểm(cấu hình k) = 100 × Σ  wₖᵢ × chỉ báoᵢ   (7 chỉ báo, Σ wₖᵢ = 1)" : "PRO-SCORE1000 = mean of 1000 scores, each given by one simulated configuration:\nScore(configuration k) = 100 × Σ  wₖᵢ × indicatorᵢ   (7 indicators, Σ wₖᵢ = 1)"}</pre>
        <div className="psp-stack" role="img" aria-label={pl.map((p) => `${P[p.k][0]} ${p.w}%`).join(", ")}>{pl.map((p) => <i key={p.k} style={{ width: `${p.w}%`, background: p.color }} title={`${P[p.k][0]} ${p.w.toFixed(1)}%`}><span>{p.w >= 8 ? Math.round(p.w) : ""}</span></i>)}</div>
        <p className="psp-legend">{pl.map((p) => <span key={p.k}><i style={{ background: p.color }} />{P[p.k][0]} {p.w.toFixed(1).replace(".", ",")}%</span>)}</p>
        <p className="meta">{vi ? "Thanh màu và các thẻ bên dưới là trọng số trung bình của hội đồng (kèm độ lệch chuẩn). Mỗi chỉ báo nằm trong khoảng 0 đến 1 (bách phân vị trong ngành, hoặc tỉ lệ đã làm trơn); điểm cuối nhân 100." : "The bar and cards below show the panel’s mean weights (with standard deviation). Each indicator lies between 0 and 1 (field percentile, or a smoothed ratio); the final score is multiplied by 100."}</p></section>

      <section className="psp-sec"><h2>{vi ? "Cách vận hành 1000 cấu hình trọng số mô phỏng" : "How the 1000 simulated weighting configurations work"}</h2>
        <ol className="psp-ul">
          <li>{vi ? <><b>Sinh hồ sơ.</b> Mỗi cấu hình được gán ngẫu nhiên (hạt giống cố định, kết quả tái lập được) một lĩnh vực (6 nhóm), giai đoạn sự nghiệp (3), khu vực (4) và lập trường đánh giá (3: thư mục học, đánh giá có trách nhiệm theo DORA, quản lý nghiên cứu).</> : <><b>Generate profiles.</b> Each simulated configuration is randomly assigned (fixed seed, reproducible) a field (6 groups), career stage (3), region (4) and evaluation stance (3: bibliometrics, responsible assessment per DORA, research management).</>}</li>
          <li>{vi ? <><b>Sinh trọng số.</b> Xuất phát từ trọng số của bản v1 (đã được 10 vai trò chuyên môn mô phỏng phản biện), điều chỉnh theo khuynh hướng đã ghi nhận trong tài liệu: người mới vào nghề coi trọng đà phát triển hơn, ngành xã hội và nhân văn ít coi trọng hạng tạp chí, quan điểm DORA hạ trọng số tạp chí và sản lượng, ngành vật lý với danh sách tác giả theo vần ABC ít coi trọng vai trò chủ đạo... rồi lấy mẫu Dirichlet để mỗi cấu hình khác nhau.</> : <><b>Generate weights.</b> Starting from the v1 weights (stress-tested by 10 simulated expert roles), adjusted by tendencies documented in the literature: early-career configurations favour momentum, social-science and humanities configurations weigh journal quartile less, DORA-minded experts lower journal and output weights, fields with alphabetical authorship weigh leadership less... then Dirichlet sampling makes each expert different.</>}</li>
          <li>{vi ? <><b>Chấm điểm.</b> Mỗi cấu hình chấm mọi hồ sơ theo trọng số của mình; PRO-SCORE1000 là <b>trung bình</b> của 1000 điểm.</> : <><b>Score.</b> Each simulated configuration scores every profile with their own weights; PRO-SCORE1000 is the <b>mean</b> of the 1000 scores.</>}</li>
          <li>{vi ? <><b>Đo độ vững.</b> Từ 1000 cách xếp hạng, ProFind báo <b>khoảng điểm</b> (P10 đến P90), <b>khoảng hạng</b> và <b>độ vững của huy hiệu</b>: tỉ lệ cấu hình mô phỏng xếp hồ sơ vào đúng nhóm Top đó.</> : <><b>Measure robustness.</b> From the 1000 rankings, ProFind reports a <b>score range</b> (P10 to P90), a <b>rank range</b> and <b>badge robustness</b>: the share of simulated configurations placing the profile in that Top group.</>}</li></ol>
        {panel && <><h3>{vi ? "Cơ cấu hội đồng và trọng số trung bình (%)" : "Panel composition and mean weights (%)"}</h3>
          <div className="psp-tw"><table className="psp-t"><thead><tr><th>{vi ? "Nhóm" : "Group"}</th><th>n</th>{COLS.map((c) => <th key={c}>{P[c][0]}</th>)}</tr></thead>
            <tbody>{Object.entries(panel.by).map(([dim, g]) => [<tr key={dim} className="dim"><th colSpan={9}>{DIM_LABEL[dim][vi ? 0 : 1]}</th></tr>, ...Object.entries(g).map(([k, v]) => <tr key={dim + k}><td>{v.label}</td><td>{v.n}</td>{v.w.map((x, i) => <td key={i}>{x.toFixed(1).replace(".", ",")}</td>)}</tr>)])}
              <tr className="all"><td><b>{vi ? "Toàn hội đồng" : "Whole panel"}</b></td><td>{panel.n}</td>{panel.mean.map((x, i) => <td key={i}><b>{x.toFixed(1).replace(".", ",")}</b></td>)}</tr></tbody></table></div>
          <p className="meta">{vi ? `Hạt giống ngẫu nhiên: ${panel.seed}. Các hệ số điều chỉnh nằm trong mã nguồn (scripts/pro-panel.mjs) và là giả định của mô hình.` : `Random seed: ${panel.seed}. The adjustment factors are in the source code (scripts/pro-panel.mjs) and are model assumptions.`}</p></>}</section>

      <section className="psp-sec"><h2>{vi ? "Bảy chỉ báo" : "The seven indicators"}</h2>
        <ol className="psp-cards">{pl.map((p, i) => <li key={p.k} style={{ "--c": p.color } as React.CSSProperties}>
          <div className="psp-ch"><span className="kic"><Icon n={p.icon} size={20} /></span><b>{P[p.k][0]}</b><em>{p.w.toFixed(1).replace(".", ",")}%{panel ? <small> ±{panel.sd[i].toFixed(1).replace(".", ",")}</small> : null}</em></div>
          <p className="psp-what">{P[p.k][1]}</p><p className="psp-how">{P[p.k][2]}</p></li>)}</ol></section>

      <section className="psp-sec"><h2>{vi ? "Chuẩn hóa và làm trơn" : "Normalisation and smoothing"}</h2>
        <ul className="psp-ul">
          <li>{vi ? <><b>Bách phân vị trong ngành chính.</b> Mỗi người được so với những người cùng ngành (28 ngành). Ngành dưới 50 người được trộn với bách phân vị toàn hệ thống để điểm ổn định.</> : <><b>Percentile within the primary field.</b> Each person is compared with others in the same field (28 fields). Fields under 50 people are blended with the system-wide percentile for stability.</>}</li>
          <li>{vi ? <><b>Làm trơn Bayes.</b> Với tỉ lệ dựa trên ít dữ liệu (vai trò, hạng Q, công trình nhiều trích dẫn), điểm kéo về trung bình ngành: (số đếm + k × trung bình ngành) ÷ (số mẫu + k).</> : <><b>Bayesian smoothing.</b> Ratios built on little data (role, quartile, highly cited works) are pulled toward the field mean: (count + k × field mean) ÷ (sample + k).</>}</li>
          <li>{vi ? <><b>Trần chống thổi phồng.</b> Trích dẫn mỗi công trình bị cắt ở P99 của ngành; sản lượng có trần P95; hồ sơ nghi gộp nhầm nhiều người bị loại khỏi xếp hạng.</> : <><b>Anti-inflation caps.</b> Per-work citations are capped at the field’s P99; output is capped at P95; profiles suspected of merging several people are excluded from ranking.</>}</li></ul>
        <div className="psp-ex"><b>{vi ? "Ví dụ minh họa (số giả định)" : "Illustrative example (hypothetical numbers)"}</b>
          <p>{vi ? "Một nhà khoa học có bách phân vị tác động 0,90; sản lượng 0,80; chủ đạo 0,70; chất lượng 0,60; đà phát triển 0,85; đều đặn 0,90; chưa thuộc Top 2%:" : "A scientist with impact percentile 0.90; output 0.80; leadership 0.70; quality 0.60; momentum 0.85; consistency 0.90; not in the Top 2%:"}</p>
          <code>{vi ? "Với trọng số trung bình của hội đồng" : "With the panel’s mean weights"}: {pl.map((p) => `${(p.w / 100).toFixed(3).replace(".", ",")}×${(ex[p.k as keyof typeof ex] / 100).toFixed(2).replace(".", ",")}`).join(" + ")} = <b>{(exScore / 100).toFixed(4).replace(".", ",")}</b> → PRO-SCORE1000 <b>{exScore.toFixed(1).replace(".", ",")}</b></code></div></section>

      <AbroadRule lang={lang} num={num} />

      <section className="psp-sec"><h2>{vi ? "Xếp hạng và huy hiệu" : "Ranking and badges"}</h2>
        <p>{vi ? "Hồ sơ có từ 10 công trình và hoạt động từ 3 năm được xếp hạng toàn hệ thống theo PRO-SCORE1000 (đồng điểm thì đồng hạng). Hạng và huy hiệu được tính lại tự động mỗi lần dữ liệu cập nhật." : "Profiles with 10+ works and 3+ active years are ranked system-wide by PRO-SCORE1000 (ties share a rank). Ranks and badges are recomputed automatically at every data refresh."}</p>
        <ul className="psp-tiers">{[...TIERS].map((tr) => <li key={tr} className={tr}><ProBadge rank={RANKS[tr]} size={56} /><b>{names[tr]}</b><span>{t("topN", { n: String(RANKS[tr]) })}</span></li>)}</ul></section>

      <section className="psp-sec"><h2>{vi ? "Giới hạn hiện tại" : "Current limits"}</h2>
        <ul className="psp-ul">
          <li>{vi ? "Đây là mô phỏng: các cấu hình trọng số và hệ số điều chỉnh phản ánh giả định của người xây mô hình dựa trên tài liệu, không phải ý kiến thực của 1000 nhà nghiên cứu. Chưa nên trích PRO-SCORE1000 như kết quả khảo sát hay đồng thuận của cộng đồng học thuật." : "The panel is simulated: the simulated configurations and adjustment factors reflect the modeller’s assumptions drawn from the literature, not the real opinions of 1000 researchers. Do not cite PRO-SCORE1000 as a survey result or as a consensus of the academic community."}</li>
          <li>{vi ? "OpenAlex chưa cho số tác giả mỗi công trình nên chưa chia trích dẫn theo đóng góp, và chưa có năm bắt đầu sự nghiệp để chuẩn hóa theo thế hệ." : "OpenAlex does not give the author count per work, so citations are not split by contribution, and there is no career-start year for cohort normalisation."}</li>
          <li>{vi ? "Hạng Q và vai trò chỉ có ở một phần công trình; sách, chương sách, kỷ yếu và bằng sáng chế chưa được tính." : "Quartile and role exist for only some works; books, chapters, proceedings and patents are not counted."}</li>
          <li>{vi ? "Hồ sơ OpenAlex có thể gộp nhầm hoặc tách đôi một người; ngành chính suy ra từ tạp chí đã đăng." : "OpenAlex profiles may merge or split people; the primary field is inferred from journals published in."}</li>
          <li>{vi ? "Hồ sơ có tỉ lệ công trình mang liên kết tại Việt Nam dưới ngưỡng quy định (theo OpenAlex, tối thiểu 15 công trình có ghi cơ quan) được gắn nhãn “Liên kết chính ở nước ngoài” và không xếp hạng; ngoại lệ do quản trị viên xác nhận. Xem mục “Phạm vi Việt Nam”." : "Profiles whose share of works with an affiliation in Vietnam is below the stated threshold (per OpenAlex, at least 15 works with a recorded affiliation) are tagged “Primary affiliation abroad” and not ranked; exceptions are confirmed by an administrator. See “Vietnam scope”."}</li>
          <li>{vi ? "Điểm là thước đo tương đối giữa các hồ sơ trong ProFind, không dùng thay cho đánh giá chuyên môn." : "The score is a relative measure between ProFind profiles, not a substitute for expert judgement."}</li></ul>
        <h3>{vi ? "Lộ trình cải tiến" : "Roadmap"}</h3>
        <ol className="psp-ul">{roadmap.map((r) => <li key={r}>{r}</li>)}</ol></section>

      <section className="psp-sec"><h2>{vi ? "Cách trích dẫn" : "How to cite"}</h2>
        <blockquote className="psp-cite">{cite}</blockquote>
        <p className="actions-row"><button type="button" className="ghost" onClick={copy}><Icon n="link" size={16} />{copied ? (vi ? "Đã chép" : "Copied") : (vi ? "Chép trích dẫn" : "Copy citation")}</button><a className="ghost btn" href={`mailto:${CONTACT}?subject=${encodeURIComponent("PRO-SCORE1000")}`}><Icon n="mail" size={16} />{vi ? "Góp ý về PRO-SCORE1000" : "Feedback on PRO-SCORE1000"}</a></p>
        <p className="meta">{vi ? "Chúng tôi hoan nghênh góp ý của các chuyên gia, hội đồng khoa học và nhà quản lý nghiên cứu, kể cả đăng ký làm thành viên thật của hội đồng ở các phiên bản sau, để hoàn thiện chỉ số." : "We welcome feedback from experts, scientific committees and research managers, including volunteering as a real panel member in later versions, to refine the index."}</p></section>
    </article>
  );
}
