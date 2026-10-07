# Báo cáo kiểm thử số 17: HIỆU NĂNG, tải trang, bộ nhớ đệm (ProFind)

Phạm vi: bản local http://127.0.0.1:4300 (không nén) và 4301 (máy chủ tạm của tôi, brotli q5, cùng dist) cho đo trình duyệt; bản thật https://profind-red.vercel.app chỉ đo tiêu đề bằng curl (khoảng 14 lượt). Script: /tmp/claude-0/qa/scripts-17/. Ảnh: /tmp/claude-0/qa/shots/17-*. "4G chậm" = 1,6 Mbps, RTT 150 ms, CPU 4x. Số đo CPU 4x chỉ là mô phỏng, có nhiễu.

## Số liệu nền (đã đo)
- Tải đầu: 9 request (html, JS, CSS, 2 svg, 3 phông, profind.json). JS 248.905 B (gzip/br tại Vercel: 75.473 B qua br local), CSS 9.025 B, phông tải ngay 48+10+85 KB (không nén, woff2), profind.json 4.579.499 B.
- profind.json tại Vercel: br = 754.718 B, gzip = 847.916 B (curl). Bản local không nén = 4,58 MB.
- Tổng truyền khi nén: khoảng 0,78-0,95 MB; không nén: 4,99 MB. Phần bắt buộc để thấy bảng = JS + CSS + profind.json (~92% dung lượng). Phông, svg không chặn bảng.
- Cơ cấu profind.json (6.876 tác giả): trường `jn` = 2.053.552 B = 45% dung lượng thô (br riêng: 215 KB). Bỏ `jn`: 2,52 MB thô, br 189 KB, gzip 262 KB. Chỉ giữ cột hiển thị ở danh sách (dạng mảng): 735 KB thô, br 130 KB, gzip 161 KB.

## Lỗi và đề xuất

### 17-A1 | P1 | Điều kiện đua (race) khi chuyển hồ sơ liên tiếp: hồ sơ B hiện công trình của hồ sơ A
- Ở đâu: src/App.tsx dòng 113 (AuthorPage, `useEffect` fetch works, không AbortController, không cờ huỷ).
- Cách đo: mở #/tac-gia/A5100404947 (2.509 công trình, tôi trì hoãn phản hồi 2,5 s bằng page.route), sau 0,3 s chuyển sang #/tac-gia/A5114376646 (785 công trình), đợi 4 s. Script author.js, ảnh 17-race.png.
- Mong đợi: hồ sơ B hiện đúng 785 công trình. Thực tế: sau khi phản hồi của A về muộn, URL vẫn là hồ sơ B nhưng nút "Hiển thị thêm" ghi "100/2509" (công trình của A đè lên B), và trước đó hiện "128/785" xen kẽ trong DOM. Nội dung sai tác giả: nghiêm trọng với công cụ tra cứu.
- Gợi ý: trong effect dùng `const ac = new AbortController()` và cleanup `ac.abort()`, hoặc cờ `let alive=true`; chỉ `setWorks` khi `alive`.

### 17-A2 | P1 | Lỗi tải công trình bị nuốt: hiển thị như hồ sơ không có công trình, không có thử lại
- Ở đâu: App.tsx dòng 113, nhánh `() => setWorks([])`; `r.json()` không kiểm tra `r.ok`.
- Cách đo: (a) setOffline(true) rồi mở #/tac-gia/A5114376646; (b) trả 500 cho works/A5068175005.json. Script off.js, ảnh 17-works-offline.png.
- Mong đợi: thông báo "không tải được công trình" + nút Thử lại. Thực tế: không có thông báo lỗi, không nút (chỉ VI/EN, Tải CSV); bảng công trình trống. Khi bật lại mạng, 0 hàng, không tự phục hồi (afterOnlineNoAction = 0).
- Gợi ý: trạng thái `error` riêng, kiểm tra `r.ok`, nút "Thử lại", lắng nghe sự kiện `online`.

### 17-A3 | P1 | Lỗi tải profind.json: chỉ một dòng, không thử lại, thông báo không phân biệt mất mạng
- Ở đâu: App.tsx dòng 23, 40.
- Cách đo: abort request; trả 503; trả thân JSON bị cắt (200). Cả 3 ca ra đúng một dòng "Could not load data." (0 nút Thử lại, tìm theo vai trò button /thử lại|retry/). Không có service worker (navigator.serviceWorker.controller = no), không dùng navigator.onLine. Không tìm thấy xử lý "mất mạng" nào trong /home/user/edufind-khgd/src bằng grep `onLine|offline` (kết quả rỗng, nên tôi không khẳng định hiện trạng EduFind).
- Gợi ý: nút Thử lại, tự thử lại có backoff, thông báo riêng "bạn đang ngoại tuyến", kiểm tra `r.ok`.

### 17-A4 | P1 | Phải tải và parse toàn bộ 4,58 MB mới thấy bảng; không có khung chờ; nén là yếu tố sống còn
- Ở đâu: App.tsx dòng 23, 40 (`!data` thì chỉ hiện chữ "Đang tải").
- Cách đo: load.js, bốn cấu hình, cache tắt, thời gian đến khi `tbody tr` xuất hiện (đã gồm overhead Playwright):
  - Mạng nhanh, local không nén: 1,70 s (FCP 0,31 s). Mạng nhanh, br: 1,3 s (một lần chạy cũ 6,2 s do máy chủ tạm nén lúc nguội, loại trừ).
  - 4G chậm + CPU 4x, KHÔNG nén: FCP 1,81 s, thấy bảng sau 28,1 s, TBT 3.706 ms, 53 tác vụ dài. profind.json tải 1.748 đến 25.407 ms.
  - 4G chậm + CPU 4x, br (555 KB local): FCP 1,43 s, thấy bảng sau 9,9 s, TBT 1.760 ms, 21 tác vụ dài; profind.json xong ở 5,95 s, tức khoảng 4 s còn lại là parse + dựng 100 hàng + chờ phông (lưu ý nhiễu).
- LCP = FCP (là dòng chữ tiêu đề, không phải bảng) nên chỉ số LCP không phản ánh thời điểm có nội dung có ích. Mong đợi (theo nguyên tắc 0,2-0,5 MB của EduFind, UNIFIED-DEPLOYMENT.md dòng 20): tải đầu dưới 0,5 MB; thực tế 0,78 MB sau nén (gấp 1,6 đến 4 lần).
- Gợi ý (theo mức lợi giảm dần): (1) bỏ `jn` khỏi tệp danh sách, đưa vào tệp riêng `search-journals.json` chỉ tải khi người dùng gõ từ khoá hoặc tách theo `works/`: tiết kiệm 2,05 MB thô (-45%), br còn 189 KB; (2) tách "list.json" dạng mảng cột (135 KB br) cho danh sách, lấy chi tiết khi mở hồ sơ; (3) tách theo phạm vi: chỉ nạp 5.089 tác giả VN trước (foreign/suspect nạp sau khi đổi phạm vi); (4) skeleton bảng 10 hàng thay cho chữ "Đang tải"; (5) `<link rel="preload" as="fetch" crossorigin href="./data/profind.json">` trong index.html để bắt đầu tải song song với JS (hiện fetch chỉ bắt đầu sau khi JS chạy: ở 4G chậm, request bắt đầu lúc 1,2 s).

### 17-A5 | P2 | CLS 0,255 trên màn hình đầu (ngưỡng xấu > 0,25): chân trang bị đẩy khi bảng xuất hiện
- Ở đâu: `<footer class="foot wrap">` (App.tsx dòng 44) khi `.empty` "Đang tải" được thay bằng bảng.
- Cách đo: PerformanceObserver layout-shift, viewport 390x800: một lần dịch chuyển duy nhất 0,255 tại 1,8 s, nguồn FOOTER.foot (từ y=596 sang ngoài khung nhìn). Lặp lại ở cả 4 cấu hình. Ảnh 17-cls.png, 17-predata.png.
- Mong đợi: CLS < 0,1. Gợi ý: đặt `min-height` cho `<main>` (hoặc skeleton cao tương đương 10 hàng), nhờ đó chân trang không nhảy.

### 17-A6 | P1 | Tiêu đề cache trên Vercel: tệp băm (hash) và dữ liệu đều `max-age=0, must-revalidate`; không `immutable`
- Cách đo (curl, bản thật): /assets/index-Babk5hc1.js, /data/profind.json, /data/works/*.json, /fonts/inter-latin.woff2 đều `cache-control: public, max-age=0, must-revalidate`. ETag có (W/"..." cho nội dung nén, mạnh cho woff2). `x-vercel-cache`: HIT cho profind.json, MISS cho JS, phông, works (lần đầu; edge cache vẫn có nhưng trình duyệt luôn phải revalidate).
- Mong đợi: /assets/* (tên băm) `public, max-age=31536000, immutable`; phông tương tự. Thực tế: mỗi lần mở lại phải gửi lại ít nhất 3 request điều kiện (JS, CSS, profind.json) dù chưa đổi; trên mạng chậm mỗi cái tốn 1 RTT. vercel.json chỉ có 3 khoá, không có `headers`.
- Gợi ý: thêm `headers` vào vercel.json: `/assets/(.*)` và `/fonts/(.*)` => `public, max-age=31536000, immutable`; `/data/profind.json` => `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` hoặc `max-age=300`; `/data/works/(.*)` => `max-age=86400, stale-while-revalidate`. Muốn cache dài cho dữ liệu thì đặt tên có băm (profind.<hash>.json) kèm `meta.fetched`.

### 17-A7 | P2 | Phông không preload; phông tiếng Việt và latin-ext tải muộn sau khi dữ liệu về, gây đổi chữ (swap)
- Cách đo: ở 4G chậm, inter-vietnamese (10 KB) và inter-latin-ext (85 KB) bắt đầu lúc 9,0 s, tức sau khi có bảng (resource timing); index.html không có `<link rel="preload" as="font">`; fonts.css (src/fonts.css) dùng `font-display:swap` nên chữ có dấu đổi phông sau khi thấy bảng.
- Gợi ý: preload inter-vietnamese + inter-latin với `crossorigin`; 85 KB latin-ext có thể cân nhắc bỏ nếu nội dung không cần. Lưu ý: curl phông tại Vercel không có `content-encoding` (woff2 đã nén sẵn, bình thường).

### 17-A8 | P1 | Tương tác trên 6.876 hàng: gõ ô tìm chậm (INP vượt ngưỡng) do lọc và dựng đồng bộ mỗi phím
- Ở đâu: App.tsx dòng 67-77: `useMemo` lọc đồng bộ trên mọi tác giả với `fold(a.name)` tính lại mỗi phím cho mọi hàng và `a.jn.includes(n)` trên chuỗi dài; không `useDeferredValue`, không debounce, không tính trước tên đã chuẩn hoá.
- Cách đo (inter2.js): gõ "nguyen" từng phím, đo đến 2 rAF; bấm Sort/Scope:
  - CPU 1x: phím 1..6 = 537, 122, 280, 94, 72, 97 ms; sắp xếp theo công trình 107 ms, theo điểm 394 ms, đổi phạm vi 261 ms.
  - CPU 4x: phím = 472, 616, 595, 196, 204, 285 ms; sắp xếp 681 và 735 ms; đổi phạm vi 173 ms đến 265 ms.
  - Gõ "nguyen van" ở 4x (inter.js): từng phím từ 271 đến 1.491 ms (trung vị khoảng 700 ms). INP "tốt" là ≤ 200 ms.
  - Đổi bộ lọc ngành: 1.339 ms và 893 ms ở 4x.
- Gợi ý: tính trước `nameFold` một lần khi nạp dữ liệu (map tên đã bỏ dấu); `useDeferredValue(q)`; tìm theo `jn` chỉ khi từ khoá >=3 ký tự và qua chỉ mục riêng; tránh sắp xếp lại bằng `.sort` trên mảng mới 6.876 phần tử mỗi lần (dùng danh sách đã sắp xếp sẵn theo từng khoá).

### 17-A9 | P1 | "Hiển thị thêm": thời gian bấm tăng theo số hàng, không ảo hoá; DOM và heap tăng tuyến tính
- Ở đâu: App.tsx dòng 95, 104 (`rows.slice(0, limit)` dựng lại toàn bộ hàng, `key` ổn định nhưng nội dung hàng tính lại; `limit+PAGE`).
- Cách đo (inter.js, CPU 4x, 5.089 tác giả VN, 50 lần bấm đến hết): nút bấm đầu tiên 1.575 ms, giữa chừng 1.228 ms, cuối cùng 5.558 ms; một sự kiện click treo tới 3.744 ms (pointerdown/up/click đều bị tính cùng). Số node DOM: 3.636 (đầu) đến 25.698 (sau 10 lần) đến 69.661 (30 lần) đến 112.411 (50 lần, 5.089 hàng); heap JS 7,6 MB đến 13,8 đến 25,0 đến 36,3 MB. Cuộn bảng 5.089 hàng ở 4x: p50 33 ms/khung, p95 67 ms, tối đa 167 ms (giật, ~30 fps).
- Mong đợi: bấm thêm < 200 ms; DOM < 10.000. Gợi ý: ảo hoá (react-window) hoặc phân trang cố định 100 hàng; `React.memo` cho hàng; `content-visibility:auto` trên `tr`.

### 17-A10 | P2 | Hồ sơ lớn nhất (2.509 công trình): mở nhanh nhưng "Hiển thị thêm" liên tiếp chậm dần
- Cách đo (author.js, file works 838.573 B thô, br ở Vercel 179.065 B): mở hồ sơ + dựng 100 dòng: 169 ms (CPU 1x), 592 ms (4x); JSON tải 20 ms local (47 ms ở 4x). Bấm thêm 25 lần để đủ 2.509: mỗi lần 138 đến 244 ms (1x), 387 đến 2.071 ms (4x, tăng dần); DOM cuối 90.571 node (4x), heap 23,6 MB.
- Gợi ý: như 17-A9. Hồ sơ trung bình (785 công trình) br chỉ 52 KB, nên mức tải đạt.

### 17-A11 | P2 | Không hủy yêu cầu cũ và không cache hồ sơ đã xem
- Cách đo: hai lần mở lại cùng hồ sơ A5100404947: lần 2 vẫn phát đúng 1 request works (transferSize 838.873 B ở local; trên Vercel sẽ là 304 hoặc 179 KB br vì max-age=0). Chuyển 50 lần qua lại 10 hồ sơ: heap ổn định 17,9 MB đến 18,3 MB, DOM 96.277 đến 98.523 (không rò rỉ).
- Cũng: về danh sách là `List` mount lại, mất bộ lọc, ô tìm, "Hiển thị thêm" và vị trí cuộn (scrollTo(0,0) ở hashchange). Mỗi lần quay về phải dựng lại 100 hàng và chạy lại lọc 6.876 hàng.
- Gợi ý: Map cache trong module cho works (hoặc dựa vào HTTP cache sau khi sửa 17-A6); đưa bộ lọc lên URL (`#/?q=`) hoặc lên App để giữ khi quay lại; `<link rel="prefetch">` khi rê chuột vào tên.

### 17-A12 | P2 | Kích thước kho và triển khai: 6.038 tệp works, 61 MB dist
- Cách đo: du, ls. dist 61 MB (apparent: works 41 MB, tương ứng 55 MB trên đĩa vì khối 4 KB); public/data/works 6.038 tệp, trung bình 7.029 B, 3.162 tệp dưới 4 KB (53% là tệp rất nhỏ, đa số tốn 1 khối). profind.json 4,58 MB. tsc -b + vite phải sao chép 6.038 tệp mỗi lần build/deploy.
- Ảnh hưởng: Vercel tải lên và băm từng tệp (thời gian deploy tăng tuyến tính theo số tệp); mỗi hồ sơ là một request riêng; chưa tìm được giới hạn chính xác trên tài khoản này nên không khẳng định; cần đối chiếu giới hạn số tệp và dung lượng tĩnh theo gói Vercel đang dùng. Mức tăng dự kiến sẽ gấp đôi (xem 17-A13).
- Gợi ý: gộp works theo nhóm (shard theo 2 ký tự đầu của id, ~256 tệp, mỗi tệp tải cả nhóm hoặc dùng Range), hoặc đưa works vào kho đối tượng/Blob/R2 + CDN và giữ dist chỉ có app + list; hoặc chỉ build lại phần thay đổi (không commit works vào kho). Thêm `.vercelignore` cho thư mục `data/` thô nếu có.

### 17-A13 | P2 | Ước lượng tăng trưởng: thêm 130 đơn vị (thêm khoảng 6.000 tác giả, tức +87%)
- Tính từ số đo (tuyến tính theo số tác giả; chưa đo thực):
  - Hiện tại: 4,58 MB thô / 755 KB br / 848 KB gzip.
  - +6.000 tác giả (khoảng 12.900): khoảng 8,6 MB thô, br khoảng 1,41 MB, gzip khoảng 1,59 MB. Ở 4G chậm khoảng +3,5 s tải; parse và lọc mỗi phím gần gấp đôi (A8: phím trên 1 giây khi CPU 4x thành khoảng 1,2 đến 2,8 s theo mẫu gõ "nguyen van").
  - works: 6.038 + khoảng 6.000 = khoảng 12.000 tệp, dist khoảng 115 MB.
  - Nếu áp dụng 17-A4 (list dạng mảng + không `jn`): 12.900 tác giả sẽ khoảng 1,4 MB thô, br khoảng 245 KB, gzip khoảng 300 KB, tức nhỏ hơn mức hiện tại 3 lần dù dữ liệu gấp đôi.
- Gợi ý: làm 17-A4, A8, A9 trước khi nạp thêm; cân nhắc tìm kiếm phía máy chủ (Edge Function + index) nếu vượt 20.000 tác giả.

### 17-A14 | P3 | `data.authors.find` tuyến tính và datalist lớn
- App.tsx dòng 29 (`find` trên mảng 6.876 mỗi render App); datalist trường đơn vị dựng toàn bộ `<option>` mỗi lần render List. Không đo được tác động riêng (nhỏ so với A8), ghi nhận để dọn khi sửa: dùng `Map` theo id.

## Mục đạt (đã đo)
- Vercel: HTTP/2, nén br cho JSON/JS (profind.json 4,58 MB thành 755 KB; works 2.509 công trình 838 KB thành 179 KB), ETag có, edge cache hoạt động (x-vercel-cache HIT, age), HSTS bật, 404 cho đường dẫn không tồn tại (JSON/ text, không rơi về index).
- JS 249 KB (br 75 KB) và CSS 9 KB đúng mức nhỏ; phông là woff2 có tách unicode-range.
- Khoá tải đầu không có lỗi console tìm thấy trong các lượt chạy; FCP 0,3 đến 1,8 s (chữ tiêu đề).
- Không rò rỉ khi chuyển trang 50 lần (heap 17,9 đến 18,3 MB, DOM 96.277 đến 98.523).
- Hồ sơ trung bình mở nhanh; mở hồ sơ lớn nhất 169 ms (1x) và 592 ms (4x); tải JSON công trình nhanh.
- Sắp xếp theo công trình chỉ 107 ms (1x); đổi phạm vi 261 ms (1x).
- Thông báo lỗi lưu hồ sơ/sửa (`/api/correction`) có nhánh `err` và liên kết mailto dự phòng.

## Giới hạn
Không đo được CDN hit/miss lặp nhiều lần trên bản thật (giới hạn lượt); số đo 4G/CPU là mô phỏng; không đo INP bằng tương tác thật trên thiết bị; "build cũ hơn" của bản thật có thể làm tiêu đề khác bản mới nhất.
