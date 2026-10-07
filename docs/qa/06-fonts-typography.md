# Báo cáo 06: Font chữ và Typography (ProFind, bản http://127.0.0.1:4300/)

Phương pháp: Playwright + CDP (CSS.getPlatformFontsForNode, document.fonts), giả lập mạng chậm (50KB/s, trễ 400ms), PerformanceObserver layout-shift, đọc mã nguồn chỉ đọc. Ảnh: /tmp/claude-0/qa/shots/06-*.png. Script: /tmp/claude-0/qa/scripts-06/.

## 06-A1 | P1 | Space Grotesk không bao giờ được dùng cho chữ Latin (thiếu @font-face latin và latin-ext)
- Ở đâu: /home/user/profind/src/fonts.css (và dist/assets/index-BmfYuwhw.css). Chỉ khai báo space-grotesk-vietnamese.woff2; hai tệp space-grotesk-latin.woff2 (22 KB) và space-grotesk-latin-ext.woff2 (19 KB) có trong public/fonts nhưng KHÔNG được khai báo. EduFind (portal/fonts.css dòng 6-8) khai báo đủ 3 mặt.
- Tái hiện: mở #/, bật VI, CDP getPlatformFontsForNode cho h1, h2 (tên tác giả), .brand b, .stats b, .rk.
- Mong đợi: tiêu đề/số liệu dùng Space Grotesk theo thiết kế (font-display). Thực tế: h1 "Tra cứu tác giả và công trình nghiên cứu" = Space Grotesk 3 glyph + Inter 37 glyph (chỉ các ký tự có dấu trong dải vietnamese như ứ, ả, ... dùng Space Grotesk, ký tự ASCII rơi về Inter, nên một từ có thể trộn hai phông). Ở EN, h1, brand, .stats b (#4), .rk, tiêu đề hồ sơ đều 100% Inter; document.fonts cho thấy Space Grotesk chỉ có 1 mặt (vietnamese) và ở trang EN trạng thái "unloaded".
- Bằng chứng: 06-h1-zoom.png (hiện trạng) so với 06-h1-zoom-fixed.png (sau khi thêm @font-face latin, khác biệt rõ ở r, a, g, n). Số liệu .stats b, .rk (dùng Space Grotesk theo CSS) hiển thị bằng Inter.
- Gợi ý: sao chép 3 khối @font-face Space Grotesk từ edufind-khgd/portal/fonts.css (dòng 6-8).

## 06-A2 | P1 | Tên dài không có khoảng trắng làm trang hồ sơ cuộn ngang
- Ở đâu: h2.au trong #/tac-gia/<id> (styles.css, overflow-wrap: normal). 
- Tái hiện: viewport 375px, #/tac-gia/A5155559791, đặt tên thành chuỗi "Nguyễnnnn..." 70 ký tự không dấu cách (hoặc tên thật dạng từ ghép dài, URL, tên Thái liền).
- Mong đợi: ngắt dòng/ellipsis trong khung. Thực tế: documentElement.scrollWidth = 1045 so với 375 (cuộn ngang cả trang). Trang danh sách thì cột tên giãn bảng ra 1095px, chỉ cuộn trong .table-wrap (chấp nhận được nhưng bảng rộng bất thường).
- Gợi ý: h2.au, td a: overflow-wrap:anywhere (hoặc word-break:break-word), min-width:0; có thể thêm hyphens:auto + lang.

## 06-A3 | P2 | Định dạng số không theo ngôn ngữ, không nhất quán
- Ở đâu: App.tsx (render điểm/trích dẫn trong bảng, thẻ thống kê); chỉ tooltip top2 dùng toLocaleString(vi-VN/en-US).
- Thực tế: ở chế độ VI, điểm hiện "325.5", "321.75", "233.25" (dấu chấm), trích dẫn "2543" / "5089" không có dấu phân nhóm; còn tooltip Top 2% dùng "1.234" kiểu vi-VN. EN/VI cho cùng chuỗi số y hệt (so sánh innerText hai chế độ).
- Mong đợi: VI "325,5", "2.543"; EN "325.5", "2,543"; thống nhất toàn app (tooltip và bảng cùng một bộ định dạng).
- Gợi ý: một hàm fmt(n, lang, {maximumFractionDigits:2}) dùng Intl.NumberFormat.

## 06-A4 | P2 | Điểm số có số chữ số thập phân thay đổi nên cột "Tổng điểm" không thẳng dấu thập phân
- Ở đâu: cột Total score, .num (tabular-nums, text-align:right). Giá trị: 325.5, 321.75, 233.25, 196.25, 161 (1-2-0 chữ số lẻ).
- Mong đợi: cố định 2 chữ số lẻ (minimumFractionDigits:2) để dấu thập phân thẳng hàng. Thực tế: dấu thập phân lệch giữa các hàng.

## 06-A5 | P3 | Dải unicode-range thiếu U+031B (dấu móc tổ hợp) và vài dấu NFD
- Ở đâu: fonts.css, khối vietnamese của Inter/Space Grotesk (có 0300-0301, 0303-0304, 0308-0309, 0323, 0329 nhưng không 031B, 0306, 0302).
- Thực tế: chuỗi NFD "Nguyễn Thị Thuỷ... ư ơ" trong thử nghiệm: các dấu tổ hợp ngoài dải lấy từ phông hệ thống (Liberation Serif hiện 3 glyph), dấu lệch kiểu chữ (06-glyphs.png dòng NFD: "Nguyễn", "ẫ" có dấu khác nét). Dữ liệu thật có 10 tên NFD (vd A5155559791, A5154427033) và 2 tên bị tách dấu bằng khoảng trắng A5009055800 "Quô ́c B. Nguyê ̃n", A5041686655 (lỗi dữ liệu, hiển thị "Quô ć B. Nguyê ñ" ở 06-prof-d-A5009055800.png).
- Gợi ý: chuẩn hóa NFC khi nạp dữ liệu (name.normalize("NFC")) và gộp dấu rời; mở rộng unicode-range thêm U+0302, U+0306, U+031B (như bản Google gốc).

## 06-A6 | P3 | Chữ lẻ (orphan) và thiếu text-wrap: pretty
- Ở đâu: p/.banner, .stats span, .tag; chỉ h1 có text-wrap:balance, mọi đoạn khác text-wrap:wrap. Kho EduFind có orphans.js chống chữ lẻ nhưng ProFind không.
- Thực tế: ở 414px, thẻ thống kê và mô tả có dòng cuối chỉ rộng 26px (một từ/âm tiết); banner 768px dòng cuối 79px.
- Gợi ý: p,.banner,.stats span,.meta{text-wrap:pretty}; hoặc dùng nbsp nối 2 từ cuối.

## 06-A7 | P3 | Cỡ chữ quá nhỏ
- Đo: .top2 (huy hiệu ★) 10.88px (0.68rem), .sel span nhãn 11.2px, th 11.52px, .tagf 10.88px. Dưới 12px, kèm chữ HOA + dấu tiếng Việt khó đọc (th, .sel span in hoa).
- Gợi ý: tối thiểu 12px (0.75rem).

## 06-A8 | P3 | Không preload phông, phông đến muộn trên mạng chậm
- Thực tế (50KB/s, 400ms): index.js 249KB, trang trắng ~6s (không có shell/fallback HTML tĩnh trong #root); các woff2 chỉ được phát hiện sau khi CSS và render, đổi phông ở ~9s (swap, CLS đo được = 0, không FOIT vì font-display:swap). Tải trọn: Inter-latin 48KB + ext 85KB (latin-ext tải dù trang chỉ cần tiếng Việt/Latin, vì dải 1E00-1E9F/U+0100-02BA trùng ký tự tiếng Việt như ă, đ, ơ nên bị kéo vào: 143KB phông Inter trước khi dùng Space Grotesk).
- Cache: máy chủ test (Python SimpleHTTP) không gửi Cache-Control; tệp /fonts/*.woff2 và assets hash chưa kiểm được trên Vercel, cần cache immutable trong vercel.json.
- Gợi ý: <link rel="preload" as="font" type="font/woff2" crossorigin> cho inter-latin và inter-vietnamese; cân nhắc bỏ latin-ext hoặc để unicode-range không chồng; Cache-Control: public,max-age=31536000,immutable cho /fonts và /assets.

## 06-A9 | P3 | Ngăn xếp phông không có fallback cho CJK/Ả Rập/Thái/Hàn và ký hiệu
- Dữ liệu thật có chữ Kirin, Hán, Hàn (Hangul dạng tổ hợp jamo), Ả Rập, Thái (vd A5061150241, A5153946443). Các chữ này dùng phông hệ thống (Linux thử nghiệm: WenQuanYi, DejaVu, Loma, Unifont); không ô vuông (tofu) nhưng khác trọng lượng/chiều cao dòng. ★ ↗ ⇄ … ✓ ⚠ đều có glyph (DejaVu/hệ thống), ★ trong .top2 lấy từ phông hệ thống (Inter:1 không phải custom). Không đủ bằng chứng là lỗi trên máy thật; chỉ khuyến nghị thêm "Noto Sans CJK, Noto Sans Arabic, Noto Sans Thai" vào --font-body và dùng SVG cho ★.

## Mục đã kiểm đạt
- Tất cả phần tử (thân, bảng, nút, input, select, nhãn, tooltip nội dung) dùng Inter tự lưu (isCustomFont), không rơi về phông hệ thống cho chữ Latin/Việt (trừ A1, A5).
- NFC đầy đủ dấu "Nguyễn Thị Thuỷ Đặng Ữ Ự Ỷ ẫ ậ ệ ộ ợ" và chữ hoa hiển thị đúng, không tofu, dấu không lệch (Inter).
- Gạch nối đặc biệt ‐ – — ’ « » ® có glyph; tên dữ liệu có ‐ (131 lần) hiển thị bình thường.
- font-display:swap, CLS = 0 khi đổi phông, không FOIT, mạng chậm vẫn đọc được bằng phông hệ thống.
- Tiêu đề h1 (line-height 36px/24px = 1.5) và thẻ thống kê (1.5) không bị cắt dấu; không overflow hidden trên h1; letter-spacing -0.02em không làm dính dấu tại cỡ ≥24px (kiểm bằng ảnh zoom 3x).
- font-variant-numeric: tabular-nums áp dụng cho .num và .issn.
- Tên dài có dấu gạch nối/khoảng trắng (Curly-Howard-Chungus...) ngắt dòng đúng ở 375px.
- Chuyển VI/EN không gây cuộn ngang ở trang danh sách (375px).
