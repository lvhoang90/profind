# Đối chiếu với STI.gov.vn (tạp chí và công bố trong nước)

Ngày thực hiện: 13/10/2026. Nguồn: cổng STI.gov.vn (Hệ thống thông tin quốc gia về KH,CN&ĐMST), API công khai không cần đăng nhập; `robots.txt` cho phép (`Allow: /`). **STI chưa công bố điều khoản tái sử dụng dữ liệu; ProFind đang xin phép.** Vì vậy mọi dữ liệu STI trong ProFind đều (1) chỉ hiển thị tham khảo kèm ghi nguồn, (2) ghi rõ "chưa xác thực", (3) **không tính vào PRO-SCORE1000™ và hạng**, (4) chỉ dẫn tới bản ghi gốc trên STI. Không lấy hay lưu trường `pCccd` (số căn cước) hay bất kỳ dữ liệu cá nhân nhạy cảm nào; không lấy thông tin liên hệ (email, điện thoại, tên người liên hệ) của tạp chí.

Số yêu cầu gửi tới STI: tuần tự, nghỉ 0,4 đến 0,7 giây giữa các yêu cầu. Danh sách tạp chí: 5 trang liệt kê và 440 trang chi tiết (445 yêu cầu). Thí điểm công bố: 46 yêu cầu (hai truy vấn, mỗi trang 100 bản ghi). Cộng thêm một số yêu cầu thăm dò khi tìm hiểu API (dưới 60).

## 1. Điểm cuối STI đã dùng (tìm trong các chunk JS của giao diện Angular)

| Việc | Cách gọi |
|---|---|
| Danh sách tạp chí | `POST /api/public/journals/search?page=N&size=100&orderBy=impactFactor&sortDirection=desc`, thân `{"isVerified":true}` (440 tạp chí; `page` bắt đầu từ 1) |
| Chỉ số một tạp chí | `GET /api/public/journals/{id}`: `soBaiBaoDaXuatBan5Nam`, `soBaiBao2NamGanDay`, `soBaiBaoDuocTrichDan2NamGanDay`, `tongSoLuotTrichDanTheoNam`, `impactFactor`, `citeScore` |
| Công bố trong nước (tìm) | `POST /api/public/publications/advanced-search-es?page=N&size=100`, thân `{"conditions":[{"field":"ALL","value":"...","operator":"AND"}]}`. Điểm cuối này nhanh (vài giây mỗi trang); điểm cuối `publications/search` với `keyword` chậm (khoảng 60 giây mỗi trang 100 bản ghi) và danh sách `authors[]` hầu như không có cơ quan, nên không dùng |
| Trang web | `/publication?q=<từ khóa>` tìm trên mọi trường (tham số `q` do `ListRouteState` đọc); `/publication/<mã số>` mở bản ghi (cổng chấp nhận mã số thập phân ở cuối đường dẫn); trang `/journal` không đọc tham số tìm kiếm nên ProFind không liên kết trang tạp chí |

Lưu ý: ô tìm "mọi trường" của STI khớp theo từ có dấu (tìm "Tran Minh Triet" ra 0 kết quả, "Trần Minh Triết" ra 21) và không tìm theo ISSN. Vì vậy liên kết "Tra trên STI.gov.vn" ở hồ sơ có chú thích khi tên chưa có dấu.

## 2. Mức 2: tạp chí STI và đối chiếu ISSN

Tệp: `data/sti-journals.json` (đầy đủ trường cấp tạp chí, 177 KB) và `public/data/sti-journals.json` (gọn, ISSN -> chỉ số, 13 KB, tải ở trang hồ sơ). Dựng bằng `scripts/build-sti-journals.mjs`.

| Chỉ tiêu | Số |
|---|---|
| Tạp chí STI (đã xác thực, `isVerified`) | 440 |
| Có ISSN hoặc e-ISSN hợp lệ | 310 |
| Không có ISSN trong STI | 130 |
| Trùng danh mục HĐGSNN của ProFind (`data/journals.json`, 686 ISSN) | 259 |
| Trùng danh sách nguồn Scopus (`data/scopus-sources.json`) | 4 (trùng ít nhất một trong hai danh mục: 260) |
| **ISSN còn thiếu**: có ISSN nhưng không có trong danh mục HĐGSNN lẫn Scopus | **50** (24 tạp chí trong số này có số liệu bài báo; 16 tạp chí đã xuất hiện trong công trình của hồ sơ ProFind, 34 thì chưa) |
| Có chỉ số hiển thị (số công bố 5 năm hoặc trích dẫn) | 229 |
| Tổng số công bố 5 năm của 440 tạp chí / tổng trích dẫn 5 năm | 49.549 / 4.564 |

Hiển thị: dòng "STI: N công bố, M trích dẫn trong nước (5 năm)" ở khối "Tạp chí có thể cân nhắc" (`src/Related.tsx`) và ở dòng ISSN của từng công trình trong hồ sơ (`src/App.tsx`) khi ISSN (in hoặc điện tử) khớp. Đây là chỉ số tham khảo của STI, chưa kiểm chứng, không dùng để chấm điểm.

Hạn chế: STI chỉ trả "trích dẫn trong nước theo năm" cho khoảng 5 năm gần nhất và nhiều tạp chí (đặc biệt tạp chí mới có ISSN 3030-/3093-) chưa có số liệu; 129 tạp chí không có ISSN nên không đối chiếu được; chỉ số IF/CiteScore của STI do STI tự tính, không so sánh được với Clarivate/Scopus.

### Danh sách 50 tạp chí STI có ISSN chưa có trong danh mục ProFind

Gợi ý đưa vào danh mục khi có thông tin điểm chính thức của HĐGSNN. Sắp theo số công bố 5 năm giảm dần.

| ISSN | e-ISSN | Tên tạp chí (theo STI) | Công bố 5 năm | Trích dẫn 5 năm |
|---|---|---|---|---|
| 2525-250X | – | Tạp chí Việt Nam Hội nhập | 561 | 12 |
| 3093-3641 | – | Tạp chí Dân tộc học và Tôn giáo học | 482 | 98 |
| 2354-1069 | – | Tạp chí Khoa học - Trường Đại học Sư phạm Hà Nội: Khoa học Xã hội | 314 | 13 |
| – | 2815-6293 | Tạp chí Khoa học Sức khỏe | 285 | 18 |
| 2526-2445 | – | Tạp chí Nghiên cứu Nước ngoài | 284 | 37 |
| 3093-3196 | 3093-3226 | Tạp chí Khoa học - Trường Đại học Cửu Long | 138 | 1 |
| – | 2815-6145 | Tạp chí điện tử Khoa học và Công nghệ QUI | 93 | 4 |
| 3030-4318 | 3030-4326 | Tạp chí Y Dược Huế | 84 | 1 |
| 3093-3080 | 3093-3099 | Tạp chí Sức khoẻ và Lão hoá | 81 | 2 |
| 3093-379X | 3093-396X | Journal of Science and Development Economics | 63 | 0 |
| 3093-3943 | – | Tạp chí Xã hội học và Tâm lý học - Tâm lý học | 59 | 0 |
| 3093-3064 | – | Tạp chí Nghiên cứu Á - Phi | 48 | 1 |
| 2815-5998 | 2815-598X | Tạp chí Khoa học Trường Đại học Hoa Sen | 38 | 1 |
| 3030-475X | 3030-4768 | Hong Duc University Journal of Science | 36 | 0 |
| 3093-3919 | – | Tạp chí Xã hội học và Tâm lý học - Xã hội học | 35 | 1 |
| 3093-3307 | – | Tạp chí Nghiên cứu Con người, Gia đình và Giới | 32 | 1 |
| 2354-1504 | – | Tạp chí Khoa học - Trường Đại học Thủ đô Hà Nội: Khoa học Tự nhiên và Công nghệ | 31 | 0 |
| 3093-401X | – | Tạp chí Nghiên cứu Châu Âu và Châu Mỹ | 28 | 0 |
| 3030-4644 | 3030-4652 | Tạp chí Khoa học Trường Đại học Hồng Đức – Khoa học Xã hội và Nhân văn | 25 | 1 |
| 3030-4725 | 3030-4741 | Tạp chí Khoa học Trường Đại học Hồng Đức – Khoa học Giáo dục và Quản lý | 15 | 1 |
| 3030-444X | – | Tạp chí Khoa học Trường Đại học Phan Thiết | 14 | 0 |
| 3093-3617 | – | Tạp chí Nghiên cứu Văn học | 13 | 0 |
| 3030-4695 | 3030-4709 | Tạp chí Khoa học Trường Đại học Hồng Đức – Khoa học Nông - Lâm - Ngư nghiệp | 12 | 0 |
| 3093-3927 | – | Tạp chí Địa lý nhân văn và Phát triển bền vững. Kỳ Nghiên cứu Địa lý nhân văn | 9 | 0 |
| 1859-3984 | – | Công Nghiệp: Kinh tế & Quản lý (nay là Tạp chí Công thương) |  |  |
| 3093-3102 | 3093-3110 | Journal of Health and Aging |  |  |
| 3093-3587 | – | Journal of Human, Family and Gender |  |  |
| 3093-3633 | 3093-3803 | Journal of Tropical Science and Engineering |  |  |
| 3030-489X | 3030-4903 | Thang Long Journal of Science: Van hien and Heritage |  |  |
| – | 2734-9780 | Tạp chí  điện tử Lý luận chính trị và Truyền thông (tiếng Anh) |  |  |
| 3030-4423 | – | Tạp chí Khoa học Pháp lý Việt Nam. |  |  |
| 3030-4873 | 3030-4881 | Tạp chí Khoa học Thăng Long – Khoa học ứng dụng |  |  |
| 3030-4628 | 3030-4636 | Tạp chí Khoa học Trường Đại học Hồng Đức – Khoa học Tự nhiên, Kỹ thuật và Công nghệ |  |  |
| 0866-7780 | – | Tạp chí Khoa học Trường Đại học Phú Yên |  |  |
| 3126-2775 | 3126-3267 | Tạp chí Khoa học Trường Đại học Tân Tạo |  |  |
| 3093-3838 | 3093-3862 | Tạp chí Khoa học và Công nghệ Y Dược |  |  |
| 2588-1329 | – | Tạp chí Khoa học và công nghệ Trường Đại học Hải Dương |  |  |
| 3093-3625 | – | Tạp chí Nghiên cứu Châu Á – Thái Bình Dương |  |  |
| 2354-0834 | 2734-9527 | Tạp chí Pháp lý |  |  |
| – | 3093-3595 | Tạp chí Phòng cháy và Chữa cháy điện tử |  |  |
| 2815-6358 | – | Tạp chí Răng Hàm Mặt Việt Nam |  |  |
| 3093-3544 | 3093-3765 | Tạp chí Y Dược Đại học Y khoa Vinh |  |  |
| 2815-5718 | – | Tạp chí khoa học công nghệ và phát triển |  |  |
| 3093-365X | – | Tạp chí khoa học Đại học Gia Định |  |  |
| 3093-3951 | – | Tạp chí Địa lý nhân văn và Phát triển bền vững. Kỳ: Phát triển bền vững Vùng |  |  |
| 2588-1229 | – | Vietnam Journal of Agricultural Sciences |  |  |
| 3093-3137 | – | Vietnam Journal of Agriculture and Environment |  |  |
| 0866-7167 | – | Vietnam Journal of Earth Sciences |  |  |
| 3093-3781 | – | Vietnam Journal of Sociology and Psychology |  |  |
| 2719-5872 | 2719-3004 | Vietnamese Journal of Legal Science |  |  |

## 3. Mức 3: thí điểm công bố trong nước theo hồ sơ (Trường Đại học Y Hà Nội, mã `hmu`)

Chọn Trường Đại học Y Hà Nội vì có 2.063 hồ sơ trong ProFind (1.900 hồ sơ đang công tác, không nghi gộp, không dữ liệu mẫu), nằm trong khoảng 2.000 đến 3.000, và tạp chí y học tiếng Việt có tên tác giả đầy đủ có dấu, dễ khớp chắc. Trường Đại học Cần Thơ chỉ có 1.338 hồ sơ nên không chọn.

### 3.1. Cách làm

1. Quét bản ghi STI nhắc tới trường: hai truy vấn "Đại học Y Hà Nội" và "Hanoi Medical University" (46 yêu cầu). Lấy tường minh: mã, DOI, nhan đề, năm, ISSN, tên tạp chí, trích dẫn, danh sách tên tác giả và danh sách cơ quan của công bố. **Không đọc `pCccd`** hay trường cá nhân nào khác. Danh sách `authors[]` có tên nhưng hầu như không có cơ quan, nên cơ quan chỉ có ở mức công bố (`nCoQuanTacGia`, các cơ quan cách nhau dấu chấm phẩy), không gắn được với từng tác giả.
2. Khớp với hồ sơ ProFind của trường theo quy tắc chắc (`scripts/pilot-sti-pubs.mjs`, hàm `decide`). Ưu tiên độ chính xác hơn độ phủ, **không khớp chỉ theo tên**:
   - `d` khớp DOI;
   - `t` họ tên chuẩn hóa trùng + cơ quan + năm + ngành, và nhan đề trùng một công trình đã có của hồ sơ (bằng chứng độc lập về danh tính, dùng được cả với tên phổ biến);
   - `ni` họ tên + cơ quan + năm + ngành + ISSN trùng ISSN một công trình khác của hồ sơ, tên không phổ biến;
   - `n` họ tên + cơ quan + năm + ngành, tên không phổ biến.
   - Họ tên chuẩn hóa: bỏ dấu, chữ thường, chỉ cho phép xoay vòng thứ tự các tiếng (OpenAlex hay đưa họ ra cuối: "Minh-Triet Tran" = "Trần Minh Triết"), không cho đảo tùy ý ("Phúc Hoàn" khác "Hoàn Phúc").
   - Cơ quan: danh sách cơ quan của công bố chỉ gồm trường (kể cả "Bệnh viện Đại học Y Hà Nội", "Viện … thuộc trường"); công bố còn cơ quan khác thì bỏ vì không biết tác giả thuộc cơ quan nào.
   - Năm: trong khoảng [năm công bố đầu của hồ sơ - 5, năm cuối + 1].
   - Ngành: ngành chính của hồ sơ phải là ngành chủ yếu của trường (chiếm từ 5% số hồ sơ; ở `hmu` là y học, dược, sinh học), loại hồ sơ gộp lẫn ngành lạ.
   - Tên không phổ biến: dưới 5 hồ sơ cùng tên (xoay vòng) trong toàn ProFind.
   - Bỏ qua: tên dưới 3 tiếng hoặc có chữ viết tắt (101 hồ sơ); tên trùng nhau giữa các hồ sơ trong trường (hồ sơ tách đôi hoặc người trùng tên); hồ sơ không dấu mà STI có nhiều cách viết có dấu cho cùng tên, hoặc có dấu nhưng khác dấu của STI.
3. Kết quả: `data/sti-pubs-pilot.json` (khoá theo mã tác giả ProFind; mỗi mục: mã STI, nhan đề, năm, ISSN, tên tạp chí, trích dẫn, lý do khớp) và `public/data/sti-pilot.json` (bản gọn, chỉ tải khi mở hồ sơ thuộc trường thí điểm). Hồ sơ không có kết quả thì không hiện mục.

### 3.2. Số liệu

| Chỉ tiêu | Số |
|---|---|
| Bản ghi STI quét được | 3.668 (hai truy vấn, loại trùng) |
| Trong đó nhắc tới trường ở danh sách cơ quan | 1.137 |
| Hồ sơ ProFind của trường đưa vào khớp | 1.900 |
| **Cặp (hồ sơ, công bố STI) được nhận** | **485** |
| Hồ sơ có ít nhất một công bố được nhận | 227 (11,9% số hồ sơ) |
| Theo lý do: khớp DOI (`d`) | 0 (0%) |
| Theo lý do: tên + cơ quan + năm + nhan đề đã có (`t`) | 82 (16,9%) |
| Theo lý do: tên + cơ quan + năm + ISSN đã có (`ni`) | 84 (17,3%) |
| Theo lý do: tên + cơ quan + năm (`n`) | 319 (65,8%) |
| Số cặp bị loại theo lý do (một cặp có thể bị loại vì lý do đầu tiên gặp) | trùng tên trong trường 3.870; nhiều cơ quan 327; tên phổ biến 103; dấu khác 54; ngành lệch 32; năm không hợp lý 29; dấu không rõ 30 |

Nhận xét: DOI gần như không dùng được (STI hầu hết không có DOI; trong 1.137 bản ghi nhắc tới trường chỉ 4 bản ghi có DOI và không bản ghi nào trùng DOI công trình của hồ sơ); độ phủ thấp có chủ ý (khoảng 12% hồ sơ). Số lớn nhất bị loại là tên trùng nhau giữa các hồ sơ cùng trường, cho thấy ProFind có nhiều hồ sơ tách đôi hoặc người trùng tên. Phân bố năm của công bố được nhận: 2020 (54), 2021 (17), 2023 (5), 2024 (106), 2025 (186), 2026 (117); STI nạp theo đợt nên 2021 đến 2023 thưa.

### 3.3. Ước lượng độ chính xác bằng kiểm tay (kiểm tra nội bộ, không thay thế kiểm toán)

Người thực hiện (trợ lý AI) tự đọc 40 cặp (hồ sơ, công bố) rút ngẫu nhiên (hạt giống 99) từ kết quả cuối, không nhìn lý do khớp khi đánh giá. Với mỗi cặp so nhan đề và tạp chí của công bố STI với nhan đề các công trình trong hồ sơ ProFind, ngành, năm và danh sách đồng tác giả; đánh giá "đúng nhiều khả năng" khi chủ đề và đồng tác giả cùng chuyên khoa, "nghi sai" khi chủ đề lệch hẳn hoặc hồ sơ ProFind trộn nhiều lĩnh vực không liên quan. Không có đối chiếu với chính tác giả nên đây chỉ là xét đoán, không phải sự thật nền.

| Mức | Số cặp trong mẫu | Đúng nhiều khả năng |
|---|---|---|
| `t` | 6 | 6 |
| `ni` | 5 | 5 |
| `n` | 29 | 24 (5 nghi sai: hồ sơ tên phổ biến hoặc hồ sơ ProFind trộn nhiều lĩnh vực) |
| Cộng | 40 | **35 (87,5%)**; khoảng tin cậy 95% xấp xỉ 73% đến 95% |

Quy tắc đã được chỉnh qua ba mẫu 40 cặp rút trước đó (mỗi mẫu một lần rút khác nhau, cùng cách đọc): mẫu 1 với khóa tên bỏ qua thứ tự tiếng, khoảng 70% đúng nhiều khả năng; mẫu 2 sau khi chỉ cho phép xoay vòng thứ tự tên, khoảng 87%; mẫu 3 sau khi thêm lọc ngành chính, khoảng 78% (nhiều ca tên phổ biến), từ đó thêm điều kiện "tên không phổ biến" và mức `t`. Mẫu cuối (87,5%) rút sau khi chốt quy tắc, không dùng để chỉnh thêm. Mẫu chỉ 40 cặp, một số tác giả xuất hiện hai lần, người đánh giá cũng là người viết quy tắc, nên con số chỉ mang tính tham khảo và sai số lớn. Lỗi còn lại tập trung ở mức `n` (chỉ tên + cơ quan + năm + ngành) với tên không dấu hoặc hồ sơ ProFind bị trộn nhiều người. Vì vậy giao diện hiện rõ lý do khớp từng mục, ghi "chưa xác thực", và người dùng có thể báo sai qua biểu mẫu đính chính.

### 3.4. Rủi ro và việc tiếp theo

- Dữ liệu STI chưa có điều khoản tái sử dụng: cần xin phép bằng văn bản trước khi mở rộng sang trường khác hoặc đưa vào xuất dữ liệu; hiện chỉ lưu tham chiếu tối thiểu và dẫn về bản ghi gốc.
- Cơ quan chỉ ở mức công bố nên công bố nhiều cơ quan bị loại (327 cặp); nếu STI mở trường cơ quan theo từng tác giả (`pOrgan`) thì độ phủ tăng đáng kể.
- Hồ sơ ProFind bị trộn nhiều người (OpenAlex) làm sai ngành chính; đã có lọc ngành nhưng không loại hết.
- Nếu mở rộng: xin phép STI, thêm bước kiểm tay lớn hơn (hàng trăm cặp, có người đọc), cân nhắc chuyển hẳn sang khớp theo định danh (ORCID) nếu STI công bố.

## 4. Mức 4: chức danh (học hàm, học vị) từ hồ sơ nhà khoa học STI

**Đây là quyết định của quản trị viên (Lương Việt Hoàng, Viện ISA) ngày 13/10/2026, khi STI.gov.vn chưa trả lời thư xin phép.** Quản trị viên chịu trách nhiệm và liên hệ STI song song; nếu STI từ chối thì gỡ ngay (xóa `public/data/sti-titles.json`, `src/StiTitle.tsx`). Quy tắc chi tiết: `data/sti-titles-rules.md`; script `scripts/build-sti-titles.mjs` (`npm run d:sti-titles`); test `test/sti-titles.test.mjs`.

Cách lấy: `POST /api/public/v2/profiles/search?page=N&size=100`, thân `{}` (trang bắt đầu từ 1), 385 yêu cầu tuần tự, nghỉ 0,6 giây, một lần tải, 38.487 hồ sơ. Chỉ giữ họ tên, học hàm, học vị, lĩnh vực, cơ quan, trạng thái ở thư mục tạm ngoài kho (đã xóa); không lưu mã cán bộ, giới tính, `pCccd`. Tệp sinh ra chỉ có mã tác giả ProFind -> chức danh.

### 4.1. Số hồ sơ được bổ sung (5 trường: hmu, hust, ctu, yds, ctump)

Hồ sơ ProFind đang công tác ở 5 trường: 7.118. **Bổ sung 231 hồ sơ (3,2%).**

| Chức danh | Hồ sơ |
|---|---|
| PGS.TS | 74 |
| GS.TS | 13 |
| GS.TSKH | 1 |
| TS | 104 |
| TSKH | 2 |
| ThS | 37 |

Theo trường: ctu 111, hust 84, yds 18, hmu 14, ctump 4. Độ phủ thấp có chủ ý: các lý do loại lớn nhất là STI không có hồ sơ cùng tên trong đơn vị (2.913), trùng tên ở ProFind (1.454; nhiều hồ sơ tách đôi hoặc người trùng tên), tên phổ biến (851), ngành không liền mạch (551), tên ngắn/viết tắt (394), hồ sơ suspect hoặc nghi gộp/tách (170).

### 4.2. Kiểm tay mẫu mới (100 cặp ngẫu nhiên, hạt giống 20261013, rút sau khi chốt quy tắc, không chỉnh quy tắc theo mẫu này)

Người kiểm: trợ lý AI (chưa phải người kiểm độc lập). Bằng chứng độc lập: đơn vị, ngành, công trình gần đây của hồ sơ ProFind đối chiếu với cơ quan và mã lĩnh vực của hồ sơ STI; tra web công khai với 3 trường hợp GS (trang hội đồng GS của trường, tin tức).

| Kết quả | Số cặp |
|---|---|
| Đúng (người và chức danh nhiều khả năng đúng) | 90 |
| Không chắc (hồ sơ ProFind có dấu hiệu lẫn công trình nhiều chủ đề; tên xoay vòng mơ hồ; một chức danh GS chưa xác nhận được) | 8 |
| Sai (hồ sơ ProFind lẫn công trình của người khác ngành) | 2 |

- Độ chính xác chặt (ca không chắc tính là không đạt): **90/100 = 90%**, khoảng tin cậy Wilson 95%: **82,6% đến 94,5%**.
- Loại ca không chắc: 90/92 = 97,8%, Wilson 92,4% đến 99,4%.
- **Chưa đạt ngưỡng 95% (chặt) nên không mở rộng sang nhiều trường**; giữ 5 trường.

Hạn chế: người kiểm cũng là người viết quy tắc, không có xác nhận từ chính nhà khoa học; chức danh là dữ liệu STI (nhiều hồ sơ tự khai, `status` khác nhau), một trường hợp GS (Đinh Minh Quang, ĐH Cần Thơ) không xác nhận được ngoài STI (tài liệu công khai tìm thấy chỉ là hồ sơ ứng viên PGS 2020); lỗi chủ yếu do hồ sơ OpenAlex lẫn nhiều người.

### 4.3. Điều kiện mở rộng

Chỉ mở thêm trường khi (1) STI trả lời đồng ý (hoặc quản trị viên quyết định lại), (2) mẫu kiểm tay mới ≥ 100 cặp, tốt nhất có người kiểm độc lập, đạt ≥ 95% theo cách tính chặt, (3) bảng ánh xạ cơ quan của trường mới được thêm vào `EXTRA_ALIASES` và kiểm. Cân nhắc siết thêm: thêm bằng chứng nhất quán công trình-ngành để loại hồ sơ lẫn nhiều người.
