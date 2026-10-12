# Danh mục nguồn Scopus (Scopus Source List) do quản trị viên cung cấp

Tệp trên Drive của quản trị viên (11/10/2026): `ext_list_Sep_2026.xlsx` (và bản tháng 1/2025), `Scopus_book_list_Q2.xlsx`. **Đây là danh mục nguồn, không có CiteScore hay hạng Q**, nên không thay được hạng SCImago (SJR) đang dùng. Hạng Q theo CiteScore cần tệp "CiteScore metrics" riêng của Elsevier. Web of Science (ISI, SCIE/SSCI) cần giấy phép Clarivate, không có dữ liệu công khai.

## Nội dung các trang
- `Scopus Sources`: 49.105 nguồn (mã nguồn, tên, ISSN, EISSN, **Active/Inactive**, **Coverage** theo năm, loại nguồn, nhà xuất bản, ASJC).
- `Discontinued Titles`, `Accepted Titles`: tạp chí vừa ngừng hoặc vừa được nhận.
- `Serial Conf. Proc. with Profile` và `All Conf. Proceedings` (180.588 dòng): **kỷ yếu hội nghị có ISBN**, kèm tên kỷ yếu, năm, nhà xuất bản và mã EID từng bài.
- `Scopus_book_list_Q2.xlsx`: 493.130 sách với ISBN, nhà xuất bản, năm.

## Đối chiếu với dữ liệu ProFind (kết quả đo ngày 11/10/2026)
- Bảng hạng SJR của ProFind có 49.469 ISSN: 98,2% (48.563) là nguồn **Active** trong Scopus, 874 là Inactive, 32 không có. Hai nguồn gần như trùng nhau nên đổi từ SJR sang "Scopus Source" không làm hạng Q đổi nhiều; nếu muốn hạng theo CiteScore thì cần tệp CiteScore.
- Công trình ProFind nằm trong tạp chí có trong Scopus: 370.899 bài công bố trong khoảng được Scopus lập chỉ mục (Coverage) và **10.088 bài (khoảng 2,5%) công bố ngoài khoảng đó** dù tạp chí có hạng SJR, ví dụ Vietnam Journal of Science and Technology (449 bài), Annals of Computer Science and Information Systems (255). Các bài này hiện vẫn được điểm Scopus; có thể xét chỉ tính điểm khi năm công bố nằm trong Coverage.
- Kỷ yếu: trong 25 công trình loại kỷ yếu của các hồ sơ có đủ công trình, **11 bài (44%) có kỷ yếu nằm trong danh sách Scopus** theo tên kỷ yếu (khớp tên chuẩn hóa); phần còn lại là hội nghị trong nước (FAIR, NICS) hoặc OpenAlex không ghi tên kỷ yếu. Đây là căn cứ kiểm chứng "kỷ yếu quốc tế có ISBN" tốt hơn lời khai của tác giả (Crossref không ghi ISBN ở cấp từng bài).

## Việc có thể làm tiếp (chưa làm)
1. Với kỷ yếu tác giả đánh dấu: gắn nhãn "đã đối chiếu Scopus" khi tên kỷ yếu có trong danh sách (không đổi điểm, chỉ tăng độ tin cậy).
2. Chỉ tính điểm Scopus khi năm công bố nằm trong Coverage (cần quyết định chính sách vì giảm điểm 2,5% công trình).
3. Nếu có tệp CiteScore metrics: so sánh hạng Q CiteScore với SJR trước khi đổi nguồn.

## Điều tra: công trình trong tạp chí Scopus nhưng không có điểm Scopus (11/10/2026)
Tệp xuất 1.000 tạp chí đầu theo CiteScore (`1000-source-results.xlsx`) cho thấy 62 tạp chí hàng đầu (Nature, Cell, PNAS, Science Advances, Joule, Neuron...) không có dòng nào trong `sjrByIssn`. Đối chiếu toàn bộ công trình ProFind có ISSN với danh mục nguồn Scopus (Sep 2026) và `journals.json` (danh mục trong nước):

- 407.656 công trình nằm trong tạp chí có trong Scopus; **25.535 (6,3%) không được điểm** (không có dòng SJR và không khớp danh mục trong nước), thuộc 5.914 hồ sơ.
- **Nguyên nhân do cách dựng bảng hạng**: `scripts/import-edufind.mjs` chỉ lấy các danh mục SCImago mà từng ngành EduFind cấu hình (257 danh mục). Tạp chí chỉ thuộc danh mục "Multidisciplinary" hoặc "General …" (General Engineering, General Social Sciences, General Physics and Astronomy...) hoặc ngừng chỉ mục thì không có dòng.

| Nhóm | Công trình | Trong đó tác giả chính | Hồ sơ | Ví dụ |
|---|---|---|---|---|
| A. Tạp chí **Active**, năm công bố nằm trong Coverage, chỉ thuộc danh mục chung hoặc đa ngành | 8.186 | 2.985 | 2.867 (123 hồ sơ Top 2%) | Heliyon (1.077), SAGE Open, Nature (401), PNAS, Results in Engineering, Arabian J. Sci. Eng. |
| B. Tạp chí **Inactive** (Scopus đã ngừng), bài công bố trong thời gian còn được lập chỉ mục | 12.353 | 4.806 | 3.508 | IJECE (515), Journal of Asian Finance, Economics and Business (476), Radiology Case Reports, J. Nanosci. Nanotechnol. |
| C. **Active**, danh mục có cấu hình nhưng không có dòng SJR (tạp chí mới hoặc lệch ISSN) | 986 | 435 | 398 | Annals of Operations Research (190) |
| D. Năm công bố **ngoài** Coverage | 4.010 | | | đúng khi không có điểm |

Ảnh hưởng: điểm HĐGSNN của các công trình này là rỗng, và chỉ báo "Chất lượng" của PRO-SCORE1000™ (trung bình hạng Q trên công trình có hạng) bỏ qua chúng. Việc cần: nhóm A bổ sung hạng cho danh mục "Multidisciplinary" và "General …" (CSV SCImago; trang scimagojr.com chặn truy cập tự động nên phải tải tay như `docs/PLAYBOOK.md` của EduFind) và quyết định chính sách ngành cho tạp chí đa ngành; nhóm B cần quy tắc (ví dụ tính theo hạng SJR cuối cùng khi còn lập chỉ mục) hoặc SJR theo năm; nhóm C kiểm tra lệch ISSN. Chưa đổi mã hay dữ liệu.

### Kết quả sau khi áp dụng bảng dự phòng (11/10/2026)
Quyết định của quản trị viên: nhóm A (đa ngành/General) tính theo hạng Q trong danh mục đa ngành cho mọi ngành; nhóm B (đã ngừng) tính theo hạng SJR năm cuối còn lập chỉ mục; nhóm C (thiếu dòng) kiểm tra ISSN và tạp chí mới (SCImago 1999-2025 đã nạp). Kết quả dựng lại: **2.383 hồ sơ đổi điểm, 5.213 công trình mới được tính (đa ngành 1.081, đã ngừng 2.370, còn hoạt động thiếu dòng 1.899, chỉ tính tác giả chính), +8.770 điểm; không hồ sơ nào bị giảm điểm**; PRO-SCORE1000™ đổi ở 3.009 hồ sơ (trung vị 0,1 điểm), 7 hồ sơ vào và 7 hồ sơ ra khỏi Top 1000; 125 hồ sơ Top 2% đổi số công trình tính điểm. Nhiều công trình ở tạp chí đã ngừng không có hạng Q ở năm cuối nên điểm bằng 0 theo quy tắc "Scopus chưa xếp hạng" của ngành.


### Cập nhật 12/10/2026: hạng Q hiển thị (`jq`), sách theo tập, sửa Coverage
- `scripts/build-sjr-fallback.mjs` nay có thêm loại "book series" (`k = "b"`, 1.946 nguồn; tổng 11.803 nguồn). Nguồn `k = "b"` **không** dùng để tính điểm HĐGSNN (`build-index.mjs` bỏ qua), chỉ để hiển thị hạng.
- `build-index.mjs` gán `jq` (hạng Q tốt nhất của tạp chí/sách theo tập, chỉ để hiển thị) cho công trình chưa có `quartile`: bài đồng tác giả, sách theo tập, tạp chí ngoài ngành của tác giả. Trang hồ sơ hiện chip "SJR" nét đứt; điểm HĐGSNN không đổi.
- Chỉ báo "Chất lượng" của PRO-SCORE1000™ dùng `quartile ?? jq` (tính cả bài đồng tác giả), theo quyết định của quản trị viên.
- Sửa lỗi `inCoverage`: trường Coverage trong `sjr-fallback.json` phân cách bằng dấu phẩy, mã cũ chỉ tách theo `;` nên 5.107 tạp chí có khoảng hở coverage không bao giờ khớp (1.919 công trình thiếu hạng, 713 bài tác giả chính mất điểm dự phòng). Nay tách theo `;` hoặc `,`.
- Hạng `jq` là hạng mới nhất của nguồn trong SCImago, không phải hạng đúng năm công bố (so cùng năm khớp khoảng 81%; so hạng mới nhất khớp 98,6%).
