# Báo cáo 18 - Độ bền và ca biên (ProFind)

Môi trường: Chromium (Playwright), bản test http://127.0.0.1:4300/. Giới hạn: không có WebKit/Firefox; Safari/Firefox chưa kiểm thử (chỉ mô phỏng UA cũ, không thay thế được). Script: /tmp/claude-0/qa/scripts-18/ (t1-t4.js), ảnh: /tmp/claude-0/qa/shots/18-*.png.

## Lỗi đã xác minh

### 18-A1 - P1 - Hash mã hóa sai (`%E0%A4%A`, `%`) làm TRẮNG TRANG khi mở/tải lại
- Ở đâu: src/App.tsx dòng 12 (`decodeURIComponent` không bọc try/catch), dùng ở `useState(hash())` (dòng 17) và handler hashchange (dòng 22).
- Tái hiện: mở `http://127.0.0.1:4300/#/tac-gia/%E0%A4%A` (hoặc `#/%`). 
- Mong đợi: hiện danh sách hoặc trang "không tìm thấy". Thực tế: `#root` rỗng, hoàn toàn trắng, console `PAGEERROR: URI malformed`. Không có ErrorBoundary nên không phục hồi được.
- Khi đổi hash lúc đang chạy: trang không sập nhưng ném lỗi chưa bắt, route giữ nguyên (không đổi) - P3 phụ.
- Bằng chứng: shots/18-h-e0.png, 18-h-pct.png, 18-hashchange-bad.png.
- Sửa: `const hash=()=>{const s=location.hash.replace(/^#\/?/,"");try{return decodeURIComponent(s)}catch{return s}}`; thêm ErrorBoundary ở main.tsx.

### 18-A2 - P1 - Đổi hồ sơ nhanh: kết quả fetch cũ ghi đè, hiện công trình của TÁC GIẢ KHÁC
- Ở đâu: AuthorPage useEffect (App.tsx dòng 113) không hủy/không kiểm tra id khi phản hồi về.
- Tái hiện: mở `#/tac-gia/A5053495766` (works trả chậm 3s), đổi ngay sang `#/tac-gia/A5064939188` (Bach Xuan Tran, phản hồi tức thì). Chờ 5s.
- Mong đợi: bảng của Bach Xuan Tran (118 công trình, đầu bảng "Salmonella Infections..."). Thực tế: tiêu đề Bach Xuan Tran nhưng bảng 100+ dòng là của Minh-Triet Tran (đầu bảng "Toward Abstraction-Level Event Retrieval..."), tức dữ liệu sai gán tác giả (nghiêm trọng vì là điểm/trích dẫn). Mạng chậm thật sẽ gặp khi bấm qua lại nhanh/Back/Forward.
- Bằng chứng: shots/18-race.png; nút CSV cũng xuất dữ liệu sai.
- Sửa: cờ `let cancelled=false` + cleanup trong effect (hoặc AbortController), hoặc `key={a.id}` cho AuthorPage.

### 18-A3 - P1 - Dữ liệu profind.json lệch cấu trúc => trắng trang (không có ErrorBoundary, `fetch` không kiểm tra `r.ok`/schema)
- Ở đâu: App.tsx dòng 23 (`.then(r=>r.json()).then(setData)`), dòng 38 (`data?.meta.demo`), List (`Object.entries(d.types)`), AuthorPage.
- Các ca xác minh đều trắng hoàn toàn (`#root` rỗng):
  - máy chủ trả HTTP 500 kèm JSON hợp lệ (ví dụ `{"error":"x"}`) -> `reading 'demo'`;
  - JSON là mảng `[]` -> cùng lỗi;
  - thiếu `meta` -> cùng lỗi; thiếu `types` -> `Cannot convert undefined or null to object`;
  - tác giả thiếu `institutions` (list: mọi dòng; hồ sơ) -> `reading 'map'`; 
  - hồ sơ tác giả có `top2:{}` không `rank`/thiếu `matchedRate` -> `reading 'toLocaleString'`.
- Ca JSON trả `null`: kẹt vĩnh viễn ở "Loading data..." (không báo lỗi).
- Ca 404, JSON hỏng, trả HTML, timeout/treo: hiện "Could not load data." (đạt) nhưng treo (không phản hồi) thì chỉ "Loading data..." vô hạn, không timeout.
- Sửa: kiểm `r.ok` và dạng dữ liệu (`Array.isArray(d.authors)` ...), ErrorBoundary hiển thị thông báo + nút tải lại, timeout bằng AbortSignal.timeout.
- Bằng chứng: shots/18-pf500json.png, 18-pfarr.png, 18-nometa.png, 18-notypes.png, 18-author-noinst.png, 18-author-nomatched.png, 18-pfnull.png.

### 18-A4 - P2 - Lỗi tải works/<id>.json bị nuốt: bảng trống không giải thích, không thử lại
- Ở đâu: App.tsx dòng 113 (`() => setWorks([])`).
- Tái hiện: chặn works/*.json trả 404 / abort / offline giữa chừng / JSON hỏng / HTML. Hồ sơ ghi "215 công trình" nhưng bảng chỉ có hàng tiêu đề, nút CSV bị khóa, không có thông báo lỗi hay nút "Thử lại". Online lại cũng không tự tải lại. (Ca JSON hỏng/HTML cũng như vậy.)
- Bằng chứng: shots/18-w404.png, 18-wabort.png, 18-offline-mid.png.
- Sửa: thêm trạng thái lỗi + nút thử lại; phân biệt "không có công trình" và "lỗi tải".

### 18-A5 - P2 - works trả JSON không phải mảng (object/null): kẹt "Loading" vĩnh viễn + lỗi chưa bắt
- `works.sort` ném lỗi trong `.then` thành công nên handler lỗi (tham số thứ 2) không bắt được: `PAGEERROR: O.sort is not a function` / `reading 'sort'`. Giao diện giữ "Loading..." mãi. Sửa: `.catch` cuối chuỗi + `Array.isArray`.
- Bằng chứng: shots/18-wobj.png, 18-wnull.png.

### 18-A6 - P2 - Không có `<noscript>`: tắt JavaScript => trang trắng tuyệt đối
- index.html chỉ có `<div id="root">`; `document.body.innerText` rỗng, 0 thẻ noscript. Sửa: thêm `<noscript>` thông báo (và tốt hơn: liên kết tới nguồn dữ liệu). Bằng chứng: shots/18-nojs.png.

### 18-A7 - P2 - Thông báo lỗi tải dữ liệu không có nút Thử lại và không nêu nguyên nhân
- "Could not load data." (shots/18-pfbad.png, 18-pf404.png) chỉ có chữ, người dùng phải tự F5; không phân biệt offline/máy chủ lỗi. Sửa: nút "Tải lại" (gọi lại fetch), gợi ý kiểm tra mạng.

### 18-A8 - P2 - Không có CSS in (print): in danh sách/hồ sơ in cả bộ lọc, nền aurora đầu trang, nút ngôn ngữ
- `@media print` = 0 trong dist/assets/*.css. Danh sách in ra PDF 10 trang chỉ cho 100 dòng đầu; đầu trang tối aurora tốn mực, ô lọc/nút in ra. Hồ sơ tác giả cũng không có bố cục in (nút CSV, link hiệu chỉnh vẫn hiện). Bằng chứng: shots/18-print-list.png, 18-printpdf-01.png, 18-print-author.png.
- Sửa: `@media print{.top::after,.filters,.lang,.actions-row,.eco{display:none}.top{background:none;color:#000}}`, `thead{display:table-header-group}`, `tr{break-inside:avoid}`.

### 18-A9 - P3 - Trang không tồn tại trên bản thật trả 404 văn bản trần
- `https://profind-red.vercel.app/abc` -> 404 `text/plain` "The page could not be found / NOT_FOUND" (không phải index SPA, không có liên kết về trang chủ). Thực tế vì dùng hash route nên chỉ ảnh hưởng người gõ/chia sẻ nhầm đường dẫn. Tương tự /tac-gia/xyz, /robots.txt, /sitemap.xml đều 404 (thiếu robots/sitemap cho SEO, canonical trỏ profind.isavn.edu.vn). Gợi ý: thêm 404.html có liên kết về trang chủ.

### 18-A10 - P3 - Hash hợp lệ nhưng không có thật không báo gì
- `#/xyz`, `#//`, `#/tac-gia/`, `#/tac-gia/doesnotexist`: trả về danh sách mà không thông báo "không tìm thấy tác giả" (URL giữ nguyên). `#/dinh-chinh/xxx`: hiện biểu mẫu mà không báo tác giả không tồn tại. Không sập.

### 18-A11 - P3 - Nội dung điều hướng khi `navigator.language` không phải chuỗi
- `navigator.language` là undefined -> `startsWith` ném lỗi, trắng trang (initialLang). Chỉ xảy ra với môi trường giả lập/webview hiếm; ghi nhận mức thấp. Sửa: `(navigator.language||"").startsWith("vi")`.

## Mục kiểm đạt
- localStorage/sessionStorage ném SecurityError: trang chạy bình thường (try/catch đúng chỗ). Giá trị lang lạ trong storage (`fr`) -> rơi về mặc định đúng.
- profind.json 404, JSON hỏng, trả HTML, mảng authors rỗng (có meta): hiện thông báo/danh sách rỗng, không trắng.
- Thiếu `jn`, `top2:null`, `disciplines` ở một tác giả: không sập (danh sách).
- works: rỗng, thiếu trường, chậm 10s (hiện "Loading", UI vẫn dùng được), 404 không sập.
- Reload (F5) ở cả 4 loại route (`#/`, hồ sơ, `#/dinh-chinh`, `#/dinh-chinh/<id>`) giữ đúng nội dung; F5 liên tiếp 5 lần khi đang tải ổn; Back/Forward nhanh qua 6 hồ sơ ra đúng hồ sơ cuối.
- Console: trang bình thường ở cả 4 route không có cảnh báo/lỗi (không React key warning, không 404 favicon/manifest/phông).
- Chặn phông woff2: fallback sans-serif đẹp, bố cục không vỡ. Chặn CSS: nội dung vẫn đọc được (HTML trần). Chặn logo/favicon: không vỡ (alt rỗng chủ đích, logo trang trí).
- Cuộn: 320px và 200px không có cuộn ngang trang; cảm ứng (tap) điều hướng đúng; `prefers-reduced-motion` tắt animation (0 animation chạy); CPU 6x: bảng đầu hiện sau ~1,9s, gõ tìm kiếm 0,7s (chấp nhận được); đồng hồ lệch 2099 và UA IE11, locale zh-CN/vi-VN: chạy bình thường (zh -> EN, vi -> VI).
- Bản thật https://profind-red.vercel.app: `/`, favicon.svg, icon-180/192/512, icon-maskable-512, icon-maskable.svg, logo-disc.svg, manifest.webmanifest, /fonts/inter-latin.woff2 đều 200 đúng content-type; profind.json nén brotli.
- Chưa kiểm: nhiều tab đồng thời (lang đồng bộ giữa tab không có sự kiện `storage`, hành vi mong đợi nhỏ), Safari/Firefox, cookie tắt (ứng dụng không dùng cookie).
