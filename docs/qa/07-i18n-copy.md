# Báo cáo 07: Đa ngôn ngữ VI/EN và nội dung văn bản (ProFind, http://127.0.0.1:4300/)

Phương pháp: đọc src/i18n.ts, App.tsx, disciplines.ts; chạy Playwright (kịch bản /tmp/claude-0/qa/scripts-07/t1-t3.js, ảnh /tmp/claude-0/qa/shots/07-*.png). Chỉ liệt kê lỗi đã xác minh.

## Lỗi

### 07-A1 | P2 | Thẻ <title> (và og:title, meta description) luôn tiếng Việt khi chuyển sang EN
- Ở đâu: index.html; App.tsx chỉ cập nhật document.documentElement.lang.
- Tái hiện: mở bằng locale en-US (hoặc bấm EN) rồi đọc document.title.
- Mong đợi: "ProFind | Find researchers and their publications". Thực tế: "ProFind | Tra cứu tác giả và công trình nghiên cứu" (cả trên trang hồ sơ, trang đính chính; tab trình duyệt không nêu tên tác giả). <html lang> thì đúng (vi/en).
- Bằng chứng: kết quả t1.js cho 5 locale, title không đổi.
- Gợi ý: trong useEffect theo lang đặt document.title = `${t("sub")} | ProFind` (hồ sơ: `${a.name} | ProFind`); meta description theo ngôn ngữ nếu có prerender.

### 07-A2 | P2 | Đổi ngôn ngữ làm ô "Đơn vị" giữ chữ ngôn ngữ cũ và bộ lọc đơn vị mất hiệu lực âm thầm
- Ở đâu: List() trong App.tsx: `inst` suy ra từ so khớp instText với tên theo ngôn ngữ hiện tại.
- Tái hiện: EN, gõ "Can Tho University" (hiển thị 33/33 tác giả), bấm VI.
- Mong đợi: ô đổi thành "Đại học Cần Thơ" hoặc bộ lọc giữ nguyên. Thực tế: ô vẫn là "Can Tho University" nhưng danh sách trở về "Hiển thị 100 / 5089 tác giả" (bộ lọc biến mất, người dùng tưởng vẫn đang lọc).
- Bằng chứng: shots/07-vi-instswitch.png.
- Gợi ý: lưu id đơn vị đã chọn (không lưu chuỗi), hiển thị tên theo lang hiện tại.

### 07-A3 | P2 | Định dạng số không theo ngôn ngữ, lẫn lộn trong cùng màn hình
- Ở đâu: App.tsx (chỉ top2 rank dùng toLocaleString; điểm, trích dẫn, số bài, ngày không dùng).
- Thực tế: VI: điểm "325.5" (VN dùng "325,5"), trích dẫn "2543" không phân tách nghìn, trong khi tooltip Top 2% ghi "hạng 741.671" (dấu chấm nghìn VN). Cùng một trang vừa dấu chấm thập phân vừa dấu chấm nghìn, dễ đọc nhầm 325.5 thành 3255. EN: "2543" không có dấu phẩy. Ngày nguồn dữ liệu "2026-10-07" (ISO) ở cả hai ngôn ngữ (VI nên "07/10/2026", EN "Oct 7, 2026").
- Gợi ý: một hàm fmt(n, lang) dùng Intl.NumberFormat (maximumFractionDigits 2) cho điểm, trích dẫn, số bài, mục thống kê; Intl.DateTimeFormat cho {d}.

### 07-A4 | P2 | Câu cảnh báo "thứ hạng chỉ để tham khảo" tự mâu thuẫn và quá dài (VI 410 ký tự, một đoạn)
- Ở đâu: key notRank (cả vi và en), banner hiện trên mọi trang kể cả trang đính chính.
- Vấn đề: "Điểm là mức tối đa ... nên là mức tham khảo thấp hơn thực tế": vừa nói "tối đa" vừa nói "thấp hơn thực tế" khiến người đọc không biết điểm là cận trên hay cận dưới. Ý đúng: với từng bài là mức trần theo quy tắc, nhưng tổng có thể thấp hơn thực tế vì thiếu SCIE/SSCI/kỷ yếu. Cụm "kỷ yếu hội nghị, nên" thiếu động từ và dấu ngắt. Bản EN còn bỏ mất "than actual" ("a lower reference value" thiếu "than the real score") nên hai bản không tương đương. Đoạn dài lẫn quy tắc tác giả chính, người đọc lướt sẽ bỏ qua; trên trang đính chính câu này không liên quan.
- Gợi ý lời ngắn (VI): "Thứ hạng và điểm chỉ để tham khảo, không phải xếp hạng chính thức. Điểm tính theo mức tối đa của quy tắc HĐGSNN và chỉ cho tác giả chính; do chưa nhận diện được SCIE/SSCI và kỷ yếu hội nghị nên tổng điểm có thể thấp hơn điểm thực tế." Đưa quy tắc tác giả chính (đứng đầu / liên hệ duy nhất) vào dòng giải thích có thể mở rộng hoặc tooltip. EN: "Rankings and scores are for reference only, not an official ranking. Scores use the maximum level under Council rules and count only the lead author. SCIE/SSCI journals and conference proceedings are not identified, so a total may be lower than the real score."

### 07-A5 | P3 | Chuỗi không dịch / lẫn ngôn ngữ
- (a) Tooltip Top 2% ở VI: "lĩnh vực: Chemistry" (tên lĩnh vực nguyên tiếng Anh, từ dữ liệu); tương tự hồ sơ.
- (b) 83/212 đơn vị có trường `en` còn tiếng Việt hoặc lai ("Trường Đại học Đông Đô", "Học viện Tư pháp", "Bình Dương University", "Tân Tạo University", "Viện Khảo cổ học"...) nên ở EN danh sách đơn vị và datalist lẫn tiếng Việt; 125 đơn vị en trùng hệt vi (đa số tên Anh vốn đúng, nhưng nhóm tên Việt cần dịch).
- (c) aria-label="Language" của nhóm nút VI/EN cố định tiếng Anh ở cả hai ngôn ngữ; nút "VI"/"EN" không có lang/aria-label đầy đủ.
- (d) Nhãn "Scopus Q1" (App.tsx) và title "Scopus Q1" gắn cứng; chấp nhận được (thuật ngữ quốc tế) nhưng không đi qua i18n. Tiêu đề cột CSV (year,title,journal...) luôn tiếng Anh.
- (e) Placeholder ô tìm kiếm trùng hệt nhãn ("Tìm theo tên, ORCID...") nên lặp hai lần ngay cạnh nhau.
- Gợi ý: chuẩn hóa `en` cho 83 đơn vị; tra bảng dịch tên lĩnh vực Top 2%; t("lang") cho aria-label.

### 07-A6 | P3 | Thuật ngữ và độ nhất quán với EduFind
- VI chỉ dùng "HĐGSNN" viết tắt (tagline, banner, nhãn thống kê "Điểm theo danh mục HĐGSNN") không giải nghĩa lần nào; EduFind VI viết "Hội đồng Giáo sư nhà nước" (viết hoa "Nhà nước" cũng không thống nhất trong EduFind). EN ProFind dùng "Council" trơn ở ~6 chỗ (kDom "Domestic journal (Council)", "Council catalogue") sau lần đầu "State Professorship Council" ở tagline, EduFind EN dùng "State Professorship Council" đầy đủ và giữ "HĐGSNN" ở nhãn cột.
- Cột vai trò: VI "Chính" / "Đồng tác giả" (không đối xứng, "Chính" đơn độc khó hiểu), EN "Lead" / "Co-author". Nên "Tác giả chính" / "Đồng tác giả" (đúng thuật ngữ EduFind "tác giả chính"), EN "Lead author" / "Co-author".
- EN "Years" cho cột VI "Năm đăng" (nên "Publication years").
- "Cao đẳng, dự bị đại học" dịch "College" mất ý "dự bị đại học".
- Tên ngành EN viết tắt không đẹp: "Mechanical Eng.", "Electrical & Electronic Eng.", "Chemistry & Food Tech", "Animal Science, Vet. & Fisheries"; "Hydraulics" cho "Thủy lợi" (đề xuất "Hydraulic and Water Resources Engineering"). Đủ 28 ngành, không ngành nào thiếu.
- "Điểm" (cột công trình, key pts) và "Tổng điểm" ổn; "Số bài" (VI) vs "Papers"/"Work" EN dùng lẫn "paper/work" (key paper="Công trình"/"Work" nhưng works="Số bài"/"Papers").

### 07-A7 | P3 | Địa chỉ hồ sơ không tồn tại không có thông báo
- Tái hiện: #/tac-gia/zzz. Thực tế: lặng lẽ hiện danh sách đầy đủ, không có câu "Không tìm thấy hồ sơ"; bộ i18n không có khóa tương ứng. #/dinh-chinh/zzz hiện biểu mẫu chung không báo id sai.
- Gợi ý: thêm khóa notFound ở cả hai ngôn ngữ.

## Đã kiểm đạt
- Khóa: en được ép kiểu `typeof vi`; khóa đủ ở cả hai (kiểm bằng kiểu TypeScript), không khóa nào bỏ trống.
- Biến {n},{t},{r},{f},{d}: không còn "{x}" lộ trên danh sách, hồ sơ, chân trang (cả hai ngôn ngữ).
- 28 ngành đủ ở VI/EN; 7 loại đơn vị có đủ vi/en; nhãn bộ lọc, banner, tooltip, thông báo trống/lỗi, chân trang đều có bản dịch.
- Trang đính chính (tiêu đề, nhãn, lỗi gửi, mailto) dịch đủ; đổi ngôn ngữ giữa chừng khi đang điền biểu mẫu (tên, nội dung, loại yêu cầu) KHÔNG mất dữ liệu; URL giữ nguyên (#/tac-gia/<id>, #/dinh-chinh/<id>) ở mọi lần chuyển.
- <html lang> đổi đúng vi/en; aria-label/placeholder ô tìm kiếm có dịch.
- Mặc định ngôn ngữ: vi-VN -> vi; en-US, fr-FR, zh-CN, ja-JP -> en (đúng thiết kế startsWith("vi")). localStorage giá trị lạ ("fr") bị bỏ qua và ghi đè "en"; localStorage ném lỗi (bị chặn): không lỗi trang, chuyển VI/EN vẫn hoạt động trong phiên.
- Ghi chú: dùng chung khóa "edufind.lang" đúng như thiết kế; nhãn "Scopus Qn", "Lead/Co" hiển thị đúng ở cả hai ngôn ngữ trừ các điểm nêu trên.
