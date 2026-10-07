# Báo cáo kiểm thử 08: Tìm kiếm và bộ lọc (ProFind, bản http://127.0.0.1:4300/)

Kịch bản: /tmp/claude-0/qa/scripts-08/ (t1.js tìm kiếm 48 truy vấn x 2 phạm vi = 96 ca; t2.js 60 tổ hợp lọc ngẫu nhiên + ô Đơn vị + Back; t4.js hiệu năng/phím). Giá trị kỳ vọng tính độc lập từ profind.json (6876 tác giả, 212 đơn vị; phạm vi VN = 5089).
Ảnh: /tmp/claude-0/qa/shots/08-langswitch.png, 08-empty.png, 08-back.png.

## Lỗi đã xác minh

### 08-A1 (P1) Ô Đơn vị: gõ sai/một phần/không dấu bị bỏ qua im lặng, hiển thị toàn bộ danh sách
- Ở đâu: src/App.tsx dòng 66 `inst = d.institutions.find(i => instName(i) === instText)?.id ?? ""`.
- Tái hiện: chọn "Đại học Quốc gia Hà Nội" -> 28 tác giả; sửa thành "Đại học Quốc gia" / "đại học quốc gia hà nội" / "dai hoc quoc gia ha noi" / thêm một dấu cách cuối / "xyz".
- Mong đợi: lọc theo khớp một phần (bỏ dấu, không phân biệt hoa thường), hoặc báo "không có đơn vị khớp".
- Thực tế: mọi trường hợp trên đều trả 100/5089, không cảnh báo; ô vẫn hiện chữ người dùng nên tưởng đã lọc.
- Gợi ý: so khớp bằng fold(); khi chưa khớp đúng thì lọc theo "chứa" hoặc hiện cảnh báo; thay datalist bằng combobox có lọc.

### 08-A2 (P2) Đổi VI<->EN khi đang chọn đơn vị làm mất bộ lọc nhưng ô vẫn hiện tên cũ
- Tái hiện: chọn "Đại học Quốc gia Hà Nội" (28) -> bấm EN.
- Thực tế: ô giữ nguyên chữ tiếng Việt, kết quả nhảy 28 -> 5089 (ảnh 08-langswitch.png). Giá trị cũ không còn khớp vì so với tên EN.
- Gợi ý: lưu id đơn vị (không lưu chuỗi), hiển thị tên theo ngôn ngữ hiện tại; hoặc khớp cả hai ngôn ngữ.

### 08-A3 (P2) Tìm theo ISSN không gạch nối không ra kết quả
- Tái hiện: gõ "23318422" (ISSN arXiv, có trong dữ liệu) -> 0 kết quả; gõ "2331-8422" -> 480. Tương tự "18591531".
- Nguyên nhân: `a.jn` lưu "tên|2331-8422", so khớp chuỗi con thuần. Ô ghi "ISSN" nhưng người dùng thường gõ liền.
- Gợi ý: chuẩn hóa bỏ "-" ở cả truy vấn và jn (hoặc lập chỉ mục ISSN riêng).

### 08-A4 (P2) ORCID: hoa/thường và không gạch không khớp; ORCID kết thúc bằng X không tìm được
- Tái hiện: "0000-0001-8163-028X" (hoặc "028X", "028x") -> 0 kết quả; "0000000330463041" (không gạch) -> 0.
- Nguyên nhân: `a.orcid?.includes(n)` với n đã hạ chữ thường còn orcid giữ chữ X hoa. 295 tác giả có ORCID tận cùng X (190 trong phạm vi VN) không tìm được bằng ORCID đầy đủ.
- Gợi ý: so `a.orcid.toLowerCase()`, bỏ "-" ở hai phía; có thể chấp nhận dán URL https://orcid.org/...

### 08-A5 (P2) Tên có gạch nối (en dash/hyphen Unicode) không tìm được bằng "-" ASCII hoặc bằng dấu cách
- Dữ liệu có 535 tên chứa dash (133 dùng "–"/"‐" Unicode, 71 trong phạm vi VN), ví dụ "Minh–Triet Tran", "Dinh‐Toi Chu".
- "minh-triet", "minh triet", "Minh‐Triet" -> 0 kết quả (chỉ "minh–triet" đúng ký tự mới khớp). Người dùng gần như không gõ được ký tự này.
- Gợi ý: chuẩn hóa mọi loại dash (U+2010–2015, 2212) về dấu cách hoặc bỏ đi ở cả hai phía.

### 08-A6 (P2) Mất toàn bộ trạng thái lọc/tìm khi vào hồ sơ rồi Back; URL không phản ánh bộ lọc
- Tái hiện: ô tìm "tran" + ngành CNTT (100/115) -> bấm tác giả đầu -> Back.
- Thực tế: ô tìm trống, ngành "Tất cả", 100/5089, cuộn về đầu (ảnh 08-back.png). Cả "Hiển thị thêm", cuộn đều mất. URL luôn là `#/`, không chia sẻ/đánh dấu được. (EduFind đọc `?q=` khi khởi tạo, ProFind không có; nhưng EduFind cũng không bền qua Back trừ ?q.)
- Gợi ý: đồng bộ state với hash query `#/?q=..&nganh=..&loai=..&donvi=<id>&pham-vi=..&sx=..` (khởi tạo từ URL, replaceState khi đổi); phục hồi scrollY khi Back; tối thiểu lưu sessionStorage.

### 08-A7 (P3) Thứ tự họ-tên: tên lưu dạng "Tên đệm Họ" (Tây), gõ thứ tự Việt không ra
- "Nguyễn Thanh" -> 37 (chỉ khớp chuỗi liền); các tác giả "Thanh ... Nguyen" bị bỏ (khớp theo từ không thứ tự sẽ cho 141). "Hoang Son Le" cho 0 dù có tác giả khớp từng từ (1 kết quả theo khớp token).
- Gợi ý: tách từ, mọi từ phải có trong tên (AND, không thứ tự). Cũng xử lý nhiều dấu cách/tab: "nguyen  thanh" (2 dấu cách) -> 0 dù "nguyen thanh" có kết quả.

### 08-A8 (P3) Tên chứa 2 dấu cách liên tiếp trong dữ liệu
- 7 tác giả (đều trong phạm vi VN), ví dụ "Anh  Duc Nguyen", "Phung  Kim Le", "Dinh  Viet Cuong": gõ "phung kim" -> không khớp. Giao diện gộp khoảng trắng nên không thấy.
- Gợi ý: chuẩn hóa `name.replace(/\s+/g," ").trim()` trong build-index.mjs.

### 08-A9 (P3) Tên tạp chí có dấu trong `jn` (chưa fold)
- 63 tác giả (32 trong VN) có jn chứa ký tự có dấu; gõ không dấu sẽ không khớp tạp chí đó (gõ "tạp chí" có dấu thì `fold` làm n mất dấu nên cũng không khớp). Gợi ý: fold jn khi build.

### 08-A10 (P3) Khác
- Ô Đơn vị hẹp: tên bị cắt ("Đại học Quốc g") khi chọn (ảnh langswitch); datalist 212 mục không lọc theo từ khóa giữa chuỗi trên mọi trình duyệt (Chrome lọc theo chứa, Safari/Firefox khác nhau) và không có nhóm theo loại; nên dùng combobox có tìm kiếm.
- Số kết quả "Hiển thị n / t tác giả" không có aria-live, và kết quả rỗng không có role=status (người dùng đọc màn hình không biết).
- Không debounce: khoảng 18-90 ms/phím ở tốc độ thường, 40-241 ms/phím khi CPU giảm 6x (5089 hàng lọc, jn dài). Chấp nhận được; có thể thêm useDeferredValue.
- Phạm vi mặc định ẩn 548 tác giả có foreign=null (không phải false) cùng nhóm foreign/suspect; chưa rõ chủ ý (null bị coi là không phải "VN").

## Mục kiểm đạt
- 96 ca truy vấn: số kết quả UI == tính từ mã (0 lệch), "Hiển thị n / t" = min(100,t), số dòng bảng khớp, t=0 có "Không có kết quả." và ẩn bảng.
- Hoa/thường, có dấu/không dấu ("nguyen thanh"/"NGUYỄN"), "đ"/"Đặng"=dang, ISSN có gạch, tên tạp chí VI/EN, chuỗi chỉ dấu cách (= không lọc), `<script>` (không thực thi, không dialog, không lỗi trang), %, \, ".*", "(", "[", "a|b", "?" (không dùng RegExp nên không lỗi), emoji, chuỗi 5000 ký tự (45 ms/127 ms CPU 6x).
- 60 tổ hợp ngẫu nhiên ngành x loại đơn vị x đơn vị x phạm vi x sắp xếp: danh sách, thứ tự (kể cả bằng điểm: phụ theo số bài, sort ổn định) và tổng khớp 100%. Lọc ngành chỉ ra tác giả có ngành đó.
- Reset về 100 khi đổi sắp xếp/tìm kiếm; nút "Hiển thị thêm" +100 mỗi lần, biến mất khi hết (5089).
- Datalist có đủ 212 mục; tên đơn vị VI/EN không trùng.
- Enter không gây điều hướng/lỗi; Escape trong ô search xóa nội dung và trả về 5089; gõ nhanh 30 ms/ký tự dưới CPU 6x vẫn ra kết quả cuối đúng; không lỗi console.
