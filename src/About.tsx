// Trang "Về ProFind, dữ liệu và giấy phép": nguồn dữ liệu, cách tính điểm, giấy phép, mã nguồn mở, quyền riêng tư. Nằm trong web, không dẫn ra ngoài.
import { useEffect, type ReactElement } from "react";
import { useT } from "./i18n";
import { Icon, type IconName } from "./icons";

const MIT = `MIT License

Copyright (c) 2026 Luong Viet Hoang (ISA Vietnam)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

type Sec = { id: string; icon: IconName; h: string; body: ReactElement };
const CONTACT = "luongviethoang.hcm@gmail.com";

export function AboutPage({ section }: { section: string }) {
  const { lang, t } = useT();
  const vi = lang === "vi";
  useEffect(() => { const el = section ? document.getElementById(`s-${section}`) : null; if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }, [section]);
  const go = (id: string) => document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const secs: Sec[] = [
    { id: "gioi-thieu", icon: "spark", h: vi ? "Về ProFind" : "About ProFind", body: vi ? <>
      <p>ProFind là <b>dữ liệu số về nhà khoa học và công trình nghiên cứu</b>: tìm theo tên, đơn vị, ngành, công trình, tạp chí, ISSN và DOI; xem điểm tham khảo theo quy tắc của Hội đồng Giáo sư nhà nước (HĐGSNN).</p>
      <p>ProFind <b>miễn phí, mã nguồn mở</b>, thuộc hệ sinh thái ISA cùng EduFind (chọn tạp chí), Ami (đọc và trích dẫn) và Mây (chuẩn hóa văn bản). Bản quyền thuộc về tác giả Lương Việt Hoàng (ISA Vietnam). ProFind độc lập, không trực thuộc Elsevier, Scopus, Clarivate hay ORCID.</p></> : <>
      <p>ProFind is <b>digital data on scientists and their research works</b>: search by name, institution, field, work, journal, ISSN and DOI, and see a reference score based on the State Professorship Council (HĐGSNN) rules.</p>
      <p>ProFind is <b>free and open source</b>, part of the ISA ecosystem with EduFind (pick a journal), Ami (read and cite) and Mây (format documents). Copyright belongs to the author Luong Viet Hoang (ISA Vietnam). ProFind is independent and not affiliated with Elsevier, Scopus, Clarivate or ORCID.</p></> },
    { id: "nguon", icon: "link", h: vi ? "Nguồn dữ liệu" : "Data sources", body: vi ? <ul>
      <li><b>OpenAlex</b> (CC0): hồ sơ tác giả, công trình, DOI, trích dẫn, đơn vị.</li>
      <li><b>Semantic Scholar</b>: số trích dẫn bổ sung theo DOI (lấy giá trị lớn hơn giữa hai nguồn cho từng công trình).</li>
      <li><b>ORCID</b> và <b>ROR</b> (dữ liệu công khai, CC0): định danh tác giả và đơn vị.</li>
      <li><b>Danh mục tạp chí và điểm của HĐGSNN</b>, hạng Q theo SJR/Scopus: qua EduFind.</li>
      <li><b>Danh sách cơ sở giáo dục</b> do Bộ Giáo dục và Đào tạo công bố.</li>
      <li><b>Danh sách Top 2% nhà khoa học</b> (Elsevier), xem mục Giấy phép.</li>
      <li><b>Liên kết Google Scholar</b> do tác giả cung cấp. ProFind không truy xuất Google Scholar tự động.</li></ul> : <ul>
      <li><b>OpenAlex</b> (CC0): author profiles, works, DOI, citations, affiliations.</li>
      <li><b>Semantic Scholar</b>: extra citation counts by DOI (the larger value of the two sources is used per work).</li>
      <li><b>ORCID</b> and <b>ROR</b> (public data, CC0): author and institution identifiers.</li>
      <li><b>HĐGSNN journal catalogue and scores</b>, Q quartiles from SJR/Scopus: via EduFind.</li>
      <li><b>List of education institutions</b> published by the Ministry of Education and Training.</li>
      <li><b>Top 2% scientists list</b> (Elsevier), see the Licences section.</li>
      <li><b>Google Scholar links</b> provided by the authors. ProFind does not scrape Google Scholar.</li></ul> },
    { id: "diem", icon: "chart", h: vi ? "Cách tính điểm và giới hạn" : "How scores work and their limits", body: vi ? <>
      <p><b>Thứ hạng và điểm chỉ để tham khảo, không phải xếp hạng chính thức.</b></p>
      <ul><li>Điểm theo quy tắc của HĐGSNN, chỉ tính cho <b>tác giả chính</b>: tác giả đứng đầu, hoặc tác giả liên hệ duy nhất; nếu có từ 2 tác giả liên hệ thì chỉ tính tác giả đứng đầu.</li>
      <li>Tạp chí trong nước tính theo năm đăng; tạp chí Scopus tính theo hạng Q và quy tắc từng ngành. Ngành của tác giả suy ra từ các tạp chí họ đã đăng.</li>
      <li>Chưa xác định được SCIE/SSCI và kỷ yếu hội nghị; OpenAlex thiếu thông tin tác giả liên hệ ở nhiều công trình. Vì vậy điểm thường <b>thấp hơn thực tế</b>.</li>
      <li>Chỉ lấy công trình từ năm 2016. Số trích dẫn là của hồ sơ OpenAlex (toàn thời gian) cộng phần bổ sung từ Semantic Scholar; Google Scholar thường cao hơn vì quét cả web mở (luận văn, kỷ yếu, sách, bản thảo).</li>
      <li>Hồ sơ có thể gộp nhầm hoặc tách đôi một người; hồ sơ nghi gộp nhầm không được xếp hạng. Người được nêu tên có thể yêu cầu đính chính.</li>
      <li>Số thứ tự (STT) trong danh sách đánh lại theo kết quả hiện tại; hạng theo điểm xem ở trang hồ sơ, so sánh trong nhóm tác giả đã nạp.</li></ul></> : <>
      <p><b>Ranks and scores are for reference only and are not an official ranking.</b></p>
      <ul><li>Scores follow the Council (HĐGSNN) rules and count only for the <b>lead author</b>: the first author, or the sole corresponding author; with two or more corresponding authors only the first author counts.</li>
      <li>Domestic journals are scored by publication year; Scopus journals by quartile and field rule. An author's field is inferred from the journals they publish in.</li>
      <li>SCIE/SSCI and conference proceedings cannot be determined, and OpenAlex lacks corresponding-author data for many works, so scores are often <b>lower than the true value</b>.</li>
      <li>Only works since 2016 are loaded. Citations are the OpenAlex profile total (all time) plus a top-up from Semantic Scholar; Google Scholar is usually higher because it crawls the open web (theses, proceedings, books, preprints).</li>
      <li>A profile may merge or split people; profiles suspected of merging are not ranked. Named people may request corrections.</li>
      <li>The No. column in the list is renumbered for the current results; the score-based rank is on the profile page and compares only the authors loaded so far.</li></ul></> },
    { id: "giay-phep", icon: "shield", h: vi ? "Giấy phép" : "Licences", body: vi ? <>
      <h3>Mã nguồn: MIT</h3>
      <p>Mã nguồn ProFind là mã nguồn mở theo giấy phép MIT: được dùng, sao chép, chỉnh sửa, phân phối, kể cả thương mại, miễn là giữ lại thông báo bản quyền và giấy phép. Toàn văn ở cuối mục này.</p>
      <h3>Dữ liệu do dự án biên soạn: CC BY 4.0</h3>
      <p>Cấu trúc, chuẩn hóa, đối chiếu tác giả, đơn vị và tạp chí, cách tính điểm tham khảo, văn bản và giao diện do ProFind biên soạn theo giấy phép <b>Creative Commons Attribution 4.0 (CC BY 4.0)</b>: được dùng, chia sẻ, chỉnh sửa, kể cả thương mại, với điều kiện ghi công "ProFind, ISA Vietnam, Lương Việt Hoàng" và nêu rõ nếu có chỉnh sửa.</p>
      <h3>Dữ liệu bên thứ ba</h3>
      <p>OpenAlex, ORCID và ROR theo CC0. Danh mục tạp chí và điểm của HĐGSNN, danh sách cơ sở giáo dục, Semantic Scholar, SCImago/Scopus (Elsevier B.V.) và Web of Science (Clarivate) theo điều khoản và nhãn hiệu của chủ sở hữu.</p>
      <h3>Nhãn "Top 2% thế giới": CC BY-NC 3.0 (chỉ phi thương mại)</h3>
      <p>Ioannidis J.P.A., Baas J., Klavans R., Boyack K.W. (2025), "Updated science-wide author databases of standardized citation indicators", phiên bản 8, Elsevier BV (Mendeley Data), DOI 10.17632/btchxktzyw.8, dựa trên dữ liệu Scopus. Giấy phép Creative Commons Attribution-NonCommercial 3.0.</p>
      <p>Trường "Top 2%" (hạng, lĩnh vực) không thuộc CC BY 4.0 của dự án. ISA Vietnam vận hành ProFind không nhằm mục đích thương mại. Ai dùng lại bộ dữ liệu của ProFind cho mục đích thương mại phải bỏ trường này. Không có tên trong danh sách không có nghĩa là ít được trích dẫn.</p>
      <details className="lic"><summary>Toàn văn giấy phép MIT</summary><pre>{MIT}</pre></details></> : <>
      <h3>Source code: MIT</h3>
      <p>The ProFind source code is open source under the MIT licence: you may use, copy, modify and distribute it, including commercially, as long as you keep the copyright and licence notice. Full text at the end of this section.</p>
      <h3>Project-compiled data: CC BY 4.0</h3>
      <p>The structure, normalisation, author–institution–journal matching, reference scoring, text and interface compiled by ProFind are licensed under <b>Creative Commons Attribution 4.0 (CC BY 4.0)</b>: use, share and adapt, including commercially, with credit to "ProFind, ISA Vietnam, Luong Viet Hoang" and a note of any changes.</p>
      <h3>Third-party data</h3>
      <p>OpenAlex, ORCID and ROR are CC0. The Council journal catalogue and scores, the institution list, Semantic Scholar, SCImago/Scopus (Elsevier B.V.) and Web of Science (Clarivate) follow their owners' terms and trademarks.</p>
      <h3>"Top 2% worldwide" label: CC BY-NC 3.0 (non-commercial only)</h3>
      <p>Ioannidis J.P.A., Baas J., Klavans R., Boyack K.W. (2025), "Updated science-wide author databases of standardized citation indicators", version 8, Elsevier BV (Mendeley Data), DOI 10.17632/btchxktzyw.8, based on Scopus data. Licence: Creative Commons Attribution-NonCommercial 3.0.</p>
      <p>The "Top 2%" field (rank, field) is not covered by the project's CC BY 4.0. ISA Vietnam operates ProFind for non-commercial purposes. Anyone reusing ProFind data commercially must remove this field. Not being on the list does not mean few citations.</p>
      <details className="lic"><summary>Full MIT licence text</summary><pre>{MIT}</pre></details></> },
    { id: "ma-nguon", icon: "book", h: vi ? "Mã nguồn mở" : "Open source", body: vi ? <>
      <p>Toàn bộ mã nguồn và quy trình nạp dữ liệu của ProFind (giao diện, bộ nạp OpenAlex, bộ tính điểm, bộ đối chiếu Top 2%, hàm máy chủ cho tài khoản và đo lường) là mã nguồn mở theo giấy phép MIT, kèm tài liệu thiết kế và triển khai. Muốn nhận mã nguồn, đóng góp hoặc báo lỗi, hãy liên hệ qua mục Liên hệ bên dưới.</p></> : <>
      <p>All ProFind source code and the data pipeline (interface, OpenAlex loader, scoring, Top 2% matcher, server functions for accounts and analytics) are open source under the MIT licence, with design and deployment documentation. To get the source, contribute or report a bug, use the Contact section below.</p></> },
    { id: "rieng-tu", icon: "user", h: vi ? "Quyền riêng tư" : "Privacy", body: vi ? <ul>
      <li>ProFind chỉ dùng <b>dữ liệu công khai</b> về nhà khoa học (OpenAlex, ORCID, danh mục HĐGSNN). Không thu thập thông tin riêng tư của người được nêu tên.</li>
      <li>Người được nêu tên có quyền <b>xác nhận, đính chính hoặc yêu cầu gỡ hồ sơ</b> bất cứ lúc nào qua biểu mẫu <a href="#/dinh-chinh">Đính chính hoặc gỡ hồ sơ</a>. Yêu cầu gỡ được ưu tiên xử lý sau khi xác minh người yêu cầu.</li>
      <li><b>Tài khoản</b> (tùy chọn): email, số điện thoại, họ tên và dữ liệu đã lưu chỉ dùng để cung cấp tài khoản, liên hệ xác minh và hoàn thiện công cụ. Bạn có thể tải hoặc xóa toàn bộ dữ liệu trong Không gian của tôi.</li>
      <li><b>Đo lường ẩn danh</b>: lượt truy cập, nguồn, thiết bị, thời lượng và sự kiện được đếm tổng hợp, không cookie, không lưu địa chỉ IP; từ khóa tìm kiếm được gộp chung, không gắn với người dùng.</li></ul> : <ul>
      <li>ProFind uses only <b>public data</b> about scientists (OpenAlex, ORCID, the Council catalogue). It collects no private information about the people named.</li>
      <li>Named people may <b>claim, correct or ask to remove their profile</b> at any time through the <a href="#/dinh-chinh">Correct or remove a profile</a> form. Removal requests take priority once the requester is verified.</li>
      <li><b>Accounts</b> (optional): email, phone number, name and saved data are used only to provide the account, contact you for verification and improve the tool. You can download or delete all your data in My space.</li>
      <li><b>Anonymous analytics</b>: visits, sources, devices, duration and events are counted in aggregate, with no cookies and no IP addresses stored; search keywords are pooled, not tied to any user.</li></ul> },
    { id: "lien-he", icon: "mail", h: vi ? "Liên hệ" : "Contact", body: vi ? <p>Góp ý, báo lỗi, đề nghị bổ sung nhà nghiên cứu hoặc yêu cầu đính chính: dùng <a href="#/dinh-chinh">biểu mẫu trong trang</a> hoặc gửi thư tới <b>{CONTACT}</b>.</p> : <p>Feedback, bug reports, suggestions to add a researcher or correction requests: use the <a href="#/dinh-chinh">in-page form</a> or email <b>{CONTACT}</b>.</p> },
  ];
  return (
    <article className="about">
      <header className="dash-head"><div className="av" aria-hidden="true"><Icon n="shield" size={34} /></div>
        <div className="dh-main"><h1>{vi ? "Về ProFind, dữ liệu và giấy phép" : "About ProFind, data and licences"}</h1><p className="meta">{vi ? "Nguồn dữ liệu, cách tính điểm, giấy phép, mã nguồn mở và quyền riêng tư." : "Data sources, scoring, licences, open source and privacy."}</p></div>
      </header>
      <nav className="tabs" aria-label={vi ? "Mục lục" : "Contents"}>{secs.map((s) => <button key={s.id} className="tabbtn" onClick={() => go(s.id)}><Icon n={s.icon} size={16} />{s.h}</button>)}</nav>
      {secs.map((s) => <section key={s.id} id={`s-${s.id}`} className="card about-sec" aria-labelledby={`h-${s.id}`}><h2 id={`h-${s.id}`}><Icon n={s.icon} size={20} />{s.h}</h2>{s.body}</section>)}
      <p><a href="#/">{t("back")}</a></p>
    </article>
  );
}
