# Báo cáo 01 - Giao diện máy tính, chế độ sáng, tiếng Việt
Bản test: http://127.0.0.1:4300/ ; cỡ 1280x800, 1440x900, 1920x1080. Ảnh: /tmp/claude-0/qa/shots/01-*.png ; script: /tmp/claude-0/qa/scripts-01/.
Ghi chú chung: khung nội dung cố định max 1180px nên bố cục ở 3 cỡ gần như giống hệt nhau (bảng 1146px); các lỗi dưới đây đúng ở cả 3 cỡ trừ khi ghi khác.

## Lỗi

### 01-A1 (P2) Placeholder và giá trị ô lọc bị cắt chữ
- Ở đâu: `#/`, cả 3 cỡ, VI, sáng.
- Tái hiện: mở trang danh sách, nhìn hàng bộ lọc (lưới `2fr repeat(5,1fr)`).
- Mong đợi: chữ gợi ý/giá trị đọc được đủ. Thực tế: ô tìm kiếm chỉ rộng ~313px nên "Tìm theo tên, ORCID, tên tạp chí hoặc ISSN" bị cắt ở "hoạ"; ô Đơn vị (157px) cắt "Gõ tên đơn vị (v"; ô Phạm vi cắt "Đơn vị tại Việt N..." và "Kể cả có đơn vị..." (option "Kể cả có đơn vị nước ngoài").
- Bằng chứng: shots/01-list-1440.png, 01-foreign-1440.png, 01-focus-input.png.
- Gợi ý: đổi lưới (ô tìm kiếm chiếm cả hàng riêng hoặc `minmax`), rút ngắn placeholder/option ("Chỉ đơn vị Việt Nam" / "Gồm cả nước ngoài"), hoặc cho `.sbox` rộng hơn trên màn >=1100px.

### 01-A2 (P2) Tên tác giả bị ngắt giữa tên khi có nhãn, cột "Tác giả" quá hẹp
- Ở đâu: `#/` với Phạm vi = "Kể cả có đơn vị nước ngoài", 1440x900.
- Thực tế: cột Tác giả 271px, cột Đơn vị 491px; "Arivalagan / Pugazhendhi" và "Hijaz / Ahmad" xuống 2 dòng, nhãn "Có đơn vị ngoài Việt Nam", "Top 2%", "Hồ sơ có thể gộp nhầm nhiều người" rớt cùng dòng thứ hai, hàng cao không đều (60-84px).
- Bằng chứng: shots/01-foreign-1440.png (hàng 2 và 6).
- Gợi ý: đặt `min-width` cho cột tác giả (~320px), `white-space:nowrap` cho tên hoặc cho nhãn xuống dòng riêng (`display:block`/flex-wrap có gap), giảm độ rộng cột Đơn vị.

### 01-A3 (P2) Hồ sơ không có công trình: bảng rỗng chỉ còn tiêu đề, không có trạng thái trống
- Ở đâu: `#/tac-gia/A5129023937` (và A5014924659), 1440x900.
- Thực tế: thẻ thống kê hiện 0, 0/0, 0%, bảng chỉ có hàng tiêu đề (cột chia đều lệch hẳn bố cục các hồ sơ khác), không có dòng "chưa có công trình". Tên hồ sơ này cũng rất dài ("Curly-Howard-Chungus Correspondence | Lamport-Cabot-Codd-Backus-Naur Form") nhưng vẫn vừa 1 dòng.
- Bằng chứng: shots/01-prof-long-1440.png.
- Gợi ý: nếu `works.length===0` hiện `.empty` thay vì bảng; nút "Tải CSV" đã bị disabled đúng.

### 01-A4 (P2) Bảng công trình: cột "Vai trò" quá hẹp, "Đồng tác giả" luôn xuống 2 dòng; cột "Điểm" quá rộng
- Ở đâu: `#/tac-gia/A5001100407`, `#/tac-gia/A5064939188`, 1280/1440/1920.
- Thực tế: độ rộng cột [57, 319, 268, 103, 246, 88, 66]; "VAI TRÒ" (66px) làm tiêu đề cũng tách 2 dòng, 21-22 hàng cao >90px chỉ vì dòng này; cột Điểm 246px chứa chữ "Không tính (không phải tác giả chính)" căn phải, cách tiêu đề "ĐIỂM" và dính sát ISSN (khoảng cách ~20px) trong khi cách xa "Trích dẫn".
- Bằng chứng: shots/01-prof-many-1440.png, 01-prof-scored.png.
- Gợi ý: `white-space:nowrap` cho cột vai trò (hoặc rút "Đồng TG"), giới hạn độ rộng cột Điểm, đưa lý do "Không tính" xuống dòng phụ nhỏ như "Scopus Q2".

### 01-A5 (P3) Chân trang: link "DOI ..." và "Báo sai sót..." rớt thành dòng lẻ do `.foot .meta{display:flex;flex-wrap:wrap}`
- Ở đâu: mọi trang, cuối trang, 1440 (văn bản dài; mô tả Top 2% 2 dòng rồi DOI nằm riêng 1 dòng; "Báo sai sót" cũng xuống dòng riêng).
- Thực tế: chuỗi văn bản và link trở thành các flex-item, link bị đẩy xuống như chữ mồ côi, icon khiên (14px, xám nhạt) lệch lên so với dòng chữ. Dòng đầu "Nguồn dữ liệu" thì liền mạch -> không nhất quán giữa 3 đoạn.
- Bằng chứng: shots/01-footer-1440.png, 01-prof-long-1440.png (dưới).
- Gợi ý: chỉ dùng flex cho dòng có icon, bọc nội dung trong 1 `<span>`; dùng `text-wrap:pretty`.

### 01-A6 (P3) "Đại học Quốc gia TP. Hồ Chí Minh ... (ĐHQG-HCM)" ngắt tại dấu gạch nối
- Ở đâu: `#/` Phạm vi=Kể cả nước ngoài, hàng 4: "(ĐHQG-" / "HCM)"; và hàng 1 chế độ mặc định có "Trường Đại học / Bách khoa (ĐHQG-HCM)". Cột Đơn vị của hàng 3 mô tả ngành "Luyện kim · Hóa học - Công nghệ thực / phẩm" rớt "phẩm" lẻ (hàng D.M. Hoat, cả 3 cỡ).
- Gợi ý: dùng U+2011 (gạch nối không ngắt) cho viết tắt, `text-wrap:pretty` cho `.meta` trong ô; hoặc nối ngành bằng danh sách nhãn.

### 01-A7 (P3) Căn dọc hỗn tạp giữa các ô của hàng
- Ở đâu: `#/`, mọi cỡ. Vòng hạng 28px (top 429.8), liên kết tên (431.8, cao 17px), số liệu `.num` cùng hàng, viên điểm 25px, cột Năm đăng cỡ chữ nhỏ hơn (`.meta` .8rem): các chữ không cùng đường cơ sở (số "Năm đăng" cao hơn ~3px, số hạng thấp hơn tên ~3px, viên điểm lệch 2px so với "Số bài").
- Bằng chứng: shots/01-list-1440.png, 01-list-1920.png.
- Gợi ý: `vertical-align:middle` hoặc `baseline` cho ô; cùng cỡ chữ cho cột Năm đăng; `.rk` căn bằng `line-height`.

### 01-A8 (P3) Không có kiểu focus/hover riêng; vòng focus ô nhập màu đen mặc định
- Ở đâu: `#/` focus vào ô tìm kiếm: vòng đen (rgb(16,16,16)) mặc định, không theo `--accent`. styles.css của ProFind không có `:focus-visible`; EduFind (src/styles.css dòng 45, 96, 212...) có `outline:2px solid var(--accent)`.
- Bằng chứng: shots/01-focus-input.png; nút EN có vòng trắng nhìn được (01-focus-lang.png). Link trong bảng, thẻ hệ sinh thái, "Hiển thị thêm" chưa kiểm focus bằng ảnh (chưa xác minh bằng ảnh).
- Gợi ý: thêm quy tắc chung `:focus-visible{outline:2px solid var(--accent);outline-offset:2px}` như EduFind.

### 01-A9 (P3) Bộ icon thẻ thống kê không đồng bộ kích thước thị giác
- Ở đâu: `#/tac-gia/A5001100407`, thẻ thống kê. Cả 5 icon đặt 22px nhưng icon "chart" và "link" nhìn nhỏ hơn cúp/dấu tích/sách; icon "link" có nền vuông nhạt khác phong cách còn lại.
- Bằng chứng: shots/01-zoom-stats.png (phóng 3x).
- Gợi ý: chuẩn hóa viewBox/độ dày nét, bỏ nền riêng của icon link.

### 01-A10 (P3) Cỡ chữ nút "Tải CSV" (16px) lớn hơn link "Đây là tôi / đính chính / gỡ hồ sơ" (.88rem) và chữ bảng (.88rem); radio ở biểu mẫu dùng màu xanh mặc định của trình duyệt
- Ở đâu: hồ sơ (`#/tac-gia/<id>`), `#/dinh-chinh/<id>`; ảnh shots/01-prof-many-1440.png, 01-corr.png. Biểu mẫu để trống nửa phải (max-width 640px, canh trái), radio chưa có `accent-color:var(--accent)`.
- Gợi ý: `button.ghost{font-size:.88rem}`, `accent-color`.

### 01-A11 (P3) Văn bản nhãn "Có đơn vị ngoài Việt Nam" dính chữ trong cây DOM
- Nhãn `.tagf` dùng `margin-left` thay vì khoảng trắng, nên văn bản truy xuất (copy, đọc màn hình) thành "Jie YangCó đơn vị ngoài Việt Nam★ Top 2% thế giới". Mắt thấy ổn. Gợi ý: thêm khoảng trắng `{" "}` giữa các phần tử. Xác minh bằng innerText.

## Lưu ý dữ liệu (ngoài phạm vi giao diện, chưa xác minh nguồn)
- Hồ sơ A5001100407 có công trình "Mapping drivers of life expectancy..." gắn tạp chí "Nature" ISSN 0028-0836 ở hồ sơ Bach Xuan Tran (A5064939188) và nhiều "Retraction notice"/"Peer-Review Statements" được tính như công trình; nên kiểm tra dữ liệu.
- Tên hồ sơ lạ "Curly-Howard-Chungus Correspondence | Lamport-Cabot-Codd-Backus-Naur Form" (A5129023937) thuộc nhóm dữ liệu rác của OpenAlex.

## Đã kiểm và đạt
- Không có thanh cuộn ngang trang ở cả 3 cỡ (scrollWidth = clientWidth); bảng không tràn (1146/1146).
- Không lỗi console/requestfailed trên trang danh sách ở 3 cỡ.
- Phông Inter và Space Grotesk tải đủ (cả bộ Việt), dấu tiếng Việt hiển thị đúng ở tiêu đề, bảng, nhãn; không có chữ bị cắt dấu.
- Logo 512x512 hiển thị 40px sắc nét; đầu trang aurora + lưới, tiêu đề gradient đọc rõ.
- Banner (thông tin/khiên), tiêu đề cột, nhãn bộ lọc: màu rgb(81,103,122) trên nền sáng, tương phản đủ; cỡ nhỏ (11-11.5px) nhưng đọc được.
- Hạng 1/2/3 có màu vàng/bạc/đồng; từ hạng 4 trở đi xám; số 3 chữ số (100) vẫn nằm trong vòng.
- Nhãn "Top 2% thế giới" (nền vàng nhạt, chữ nâu, 10.9px) đọc rõ, tooltip (title) đầy đủ nguồn; nhãn "Có đơn vị ngoài Việt Nam" nhất quán giữa danh sách và hồ sơ.
- Thẻ thống kê hồ sơ đều 222x112, icon góc phải thẳng hàng; thẻ hệ sinh thái hover nâng nhẹ + viền xanh hoạt động, thẻ "Bạn đang ở đây" nổi bật.
- Trang đính chính hiển thị đúng, ORCID điền sẵn, ô nhập có viền/độ cao đồng nhất.
- So với EduFind: ProFind dùng cùng bộ phông/màu accent, nhưng thiếu focus-visible, thiếu quy tắc chống ngắt dòng (EduFind dùng `white-space:nowrap` cho nhiều cột), nút/ô lọc ít tinh chỉnh hơn.
