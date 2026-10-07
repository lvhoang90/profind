# Báo cáo kiểm thử 19: Bảo mật và quyền riêng tư (ProFind)

Phạm vi: đọc mã, curl GET/HEAD/OPTIONS tới bản thật, một POST `kind=bad` rỗng (trả 400, không gửi thư), Playwright trên bản local. Chỉ báo điều đã xác minh.

## Phát hiện

### 19-A1 | P1 | Bản thật không có tiêu đề bảo mật nào (vercel.json trống phần headers)
- Ở đâu: /home/user/profind/vercel.json (chỉ có buildCommand/outputDirectory/framework). EduFind có 4 tiêu đề.
- Tái hiện: `curl -sI https://profind-red.vercel.app/`.
- Mong đợi: X-Content-Type-Options, X-Frame-Options hoặc frame-ancestors, Referrer-Policy, Permissions-Policy (như EduFind), tốt hơn có CSP.
- Thực tế: phản hồi chỉ có `strict-transport-security` (Vercel mặc định, HSTS đạt) và `access-control-allow-origin: *` (mặc định tĩnh của Vercel). Không có CSP, XFO, nosniff, Referrer-Policy, Permissions-Policy. Trang nhúng được vào iframe (nguy cơ clickjacking trên form gỡ hồ sơ). Đối chiếu: edufind.isavn.edu.vn trả đủ 4 tiêu đề (nosniff, strict-origin-when-cross-origin, DENY, camera=()...).
- Gợi ý: sao chép khối headers của EduFind vào vercel.json; thêm CSP `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` (app không có script/CDN ngoài, đã xác minh không có yêu cầu ra host ngoài khi tải trang). Thêm cache-control dài cho /assets/ (hiện chỉ `max-age=0, must-revalidate` cho HTML; hashed assets chưa kiểm).

### 19-A2 | P1 | Gỡ hồ sơ/đính chính không xác minh danh tính; không có rate limit mặc định
- Ở đâu: /home/user/profind/api/correction.js (dòng 4, 12-24, 31-36); docs ghi "Yêu cầu gỡ hồ sơ luôn được thực hiện".
- Tái hiện (đọc mã): bất kỳ ai gửi `kind=remove`, email tùy ý hợp lệ cú pháp, `author=<id người khác>` là đủ để thành yêu cầu gỡ. Hàm `limited()` trả `false` (không giới hạn) khi không có KV_REST_API_URL/TOKEN. `RESEND_API_KEY` đã cấu hình thì mỗi POST là một email tới quản trị viên.
- Mong đợi: có xác minh (ORCID OAuth hoặc email cơ quan, hoặc ít nhất người quản trị không tự động gỡ), và giới hạn tốc độ luôn bật.
- Thực tế: không xác minh; quy trình "luôn thực hiện" kết hợp email giả = ai cũng gỡ được hồ sơ người khác (hoặc làm ngập hộp thư, tốn hạn mức Resend). Không xác minh được biến KV trên Vercel thật (không được POST thật).
- Gợi ý: không tự động gỡ; xác nhận qua email có link token gửi về chính địa chỉ khai báo, đối chiếu tên miền cơ quan/ORCID; nếu KV vắng thì "fail closed" hoặc dùng giới hạn tại Vercel (Firewall/WAF rule). Thêm ngưỡng theo email và toàn cục.

### 19-A3 | P2 | API: không giới hạn kích thước body, không kiểm Origin, honeypot trả "ok" im lặng
- Ở đâu: api/correction.js, dòng 22-26.
- Chi tiết: `await request.formData()` đọc toàn bộ body trước khi `clip()` cắt (clip chỉ cắt sau khi đã nhận); không kiểm Content-Length hay Origin/Sec-Fetch-Site. Không có CORS header trong API (OPTIONS/GET trả 405 `no-store`, không `Access-Control-Allow-Origin`), nên trình duyệt chéo nguồn không đọc được phản hồi, nhưng form POST chéo trang (multipart) vẫn gửi được vì là "simple request" và máy chủ không kiểm Origin (CSRF vô hại về trạng thái nhưng thành đường spam). Nguy cơ DoS bởi payload lớn do nền tảng Edge giới hạn (~4,5 MB) nên mức thấp.
- Gợi ý: từ chối nếu `Origin` khác site, kiểm `content-length` <= 20 KB, thêm thời gian điền tối thiểu hoặc token ký.

### 19-A4 | P2 | API: phản hồi lỗi lộ trạng thái nhà cung cấp; tiêu đề thư dựng từ dữ liệu client
- Ở đâu: api/correction.js dòng 38-40. Phản hồi `{"ok":false,"error":"send","status":<mã Resend>}` (502) làm lộ mã trạng thái Resend (401/403/422 cho kẻ tấn công biết khóa hỏng/hạn mức). Mã lỗi `not-configured` (503) cho biết cấu hình thiếu.
- Header injection: `subject` chứa `authorName` (client điều khiển, cắt 60 ký tự) nhưng gửi qua JSON API của Resend, không phải SMTP thô, nên không có rủi ro CRLF thực; Resend tự xử lý. Mức: rủi ro thấp, nhưng nên `.replace(/[\r\n]+/g," ")`. `authorName`, `author` do client đặt (form có thể bị chỉnh): tên trong thư không đáng tin, cần quản trị đối chiếu với dữ liệu.
- `reply_to: email` là email người gửi tùy ý: quản trị bấm trả lời có thể gửi cho người bị mạo danh (rủi ro lừa đảo/quấy rối nhẹ).
- Chống XSS trong HTML thư: `esc()` có `& < > "`, đủ cho nội dung phần tử và thuộc tính; đạt.
- Gợi ý: trả `{"ok":false,"error":"send"}` không kèm status; ghi log nội bộ.

### 19-A5 | P2 | Xuất CSV không chống CSV/formula injection
- Ở đâu: src/App.tsx dòng 116 (`esc` chỉ nhân đôi dấu `"`).
- Tái hiện: dữ liệu thật có 6 tiêu đề công trình bắt đầu bằng `-` hoặc `+` (ví dụ "- One Health surveillance for influenza A viruses in Vietnam", "+ MỘT SỐ THÔNG TIN VỀ VẮCXIN PHÒNG BỆNH COVID-19"). Chưa thấy tiêu đề bắt đầu `=` hoặc `@`, nhưng dữ liệu OpenAlex do bên thứ ba kiểm soát nên có thể xuất hiện về sau. Excel diễn giải ô bắt đầu `+`/`-`/`=`/`@` như công thức.
- Gợi ý: thêm tiền tố `'` hoặc tab khi chuỗi khớp `/^[=+\-@\t\r]/` (cho các cột chuỗi title, journal, role), ngoại trừ cột số.

### 19-A6 | P2 | Hash route hỏng làm trắng cả trang (URIError không được bắt)
- Ở đâu: src/App.tsx dòng 12 `decodeURIComponent(location.hash...)` không try/catch, gọi trong `useState(hash())` và trong `hashchange`.
- Tái hiện: mở `http://127.0.0.1:4300/#/%E0%A4%A` (mở mới). Kết quả: `URIError: URI malformed`, `#root` không còn phần tử con (trang trắng). Sau khi sập, đổi hash khác cũng không phục hồi nếu không tải lại. Đây là lỗi tính sẵn sàng, không phải XSS; liên kết gửi cho người khác có thể gây trang trắng.
- Gợi ý: bọc try/catch trả chuỗi thô khi lỗi; thêm Error Boundary.

### 19-A7 | P3 | Không có robots.txt, sitemap, noindex; không cân nhắc chính sách lập chỉ mục tên người
- Ở đâu: public/ không có robots.txt (live `/robots.txt` trả 404 dạng text, không phải SPA fallback); index.html không có meta robots. Hồ sơ dùng hash route nên công cụ tìm kiếm gần như không lập chỉ mục từng người; tình trạng hiện tại vô tình có lợi cho quyền riêng tư nhưng chưa là quyết định có chủ đích. Nếu về sau chuyển sang đường dẫn thật thì tên 6.876 người sẽ bị lập chỉ mục.
- Gợi ý: quyết định chính sách và ghi vào docs; thêm robots.txt tường minh, chỉ đường dẫn danh sách; nếu muốn kiểm soát, `noindex` cho trang hồ sơ.

### 19-A8 | P3 | Bộ nhớ đệm nạp 12,7 MB (raw-cache.tgz) nằm trong lịch sử git; kho có vẻ công khai
- Ở đâu: data/cache/raw-cache.tgz, commit 7462036; data/raw-authors.json (đã trong .gitignore nhưng có trong lịch sử?). `git log --all -- data/raw-authors.json` chỉ ra các commit từ a0c2d09/0408cc5, nên tệp từng được commit.
- Xác minh: tệp KHÔNG được triển khai (live `/data/cache/raw-cache.tgz` trả 404; dist/ và public/ không chứa nó). Giải nén thử (219 tệp raw/*.json): không chứa `api_key=` hay `mailto=`; dữ liệu là OpenAlex công khai. Rủi ro chỉ là phình kho, không phải bí mật.
- Gợi ý: cân nhắc Git LFS/Release asset cho tệp cache lớn.

### 19-A9 | P3 | Địa chỉ email quản trị cá nhân (gmail) cứng trong mã nguồn bundle và dùng làm đích mặc định
- Ở đâu: src/App.tsx:9 (CONTACT, hiện trong bundle JS và liên kết mailto), api/correction.js:3,39, docs/DEPLOY.md:17.
- Thực tế: email cá nhân của chủ dự án công khai vĩnh viễn (spam/thu thập). Không phải bí mật khóa; phù hợp nếu chủ ý. Gợi ý: dùng địa chỉ chức năng của ISA (vd. profind@isavn.edu.vn).
- mailto an toàn: subject dùng `encodeURIComponent`, không chèn dữ liệu gây injection.

## Kiểm đạt

- Rò rỉ bí mật: grep toàn kho (trừ node_modules/data) không có khóa thật; `re_`, `sk-`, `Bearer` chỉ là mã đọc biến môi trường (`RESEND_API_KEY`, `OPENALEX_API_KEY`, `KV_*`). Lịch sử git (16 commit, 2 tác giả: Claude, Luong Viet Hoang) không có mẫu khóa ở diff; tên tệp .env/pem/key không có trong lịch sử. api_key trong scripts bị che `***` ở thông báo lỗi. .gitignore gồm node_modules, dist, *.tsbuildinfo, data/raw, data/raw-authors.json (chưa có `.env*` nhưng chưa có tệp .env nào).
- Không đường dẫn máy (/home/user, /root, C:\Users) trong src/api/scripts/docs.
- public/ và dist/ chỉ chứa icon, font, manifest, data/profind.json (4,6 MB) và data/works/*.json (6.038 tệp); không có tgz, raw, corrections, ingest-pending.
- Live: HSTS có (max-age 2 năm, preload); `/data/` và `/assets/` không liệt kê thư mục (404); API CORS không mở (không `Access-Control-Allow-Origin` ở /api/correction); API `cache-control: no-store`; GET/OPTIONS trả 405; POST `kind=bad` trả 400 `kind`, không lộ nội bộ.
- XSS: không có `dangerouslySetInnerHTML` ngoài src/icons.tsx và ở đó chỉ dùng chuỗi hằng trong bảng `I` (không có dữ liệu ngoài); không có innerHTML/eval/document.write. Thử hash `#/tac-gia/<img onerror>`, `#/dinh-chinh/"><script>`, `%00` trên local: 0 phần tử chèn, 0 hộp thoại alert. Dữ liệu thật (124.120 công trình, 6.876 tác giả, các tổ chức) quét: không có `<tag`, `javascript:`, URL trong chuỗi, ký tự điều khiển, ký tự Unicode hai chiều (RLO/LRO), zero-width; chỉ có dấu nháy đơn/kép hợp lệ trong tiêu đề (1.703 tiêu đề, 1 tên người "Kuz'menkova"); ORCID 3.594 mã đều đúng định dạng; ISSN đúng định dạng.
- Liên kết ngoài: mọi `target="_blank"` đều có `rel="noopener"`; ORCID chỉ dựng từ mã đã kiểm định dạng; EduFind link dùng `encodeURIComponent(issn)`; host cố định (không có href từ dữ liệu tùy ý).
- Quyền riêng tư: không có email (0 địa chỉ trong 6.038 tệp works và profind.json), không số điện thoại, ảnh, ngày sinh, địa chỉ nhà (các khóa "birth/gender/image" chỉ khớp chữ trong tiêu đề khoa học). Không cookie (kiểm Playwright: `[]`), localStorage chỉ `lang`; không công cụ phân tích/đếm truy cập, không script bên thứ ba, không yêu cầu mạng tới host ngoài khi tải trang (danh sách host ngoài rỗng); font tự lưu nội bộ.
- Phụ thuộc: `npm audit --offline` báo 0 lỗ hổng (kết quả theo cơ sở dữ liệu cục bộ; chưa kiểm được trực tuyến); React 19.3.0, Vite 7.3.7; chỉ 2 phụ thuộc chạy (react, react-dom). SRI: không cần vì index.html chỉ nạp script/CSS cùng nguồn (không có thẻ `integrity`, không CDN).
- Nghiệp vụ: cơ chế gỡ hồ sơ có sẵn trong build-index (corrections.remove theo id/ORCID), giao diện form có giới hạn maxLength khớp server.

## Chưa kiểm được
- Biến môi trường thật trên Vercel (KV/Upstash đã cấu hình hay chưa) và tình trạng rate limit thật; không POST email thật.
- Trẻ vị thành niên / người đã mất: không có trường nào để phát hiện; chưa có quy trình nêu trong DESIGN/docs (đề nghị ghi vào chính sách gỡ hồ sơ).
- Kho GitHub có công khai hay không (chưa kiểm tra, license MIT cho thấy khả năng công khai).
