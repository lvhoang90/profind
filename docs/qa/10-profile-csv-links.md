# Báo cáo kiểm thử 10: Hồ sơ tác giả, liên kết EduFind, xuất CSV (ProFind, bản 127.0.0.1:4300)

Phạm vi: đọc mã `src/App.tsx` (AuthorPage, hash()), dữ liệu 6.876 tác giả và 6.038 tệp works, Playwright 37 hồ sơ (30 ngẫu nhiên + 7 ca biên), curl 10 liên kết EduFind. Ảnh: /tmp/claude-0/qa/shots/10-*.png. Script: /tmp/claude-0/qa/scripts-10/.

## Lỗi đã xác minh

### 10-A1 | P1 | Race condition: công trình của hồ sơ A hiện ở hồ sơ B (và CSV xuất sai)
- Ở đâu: `AuthorPage`, useEffect tải `./data/works/${a.id}.json` (App.tsx dòng ~112), không hủy/kiểm tra id khi phản hồi về.
- Tái hiện: mở `#/tac-gia/A5100404947` (2.509 công trình, tải chậm), chưa xong thì đổi sang `#/tac-gia/A5110200615` (Vũ Chí Dũng, 70 công trình). Trong script t3.js, giả lập trễ 3 giây cho A.
- Mong đợi: hồ sơ B hiện 70 công trình của B. Thực tế: B hiện 70 dòng, khi phản hồi A về thì bảng đổi thành 100 dòng của A (phân trang 100/2.509) dưới tên Vũ Chí Dũng. Nút "Tải CSV" khi đó xuất tệp `A5110200615.csv` chứa công trình của A. Dữ liệu sai gắn tên người khác.
- Bằng chứng: log "race: ... rows before 70, after 100 (B has 70)"; ảnh 10-race.png. Mạng chậm hoặc bấm nhanh qua lại sẽ gặp.
- Gợi ý sửa: trong effect dùng cờ `let alive = true` và `return () => { alive = false }` (hoặc AbortController), chỉ setWorks khi alive. Có thể kiểm `w[0].id.startsWith(a.id)`.

### 10-A2 | P1 | Hash sai định dạng URI (vd `#/tac-gia/%E0%A4%A`) làm trắng cả trang
- Ở đâu: `hash()` dòng 11 gọi `decodeURIComponent` không bọc try/catch, dùng trong `useState(hash())`.
- Tái hiện: mở trực tiếp (hoặc F5) `http://127.0.0.1:4300/#/tac-gia/%E0%A4%A`.
- Mong đợi: trang lỗi/không tìm thấy hoặc về danh sách. Thực tế: lỗi "URI malformed", `#root` rỗng, toàn bộ ứng dụng trắng (không cả header). Nếu đổi hash khi đang chạy, sự kiện hashchange ném lỗi và giữ nguyên route cũ.
- Bằng chứng: pageerror "URI malformed", root innerText length 0; ảnh 10-malformed.png. Một liên kết chia sẻ bị cắt cụt hoặc dán sai là đủ gây ra.
- Gợi ý sửa: bọc try/catch, trả về chuỗi gốc hoặc "" khi lỗi.

### 10-A3 | P2 | Id không tồn tại hiện danh sách im lặng, không báo "không tìm thấy hồ sơ"
- Ở đâu: App.tsx dòng 41: `kind === "tac-gia" && author ? ... : <List/>`.
- Tái hiện: `#/tac-gia/xxx`, `#/tac-gia/`, `#/tac-gia/%20`, `#/tac-gia/a5100404947` (sai hoa/thường), `#/tac-gia/A5100404947%20`.
- Mong đợi: thông báo "Không tìm thấy tác giả" + nút về danh sách. Thực tế: hiện thẳng danh sách 100 dòng, URL vẫn là hồ sơ; người dùng tưởng danh sách là hồ sơ. Id viết thường không được chấp nhận.
- Gợi ý sửa: khi data đã tải và kind==="tac-gia" mà không tìm thấy, hiện trạng thái not-found (có thể so khớp id không phân biệt hoa thường). Tương tự `#/dinh-chinh/xxx` hiện form đính chính không gắn tác giả.

### 10-A4 | P2 | CSV injection: ô tiêu đề bắt đầu bằng `+` hoặc `-` không được vô hiệu hóa
- Ở đâu: hàm `esc` trong `csv()` (dòng ~116) chỉ nhân đôi dấu `"`.
- Dữ liệu thật: quét toàn bộ works, 6 công trình có tiêu đề bắt đầu bằng ký tự công thức: `+ MỘT SỐ THÔNG TIN VỀ VẮCXIN PHÒNG BỆNH COVID-19` (A5157426694) và `- One Health surveillance for influenza A viruses in Vietnam` (A5101402833, A5088722020, A5000889109, A5071360816, A5058523199). Không có tiêu đề/tên tạp chí bắt đầu bằng `=` hoặc `@`, không có ISSN lạ (mọi ISSN dạng NNNN-NNNN).
- Mong đợi: ô văn bản được giữ nguyên. Thực tế: tệp CSV tải về có `"+ MỘT SỐ ..."`; Excel vẫn coi ô bắt đầu bằng `+`/`-` là công thức (thường ra #NAME?/#VALUE! hoặc cảnh báo). Mức độ thực tế thấp hiện nay (không có payload `=cmd`), nhưng dữ liệu OpenAlex do bên thứ ba nhập nên rủi ro tiềm tàng.
- Gợi ý sửa: nếu chuỗi khớp `/^[=+\-@\t\r]/` thì thêm tiền tố `'` (hoặc khoảng trắng) trước khi bọc ngoặc kép. Áp dụng cho title, journal.

### 10-A5 | P2 | Hồ sơ 0 công trình (838 tác giả): 838 yêu cầu 404, bảng rỗng không có thông báo
- Ở đâu: không có tệp `works/<id>.json` cho 838 tác giả có worksCount=0; fetch trả 404 (console lỗi), `catch` gán `[]`.
- Tái hiện: `#/tac-gia/A5014924659`. Thực tế: thẻ "0/0", "0%", hạng #6039, nút CSV bị vô hiệu hóa, bảng chỉ có tiêu đề cột, không có dòng "Chưa có công trình". Ảnh 10-zero.png.
- Gợi ý sửa: hiện thông báo "Chưa có công trình"; không fetch khi `a.worksCount === 0`; có thể ẩn hạng khi 0 công trình.

### 10-A6 | P3 | Công trình đồng tác giả (điểm null) không có liên kết "Tra tạp chí trên EduFind"
- Ở đâu: dòng 138 chỉ vẽ liên kết khi `w.scoreDiscipline` có; dữ liệu: mọi công trình điểm null đều có scoreDiscipline null (95.912 công trình), 0 trường hợp "null nhưng có liên kết" và 0 trường hợp "có điểm mà thiếu liên kết".
- Ảnh hưởng: ví dụ hồ sơ Sillanpää (91% khớp tạp chí HĐGSNN) có tạp chí khớp danh mục như International Journal of Modern Physics B nhưng ở dòng "Không tính (không phải tác giả chính)" không có cách tra tạp chí. Đây là hành vi nhất quán với thiết kế, chỉ ghi nhận để cân nhắc.

### 10-A7 | P3 | Quay lại bằng Back mất vị trí cuộn danh sách; tên tệp CSV chỉ là mã
- Danh sách cuộn 600px, mở hồ sơ, Back: scrollY=28 (hashchange luôn `scrollTo(0,0)`), người dùng mất vị trí đang xem.
- Tên tệp `A5100404947.csv`: khó nhận biết; nên `ten-tac-gia_A5100404947.csv` (bỏ dấu). Tiêu đề cột CSV luôn tiếng Anh dù giao diện là VI (chấp nhận được).

### Ghi chú, không tính lỗi
- Bản đang chạy mặc định giao diện tiếng Anh (initialLang), nhãn tiếng Việt kiểm qua i18n.ts.
- Số liệu `matchedRate` không kiểm lại được từ tệp works (không có cờ "khớp tạp chí"; với A5053495766 hệ số 0,25 so với chỉ 2/215 công trình có điểm), nên chỉ đối chiếu với profind.json.
- Dữ liệu `claimed` bằng null cho cả 6.876 tác giả, nên không kiểm được huy hiệu "đã xác nhận" trên hồ sơ thật.

## Mục đã kiểm đạt
- 37 hồ sơ (30 ngẫu nhiên + lớn nhất 2.509, 0 công trình, suspect, Top 2%, không ORCID, countedWorks=0, foreign) đối chiếu 5 thẻ: hạng điểm, hạng số bài, tổng điểm, countedWorks/worksCount, matchedRate đều khớp profind.json, 0 sai lệch.
- Toàn bộ 6.038 tệp: số công trình = worksCount, số công trình có điểm = countedWorks, tổng điểm = totalScore, không trùng id, không ký tự điều khiển/xuống dòng trong tiêu đề.
- Nhãn thẻ "Điểm theo danh mục HĐGSNN (mức tối đa)" đúng nghĩa, giá trị là totalScore.
- Mọi ISSN đều có gạch NNNN-NNNN. Mọi 28 slug scoreDiscipline trùng 28 site.path trong edufind-khgd/disciplines. EduFind đọc `?q=` (cả hai tab, so khớp ISSN chuẩn hóa) và `?tab=international`.
- curl 10 liên kết thật (10 ngành, cả domestic và tab=international): đều HTTP 200, tiêu đề đúng ngành ("Danh mục tạp chí ... | EduFind").
- Liên kết ngoài (EduFind, ORCID, Top 2%): target=_blank rel=noopener; ORCID đúng `https://orcid.org/<id>`, định dạng hợp lệ 100%; hồ sơ không ORCID không hiện liên kết thừa.
- Nhãn suspect (biểu ngữ cảnh báo), foreign, Top 2% hiển thị đúng ở danh sách và hồ sơ (ảnh 10-suspect.png, 10-top2.png).
- CSV (tải qua Playwright): có BOM UTF-8 (EF BB BF), 7 cột nhất quán, đủ mọi công trình (2.509/2.509 dòng, không chỉ 100), điểm rỗng khi null (2.126 = 2.126), dấu phẩy/ngoặc kép trong tiêu đề được escape, tiếng Việt không lỗi.
- F5 trên hồ sơ hợp lệ, nút Back về danh sách hoạt động. Hồ sơ 2.509 công trình: 100 dòng đầu, nút "Hiển thị thêm" +100/lần; 200 dòng cao khoảng 17.100px, mobile 375px không tràn ngang.
