# Báo cáo kiểm thử 15: Biểu mẫu đính chính / gỡ hồ sơ và API /api/correction (ProFind)

Phạm vi: src/App.tsx (Correction), api/correction.js, bản test http://127.0.0.1:4300/ (mock bằng page.route), phản hồi thật của /api/correction (chỉ GET/OPTIONS/HEAD và POST kind=bad). Script: /tmp/claude-0/qa/scripts-15/t1.js, t2.js, t3.js. Ảnh: /tmp/claude-0/qa/shots/15-*.png.

## LỖI ĐÃ XÁC MINH

### 15-A1 | P1 | Vào `#/dinh-chinh` không kèm id: gửi yêu cầu không xác định được hồ sơ nào
- Ở đâu: Correction (App.tsx ~148-170); liên kết chân trang "Báo sai sót hoặc yêu cầu đính chính / gỡ hồ sơ" trỏ `#/dinh-chinh`.
- Tái hiện: mở `#/dinh-chinh`, chọn "Gỡ hồ sơ khỏi ProFind", nhập tên + email, gửi.
- Mong đợi: bắt buộc chọn hoặc nhập hồ sơ (tên, id, đường dẫn OpenAlex/ORCID), hoặc chặn gửi.
- Thực tế: form không có trường nào nêu hồ sơ. POST có `author=` và `authorName=` rỗng, API trả ok, tiêu đề thư là "[ProFind] Gỡ hồ sơ khỏi... - " (trống). Người gửi gỡ hồ sơ không có cách nói hồ sơ nào, trừ khi tự viết vào ô nội dung (kind remove/claim không bắt buộc ô này). Quản trị viên nhận thư không hành động được.
- Bằng chứng: t1.js, mục "posts no-id", fields = [kind=claim, name, email, orcid, msg=, _honey=, author=, authorName=]. Ảnh 15-desktop-noid.png.
- Gợi ý: khi không có `a`, thêm ô bắt buộc "Tên hoặc liên kết hồ sơ"; có thể kèm ô tìm tác giả. Server: nếu author và authorName đều rỗng thì cần msg/orcid, trả lỗi `profile`.

### 15-A2 | P1 | Mọi phản hồi 2xx đều bị coi là thành công; mã lỗi API không được dịch
- Ở đâu: App.tsx `setState(r.ok ? "ok" : "err")`.
- Tái hiện: mock 200 với body HTML (rơi vào SPA fallback / host tĩnh) hoặc `{"ok":false}`; gửi form.
- Mong đợi: kiểm `await r.json()` có `ok === true`.
- Thực tế: hiện "Đã gửi. Chúng tôi sẽ phản hồi qua email." và xóa form dù yêu cầu không đến nơi (người dùng gỡ hồ sơ tưởng đã gửi).
- Bằng chứng: t2.js, các dòng "200 <html>spa fallback</html>" và "200 {"ok":false}" đều ra banner thành công.
- Gợi ý: parse JSON trong try, chỉ thành công khi `j.ok === true`.

### 15-A3 | P2 | Mọi lỗi dùng chung một thông báo "Không gửi được", không phân biệt 400/429/502/503
- Mock 400 email, 400 empty, 405, 429 rate, 502 send, 503 not-configured, 404, mất mạng: banner giống hệt. 429 không nói "gửi quá nhiều, thử lại sau 1 giờ"; 400 email/empty không chỉ rõ trường sai (ví dụ "a@b" vượt kiểm HTML5 nhưng server từ chối, người dùng bị đẩy sang mailto dù chỉ cần sửa email). Người dùng thấy thông báo sai nguyên nhân.
- Gợi ý: đọc `error` từ JSON, ánh xạ sang i18n (email, empty, rate, send/not-configured, mạng), đặt `aria-invalid` + focus vào trường sai.

### 15-A4 | P2 | Không có timeout: treo vô hạn ở "Đang gửi…"
- Mock trễ 20 giây: sau 15 giây nút vẫn disabled "Đang gửi…", không hủy, không báo lỗi, không cho thử lại hoặc dùng mailto. (t2.js, "after 15s hang").
- Gợi ý: AbortController 15-20 giây, rồi hiện lỗi + mailto.

### 15-A5 | P2 | Đổi id trong khi component đang mở: ORCID của hồ sơ cũ bị giữ lại, gửi sai ORCID
- Tái hiện: mở `#/dinh-chinh/A5053495766` (ORCID 0000-0003-3046-3041), rồi đổi hash sang `#/dinh-chinh/A5064939188` (ORCID thật 0000-0001-7827-8449).
- Thực tế: tiêu đề đổi sang "Bach Xuan Tran" nhưng ô ORCID vẫn 0000-0003-3046-3041 vì `defaultValue` không đặt lại và không có `key`. Cũng vậy từ trang `#/dinh-chinh/ID` bấm liên kết chân trang `#/dinh-chinh`: ORCID/tên/loại cũ còn nguyên, nhưng `author` gửi là rỗng (hồ sơ A cũ đã bị bỏ).
- Hệ quả: quản trị viên nhận ORCID không khớp hồ sơ.
- Bằng chứng: t3.js, dòng "switch id" và "footer link from profile form".
- Gợi ý: `<Correction key={author?.id ?? "none"} ...>` (hoặc key cho form).

### 15-A6 | P2 | Trạng thái "đã gửi" (ok) dính lại khi điều hướng hash trực tiếp
- Sau khi gửi thành công ở `#/dinh-chinh`, đổi hash sang `#/dinh-chinh/<id khác>`: vẫn hiện "Đã gửi", không có form (t1.js: form present = 0, h2 đã đổi sang tên khác). Người dùng muốn gửi yêu cầu cho hồ sơ thứ hai bị chặn tới khi tải lại. Cùng gốc với 15-A5 (sửa bằng key), kèm nút "Gửi yêu cầu khác".

### 15-A7 | P3 | Thành công không báo hiệu cho trình đọc màn hình; lỗi không có role/aria-live; không dời focus
- Banner thành công/lỗi không có role="status"/"alert"; sau khi form biến mất focus rơi về body. Người dùng bàn phím/AT không biết kết quả.
- Gợi ý: role="alert" cho lỗi, role="status" cho thành công, focus vào banner.

### 15-A8 | P3 | Kiểm tra client lỏng: tên và nội dung chỉ-khoảng-trắng qua được; ORCID không kiểm định dạng; không bộ đếm ký tự
- Tên "   " hợp lệ HTML5 (required). Loại "correct" với msg "   " được gửi lên (client), server trả `empty` 400, người dùng chỉ thấy lỗi chung (xem A3).
- ORCID nhận bất kỳ chuỗi ("not an orcid <script>" được gửi nguyên). Nên có `pattern="\d{4}-\d{4}-\d{4}-\d{3}[\dX]"` (cho phép để trống) và chuẩn hóa dán URL orcid.org.
- maxLength đủ (120/160/40/4000, fill 5000 bị cắt còn 4000) nhưng im lặng, không có bộ đếm.
- Email unicode ("ünï@dömäin.vn") bị Chromium từ chối, "a@b" qua client nhưng server từ chối (không khớp giữa hai bên).

### 15-A9 | P3 | Liên kết mailto dự phòng làm mất nội dung đã nhập
- mailto chỉ có subject `[ProFind] <tên hồ sơ>`, không có body (loại yêu cầu, email, nội dung). Người dùng phải gõ lại; khi không có hồ sơ subject chỉ là "[ProFind] ". Gợi ý: đưa kind/author/msg vào `body` (cắt ~1500 ký tự).

### 15-A10 | P3 | Id không tồn tại không báo gì
- `#/dinh-chinh/ZZZ`: hiển thị tiêu đề chung như không có id, nút quay lại về `#/`, gửi đi với author rỗng. Nên báo "Không tìm thấy hồ sơ" hoặc xử lý như A1.

## RỦI RO PHÍA API (đọc api/correction.js, không gửi thư thật)

### 15-B1 | P1 | Yêu cầu "gỡ hồ sơ" không xác minh danh tính, chính sách nói "luôn được thực hiện"
- Văn bản i18n và đầu api/correction.js: "Yêu cầu gỡ hồ sơ luôn được thực hiện". Email người gửi tự khai (reply_to = email tự nhập, không có link xác nhận), ORCID tự khai. Bất kỳ ai cũng có thể gỡ hồ sơ của người khác, hoặc lập hàng loạt yêu cầu "xác nhận (đây là tôi)" mạo danh.
- Quy trình đề xuất: (1) gửi email chứa liên kết xác nhận (token ký HMAC, hết hạn) tới địa chỉ người gửi trước khi chuyển cho quản trị viên; (2) với "xác nhận/đính chính": đối chiếu email cơ quan trùng miền với đơn vị trong OpenAlex, hoặc đăng nhập ORCID OAuth; (3) với "gỡ": cho phép gỡ tạm (ẩn) ngay khi xác minh email, hoặc gỡ ngay khi người gửi chứng minh bằng ORCID/email cơ quan; yêu cầu không chứng minh được thì ẩn tạm có thể khôi phục, tránh bị lợi dụng; (4) ghi nhật ký và thông báo cho email trong hồ sơ ORCID công khai (nếu có). Sửa lại câu "luôn được thực hiện" thành "được thực hiện sau xác minh nhanh".

### 15-B2 | P2 | Không có CAPTCHA, không Origin/Referer check, giới hạn tốc độ chỉ "nếu có KV" và fail-open
- Không kiểm Origin: POST multipart là "simple request" nên trang bất kỳ (và curl) đều gửi được (OPTIONS thật trả 405, không có CORS; vì vậy trình duyệt chỉ ngăn đọc kết quả, không ngăn gửi). Spam vào hộp thư quản trị.
- `limited()` trả false nếu thiếu KV_REST_API_* hoặc Upstash lỗi (fail-open), không có giới hạn nào khi không cấu hình; không thể kiểm tra cấu hình thật từ ngoài. Giới hạn 5/giờ/IP; EXPIRE đặt lại mỗi lần gọi nên người bị chặn mà vẫn thử sẽ bị kéo dài mãi (cửa sổ trượt). Khóa theo header x-forwarded-for nguyên chuỗi (có thể chứa nhiều IP; trên Vercel được đặt lại nên ok). Đã băm SHA-256 và cắt 8 byte: tốt. Thứ tự: kiểm tra hợp lệ trước rồi mới đếm, nên request lỗi 400 không bị giới hạn.
- Gợi ý: Turnstile/hCaptcha, kiểm `Origin` thuộc danh sách cho phép, đặt EXPIRE chỉ khi INCR trả 1 (EXPIRE NX), fail-closed tùy chọn, giới hạn kích thước body (Content-Length) trước khi `formData()`.

### 15-B3 | P3 | Các điểm khác (đánh giá, chưa phải lỗi nghiêm trọng)
- Header injection: subject chứa `authorName`/`author` do client tự cung cấp và có thể có xuống dòng, nhưng gửi qua JSON tới Resend (không tự ghép header SMTP) nên rủi ro thấp; nên loại `[\r\n]` và dùng tên hồ sơ lấy từ dữ liệu phía server, không tin `authorName`/`author` (có thể đặt thành tên người khác, tiêu đề giả).
- XSS trong HTML thư: `esc` xử lý `& < > "`, mọi giá trị chèn đều qua esc: đạt. Thiếu `'` nhưng không dùng trong thuộc tính nháy đơn: chấp nhận được.
- reply_to = email tự khai (không xác minh): quản trị viên trả lời sẽ gửi đến địa chỉ do kẻ mạo danh chọn (liên quan B1). Regex email chấp nhận ký tự như `<`, `>` trong phần local; Resend sẽ xác nhận hợp lệ nên hiệu ứng nhỏ, nhưng nên thắt chặt.
- Trường chỉ-trắng ("   ") của name không kiểm; kind "claim"/"remove" không cần msg (xem A1).
- Khi Resend lỗi: trả 502 + `status` (lộ mã trạng thái Resend, ví dụ 403/422), mất yêu cầu, không có hàng đợi/lưu trữ dự phòng; UI chỉ hiện lỗi chung. Nên log lỗi phía server và/hoặc lưu bản sao vào KV để không mất yêu cầu gỡ hồ sơ.
- Thư gửi từ `onboarding@resend.dev` (mặc định) chỉ gửi được tới chủ tài khoản Resend và dễ vào spam; nên dùng domain đã xác minh.

## PHẢN HỒI THẬT (https://profind-red.vercel.app/api/correction)
- GET/OPTIONS/HEAD: 405, `{"ok":false,"error":"method"}`, content-type application/json; charset=utf-8, cache-control: no-store, có HSTS; không có tiêu đề CORS/Allow (405 thiếu `Allow: POST`). HEAD không có body.
- POST kind=bad (multipart) và POST x-www-form-urlencoded: 400 `{"ok":false,"error":"kind"}`, cùng tiêu đề. Vì không trả "not-configured" (kiểm trước kind), RESEND_API_KEY đã được cấu hình trên production.

## MỤC ĐÃ KIỂM ĐẠT
- Nhãn: mọi input/textarea/radio có label (labels.length = 1); honeypot ẩn khỏi AT (aria-hidden, tabindex -1, autocomplete off, đặt ngoài màn hình).
- required (tên, email), type=email, maxLength 120/160/40/4000, msg bắt buộc chỉ với "đính chính"; thông báo trình duyệt theo ngôn ngữ trình duyệt.
- autocomplete name/email; thứ tự Tab hợp lý (radio, tên, email, ORCID, nội dung, nút gửi), focus ring mặc định hiển thị.
- Enter trong ô email gửi form (1 request); khi đang gửi nút disabled "Đang gửi…" và Enter không gửi lần hai (chỉ 1 request).
- Khi lỗi: dữ liệu và loại yêu cầu được giữ nguyên, nút bật lại, hiện liên kết mailto; gửi lại sau lỗi hoạt động (2 request).
- Thành công: hiện banner và ẩn form; mất mạng (abort) xử lý như lỗi, hiện mailto.
- ORCID được điền sẵn từ hồ sơ khi vào qua `#/dinh-chinh/<id>`; nút "← Danh sách"/quay lại hoạt động (về hồ sơ hoặc danh sách).
- Mobile 375px: không cuộn ngang, ô nhập cao 44px, nút gửi 127x40 (hơi thấp hơn 44px nhưng chấp nhận); chế độ tối: tương phản ô nhập/nút ổn (ảnh 15-mobile-dark-err.png, 15-desktop-noid.png).
- Server: esc HTML đúng cho mọi trường, honeypot trả ok giả, cắt độ dài trường, kiểm email/kind, cache-control no-store, JSON UTF-8.
