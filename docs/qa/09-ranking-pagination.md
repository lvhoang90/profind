# Báo cáo kiểm thử 09: Thứ hạng, sắp xếp, phân trang (ProFind, bản test http://127.0.0.1:4300/)

Dữ liệu: 6.876 tác giả; mặc định (scope "vn") hiển thị 5.089 (loại foreign=true 1.239, foreign=null 548, suspect). Script: /tmp/claude-0/qa/scripts-09/{an.js,ui.js,prof.js}; ảnh: /tmp/claude-0/qa/shots/09-list.png, 09-profile-top1.png, 09-filter.png.

## 09-A1 (P1) Hạng ở hồ sơ không khớp hạng ở danh sách mặc định
- Ở đâu: src/App.tsx dòng 96 (`i + 1`) so với dòng 127 (`#{a.rankScore}`); scripts/build-index.mjs dòng 78-79 (xếp hạng trên toàn bộ outAuthors, gồm nước ngoài/suspect).
- Tái hiện: mở `#/`, bấm hàng 1 "Nguyễn Hữu Hiếu" (A5026220137).
- Mong đợi: hạng ở hồ sơ trùng hạng người dùng vừa thấy (1).
- Thực tế: danh sách ghi 1, hồ sơ ghi "#4 Hạng · Tổng điểm" (và #18 Hạng · Số bài). Lê Thanh Hà: danh sách 2, hồ sơ #5. D.M. Hoat: 3 vs #7. Cong Doanh Duong: 4 vs #8. Vu Hong Son Pham: 5 vs #12. Ninh The Son: 6 vs #14. Tính độc lập từ profind.json: trong 5.089 hàng mặc định, 5.088 hàng có vị trí khác rankScore (chỉ 1 hàng trùng). Nguyên nhân: ba hạng đầu toàn dữ liệu là người nước ngoài ẩn (Jie Yang #1, Pugazhendhi #2, Ming-Lang Tseng #3).
- Bằng chứng: an.js (mismatch 5088), prof.js, ảnh 09-profile-top1.png. Hồ sơ không có nhãn nào giải thích phạm vi hạng.
- Gợi ý: ghi rõ "Hạng #4 trong 6.876 tác giả" (kèm mẫu số), hoặc tính thêm rankScoreVn trong build-index (chỉ foreign===false && !suspect) và hiển thị "#1/5.089", hoặc đổi tiêu đề cột danh sách thành "Vị trí" để khỏi nhầm với hạng.

## 09-A2 (P1) Sắp xếp theo "Số bài"/"Trích dẫn": cột Hạng vẫn 1..n nhưng hồ sơ ghi hạng theo điểm
- Ở đâu: App.tsx dòng 96; không có rank theo trích dẫn ở dữ liệu.
- Tái hiện: chọn Sắp xếp = Số bài, bấm hàng 1 "Xuan Vinh Vo".
- Thực tế: danh sách ghi 1; hồ sơ "#770 Hạng · Tổng điểm", "#10 Hạng · Số bài". Hàng 6 "Minh–Triet Tran": hạng điểm #2529, hạng số bài #19. Sắp theo Trích dẫn: Linh Gia Vu ghi 1, hồ sơ #638 (điểm)/#644 (bài); hồ sơ không có hạng trích dẫn nào. Cột "Hạng" không nói rõ hạng theo tiêu chí nào.
- Gợi ý: đổi tiêu đề cột theo tiêu chí đang sắp ("Hạng theo số bài"), hoặc ẩn hạng khi sắp theo trích dẫn; thêm rankCitations nếu muốn hiển thị.

## 09-A3 (P2) Đồng hạng: danh sách đánh số liên tục, hồ sơ cho cùng số
- Ở đâu: App.tsx dòng 96 vs build-index.mjs dòng 78.
- Thực tế: có 2.408/5.089 tác giả mặc định điểm 0. Trong danh sách họ nhận hạng 2.682…5.089 (khác nhau), còn hồ sơ cả 2.408 người đều "#3954" (xác minh hàng đầu và cuối: vị trí 2.682 và 5.089 đều rankScore 3954; Anh Dang Ngyuyen cuối bảng). Đồng điểm ở top cũng vậy: điểm 105,5 có 3 người, 80 có 3 người, 112,5 và 68,75 có 2 người; danh sách đánh số khác nhau, hồ sơ cùng số. Thứ tự giữa các hàng đồng điểm được chốt theo số bài rồi thứ tự dữ liệu, người dùng không biết là đồng hạng.
- Gợi ý: cột danh sách dùng cùng quy tắc đồng hạng (hiện "=" hoặc cùng số, khi sắp theo tiêu chí đang chọn); không hiển thị hạng cho nhóm điểm 0 (hiện "-").

## 09-A4 (P2) Hạng của hồ sơ suspect/nước ngoài mang nghĩa khó hiểu, và hạng #1 toàn cục là hồ sơ bị ẩn
- Ở đâu: build-index.mjs dòng 78; `#/tac-gia/A5100404947`.
- Thực tế: Jie Yang (suspect + nước ngoài, 2.509 bài) hiển thị "#1 Hạng · Tổng điểm" và "#1 Số bài" dù có cờ "Hồ sơ có thể gộp nhiều người"; Hijaz Ahmad #6/#2. Hạng này cũng đẩy hạng của người thật xuống (xem 09-A1). Hồ sơ Top 2% (42 người, 23 trong danh sách mặc định) không có hạng riêng, chỉ có nhãn.
- Gợi ý: loại suspect khỏi tính hạng (hoặc không hiển thị hạng cho suspect), tính hạng riêng cho nhóm nước ngoài.

## 09-A5 (P3) Hiệu năng khi tải hết 5.089 hàng
- Bấm "Hiển thị thêm" 50 lần: DOM tăng tuyến tính (+100 hàng/lần), thời gian mỗi lần bấm (đã gồm chờ của Playwright) tăng từ ~1,6 s ở 200 hàng lên ~2,7 s ở 4.200 và 5,6 s ở lần cuối (5.089 hàng); không ảo hóa danh sách.
- Gợi ý: virtualize hoặc chỉ cần cuộn vô hạn; mức ưu tiên thấp vì ít ai bấm 50 lần.

## 09-A6 (P3, đọc mã, chưa kiểm trên giao diện) 548 tác giả foreign=null bị ẩn khỏi mặc định
- App.tsx dòng 69: `a.foreign !== false` loại cả null (chưa biết). Chúng không có nhãn riêng và ảnh hưởng hạng như A1. Nên ghi chú hoặc đưa vào mặc định.

## Mục kiểm đạt
- Danh sách mặc định: số "Hiển thị 100 / 5089 tác giả" đúng (5.089 = đếm độc lập foreign===false && !suspect).
- Thứ tự 5.089 hàng khớp 100% với sắp xếp tính lại độc lập theo tổng điểm (rồi số bài); top 10 điểm/số bài/trích dẫn tính lại khớp thuật toán.
- Phân trang: mỗi lần +100 (200, 1.200, … 5.089), nút biến mất đúng sau lần thứ 50, không trùng (5.089 id duy nhất), không bỏ sót, cột hạng liên tục 1..5.089; thêm hàng dạng append nên giữ vị trí cuộn.
- Huy chương: hàng 1/2/3 có r1/r2/r3, hạng 4 trở đi dùng r4; khi lọc chỉ còn 70 kết quả ("Hiếu") vẫn đánh 1..70 và hàng 1-3 vẫn nhận màu huy chương (nhất quán, không phải lỗi).
- Điểm làm tròn: không có totalScore nào có quá 2 chữ số thập phân (0 trường hợp kiểu 13.249999).
- Hồ sơ: rankScore/rankWorks đúng quy tắc đồng hạng của build-index (cùng giá trị → cùng hạng).
- Không kiểm riêng (do hạn chế số lượt): đổi bộ lọc quay về 100 hàng (đã đọc mã: useEffect setLimit(PAGE), đạt khi đọc mã).
