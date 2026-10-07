# Báo cáo 20 - SEO, PWA, chia sẻ, liên kết hệ sinh thái, đồng bộ EduFind (ProFind)
Bản thật: https://profind-red.vercel.app (kiểm 2026-10-07). Không sửa mã nguồn. Ghi chú: profind.isavn.edu.vn bị proxy chặn/DNS chưa trỏ nên không kiểm được; các kết luận về canonical/og dựa trên mã và HTML.

## LỖI ĐÃ XÁC MINH

### 20-A1 (P1) og:image trỏ tới ảnh vuông 512 và tên miền chưa hoạt động; thiếu og:description, twitter:*, og:image:width/height/alt, og:locale
- Ở đâu: /home/user/profind/index.html dòng og:*.
- Tái hiện: `curl -s https://profind-red.vercel.app/ | grep -c og:description` ra 0; không có thẻ twitter:card. og:image = https://profind.isavn.edu.vn/icon-512.png (512x512 RGBA, vuông, 4.8% điểm ảnh trong suốt ở góc). EduFind có og.jpg 1200x630, twitter:card=summary_large_image, 13 thẻ og.
- Mong đợi vs thực tế: thẻ xem trước 1200x630 đủ bộ; thực tế Facebook/Zalo/Slack cắt/nhỏ ảnh vuông, trên nền trong suốt hiện viền đen; X không có card nên tự suy; mô tả chia sẻ lấy tuỳ ý. Khi chia sẻ link profind-red.vercel.app, og:url và og:image lại trỏ sang tên miền chưa có DNS nên ảnh KHÔNG tải được (ảnh hỏng trong xem trước).
- Gợi ý: tạo public/og.jpg 1200x630 (logo + "Tra cứu tác giả"), thêm og:description, og:locale vi_VN/en_US alternate, og:image:width/height/type/alt, twitter:card summary_large_image + title/description/image; sinh theo `socialTags()` của EduFind (vite.config.ts); cho tới khi DNS xong, dùng URL tuyệt đối theo biến môi trường.

### 20-A2 (P1) Canonical và og:url trỏ domain chưa tồn tại
- Ở đâu: index.html `<link rel="canonical" href="https://profind.isavn.edu.vn/">`, og:url.
- Thực tế: bản đang chạy ở profind-red.vercel.app khai canonical sang host không phân giải được (proxy báo connect_rejected; curl mã 000). Công cụ tìm kiếm có thể bỏ trang hoặc chọn host sai; đồng thời hai host về sau sẽ trùng nội dung.
- Gợi ý: đặt canonical theo biến môi trường; chỉ chuyển sang isavn khi DNS hoạt động; thêm chuyển hướng 301 từ *.vercel.app sang tên miền chính.

### 20-A3 (P1) Không có robots.txt, sitemap.xml (và EduFind có cả hai)
- Tái hiện: curl robots.txt, sitemap.xml trên profind-red.vercel.app trả 404 (text/plain, đúng 404 thật, không phải SPA fallback). EduFind: cả hai 200.
- Gợi ý: thêm public/robots.txt (Allow /, Sitemap: ...; Disallow /data/ nếu không muốn lập chỉ mục JSON lớn) và sitemap.xml tối thiểu (trang chủ, #/dinh-chinh không cần).

### 20-A4 (P1) document.title cố định, không đổi theo hồ sơ/ route
- Tái hiện: mở https://profind-red.vercel.app/#/tac-gia/A5026220137 -> title vẫn "ProFind | Tra cứu tác giả và công trình nghiên cứu" (cả trang danh sách, trang hồ sơ, trang đính chính; cả hai ngôn ngữ vì title nằm tĩnh trong index.html, không có `document.title` trong src). Tab, lịch sử, dấu trang, khi chia sẻ đều giống nhau.
- Gợi ý: useEffect đặt `document.title = "<Tên tác giả> | ProFind"` và `#/dinh-chinh` -> "Đề nghị đính chính | ProFind"; đổi theo ngôn ngữ (title/description tĩnh luôn tiếng Việt dù UI tiếng Anh).

### 20-A5 (P2) Không có JSON-LD, không có `<noscript>`, `<div id=root>` rỗng
- EduFind có WebSite/WebPage/Breadcrumb/Dataset JSON-LD và nội dung dựng sẵn (%PRERENDER%). ProFind: 0 thẻ ld+json; không prerender nên trình thu thập không chạy JS thấy trang trống. Thêm `<meta name="color-scheme" content="light dark">` (EduFind có), `<noscript>`.
- Gợi ý: JSON-LD WebSite + Dataset (nguồn OpenAlex/ORCID, giấy phép), prerender danh sách top (không cần tên người, xem A6).

### 20-A6 (P2, đánh giá + đề xuất) Hash route không lập chỉ mục hồ sơ; cân nhắc quyền riêng tư
- `#/tac-gia/<id>` là fragment: Google không lập chỉ mục từng hồ sơ; mọi hồ sơ đều là một URL "/". Đây vừa là hạn chế SEO vừa là lớp bảo vệ quyền riêng tư vô tình.
- Đề xuất: (1) KHÔNG vội chuyển sang /tac-gia/<id> + prerender cho 5089 tên người khi chưa có cơ chế rút khỏi lập chỉ mục: tên + cơ quan + công trình + điểm số (kèm cờ "suspect") gắn với cá nhân là dữ liệu có thể gây tranh cãi; ProFind đã có biểu mẫu đính chính nên nên có trước. (2) Nếu làm: đường dẫn thật + `<meta name="robots" content="noindex">` mặc định, chỉ index tác giả đã xác nhận/đồng ý; hoặc chỉ prerender trang tổng hợp theo ngành/đơn vị (không tên cá nhân). (3) Hiện cần ít nhất thêm vào robots/meta noindex cho #/dinh-chinh (không áp dụng được với hash; nếu chuyển path thì cần).
- Phụ: hồ sơ chia sẻ được (hash giữ nguyên khi dán link) nhưng xem trước luôn là trang chung do 20-A1/A4.

### 20-A7 (P2) Khóa ngôn ngữ "edufind.lang" không dùng chung giữa ProFind và EduFind trên thực tế
- Ở đâu: /home/user/profind/src/i18n.ts dòng 3 (chú thích "dùng chung với EduFind"); EduFind src/i18n.tsx ghi "cùng một tên miền".
- Thực tế: localStorage tách theo origin; profind.isavn.edu.vn / profind-red.vercel.app và edufind.isavn.edu.vn là origin khác nhau nên chọn VI ở EduFind rồi sang ProFind vẫn theo navigator.language. Thử: ProFind (EN trình duyệt) tự ghi edufind.lang=en ngay lần tải đầu dù người dùng chưa chọn (effect ghi lúc mount).
- Gợi ý: truyền ngôn ngữ qua tham số (`?lang=vi` trong goUrl, cổng /go đã có `from`), hoặc cookie Domain=.isavn.edu.vn; chỉ ghi localStorage khi người dùng bấm đổi.

### 20-A8 (P2) EduFind không liên kết sang ProFind; cổng /go không có "profind"
- grep "profind" trong src/, portal/, scripts/ của EduFind: 0 kết quả. Hệ sinh thái EduFind gồm EduFind, Ami, Mây; ProFind tự coi là bước 1 nhưng không ai dẫn vào. curl `https://isavn.edu.vn/go/profind?from=edufind` -> 404.
- ProFind -> cổng: `/go/ami?from=profind` 302 sang aaa.isavietnam.app/?utm_source=isavn.edu.vn&utm_medium=ecosystem&utm_campaign=ami (chấp nhận from=profind nhưng cũng chấp nhận bất kỳ from; không xác minh được ghi nhận). `/go/may?from=profind` 302 sang trolyvanthu.isavn.edu.vn. ProFind chỉ có 3 bước (ProFind, EduFind, Ami), thiếu Mây (EduFind có Mây, không có ProFind) -> hai hệ sinh thái không đồng nhất.
- Link EduFind của ProFind là trực tiếp `https://edufind.isavn.edu.vn/` (không qua /go, không from/utm) nên không đo được hành trình; Ami link không có `to`/utm như goUrl(). Gợi ý: dùng cùng hàm goUrl; thống nhất danh sách 4 ứng dụng.

### 20-A9 (P2) Không có liên kết Issues/báo lỗi; repo public nhưng không được dùng
- Repo https://github.com/lvhoang90/profind trả 200, /issues 200 (công khai, người ngoài truy cập được). UI không có liên kết Issues; chỉ có biểu mẫu đính chính (#/dinh-chinh) và email CONTACT. EduFind repo `lvhoang90/edufind-khgd` trả 404 (private hoặc tên khác), không dẫn tới được. Cần xác nhận không để lộ email (luongviethoang.hcm@gmail.com) trong bundle ý định.
- DOI Top2 https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/8 hiển thị "DOI 10.17632/btchxktzyw.8" nhưng URL là digitalcommonsdata, không phải https://doi.org/...; nên dùng doi.org để bền vững (P3).

### 20-A10 (P2) Thiếu tính năng đồng bộ so với EduFind (xếp ưu tiên)
ProFind không có: thanh "Hệ sinh thái ISA" trên cùng (EduFind có thanh với chip EduFind/Ami/Mây + isavn.edu.vn); chuyển giao diện sáng/tối thủ công (chỉ theo prefers-color-scheme; EduFind có data-theme); logo "E" + huy hiệu phiên bản v1.5; hiệu ứng nền (cosmos/fx); số lượt truy cập (embed.js data-site, hiển thị 9,136 ở EduFind) - ProFind không có thống kê nào; đăng ký/tài khoản (auth.js); thông báo "có gì mới" + trang cap-nhat/changelog (RSS cap-nhat.xml); hướng dẫn sử dụng (huong-dan/); khối "Về tác giả" (SiteChrome); preload phông; ghi nhớ tìm kiếm (recent.ts); nút chia sẻ/sao chép liên kết; trích dẫn APA.
Ưu tiên: P1 thanh hệ sinh thái + goUrl thống nhất + changelog/tác giả/liên hệ; P2 chia sẻ & sao chép link hồ sơ, trích dẫn APA cho hồ sơ, đo lượt truy cập, chuyển sáng/tối; P3 tài khoản, ghi nhớ tìm kiếm (lưu trữ tại máy), hướng dẫn.
Khác biệt thiết kế đã quan sát: cùng bảng màu #0b2a40 (header gradient) và Inter/Space Grotesk, cùng ".eco" 3 bước + "Bạn đang ở đây" - đồng bộ ở mức nền; ProFind thiếu mô tả ("eco-lead") và đoạn mô tả từng bước (EduFind có dòng mô tả), thương hiệu "ProFind" viết nhất quán (Pro + Find tô màu) trong khi EduFind viết "EduFind" một màu - khác kiểu.

### 20-A11 (P3) Manifest/icon chi tiết
- apple-touch-icon icon-180.png có 5,2% pixel trong suốt (góc bo): iOS tô nền đen ở góc -> nên dùng bản nền đặc vuông (như icon-maskable-512 đã đặc, 0% trong suốt) cho 180.
- Manifest thiếu `description`, `id`, `purpose:"any"` rõ ràng cho 192/512 (EduFind có), không có `screenshots`, không có service worker (ghi nhận: không cài offline, Chrome vẫn cho Add to Home screen, nhưng không có "Install" tự động trên một số trình duyệt cũ).
- Không có `<link rel="alternate icon">` PNG fallback; title/description tĩnh chỉ tiếng Việt.

## MỤC ĐÃ KIỂM ĐẠT
- lang="vi" và document.documentElement.lang đổi theo EN/VI; viewport; theme-color #0b2a40 khớp background_color/theme_color manifest và EduFind.
- manifest.webmanifest 200, application/manifest+json, hợp lệ JSON; start_url "./" scope "./" đúng khi host ở gốc (không đúng nếu về sau triển khai vào thư mục con nhưng không dự kiến); short_name "ProFind"; display standalone.
- favicon.svg, icon-180/192/512, icon-maskable-512, logo-disc.svg đều 200 và đúng kích thước; maskable đặc nền, không trong suốt; trong vòng tròn cắt 80% hình mascot vẫn nguyên vẹn (an toàn vùng); favicon 16/32/48 nhận ra được hình hoa năm cánh, nền đậm nên không có viền xấu trên tab sáng/tối.
- title/description của trang chủ có và hợp lý; og:title, og:url, og:type, og:site_name có.
- Giao diện sáng/tối theo hệ thống hiển thị đúng; chip "Bạn đang ở đây" ở eco; liên kết ra ngoài dùng rel=noopener; /go/ami và /go/may hoạt động với from=profind.
