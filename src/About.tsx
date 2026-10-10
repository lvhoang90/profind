// Trang "Về ProFind™, dữ liệu và giấy phép": nguồn dữ liệu, cách tính điểm, giấy phép, mã nguồn mở, quyền riêng tư. Nằm trong web, không dẫn ra ngoài.
import { useEffect, type ReactElement } from "react";
import { useT } from "./i18n";
import { Icon, type IconName } from "./icons";

const MIT = `MIT License

Copyright (c) 2026 Luong Viet Hoang (ISA Vietnam)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

type Sec = { id: string; icon: IconName; h: string; body: ReactElement };
const CONTACT = "vienisavietnam@gmail.com";

export function AboutPage({ section }: { section: string }) {
  const { lang, t } = useT();
  const vi = lang === "vi";
  useEffect(() => { const el = section ? document.getElementById(`s-${section}`) : null; if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }, [section]);
  const go = (id: string) => document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const secs: Sec[] = [
    { id: "gioi-thieu", icon: "spark", h: vi ? "Về ProFind™" : "About ProFind™", body: vi ? <>
      <p>ProFind™ là <b>dữ liệu số về nhà khoa học và công trình nghiên cứu</b>: tìm theo tên, đơn vị, ngành, công trình, tạp chí, ISSN và DOI; xem chỉ số PRO-SCORE1000™ và huy hiệu tôn vinh.</p>
      <p><b>Phạm vi:</b> các nhà nghiên cứu có hồ sơ OpenAlex gắn với ít nhất một trường đại học, học viện hoặc viện nghiên cứu trong danh sách đơn vị của Việt Nam, không phân biệt quốc tịch. Hồ sơ nghi gộp nhầm nhiều người bị loại khỏi danh sách mặc định và khỏi xếp hạng.</p>
      <p>ProFind™ <b>miễn phí, mã nguồn mở</b>, thuộc hệ sinh thái ISA cùng EduFind (chọn tạp chí), Ami (đọc và trích dẫn) và Mây (chuẩn hóa văn bản). Bản quyền thuộc về tác giả Lương Việt Hoàng (ISA Vietnam). ProFind™ độc lập, không trực thuộc Elsevier, Scopus, Clarivate hay ORCID.</p></> : <>
      <p>ProFind™ is <b>digital data on scientists and their research works</b>: search by name, institution, field, work, journal, ISSN and DOI, and see the PRO-SCORE1000™ index.</p>
      <p><b>Scope:</b> researchers whose OpenAlex profile is linked to at least one university, academy or research institute on the Vietnamese institution list, regardless of nationality. Profiles suspected of merging several people are excluded from the default list and from ranking.</p>
      <p>ProFind™ is <b>free and open source</b>, part of the ISA ecosystem with EduFind (pick a journal), Ami (read and cite) and Mây (format documents). Copyright belongs to the author Luong Viet Hoang (ISA Vietnam). ProFind™ is independent and not affiliated with Elsevier, Scopus, Clarivate or ORCID.</p></> },
    { id: "nguon", icon: "link", h: vi ? "Nguồn dữ liệu" : "Data sources", body: vi ? <ul>
      <li><b>OpenAlex</b> (CC0): hồ sơ tác giả, công trình, DOI, trích dẫn, đơn vị.</li>
      <li><b>Semantic Scholar</b>: số trích dẫn bổ sung theo DOI (lấy giá trị lớn hơn giữa hai nguồn cho từng công trình).</li>
      <li><b>ORCID</b> và <b>ROR</b> (dữ liệu công khai, CC0): định danh tác giả và đơn vị.</li>
      <li><b>Danh mục tạp chí và điểm của HĐGSNN</b>, hạng Q theo SJR/Scopus: qua EduFind.</li>
      <li><b>Danh sách cơ sở giáo dục</b> do Bộ Giáo dục và Đào tạo công bố.</li>
      <li><b>Danh sách Top 2% nhà khoa học</b> (Elsevier), xem mục Giấy phép.</li>
      <li><b>Liên kết Google Scholar</b> do tác giả cung cấp. ProFind™ không truy xuất Google Scholar tự động.</li></ul> : <ul>
      <li><b>OpenAlex</b> (CC0): author profiles, works, DOI, citations, affiliations.</li>
      <li><b>Semantic Scholar</b>: extra citation counts by DOI (the larger value of the two sources is used per work).</li>
      <li><b>ORCID</b> and <b>ROR</b> (public data, CC0): author and institution identifiers.</li>
      <li><b>HĐGSNN journal catalogue and scores</b>, Q quartiles from SJR/Scopus: via EduFind.</li>
      <li><b>List of education institutions</b> published by the Ministry of Education and Training.</li>
      <li><b>Top 2% scientists list</b> (Elsevier), see the Licences section.</li>
      <li><b>Google Scholar links</b> provided by the authors. ProFind™ does not scrape Google Scholar.</li></ul> },
    { id: "diem", icon: "chart", h: vi ? "PRO-SCORE1000™: cách tính và giới hạn" : "PRO-SCORE1000™: method and limits", body: vi ? <>
      <p><a className="chip" href="#/pro-score">Xem trang đầy đủ về PRO-SCORE1000™ →</a></p>
      <p><b>PRO-SCORE1000™ là chỉ số tham khảo riêng của ProFind™ (thang 0 đến 100), không phải xếp hạng chính thức.</b> Ý tưởng do Viện ISA và tác giả Lương Việt Hoàng đề xuất.</p>
      <p><b>Lưu ý quan trọng:</b> chỉ số được tạo bởi một <b>mô phỏng</b> gồm 1000 cấu hình trọng số (mô hình tính toán), không phải khảo sát 1000 chuyên gia hay nhà nghiên cứu thật. Mỗi cấu hình có bộ trọng số riêng cho 7 chỉ báo (Tác động, Sản lượng, Chủ đạo, Chất lượng, Đà phát triển, Đều đặn, Ghi nhận); điểm cuối là trung bình của 1000 điểm, kèm khoảng điểm, khoảng hạng và độ vững của huy hiệu.</p>
      <ul><li>Mọi chỉ báo được quy về bách phân vị trong cùng ngành chính; trích dẫn mỗi công trình bị cắt trần; dữ liệu thiếu được làm trơn về trung bình ngành.</li>
      <li>Hạng chỉ xếp cho hồ sơ từ 10 công trình và hoạt động từ 3 năm; huy hiệu Tinh hoa (Top 10), Xuất sắc (50), Ưu tú (100), Nổi bật (500), Tiêu biểu (1000).</li>
      <li>OpenAlex chưa cho số tác giả mỗi công trình; hạng Q và vai trò chỉ có ở một phần công trình; sách, kỷ yếu, bằng sáng chế chưa được tính; hồ sơ có thể gộp nhầm hoặc tách đôi một người.</li></ul></> : <>
      <p><a className="chip" href="#/pro-score">Open the full PRO-SCORE1000™ page →</a></p>
      <p><b>PRO-SCORE1000™ is ProFind™’s own reference index (scale 0 to 100), not an official ranking.</b> The idea was proposed by ISA Institute and author Luong Viet Hoang.</p>
      <p><b>Important:</b> the index is produced by a <b>simulation</b> of 1000 weighting configurations (a computational model), not a survey of 1000 real experts or researchers. Each configuration has its own weights for the 7 indicators (Impact, Output, Leadership, Quality, Momentum, Consistency, Recognition); the final score is the mean of the 1000 scores, with a score range, rank range and badge robustness.</p>
      <ul><li>Every indicator is a percentile within the primary field; per-work citations are capped; missing data is smoothed toward the field average.</li>
      <li>Ranks are given only to profiles with 10+ works and 3+ active years; badges Elite (Top 10), Distinguished (50), Eminent (100), Notable (500), Rising (1000).</li>
      <li>OpenAlex gives no author count per work; quartile and role exist for only some works; books, proceedings and patents are not counted; a profile may merge or split people.</li></ul></> },
    { id: "giay-phep", icon: "shield", h: vi ? "Giấy phép" : "Licences", body: vi ? <>
      <h3>Mã nguồn: MIT</h3>
      <p>Mã nguồn ProFind™ là mã nguồn mở theo giấy phép MIT: được dùng, sao chép, chỉnh sửa, phân phối, kể cả thương mại, miễn là giữ lại thông báo bản quyền và giấy phép. Toàn văn ở cuối mục này.</p>
      <h3>Dữ liệu do dự án biên soạn: CC BY 4.0</h3>
      <p>Cấu trúc, chuẩn hóa, đối chiếu tác giả, đơn vị và tạp chí, cách tính điểm tham khảo, văn bản và giao diện do ProFind™ biên soạn theo giấy phép <b>Creative Commons Attribution 4.0 (CC BY 4.0)</b>: được dùng, chia sẻ, chỉnh sửa, kể cả thương mại, với điều kiện ghi công "ProFind™, ISA Vietnam, Lương Việt Hoàng" và nêu rõ nếu có chỉnh sửa.</p>
      <h3>Dữ liệu bên thứ ba</h3>
      <p>OpenAlex, ORCID và ROR theo CC0. Danh mục tạp chí và điểm của HĐGSNN, danh sách cơ sở giáo dục, Semantic Scholar, SCImago/Scopus (Elsevier B.V.) và Web of Science (Clarivate) theo điều khoản và nhãn hiệu của chủ sở hữu.</p>
      <h3>Nhãn "Top 2% thế giới": CC BY-NC 3.0 (chỉ phi thương mại)</h3>
      <p>Ioannidis J.P.A., Baas J., Klavans R., Boyack K.W. (2026), "Updated science-wide author databases of standardized citation indicators", phiên bản 9 (tháng 8/2026), Elsevier BV (Mendeley Data), DOI 10.17632/btchxktzyw.9, dựa trên dữ liệu Scopus. Giấy phép Creative Commons Attribution-NonCommercial 3.0.</p>
      <p>Trường "Top 2%" (hạng, lĩnh vực) không thuộc CC BY 4.0 của dự án. ISA Vietnam vận hành ProFind™ không nhằm mục đích thương mại. Ai dùng lại bộ dữ liệu của ProFind™ cho mục đích thương mại phải bỏ trường này. Không có tên trong danh sách không có nghĩa là ít được trích dẫn.</p>
      <details className="lic"><summary>Toàn văn giấy phép MIT</summary><pre>{MIT}</pre></details></> : <>
      <h3>Source code: MIT</h3>
      <p>The ProFind™ source code is open source under the MIT licence: you may use, copy, modify and distribute it, including commercially, as long as you keep the copyright and licence notice. Full text at the end of this section.</p>
      <h3>Project-compiled data: CC BY 4.0</h3>
      <p>The structure, normalisation, author–institution–journal matching, reference scoring, text and interface compiled by ProFind™ are licensed under <b>Creative Commons Attribution 4.0 (CC BY 4.0)</b>: use, share and adapt, including commercially, with credit to "ProFind™, ISA Vietnam, Luong Viet Hoang" and a note of any changes.</p>
      <h3>Third-party data</h3>
      <p>OpenAlex, ORCID and ROR are CC0. The Council journal catalogue and scores, the institution list, Semantic Scholar, SCImago/Scopus (Elsevier B.V.) and Web of Science (Clarivate) follow their owners' terms and trademarks.</p>
      <h3>"Top 2% worldwide" label: CC BY-NC 3.0 (non-commercial only)</h3>
      <p>Ioannidis J.P.A., Baas J., Klavans R., Boyack K.W. (2026), "Updated science-wide author databases of standardized citation indicators", version 9 (August 2026), Elsevier BV (Mendeley Data), DOI 10.17632/btchxktzyw.9, based on Scopus data. Licence: Creative Commons Attribution-NonCommercial 3.0.</p>
      <p>The "Top 2%" field (rank, field) is not covered by the project's CC BY 4.0. ISA Vietnam operates ProFind™ for non-commercial purposes. Anyone reusing ProFind™ data commercially must remove this field. Not being on the list does not mean few citations.</p>
      <details className="lic"><summary>Full MIT licence text</summary><pre>{MIT}</pre></details></> },
    { id: "ma-nguon", icon: "book", h: vi ? "Mã nguồn mở" : "Open source", body: vi ? <>
      <p>Toàn bộ mã nguồn và quy trình nạp dữ liệu của ProFind™ (giao diện, bộ nạp OpenAlex, bộ tính điểm, bộ đối chiếu Top 2%, hàm máy chủ cho tài khoản và đo lường) là mã nguồn mở theo giấy phép MIT, kèm tài liệu thiết kế và triển khai. Muốn nhận mã nguồn, đóng góp hoặc báo lỗi, hãy liên hệ qua mục Liên hệ bên dưới.</p></> : <>
      <p>All ProFind™ source code and the data pipeline (interface, OpenAlex loader, scoring, Top 2% matcher, server functions for accounts and analytics) are open source under the MIT licence, with design and deployment documentation. To get the source, contribute or report a bug, use the Contact section below.</p></> },
    { id: "rieng-tu", icon: "user", h: vi ? "Chính sách dữ liệu cá nhân" : "Personal data policy", body: vi ? <>
      <p className="meta">Cập nhật 10/2026. Áp dụng Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực từ 01/01/2026).</p>
      <h3>1. Bên chịu trách nhiệm</h3>
      <p><b>Viện Khoa học Giáo dục và Kinh tế Đông Nam Á (Viện ISA)</b>. Là bên kiểm soát và xử lý dữ liệu cá nhân của ProFind™. Liên hệ về dữ liệu cá nhân: <b>{CONTACT}</b>.</p>
      <h3>2. Dữ liệu chúng tôi xử lý, nguồn và mục đích</h3>
      <ul>
        <li><b>Dữ liệu hồ sơ nhà khoa học</b>: họ tên, đơn vị công tác, mã ORCID, công trình công bố, trích dẫn và các chỉ số tính từ đó (kể cả PRO-SCORE1000™). Nguồn: OpenAlex (CC0), Crossref, Semantic Scholar, OpenCitations, ORCID công khai, danh mục của Hội đồng Giáo sư Nhà nước, liên kết Google Scholar do tác giả cung cấp. <i>Mục đích</i>: tra cứu, tổng hợp và thống kê học thuật. Căn cứ: tổng hợp từ nguồn dữ liệu được phép xử lý (Điều 11.3), công bố đúng nguồn gốc (Điều 16.3), kèm quyền phản đối và gỡ bên dưới.</li>
        <li><b>Dữ liệu do nhà khoa học đã xác thực tự khai báo</b> (giới thiệu, trang cá nhân, email/điện thoại liên hệ, ảnh đại diện): chỉ hiển thị khi bạn đồng ý; email và điện thoại chỉ hiện khi bạn bật chia sẻ.</li>
        <li><b>Tài khoản</b> (tùy chọn): email, số điện thoại, họ tên, mục đã lưu, lịch sử xem. <i>Mục đích</i>: cung cấp tài khoản, xác minh, liên hệ. Thư giới thiệu công cụ khác của hệ sinh thái ISA chỉ gửi khi bạn đồng ý riêng.</li>
        <li><b>Yêu cầu xác thực, đính chính, gỡ hồ sơ</b>: nội dung bạn gửi và kết quả kiểm tra danh tính (email, ORCID, tên) để xử lý yêu cầu.</li>
        <li><b>Đo lường tổng hợp của ProFind™</b>: lượt truy cập, thiết bị, nguồn giới thiệu, quốc gia và các thao tác tiêu biểu, chỉ là bộ đếm tổng hợp theo ngày, không cookie, không lưu địa chỉ IP, không gắn với người dùng hay thiết bị.</li>
        <li><b>Đo lường của hệ sinh thái ISA</b>: trang này nạp thêm bộ đếm nhẹ của ISA (isavn.edu.vn). Bộ đếm lưu một <b>mã khách ngẫu nhiên</b> trong bộ nhớ trình duyệt (localStorage, không phải cookie; không chứa tên hay email) và gửi về isavn.edu.vn trang và tiêu đề đang xem, nguồn giới thiệu, thông tin chiến dịch (utm), thời gian xem, mức cuộn trang, loại thiết bị và trình duyệt. Không lưu địa chỉ IP, không chạy khi trình duyệt bật Do Not Track. Xóa dữ liệu trang web trong trình duyệt để xóa mã này.</li></ul>
      <h3>3. Điểm PRO-SCORE1000™ là xử lý tự động</h3>
      <p>Điểm và huy hiệu do thuật toán tính trên dữ liệu công bố công khai; phân loại rủi ro: <b>thấp</b> (không có hiệu lực pháp lý, không dùng dữ liệu nhạy cảm). Đây là chỉ số tham khảo mô phỏng, không phải đánh giá chính thức, không thay thế hội đồng chuyên môn và không nên là tiêu chí duy nhất trong tuyển dụng, xét duyệt, bổ nhiệm hay phân bổ nguồn lực.</p>
      <h3>4. Quyền của bạn</h3>
      <ul>
        <li>Biết, xem, <b>chỉnh sửa</b>, <b>xóa</b>, <b>hạn chế</b> và <b>phản đối</b> việc xử lý; rút lại sự đồng ý; khiếu nại.</li>
        <li><b>Ẩn điểm và huy hiệu xếp hạng</b> (vẫn giữ công trình) hoặc <b>ẩn/gỡ toàn bộ hồ sơ</b>: dùng <a href="#/dinh-chinh">biểu mẫu đính chính</a> (đăng nhập bằng email tổ chức để chúng tôi xác minh danh tính) hoặc gửi thư tới {CONTACT}. Sau khi xác minh, việc ẩn có hiệu lực ngay. Chúng tôi phản hồi trong thời hạn pháp luật quy định; mục tiêu là trong 72 giờ làm việc.</li>
        <li>Nhà khoa học đã xác thực tự quản lý quyền này tại <a href="#/tai-khoan">Hồ sơ khoa học</a> trong tài khoản.</li>
        <li>Gỡ hồ sơ chỉ áp dụng trên ProFind™; dữ liệu gốc ở OpenAlex, ORCID, Crossref vẫn tồn tại ở các hệ thống đó và bạn có thể chỉnh sửa tại đó.</li></ul>
      <h3>5. Lưu trữ, chia sẻ và chuyển ra nước ngoài</h3>
      <ul>
        <li>Chúng tôi <b>không mua bán dữ liệu cá nhân</b>. Không chia sẻ cho bên thứ ba ngoài các nhà cung cấp hạ tầng dưới đây.</li>
        <li>Nhà cung cấp hạ tầng (có máy chủ ngoài Việt Nam): Vercel (lưu trữ website), Upstash (cơ sở dữ liệu tài khoản), Resend (gửi email). Chúng chỉ xử lý theo yêu cầu của Viện ISA.</li>
        <li>Thời gian lưu: hồ sơ khoa học lưu khi còn mục đích tra cứu; tài khoản lưu đến khi bạn xóa. Yêu cầu và nhật ký thư lưu tối đa 24 tháng.</li></ul>
      <h3>6. An toàn thông tin và sự cố</h3>
      <p>Đăng nhập bằng mã dùng một lần gửi qua email, giới hạn tần suất, phiên có chữ ký. Nếu xảy ra sự cố lộ, mất dữ liệu cá nhân, chúng tôi thông báo cơ quan có thẩm quyền trong 72 giờ và thông báo người bị ảnh hưởng.</p></> : <>
      <p className="meta">Updated 10/2026. Applies the Law on Personal Data Protection No. 91/2025/QH15 (in force from 1 January 2026).</p>
      <h3>1. Controller</h3>
      <p><b>Institute of Education Sciences and Economics of Southeast Asia (ISA Institute)</b>. ISA Institute controls and processes ProFind™’s personal data. Contact: <b>{CONTACT}</b>.</p>
      <h3>2. Data, sources and purposes</h3>
      <ul>
        <li><b>Researcher profile data</b>: name, affiliation, ORCID, publications, citations and indicators computed from them (including PRO-SCORE1000™). Sources: OpenAlex (CC0), Crossref, Semantic Scholar, OpenCitations, public ORCID, the State Council for Professorship catalogue, Google Scholar links supplied by authors. Purpose: academic search, aggregation and statistics, with the objection and removal rights below.</li>
        <li><b>Self-reported data of verified researchers</b> (bio, personal site, contact email/phone, avatar) is shown only with your consent; email and phone only when you switch sharing on.</li>
        <li><b>Accounts</b> (optional): email, phone, name, saved items, viewing history, to provide the account, verification and contact. Emails about other ISA tools are sent only with your separate consent.</li>
        <li><b>Verification, correction and removal requests</b>: your message and identity checks (email, ORCID, name).</li>
        <li><b>ProFind™ aggregate analytics</b>: visits, device type, referrer, country and key actions, kept only as daily aggregate counters: no cookies, no IP addresses stored, not tied to any user or device.</li>
        <li><b>ISA ecosystem analytics</b>: this site also loads a lightweight ISA counter (isavn.edu.vn). It keeps a <b>random visitor ID</b> in your browser storage (localStorage, not a cookie; it contains no name or email) and sends isavn.edu.vn the page and title viewed, referrer, campaign (utm) data, time on page, scroll depth, device type and browser. No IP address is stored, and it does not run when your browser sends Do Not Track. Clear your site data in the browser to remove the ID.</li></ul>
      <h3>3. PRO-SCORE1000™ is automated processing</h3>
      <p>Scores and badges are computed by an algorithm on public publication data; risk class: <b>low</b> (no legal effect, no sensitive data). It is a simulated reference index, not an official assessment, does not replace expert committees and should not be the sole criterion in hiring, review, appointment or resource allocation.</p>
      <h3>4. Your rights</h3>
      <ul>
        <li>To know, access, <b>correct</b>, <b>erase</b>, <b>restrict</b> and <b>object</b>; to withdraw consent; to complain.</li>
        <li><b>Hide the score and rank badge</b> (keeping the works) or <b>hide/remove the whole profile</b>: use the <a href="#/dinh-chinh">correction form</a> (sign in with an organisational email so we can verify identity) or email {CONTACT}. Once verified the change takes effect immediately. We respond within the legal deadline; our target is 72 working hours.</li>
        <li>Verified researchers manage this themselves in <a href="#/tai-khoan">Scholar profile</a> in their account.</li>
        <li>Removal applies to ProFind™ only; the source records remain in OpenAlex, ORCID and Crossref, where you can edit them.</li></ul>
      <h3>5. Storage, sharing and cross-border processing</h3>
      <ul>
        <li>We <b>do not sell personal data</b> and share it with no third party other than the infrastructure providers below.</li>
        <li>Infrastructure providers (servers outside Vietnam): Vercel (hosting), Upstash (account database), Resend (email). They process only on ISA Institute’s instructions.</li>
        <li>Retention: scientific profiles while the lookup purpose lasts; accounts until you delete them. Request and mail logs for at most 24 months.</li></ul>
      <h3>6. Security and incidents</h3>
      <p>One-time email codes, rate limiting, signed sessions. In case of a personal data breach we notify the competent authority within 72 hours and affected people.</p></> },
    { id: "lien-he", icon: "mail", h: vi ? "Liên hệ" : "Contact", body: vi ? <p>Góp ý, báo lỗi, đề nghị bổ sung nhà nghiên cứu hoặc yêu cầu đính chính: dùng <a href="#/dinh-chinh">biểu mẫu trong trang</a> hoặc gửi thư tới <b>{CONTACT}</b>.</p> : <p>Feedback, bug reports, suggestions to add a researcher or correction requests: use the <a href="#/dinh-chinh">in-page form</a> or email <b>{CONTACT}</b>.</p> },
  ];
  return (
    <article className="about">
      <header className="dash-head"><div className="av" aria-hidden="true"><Icon n="shield" size={34} /></div>
        <div className="dh-main"><h1>{vi ? "Về ProFind™, dữ liệu và giấy phép" : "About ProFind™, data and licences"}</h1><p className="meta">{vi ? "Nguồn dữ liệu, cách tính điểm, giấy phép, mã nguồn mở và quyền riêng tư." : "Data sources, scoring, licences, open source and privacy."}</p></div>
      </header>
      <nav className="tabs" aria-label={vi ? "Mục lục" : "Contents"}>{secs.map((s) => <button key={s.id} className="tabbtn" onClick={() => go(s.id)}><Icon n={s.icon} size={16} />{s.h}</button>)}</nav>
      {secs.map((s) => <section key={s.id} id={`s-${s.id}`} className="card about-sec" aria-labelledby={`h-${s.id}`}><h2 id={`h-${s.id}`}><Icon n={s.icon} size={20} />{s.h}</h2>{s.body}</section>)}
      <p><a href="#/">{t("back")}</a></p>
    </article>
  );
}
