# Quy trình dựng dữ liệu ProFind

```bash
export OPENALEX_API_KEY=...                  # khóa miễn phí: openalex.org/settings/api (không ghi vào mã nguồn)
npm run d:journals -- ../edufind-khgd        # danh mục tạp chí + quy tắc điểm 28 ngành (data/journals.json, data/sjr-rules.json)
npm run d:inst                               # đơn vị: Wikipedia vi + ROR (data/institutions.json, .review.json)
node scripts/ingest-openalex.mjs --mailto <email> --only <id,id,...> --max-authors 50 --from 2021   # tác giả + công trình (cache ở data/raw/, chạy tiếp được)
node scripts/enrich-authors.mjs --mailto <email>   # quốc gia đơn vị của tác giả -> cờ "có đơn vị ngoài Việt Nam"
npm run d:index                              # chấm điểm, xếp hạng, áp dụng data/corrections.json -> public/data/
npm run d:check                              # kiểm tra nhất quán
```

- `data/raw-authors.json` và `data/raw/` là dữ liệu trung gian (không đưa vào kho). `public/data/` là sản phẩm dựng, được đưa vào kho để triển khai tĩnh.
- **Ngân sách OpenAlex**: khóa miễn phí có hạn mức ~1 USD/ngày, đặt lại lúc 00:00 UTC (07:00 giờ Việt Nam). Nạp thêm đơn vị: `data/ingest-pending.json` liệt kê các đơn vị chưa nạp được; chạy lại `ingest-openalex.mjs` (có cache, chạy tiếp được) rồi `enrich-authors.mjs` (tác giả chưa có quốc gia đơn vị có `foreign: null`, tạm không hiện ở chế độ mặc định "đơn vị tại Việt Nam").
- Bản dựng hiện tại (trước khi bổ sung đợt MOET):  212 đơn vị (39 đơn vị lớn + trường tư thục + viện nghiên cứu có mã ROR), từ 2021, tối đa 50 tác giả/đơn vị -> 6.571 tác giả, 117.906 công trình. Sau khi sửa lỗi mã ROR (xem docs/DESIGN.md) và nhập MOET: 45.459 tác giả, 568.733 công trình (tháng 10/2026), 28.208 công trình có điểm, 212 đơn vị.
- Danh sách chính thức của Bộ GD&ĐT: lưu từng trang của moet.gov.vn/co-so-giao-duc/danh-sach-cac-co-so-giao-duc thành HTML, rồi `node scripts/import-moet.mjs trang1.html trang2.html ...` (gắn `moetCode`, `official`; chưa khớp ghi ở data/moet.unmatched.json). Mới có trang STT 201-300.
- Đừng chạy lại `d:inst` khi đã nạp tác giả: ROR trả kết quả khác nhau giữa các lần nên mã đơn vị có thể đổi và làm đứt liên kết tác giả - đơn vị.
- Giới hạn đã biết: OpenAlex thường không đánh dấu tác giả liên hệ (nên điểm có thể thấp hơn thực tế); chưa phân biệt được SCIE/SSCI và kỷ yếu hội nghị; tên tác giả có thể viết tắt; ngành suy từ tạp chí là gần đúng; mỗi đơn vị chỉ lấy 50 tác giả nhiều công trình nhất nên thứ hạng chỉ so sánh trong tập đã nạp.
- Kiểm chứng: 6/6 công trình ngẫu nhiên khớp quy tắc "tác giả chính" khi đối chiếu bản ghi gốc OpenAlex.

## Nhãn "Top 2% thế giới" (Ioannidis et al., Elsevier; CC BY-NC 3.0)
- Nguồn: DOI 10.17632/btchxktzyw.9 (phiên bản 9, tháng 8/2026, công bố 07/10/2026). Trích các dòng quốc gia Việt Nam bằng `scripts/extract-top2.py` từ hai bảng: sự nghiệp (121 dòng, `data/top2/top2-vn-career-2025.json`) và năm 2025 (280 dòng, `data/top2/top2-vn-singleyr-2025.json`); bỏ cột số bài bị rút. Giấy phép riêng: `data/top2/LICENSE-NC.md`. `scripts/match-top2.mjs` khớp theo tên + đơn vị; ca chưa chắc ở `data/top2/review.json`, quyết định tay ở `data/top2/overrides.json`. Nhãn mang `scope` (career hoặc y2025), tự trích dẫn và cờ `inNs` (còn đạt tiêu chí khi loại tự trích dẫn). Hồ sơ mang nhãn KHÔNG còn được miễn quy tắc "liên kết chính ở nước ngoài".
- `node scripts/match-top2.mjs`: khớp theo tập từ của tên + đơn vị -> `data/top2/matches.json`; ca chưa chắc ở `data/top2/review.json`; quyết định tay ở `data/top2/overrides.json`. Hiện gắn 42/94 người (nhiều người là nhà khoa học nước ngoài có đơn vị phụ tại Việt Nam, hoặc chưa nằm trong tập tác giả đã nạp). Sau đó `npm run d:index`.
- Khi có phiên bản mới của bộ dữ liệu (thường tháng 9-10 hằng năm): tải bảng career mới, quét `cntry = vnm`, thay tệp JSON, chạy lại match.
- Việc không có tên trong danh sách không có nghĩa tác giả ít được trích dẫn; giao diện chỉ hiện nhãn cho người có tên, và không dùng danh sách để chấm điểm.

## Ngành và liên ngành của tác giả (xem mục Phương pháp trên trang PRO-SCORE1000™)
- Hai nguồn độc lập: (1) phiếu theo danh mục tạp chí (phần "Ngành của từng tạp chí" trong `scripts/build-index.mjs`; trọng số idf nay lấy căn bậc hai, `DISC_IDF_POW`, mặc định 0,5); (2) chủ đề công trình theo OpenAlex (`scripts/fetch-author-topics.mjs` -> `data/author-topics.json`), quy đổi sang 28 ngành bằng `data/discipline-crosswalk.json` (239 tiểu lĩnh vực; trọng số do người xây dựng đặt theo nội dung, có thể sửa).
- Kết hợp: tỉ trọng = 0,5 × chủ đề + 0,5 × tạp chí (quân sự và an ninh chỉ theo tạp chí); giữ tối đa 3 ngành có tỉ trọng từ 20%. Kết quả trong `profind.json`: `disciplines` (ngành chính trước), `discShares` (% mỗi ngành), `discBasis` (`dong-thuan`, `lien-nganh`, `khac-biet`, `tap-chi`, `chu-de`, `hieu-chinh`). `corrections.setDisciplines` vẫn là đính chính cuối và áp dụng cả cho chấm điểm công trình.
- `scripts/pro-score.mjs`: bách phân vị, trung bình ngành (làm trơn Bayes) và trần trích dẫn được tính theo từng ngành rồi trộn theo `discShares`.
- `data/discipline-review.json`: hồ sơ có hạng mà hai nguồn bất đồng (xem lại, đính chính bằng `setDisciplines`).
- `scripts/build-unit-parent.mjs` -> `data/unit-parent.json`: quan hệ đơn vị cha - con (ROR, website *.vast.vn/*.vnu.edu.vn..., quy tắc cho 6 hệ thống đại học); `build-index.mjs` xuất `parent` trong `institutions`; bộ lọc đơn vị gồm người ở đơn vị con, chỉ tính đơn vị hiện tại (tuỳ chọn "gồm cả người từng công tác"), cột đơn vị chỉ hiện đơn vị cụ thể nhất.
- `scripts/fetch-orcid-names.mjs` + `scripts/normalize-names.mjs` -> `data/name-order.json`: đưa tên Việt viết kiểu phương Tây ("Nhat Quang Minh Tran") về thứ tự Việt ("Tran Nhat Quang Minh"); chỉ đổi thứ tự các tiếng, dùng họ khai trên ORCID hoặc quy tắc bảo thủ làm bằng chứng; `build-index.mjs` áp dụng (`corrections.rename` vẫn thắng). Chạy lại khi nạp thêm hồ sơ: `node scripts/fetch-orcid-names.mjs && node scripts/normalize-names.mjs`.
- `corrections.clearOrcid`: `{ "<mã tác giả>": "<lý do>" }` bỏ ORCID khỏi hồ sơ OpenAlex gộp nhiều người khi ORCID đó thuộc về người khác.
- Chạy lại chủ đề: `node scripts/fetch-author-topics.mjs` (xóa `data/author-topics.json` để tải lại toàn bộ). Kiểm định nội bộ: lần 1 mẫu 180 hồ sơ đọc mù (lấy dư ca bất đồng), ngành chính khớp 54% -> 70%; lần 2 (10/2026) mẫu ngẫu nhiên 180 hồ sơ (100 cũ, 80 mới), 6 trợ lý AI đọc mù, bỏ 31 hồ sơ nghi trộn, ngành chính khớp 69% (cũ 76%, mới 61%), nằm trong hai ngành đầu của máy 82%.

## Vị trí tác giả (vai trò "Chủ đạo")
- `node scripts/fetch-positions.mjs` tải vị trí từng tác giả trong từng công trình (đứng đầu, giữa, cuối, có phải liên hệ) vào `data/raw/_positions.json` (chạy lại chỉ tải công trình còn thiếu).
- `build-index.mjs` tính lại vai trò: tác giả chính = đứng đầu HOẶC là tác giả liên hệ (một hay nhiều người). Trước đây chỉ tính liên hệ khi là người duy nhất nên bỏ sót bài đồng liên hệ. Công trình thiếu dữ liệu vị trí giữ vai trò cũ. Đặt `NO_POSITIONS=1` để dựng theo cách cũ.
- Kết quả: công trình tác giả chính 160.367 → 182.201 (trên 445.839).

## Phát hiện hồ sơ gộp nhiều người
- Tab quản trị "Nghi gộp nhiều người" lấy danh sách từ API `admin-mrisk` (API nhúng `data/merge-risk.json` khi triển khai, chỉ quản trị viên đọc được; file không để ở `public/`); quyết định "Một người/Nhiều người" lưu ở Redis (`profind:mr`, op `admin-mrisk`).
- `node scripts/build-merge-risk.mjs` (chạy sau `build-index.mjs`) chấm điểm rủi ro từ số hồ sơ cùng tên, số đơn vị, entropy lĩnh vực và tỉ trọng lĩnh vực thứ ba (từ `data/author-topics.json`); ghi `data/merge-risk.json`.
- Kiểm định trên mẫu 180 hồ sơ gán nhãn: AUC 0,78; nhóm 11% cao nhất chính xác ~76%, bắt ~30% hồ sơ nghi gộp. Vì vậy chỉ dùng làm danh sách rà cho quản trị viên, không tự ẩn hay đổi hạng. Đính chính qua `corrections.json` (`suspect`, `notSuspect`, `setInstitutions`).

## Top 2% (Việt Nam) chưa gắn hồ sơ
- `find-top2.mjs` dò OpenAlex theo tên + đơn vị (ghi `found.json`, ghim vào `pinned-orcids.json`); `match-top2.mjs` gắn nhãn; `build-top2-review.mjs` ghi `data/top2/admin-review.json` (người chưa gắn kèm ứng viên) cho tab quản trị "Top 2% chưa gắn" (API `admin-t2`, chỉ quản trị viên; quyết định ở Redis `profind:t2`). Quyết định được chép ra JSON `{overrides, pins}` để đưa vào `data/top2/overrides.json` và `pinned-orcids.json`.

## "Đều đặn" (steady) và tuổi nghề
- `pro-score.mjs` tính tuổi nghề từ năm công bố đầu tiên đến năm cuối nhưng bỏ năm công bố lẻ loi ở đầu hồ sơ (cách năm kế tiếp trên 5 năm, lặp lại đến khi hết). Lý do: một bài lẻ cũ (thường của người khác bị gộp nhầm) kéo tuổi nghề dài ra và làm điểm "Đều đặn" thấp oan (ví dụ hồ sơ A5061727008 có bài năm 1964: 39 -> 73). Ảnh hưởng 1.559 hồ sơ có hạng, chỉ làm điểm tăng.

## SEO
- Trang tĩnh do `scripts/build-seo-pages.mjs` sinh sau `vite build`: `/don-vi/`, `/nganh/`, `/tinh-thanh/`, `/pro-score/` và `/top-2-phan-tram/` (Top 2% thế giới: số liệu theo lĩnh vực, trường/viện, FAQ có dữ liệu cấu trúc FAQPage, nguồn và giấy phép). Chỉ số liệu tổng hợp, không nêu tên cá nhân. Trang đơn vị có thêm số hồ sơ thuộc Top 2% (ô thống kê và mô tả).
- Trang chủ (`index.html`): tiêu đề, mô tả (khoảng 140 ký tự), từ khóa và văn bản dự phòng trong `#root` nhắm các truy vấn tiếng Việt (tra cứu/xếp hạng nhà khoa học Việt Nam, top 2% thế giới, ORCID, ISSN, DOI). Sitemap: `dist/sitemap.xml`. Liên kết nội bộ: thanh trên của trang tĩnh và chân trang ứng dụng trỏ tới `/top-2-phan-tram/`.

## Trang hồ sơ tóm tắt cho nhóm Top 2%
- `build-seo-pages.mjs` tạo `/tac-gia/<tên>-<mã>/` cho hồ sơ có nhãn Top 2% (không nghi gộp), gồm: nhãn và hai số thứ tự của bộ dữ liệu gốc, số công trình/trích dẫn/chỉ số h, đơn vị, ngành, 5 công trình được trích dẫn nhiều (trừ bài đã loại), ORCID/OpenAlex, dữ liệu cấu trúc ProfilePage/Person. Không đưa PRO-SCORE1000™ và hạng của ProFind vào trang tĩnh.
- Gỡ trang theo đề nghị: thêm mã vào `data/seo-exclude.json` (`ids`) rồi dựng lại. Tên hiển thị lấy từ hồ sơ ProFind (đính chính bằng `corrections.rename`).
- Trang `/top-2-phan-tram/` và trang đơn vị liên kết tới các trang này.

## Tác giả cuối và chỉ báo "Chủ đạo"
- `build-index.mjs` đánh dấu `last = 1` cho công trình có từ 3 tác giả mà tác giả đứng cuối không phải đứng đầu hay liên hệ. Vai trò `lead` (dùng cho điểm công trình HĐGSNN) không đổi.
- `pro-score.mjs` chỉ tính `last` vào chỉ báo "Chủ đạo" ở nhóm ngành có quy ước (`data/last-author-disciplines.json`: y sinh, hóa, sinh, kỹ thuật); công trình tạp chí nhiều ngành chỉ tính khi mọi ngành của tạp chí nằm trong danh sách, công trình chưa rõ ngành dùng ngành chính của tác giả. Sửa danh sách ngành ở file JSON rồi dựng lại.
- Đo ảnh hưởng trước khi áp dụng: Spearman 0,996 với bản cũ khi áp cho mọi ngành; áp cho nhóm ngành này, hạng đổi trung vị 33 bậc (p90 160), top 100 giữ 96, top 1000 giữ 967.

## Tách công trình khỏi hồ sơ gộp nhiều người
- `corrections.assignWorks`: `{ "<mã công trình A…-W…>": "<mã tác giả đích>" }` chuyển từng công trình sang hồ sơ đúng người (hồ sơ đích phải có trong dữ liệu: ghim bằng `data/pinned-orcids.json`). Vai trò tác giả vẫn tra theo mã gốc. Kết hợp `rename`, `setInstitutions` và `data/scholar.json` để hoàn thiện hồ sơ mới.
- `data/namesakes.json`: ghi lại các người trùng tên đã được quản trị viên xác nhận là khác người (kèm mã Google Scholar), để không gộp nhầm về sau.
- Ví dụ: Nguyễn Hoàng Anh (Đại học Đồng Tháp, Scholar 6V_gx5cAAAAJ) tách khỏi hồ sơ gộp A5101797172.

## Báo chủ hồ sơ khi công trình "không phải của tôi" đã xử lý
- Chủ hồ sơ đã xác thực bấm "không phải của tôi": mã công trình vào Redis `profind:xw` và bị ẩn ngay trên hồ sơ. Quản trị viên chép JSON `excludeWorks` vào `data/corrections.json`; sau khi dựng lại, công trình biến khỏi `public/data/works/wNNNN.json (khối theo mã tác giả, 1024 khối)`.
- `api/account.js` `op=xw-sweep` (Vercel Cron mỗi ngày 02:00 UTC = 09:00 giờ Việt Nam, kèm `Authorization: Bearer $CRON_SECRET`; hoặc nút "Quét ngay" và tự quét khi quản trị viên mở tab Xác thực): với từng chủ hồ sơ, mã nào không còn trong dữ liệu đang chạy là "đã xử lý". Hệ thống gửi MỘT thư gộp cho email đã xác thực (mẫu `worksRemovedMail` trong `api/_mail.js`, vi/en, kèm liên kết hủy thư thông tin), chuyển các mã sang nhật ký `profind:xwdone` (lưu 90 ngày rồi tự xóa) và bỏ khỏi danh sách chờ.
- Lần quét đầu tiên (khi mới bật, khóa `profind:xwstart`): các công trình đã xử lý từ trước chỉ được dọn và ghi nhật ký (`backlog`), không gửi thư hàng loạt. Chủ hồ sơ không có email xác thực: dọn, không gửi (`no-email`). Gửi lỗi: thử lại ở lần quét sau, tối đa 3 lần rồi ghi `failed`.
- Cần đặt biến môi trường `CRON_SECRET` trong Vercel (chuỗi ngẫu nhiên dài); thiếu biến này, lịch tự động bị từ chối (403), còn nút "Quét ngay" vẫn dùng được.


## Gợi ý hồ sơ sau đăng ký ("Nhà khoa học này có phải bạn?")

- `node scripts/build-suggest-index.mjs` (refresh.mjs đã gọi) tạo `public/data/suggest.json` (khoảng 1,5 MB, 450 KB nén): tên, đơn vị, số công trình, trích dẫn, năm cuối, ORCID, nhãn Top 2% của từng tác giả, kèm bảng tên miền email -> đơn vị. Tên miền lấy từ `data/email-domains.json` (ghi tay những tên miền chắc chắn) và tự thêm `<viết tắt>.edu.vn` cho mọi đơn vị có viết tắt; tên miền không biết thì chỉ bỏ qua tín hiệu đơn vị.
- Chạy ở trình duyệt (`src/Suggest.tsx`), không gọi máy chủ: điểm = tên 40 (cùng bộ chữ sau khi bỏ dấu, chấp nhận đảo thứ tự) + đơn vị theo email 30 + đơn vị tự khai 15 + công bố trong 2 năm gần nhất 10; ORCID trùng = 100. Từ 70 là "Rất có thể", 45 đến 69 là "Có thể", dưới 45 không hiện, tối đa 3 gợi ý. Chỉnh trọng số trong hàm `suggest`.
- Người mới đăng ký được chuyển tới `#/tai-khoan/nhan-dien` ngay sau khi nhập mã; người dùng cũ vào từ nút "Gợi ý hồ sơ cho tôi" ở tab Hồ sơ khi chưa có hồ sơ xác thực.
- Chọn gợi ý không cấp xác thực: yêu cầu đi qua `claim-submit` như cũ (kiểm tra tự động hoặc quản trị viên duyệt), `note` ghi "Nguồn: chọn từ gợi ý của hệ thống (điểm, thứ tự, lý do)". Người dùng email cá nhân (Gmail…) vẫn thấy gợi ý nhưng chưa gửi tự động được (giống luồng cũ), nên có sẵn nội dung đề nghị để gửi quản trị viên.


### Gợi ý hồ sơ: email cá nhân và tên miền tổ chức
- Email cá nhân (gmail…) vẫn gửi được yêu cầu xác thực nhưng luôn vào hàng chờ quản trị viên duyệt, không bao giờ tự duyệt.
- Tên miền có nhãn `edu`, `gov` hoặc `ac` (đuôi `.vn` hay quốc tế) được coi là email tổ chức.
- Đề xuất chính: điểm ≥ 70 và hơn đề xuất kế tiếp ≥ 15 điểm; hiển thị kèm tỉ lệ % ước tính theo quy tắc so khớp (không phải xác suất thống kê).


## Công trình khác (không tính điểm)
- ProFind chỉ **tính điểm** bài tạp chí có ISSN (khớp danh mục tạp chí), chủ yếu từ 2021; công trình không ISSN (kỷ yếu, sách, bản thảo) và công trình ngoài phạm vi nạp không nằm trong `public/data/works/wNNNN.json (khối theo mã tác giả, 1024 khối)`.
- `node scripts/fetch-extra-works.mjs --mailto <email>` (cần `OPENALEX_API_KEY`; `refresh.mjs` chạy sau `build-index.mjs`) tải **đủ công trình** của một nhóm nhỏ hồ sơ từ OpenAlex (mọi năm, mọi loại) và ghi phần chưa có trong danh sách tính điểm vào `public/data/extra/<mã>.json` cùng chỉ mục `public/data/extra-index.json`. Trang hồ sơ hiện mục "Công trình khác (không tính điểm)"; điểm và hạng không đổi.
- Nhóm hồ sơ: `data/full-works-authors.json` (ghi tay, ví dụ người gửi đề nghị bổ sung) cộng hồ sơ đã xác thực (API công khai `/api/account?op=verified`, bỏ qua nếu không gọi được) và tùy chọn `--ids`. Bỏ qua hồ sơ đã gỡ (`corrections.remove`) và công trình đã loại (`corrections.excludeWorks`). Hồ sơ rời khỏi nhóm thì tệp bị xóa ở lần chạy sau.
- Chưa áp dụng cho cả 17.000 hồ sơ (tốn hạn mức OpenAlex và dung lượng); mở rộng bằng cách thêm mã vào `data/full-works-authors.json`.
- Chủ hồ sơ đã xác thực có nút "Không phải bài của tôi" ở từng công trình trong mục này như phần tính điểm: bài ẩn ngay, mã `A…-W…` vào danh sách báo của quản trị viên; sau khi đưa vào `corrections.excludeWorks` và dựng lại, `fetch-extra-works.mjs` bỏ bài đó. `xw-sweep` coi bài là "đã xử lý" chỉ khi không còn ở cả `works/wNNNN.json` lẫn `extra/<mã>.json`.

## Gộp theo ORCID chỉ khi tên tương thích (từ 11/10/2026)
- `build-index.mjs` gộp các hồ sơ OpenAlex cùng ORCID **chỉ khi tên tương thích** (sau khi bỏ dấu và chữ lẻ/viết tắt: tập từ giống nhau, một tên là tập con của tên kia, hoặc chung từ 2 từ trở lên; đảo họ tên và gạch nối đều qua). OpenAlex đôi khi gắn nhầm ORCID người này vào hồ sơ người khác; trước đây hồ sơ đó bị gộp và kéo theo đơn vị, công trình lạ (ví dụ Cao đẳng Đồng Tháp vào một hồ sơ Top 2%).
- Hồ sơ lệch tên **không bị gộp** và mất ORCID trên hồ sơ (ORCID thuộc cụm có nhiều công trình nhất); mỗi ca ghi một dòng `ORCID … gắn nhầm` trong log dựng. Muốn ẩn hẳn hồ sơ nhầm: thêm vào `corrections.remove`.
- Hồ sơ OpenAlex gộp nhiều người (cùng tên) không tách được bằng quy tắc này: dùng `corrections.excludeWorks` (ẩn công trình của người khác) và `corrections.setInstitutions` (đơn vị đúng; `[]` nếu đơn vị chưa có trong ProFind).

## Công trình bổ sung theo danh sách tác giả (Google Scholar)
- `data/manual-work-ids.json`: `{ "<mã tác giả>": ["W…", "W…:lead"] }` là mã công trình OpenAlex tìm theo nhan đề/DOI trong danh sách tác giả gửi (OpenAlex tách một người thành nhiều hồ sơ hoặc không gắn tác giả vào bài). Hậu tố `:lead` / `:co` ghi đè vai trò khi OpenAlex không có danh sách tác giả.
- `OPENALEX_API_KEY=... NODE_USE_ENV_PROXY=1 node scripts/fetch-manual-works.mjs --mailto <email>` ghi `data/manual-works.json`. Có ISSN thì `build-index.mjs` đưa vào danh sách tính điểm; không ISSN (kỷ yếu, sách) thì `fetch-extra-works.mjs` hiện ở "Công trình khác". Chạy lại `build-index.mjs` và `fetch-extra-works.mjs` sau khi sửa.
- Bài không có DOI và không có trong OpenAlex nhưng có đường dẫn công khai (ví dụ trang Google Scholar của bài): ghi đối tượng `{ "title", "year", "venue", "type", "url" }` (https, cần năm) thay cho mã W…; bài vào "Công trình khác" và mở bằng đường dẫn đó (mã nội bộ `W99…` sinh từ đường dẫn). Thiếu năm hoặc đường dẫn thì không thêm: nhờ tác giả bổ sung.

## Kỷ yếu quốc tế có ISBN do chủ hồ sơ khai (hiện điểm ngay)
- Chủ hồ sơ đã xác thực thấy nút "Đánh dấu kỷ yếu quốc tế có ISBN" ở từng công trình trong mục "Công trình khác" (bài loại kỷ yếu hoặc bài chưa có ISSN). Bấm và xác nhận: đây là kỷ yếu hội nghị quốc tế có ISBN và phản biện, và mình là tác giả đứng đầu hoặc liên hệ. Bài được cộng **điểm kỷ yếu theo ngành** ngay trên hồ sơ (quy tắc HĐGSNN khóa `conference` trong `data/sjr-rules.json`, thường 0,5; ghi ở `public/data/conf-points.json` do `build-index.mjs` sinh), có nhãn "tác giả khai" và dòng tổng ở đầu mục.
- Lưu ở Redis `profind:cf` (`{ authorId: [{ w, at }] }`), API `author-work-conf` (chủ hồ sơ; `confirm: true` để khai, `undo: true` để bỏ), công khai qua `author-public` (`cf`). Quản trị viên xem và gỡ ở tab Xác thực (`admin-claims` trả `cf`, `admin-claim-conf` gỡ).
- **Không** cộng vào `totalScore`, PRO-SCORE1000™ hay hạng (PRO-SCORE dùng trích dẫn, chỉ số h, hạng Q, số công trình, không dùng điểm từng bài); ProFind™ không kiểm chứng được ISBN và phản biện (Crossref không ghi ISBN ở cấp từng bài kỷ yếu), nên là điểm tác giả khai, quản trị viên gỡ khi phát hiện sai.
- Chạy thử: `npx esbuild api/account.js --bundle --format=esm --platform=node --outfile=/tmp/h.mjs && HANDLER=/tmp/h.mjs node test/conf-marks.test.mjs`.

## Hạng SJR dự phòng cho tạp chí Scopus ngoài bảng theo ngành (từ 11/10/2026)
- Bảng `sjrByIssn` (nhập từ EduFind) chỉ có tạp chí thuộc các danh mục SCImago mà từng ngành cấu hình, nên tạp chí đa ngành / "General …", tạp chí đã ngừng và một số tạp chí còn hoạt động không có dòng, công trình của họ không có điểm Scopus (25.535 công trình, xem `docs/SCOPUS-SOURCE-LIST.md`).
- `scripts/build-sjr-fallback.mjs` đọc các tệp SCImago "tất cả tạp chí theo năm" (`data/scimago/scimago_<năm>.csv`, tải ở scimagojr.com/journalrank.php?year=YYYY, bỏ trống lĩnh vực và danh mục, Download data; **không đưa vào kho**, ~11 MB mỗi năm; đã dùng 1999-2025) và ghi `data/sjr-fallback.json` (9.857 tạp chí chưa có dòng theo ngành): hạng Q tốt nhất, H index, Coverage, năm cuối còn trong SCImago, loại `m` (đa ngành/General), `e` (đã ngừng), `g` (còn hoạt động, thiếu dòng).
- `build-index.mjs` dùng bảng này **chỉ khi** công trình của tác giả chính chưa có ứng viên điểm nào (không khớp danh mục trong nước, không có dòng SJR theo ngành) **và** năm công bố nằm trong Coverage: điểm = `intlScore(ngành chính của tác giả, hạng Q, H index)`. Đa ngành: hạng Q trong danh mục đa ngành (hạng tốt nhất của tạp chí) áp cho mọi ngành; đã ngừng: hạng SJR năm cuối còn trong SCImago. Công trình có điểm theo cách này mang trường `fb` (`m`/`e`/`g`) trong `public/data/works/wNNNN.json (khối theo mã tác giả, 1024 khối)`. Không đổi cách suy ngành tác giả; công trình đã có điểm trước đây không đổi.
- Tạp chí ngừng trước 1999 không có trong các tệp SCImago đã nạp nên chưa có điểm (nạp thêm 1999-2012 chỉ thêm 87 công trình, vì dữ liệu ProFind chủ yếu từ 2016). Cập nhật hằng năm: tải tệp năm mới, chạy lại script, rồi `npm run d:index`.


## Hạng Q hiển thị (`jq`) và chỉ báo Chất lượng
- `build-index.mjs` gán `jq` cho công trình chưa có `quartile` (bài đồng tác giả, sách theo tập, tạp chí ngoài ngành của tác giả): hạng Q tốt nhất của tạp chí từ bảng theo ngành hoặc `data/sjr-fallback.json`. `jq` **không** làm đổi điểm công trình HĐGSNN (`score`, `quartile` giữ nguyên, chỉ bài tác giả chính được tính).
- `build-sjr-fallback.mjs` có thêm "book series" (`k = "b"`), chỉ để hiển thị; điểm dự phòng bỏ qua `k = "b"`.
- `pro-score.mjs`: chỉ báo "Chất lượng" dùng `quartile ?? jq`, tức tính cả bài đồng tác giả (theo quyết định của quản trị viên). Đo khi đổi: 42.645 hồ sơ, đổi điểm trung bình tuyệt đối 0,37; tối đa 3,2; 130 hồ sơ đổi bậc.

## Kiểm thử và dựng (cập nhật 12/10/2026)
- `npm test`: gói `api/account.js` bằng esbuild rồi chạy 6 tệp trong `test/` (scripts/run-tests.mjs).
- `npm run build` thêm bước `scripts/prune-dist.mjs`: bỏ `dist/data/_*.json` không trang nào đọc (giữ `_split-review.json`, `_multi-review.json` của trang quản trị).
- Chuỗi dựng đủ sau khi đổi `data/corrections.json`: build-index → build-current-inst (cần OPENALEX_API_KEY, có thể bỏ khi dùng bộ nhớ đệm) → build-index → build-top-works → build-wsearch → check-data → `npm run build`.
- Trang tĩnh `/don-vi/<id>/` cộng người ở đơn vị con (`parent`), khớp trang chủ.
- Hạng dự phòng SCImago: Coverage tách theo `;` hoặc `,`.

## PRO-SCORE: Đà phát triển hiệu dụng và bảng xếp hạng đơn vị (12/10/2026)
- `pro-score.mjs`: điểm dùng `momEff = momentum + s·max(0, impact − momentum)`, `s = 0,75·clamp((impact − 0,70)/0,25, 0, 1)`; `proParts.momentum` vẫn là giá trị gốc. Đo: 42.645 hồ sơ, đổi điểm TB +0,26, tối đa +13,7; 204 hồ sơ đổi bậc.
- Bảng xếp hạng đơn vị/ngành: điểm TB top 10 chỉ tính hồ sơ đủ điều kiện xếp hạng (≥10 công trình, hoạt động ≥3 năm); cột "Nhà khoa học có điểm" đếm mọi hồ sơ có điểm, người nhiều đơn vị hiện tại được đếm ở từng đơn vị.
- Quy ước: hồ sơ nhiều đơn vị vẫn được xếp hạng; chỉ hồ sơ nghi gộp nhiều người (`suspect`) hoặc liên kết chính ở nước ngoài (`abroadMain`) không xếp hạng.

## Tách profind.json (12/10/2026)
- `scripts/build-lite.mjs` (chạy đầu `npm run build`): sinh `public/data/profind-lite.json` (≈10,8 MB, nén ≈1,6 MB; không có trường chi tiết, bỏ trường null/false) và `public/data/authors/pNNN.json` (256 khối chi tiết, NNN = số trong mã tác giả chia dư 256). Cả hai nằm trong `.gitignore`.
- Trang chủ, danh sách, bảng xếp hạng và biểu mẫu xác thực tải bản lite; trang hồ sơ tải thêm khối chi tiết (`src/authorDetail.ts`) rồi ghép. Trang quản trị và người dùng dữ liệu vẫn dùng `profind.json` đầy đủ.
- Chạy `node scripts/build-lite.mjs` trước `npm run dev` nếu chưa có hai đầu ra trên.

## Tiện ích dùng chung cho script (12/10/2026)
- `scripts/lib/cli.mjs`: `arg(khóa, mặc định)` (đọc `--khóa giá trị`), `MAILTO` (địa chỉ liên hệ cho OpenAlex/Crossref; đổi bằng biến `CONTACT_MAILTO`), `tmpFile(tên)` (đường dẫn tạm theo hệ điều hành thay cho `/tmp` cứng). 30 script đã dùng chung `arg`.
- Hàm `norm` ở các script có công thức khác nhau (một số gộp "TP.HCM", bỏ "trường/the/of", giữ chữ số…) nên **không** gộp chung; khi sửa cần đối chiếu từng nơi dùng.
- `api/_claim.js` đọc địa chỉ liên hệ từ biến môi trường `CONTACT_MAILTO` (mặc định như cũ).

## Đơn vị con chưa có hồ sơ (12/10/2026)
15 đơn vị con trong `data/unit-parent.json` (trường/phân hiệu thuộc ĐHQGHN, ĐHQG-HCM, Huế, Đà Nẵng, Thái Nguyên, Cần Thơ) không có hồ sơ vì OpenAlex không có bản ghi riêng (tra theo tên ở nước VN không ra), cơ quan ghi gộp vào đơn vị cha. Đã bỏ khỏi `unit-parent.json`; `build-unit-parent.mjs` tự bỏ đơn vị con chưa có hồ sơ khi có `public/data/profind.json`.

## Liên kết quốc tế (12/10/2026)
- Quyết định của quản trị viên: hồ sơ "liên kết chính ở nước ngoài" (`abroadMain`) nhưng có ≥ 3 công trình ghi cơ quan Việt Nam trong 5 năm gần đây (`vnWorks5`, từ `scripts/lib/abroad.mjs` `vn5`; ngưỡng `INTL_MIN` ở `build-index.mjs`) được đánh dấu `intl`, vẫn được chấm PRO-SCORE bằng cùng công thức và cùng phân bố tham chiếu của nhóm trong nước (không góp vào phân bố), và có hạng gồm cả nhóm này `proRankAll`.
- Hạng và điểm trong nước (`proRank`, `pro` của hồ sơ trong nước) **không đổi** (đã kiểm: 0 hồ sơ đổi). 994 hồ sơ `intl`, 830 hồ sơ có `proRankAll`.
- Bảng xếp hạng (`leaderboard.json`) có thêm `unitsAll`/`fieldsAll`; ô "Gồm cả hồ sơ liên kết quốc tế" (mặc định bật) chuyển sang các bảng này. Trang hồ sơ có nhãn "Liên kết quốc tế" và khung giải thích kèm hạng gồm liên kết quốc tế.

## Danh mục Scopus tháng 9/2026 và Top 2% bản 8/2026 (12/10/2026)
- `scripts/import-scopus-list.py <ext_list_Sep_2026.xlsx>` → `data/scopus-sources.json` (15.407 ISSN của công trình đã tính điểm Scopus hoặc có hạng hiển thị; mỗi ISSN có thể nhiều bản ghi tên cũ/mới). `build-index.mjs` chỉ tính điểm Scopus khi năm công bố (≤ 2025) nằm trong Coverage của đúng nguồn (cùng ISSN và cùng tên); không đủ căn cứ thì giữ như cũ. Đo: 5.966 công trình (ISSN + tên khớp, năm ngoài Coverage) không còn điểm Scopus; PRO-SCORE hầu như không đổi (±1,7), 1.023 hồ sơ giảm tổng điểm HĐGSNN.
- Top 2% (Mendeley Data v9, 8/2026; 121 người sự nghiệp ở 44 cơ sở, 280 người năm 2025): tệp Drive đúng bằng bản đang dùng. Khớp thêm 15 tên bằng `data/top2/overrides.json` (ghim thủ công sau rà soát), gộp 2 hồ sơ của Phạm Việt Thanh; `data/top2/matches.json` giữ các khớp đã được quản trị viên duyệt (không chạy lại `match-top2.mjs` đè lên, vì script chỉ sinh khớp tự động). Nhãn Top 2%: 225 → 240 hồ sơ; sự nghiệp khớp 98/121.

## Rà hồ sơ Top 2% (2026-10)

240 hồ sơ có nhãn Top 2% được rà bài lạc (bài của người trùng tên) theo cách đã làm với A5008082871: nhóm bài nghi ngờ khách quan (cơ quan/ngành/ORCID khác) do bộ lọc heuristic lập, sau đó chuyên viên AI nhận định từng bài. Chỉ tách khi cả hai điều kiện cùng đúng; không động vào hồ sơ đã xác thực; không tách quá 40% số bài của một hồ sơ. Kết quả: 77 hồ sơ, 465 bài đưa vào `excludeWorks`.

## Quét đơn vị gán sai theo cơ quan ghi trên bài (2026-10)

Với 982 hồ sơ có điểm đơn vị hiện tại yếu (< 0,3), tải cơ quan ghi gốc trên từng bài từ OpenAlex và đối chiếu với tên đơn vị. Kết quả: lỗi dạng "cơ quan là công ty hoặc nơi khác nhưng bị gán một trường" rất hiếm (5 hồ sơ, đã sửa bằng `setInstitutions`; hồ sơ Nghia Nguyen-Trong là trường hợp đầu tiên). Phần lớn cảnh báo còn lại là đơn vị con/cha hoặc cách viết tên khác nhau, không phải lỗi.

Nhóm 1.484 hồ sơ có đơn vị nhưng chưa có điểm đơn vị hiện tại cũng được quét theo cách trên (tải cơ quan ghi gốc trên bài, đối chiếu tên đơn vị và đơn vị cha). 462 hồ sơ không có đơn vị nào xuất hiện trong cơ quan ghi; trong số đó 102 hồ sơ không có bất kỳ cơ quan Việt Nam nào trên mọi bài và không phải hồ sơ đã nhận, ghi tay hay đã đính chính đơn vị. 102 hồ sơ này được xóa đơn vị bằng `setInstitutions`. 360 hồ sơ còn lại có cơ quan Việt Nam nhưng khác tên đơn vị đang gán (đa phần là khác cách viết tên); để nguyên.

Quy tắc xếp hạng bổ sung (2026-10): hồ sơ không có đơn vị nào và không có công trình nào ghi cơ quan Việt Nam (vnShare không dương, vnWorks5 = 0) không có bằng chứng liên kết với Việt Nam nên `rankable = false`. Áp dụng cho 5 hồ sơ vừa bị xóa đơn vị sai (P. C. Robert, M. Galoux, Madeleine Leclercq, Pichet Grudloyma, Tu Hoang Nhan); nhóm xếp hạng giảm 5 hồ sơ.

## Độ tin cậy hồ sơ `prov` (2026-10)

`build-index.mjs` gắn `prov` cho mỗi hồ sơ (sau khi áp dụng `corrections.json` và `current-inst.json`). `prov.fix` = `{ excl, assign, merged, units }`: số mã trong `excludeWorks` có tiền tố `<id>-`, số mục `assignWorks` có đích là hồ sơ, số hồ sơ đã gộp vào hồ sơ (`merge[].from`), và `units` = có `setInstitutions[id]`; bỏ `fix` khi mọi số bằng 0 và `units` sai. `prov.instEv`: `set` (có `setInstitutions`, kể cả rỗng), `none` (không có đơn vị), `works` (điểm cao nhất của đơn vị đang công tác trong `current-inst.json` ≥ 0,3), `weak` (còn lại). `prov` nằm trong DETAIL của `build-lite.mjs` (chỉ có ở khối `authors/pNNN.json`, không phình tệp lite). Kiểm bởi `check-data.mjs` và `test/prov.test.mjs`.

## Công bố theo năm của đơn vị (2026-10)

`node scripts/build-unit-years.mjs` (chạy sau `build-index.mjs`; không nằm trong `npm run build`) đọc `public/data/profind.json` và các khối `public/data/works/wNNNN.json`, ghi `public/data/unit-years.json` = `{ meta:{built,from,to}, units:{ <đơn vị>:{ t:[tổng/năm], s:[số tính điểm/năm] } } }`, năm 2010..năm hiện tại. Mỗi công trình đếm một lần cho mỗi đơn vị (khử trùng theo phần mã sau dấu "-" trong id), gồm đơn vị con; hồ sơ và đơn vị "đang công tác" theo định nghĩa của `src/School.tsx`; tính điểm = `score` hoặc `quartile` khác null. Chỉ giữ đơn vị có từ 20 công trình. Dùng bởi `src/UnitTrend.tsx` (trang Nhà trường); kiểm bởi `test/unit-years.test.mjs`.

## Gợi ý bài báo và tạp chí liên quan (`related.json`)
`node scripts/build-related.mjs` (8 giây, chạy sau build-index) ghi `public/data/related.json` (khoảng 270 KB, 28 ngành): 40 bài nhiều trích dẫn mỗi năm và 20 tạp chí Q1/Q2 có nhiều bài của hồ sơ ProFind nhất từ 2022. Trang hồ sơ chỉ tải tệp này khi người dùng bấm "Xem gợi ý", chọn 5 bài gần tiêu đề công trình của hồ sơ nhất và tối đa 8 tạp chí (tạp chí hồ sơ đã đăng xếp sau). Liên kết sang EduFind theo `/<ngành>/?tab=international&q=<ISSN>`, sang Ami và Mây theo cổng `/go` (không truyền tham số riêng).
