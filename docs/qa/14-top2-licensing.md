# Báo cáo kiểm thử 14: Nhãn Top 2%, ghi công, giấy phép, pháp lý (ProFind)

Phạm vi: bản test http://127.0.0.1:4300/ (dist), mã nguồn chỉ đọc. Đã dùng Playwright và đối chiếu public/data/profind.json với data/top2/*.
Giới hạn: trang Elsevier (https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/8) trả HTTP 200 nhưng là SPA, bản GET chỉ chứa dòng "Creative Commons licensing terms apply", KHÔNG xác minh được loại giấy phép (CC BY-NC 3.0 hay khác) và số phiên bản từ HTML. doi.org/10.17632/btchxktzyw.8 và data.mendeley.com/datasets/btchxktzyw/8 đều trả 200. Phần pháp lý chỉ ở mức tổng quát, cần luật sư xác nhận.

## Lỗi đã xác minh

### 14-A1 | P1 | Dữ liệu NC (Top 2%) bị lẫn vào bộ dữ liệu công bố là CC BY (kể cả thương mại)
- Ở đâu: public/data/profind.json và dist/data/profind.json (trường `top2: {rank, field}` ở 42 hồ sơ); docs/DESIGN.md dòng 51 ("`/data/*.json` CC BY ... bên thứ ba dùng lại"); LICENSE-CONTENT.md.
- Tái hiện: `GET /data/profind.json`, lọc `authors[].top2 != null` được 42 bản ghi; `meta` không có trường giấy phép; DESIGN.md nói toàn bộ `/data/*.json` là CC BY. LICENSE-CONTENT.md cho CC BY 4.0 "kể cả thương mại" cho "bộ dữ liệu do ProFind biên soạn", chỉ loại trừ "data/top2/" và "nhãn Top 2% trên trang".
- Mong đợi: dữ liệu NC không nằm trong tệp được cấp CC BY thương mại, hoặc tệp đó có ngoại lệ rõ. Thực tế: rank + field (lấy từ bộ dữ liệu NC) được nhúng trong profind.json, người dùng bên thứ ba có thể hiểu là được dùng thương mại. Ngoại lệ trong LICENSE-CONTENT không nêu đích danh trường `top2` trong profind.json.
- Gợi ý: (a) thêm vào LICENSE-CONTENT và DESIGN: "trường `top2` trong profind.json thuộc CC BY-NC 3.0"; (b) thêm `meta.licenses`/`meta.top2License` vào profind.json; (c) hoặc tách Top 2% ra tệp riêng `/data/top2.json` có ghi công và giấy phép NC, hoặc bỏ trường khỏi API công khai.

### 14-A2 | P2 | Ghi công Top 2% chưa đủ theo mẫu CC BY-NC 3.0
- Ở đâu: chân trang (App.tsx dòng 53, chuỗi top2Credit trong src/i18n.ts), tooltip.
- Thực tế (đã đọc chân trang trên cả 4 loại trang): "Top 2% label: Ioannidis J.P.A., Baas J., Klavans R., Boyack K.W. (2025), Elsevier BV, CC BY-NC 3.0 (non-commercial), based on Scopus data. Not being listed does not mean few citations. | DOI 10.17632/btchxktzyw.8". Thiếu: tiêu đề bộ dữ liệu ("Updated science-wide author databases of standardized citation indicators"), phiên bản (v8, 19/09/2025), liên kết đến văn bản giấy phép (creativecommons.org/licenses/by-nc/3.0/), cho biết dữ liệu đã được trích/chỉnh (94 dòng VN, khớp theo tên tự động). Các thông tin này chỉ có trong data/top2/LICENSE-NC.md, mà tệp đó không được triển khai (xem 14-A3).
- Liên kết "DOI 10.17632/btchxktzyw.8" thực tế trỏ tới https://elsevier.digitalcommonsdata.com/datasets/btchxktzyw/8 (không phải https://doi.org/...). Trang đó trả 200, nhưng nhãn "DOI" mà không phải liên kết doi.org dễ gây lệch; doi.org cũng trả 200.
- Chuỗi tooltip nêu "Ioannidis và cộng sự, Elsevier, CC BY-NC 3.0, dựa trên dữ liệu Scopus": có ghi "dựa trên dữ liệu Scopus" (đạt) nhưng không nêu năm/phiên bản.
- Gợi ý: mở rộng top2Credit (tiêu đề, v8, năm 2025, link license, "đã trích 94 dòng VN, khớp tự động theo tên, có thể sai"), đổi link thành https://doi.org/10.17632/btchxktzyw.8.

### 14-A3 | P2 | Thư mục triển khai (dist) không chứa LICENSE / LICENSE-CONTENT / LICENSE-NC / NOTICE
- Tái hiện: `ls dist` (chỉ index.html, assets, data, fonts...); `GET /LICENSE`, `/LICENSE-CONTENT.md`, `/NOTICE`, `/data/top2/LICENSE-NC.md` đều 404 (trả HTML). Chỉ có dist/fonts/LICENSE-fonts.txt. Bundle JS không có chú thích @license/MIT của thư viện (0 kết quả grep), P3 kèm theo (React MIT cần giữ thông báo bản quyền).
- Mong đợi: người dùng trang web đọc được giấy phép; chân trang liên kết tới văn bản giấy phép. Thực tế: chân trang chỉ ghi chữ "CC BY 4.0", "MIT", không liên kết.
- Gợi ý: đặt LICENSE, LICENSE-CONTENT.md, NOTICE (liệt kê bên thứ ba) vào public/, thêm link trong chân trang tới creativecommons.org/licenses/by/4.0/ và /by-nc/3.0/, giữ banner @license cho thư viện bundle.

### 14-A4 | P2 | Tooltip hiển thị "hạng 741.671" bbên cạnh "Top 2%": dễ hiểu nhầm
- Ở đâu: top2Tip (src/i18n.ts dòng 17/34), App.tsx dòng 98 và 124 (chỉ nằm trong thuộc tính `title`).
- Thực tế: ví dụ Ninh The Son: "rank 741,671; field: Chemistry"; Bach Xuan Tran: tooltip "24.495" cạnh thẻ "Hạng #548" (hạng ProFind theo điểm) ngay trên cùng trang: hai "hạng" khác hệ quy chiếu, không giải thích. "Hạng" là `rank (ns)` của bảng career (xếp hạng theo c-score loại tự trích dẫn trong cả cơ sở Scopus), chỉ tiêu "ns" không được giải thích. Giá trị 345.295, 741.671 vượt xa 2% của bất kỳ tập hợp nào nếu người đọc hiểu là "hạng trong top 2%". Theo mô tả của chính bộ dữ liệu (cần đối chiếu README Mendeley, chưa xác minh được do SPA), danh sách gồm tác giả vào top 2% THEO TIỂU LĨNH VỰC hoặc nằm trong nhóm đầu theo c-score toàn cầu, nên nhãn "2% nhà khoa học được trích dẫn nhiều nhất thế giới" chưa chính xác đối với người vào nhờ tiêu chí tiểu lĩnh vực. Tooltip bằng `title` còn không dùng được trên màn hình cảm ứng/bàn phím.
- Gợi ý: bỏ hạng số lớn khỏi tooltip, hoặc ghi "xếp hạng c-score toàn cầu (không tự trích dẫn) trong ~... tác giả; vào danh sách do thuộc top 2% tiểu lĩnh vực {subfield}"; đổi nhãn thành "Trong danh sách top 2% (Ioannidis et al., 2025)"; thay `title` bằng popover truy cập được.

### 14-A5 | P2 | Bỏ sót ca khớp (≥8 trong 52 ca chưa khớp) do hạn chế thuật toán
Nguyên nhân gốc trong scripts/match-top2.mjs: (i) khớp theo TẬP TỪ nên thừa/thiếu chữ lót ("Thwaites, G. Edward" vs "Guy Edward Thwaites"; "Vasant, Pandian M." vs "Pandian Vasant"; "Buntine, Wray L." vs "Wray Buntine") làm lệch; (ii) từ khóa đơn vị bỏ hết stop-word nên các tên chỉ gồm từ chung ("Hanoi University of Science and Technology" = hust) có tập từ riêng rỗng, chỉ còn quy tắc Jaccard ≥ 0.6.
Ca nên khớp mà bỏ sót (đối chiếu từ ProFind):
- Thwaites G. Edward (OUCRU) ↔ "Guy Edward Thwaites" (cùng OUCRU, 176 công trình): chắc chắn.
- Vasant Pandian M. (TDTU) ↔ "Pandian Vasant" (tdtu): chắc chắn.
- Buntine Wray L. (VinUni) ↔ "Wray Buntine" (VinUni): chắc chắn.
- Waché Yves (HUST) ↔ "Yves Waché" (hust, 22 công trình): bị review ghi "khác đơn vị" do lỗi stop-word (HUST), chắc chắn.
- Khoa Dao Tien (Vietnam Atomic Energy Institute) ↔ "Dao T. Khoa" (Institute for Nuclear Science and Technology): rất có khả năng.
- Dac-Nhuong Le (Haiphong University) ↔ "Dac‐Nhuong Le" (dtu, huit; tên hiếm, 80 công trình): rất có khả năng (đổi đơn vị).
- Bui Xuan Nam (HUMG) ↔ "Xuan-Nam Bui" (tdtu; 52): có khả năng.
- Pham Chi Vinh (VNU Hà Nội) ↔ "Pham Chi Vinh" (pu): có khả năng.
Những ca khớp theo tên chung bị loại hợp lý: Nguyen Hoang, Pham Van Vinh, Nguyen Thi Hong, Le Anh Tuan, Nguyen Thanh Binh, Nguyen Van Hieu, Dang Nam Nguyen, Nguyen Liem Thanh, Van Hung Pham. Các ca "không có hồ sơ" còn lại (Porikli, El-Ghaoui, Moayedi, Hasanipanah, Asadi, Ghalambaz, Miljanić đã khớp, ...) hợp lý vì chưa nạp. Hệ quả: nhãn thiếu ở một số hồ sơ thật sự thuộc danh sách; footer chỉ nói "không có trong danh sách không có nghĩa ít trích dẫn", chưa nói "chưa gắn nhãn có thể do ProFind chưa khớp được".
- Gợi ý: bỏ chữ lót đơn (một chữ cái) khi so tập từ, thêm bảng alias đơn vị (hust, oucru, inst...), cho phép khớp theo ORCID khi bộ dữ liệu có; bổ sung các ca trên vào overrides.json sau khi người quản trị xác minh.

### 14-A6 | P2 | Cặp khớp rủi ro nhầm người trong 42 khớp
Không có cặp nào bị phát hiện sai chắc chắn, nhưng cần rà tay:
- Trung-Kien Nguyen ↔ "Nguyen, Trung Kien (HUTECH, hạng 207.166)": tên rất phổ biến; hồ sơ ProFind có 7 đơn vị (vnuhcm-university-technology, hust, utc, huce, hcmute, vinh-university, tlu), 59 công trình, ghép ORCID nhưng đơn vị bộ dữ liệu (HUTECH) không có trong danh sách. Khả năng gộp nhầm/khớp nhầm cao nhất.
- Wolfgang Schumann ↔ "Schumann, Wolfgang (VNU-HCM)": không ORCID, chỉ 3 công trình (2022-23), tên Đức phổ biến; khớp chỉ bằng tên + đơn vị chung "VNU-HCM"; không có xác thực khác. Mức tin cậy thấp.
- Hoang Phong Le (ĐH Luật TP.HCM, ngành "Energy"/kinh tế), Truong Khang Nguyen (VLU), Khanh Chau Le (TDTU), Nguyen Minh Khai (HCMUTE, override), Minh Tho Nguyen (VLU+VinUni, tên chung nhưng có hồ sơ KU Leuven nổi tiếng): tên chung, chỉ khớp tên + đơn vị.
- Ca override có đơn vị ProFind lệch đơn vị bộ dữ liệu: Nguyen-Xuan Hung (dataset HUTECH, ProFind: dai-hoc-vinuni), Canh Phuc Nguyen (dataset UEH, ProFind: vlu), Xuan Vinh Vo (dataset UEH, ProFind: vien-nghien-cuu-kinh-doanh), Tran Bach Xuan (VNU-UMP, ProFind dhqghn+vnua). Có ORCID và tên không quá phổ biến nên chấp nhận được, nhưng ghi_chú overrides ("tên hiếm hoặc đơn vị cùng hệ") không đúng với các ca này.
- Hồ sơ gắn nhãn "Có đơn vị ngoài Việt Nam" (foreign) cho nhiều người Việt (Bach Xuan Tran, Canh Phuc Nguyen, Trung-Kien Nguyen, Chu Dinh Toi, Quan-Hoang Vuong): nhãn thông tin, không sai nhưng có thể hiểu là "người nước ngoài".
- Số liệu: ProFind chỉ có công trình 2021-2026 (firstYear 2021), trong khi nhãn Top 2% tính "cả sự nghiệp" đến 2024; ví dụ Trung-Kien Nguyen chỉ 603 trích dẫn trong ProFind kèm nhãn Top 2%, người dùng thấy mâu thuẫn. Cần ghi chú.
- Gợi ý: thêm bước xác nhận bằng ORCID/Scopus ID; ẩn nhãn cho khớp "chỉ tên + đơn vị" mức tin cậy thấp, hoặc ghi "khớp tự động theo tên"; thêm nút "báo nhãn sai" cạnh nhãn.

### 14-A7 | P2 | Văn bản giấy phép/tình trạng không nhất quán giữa README, LICENSE-CONTENT, DESIGN, giao diện
- README.md: "Dữ liệu tác giả hiện là dữ liệu mẫu" và "bản khung 0.2", nhưng public/data/profind.json có `meta.demo: false`, 6.876 tác giả, 124.120 công trình từ OpenAlex. docs/DESIGN.md dòng 35 "Chưa đưa dữ liệu thật vào kho cho đến khi có cơ chế đính chính" (đã có cơ chế nhưng văn bản cũ) và dòng 24 "tác giả nhận hồ sơ bằng ORCID (chưa làm)".
- README không nhắc ngoại lệ Top 2% CC BY-NC (chỉ "dữ liệu bên thứ ba theo điều khoản nguồn"); DESIGN dòng 51 "/data/*.json CC BY" không có ngoại lệ; chân trang: "Project-compiled data CC BY 4.0 ... Third-party (OpenAlex, ORCID, State Professorship Council)" không kể SCImago/Scopus (LICENSE-CONTENT có kể), tiếng Việt viết "Lương Việt Hoàng", văn bản khác "Luong Viet Hoang".
- LICENSE-CONTENT nói SCImago/SJR thuộc bên thứ ba nhưng chân trang không ghi công SCImago dù điểm quốc tế dùng SJR (data/sjr-rules.json).
- Gợi ý: thống nhất một khối "Giấy phép và nguồn" dùng chung (README, DESIGN, chân trang), nêu đủ ngoại lệ NC và SCImago.

### 14-A8 | P2 | Cơ chế đính chính/gỡ hồ sơ chưa kèm thông báo quyền riêng tư
- Ở đâu: #/dinh-chinh, api/correction.js, i18n corrLead.
- Thực tế: trang biểu mẫu thu họ tên, email, ORCID, nội dung (qua Resend, Redis giới hạn tốc độ băm IP) nhưng không có thông báo mục đích, thời hạn lưu, bên nhận dữ liệu, thời hạn phản hồi; không có tên đơn vị chịu trách nhiệm (chỉ ISA Vietnam trong chân trang); email liên hệ mặc định là Gmail cá nhân (luongviethoang.hcm@gmail.com); dịch vụ nước ngoài (Resend, Upstash, Vercel) → chuyển dữ liệu qua biên giới. Gỡ hồ sơ "luôn được thực hiện" kể cả khi người gửi chưa xác minh là chủ hồ sơ, người khác có thể lạm dụng gỡ hồ sơ của người khác (đánh đổi chấp nhận được, nên ghi rõ).
- Fallback khi API lỗi hoạt động (đã thử: hiện "Không gửi được. Vui lòng gửi email trực tiếp").
- Gợi ý: thêm đoạn "Quyền riêng tư" (người kiểm soát dữ liệu, căn cứ, lưu trữ, thời hạn phản hồi ví dụ 7-15 ngày, cách gỡ khỏi cả JSON tĩnh và bộ đệm CDN).

### 14-A9 | P3 | Thiếu thông báo nhãn hiệu và tuyên bố "độc lập" trên giao diện; tuyên bố miễn trừ cho nhãn Top 2%
- Scopus, Web of Science, Clarivate, Elsevier chỉ xuất hiện theo kiểu nêu danh (nominative), không dùng logo/tên như thương hiệu của ProFind (đạt). Nhưng câu "ProFind độc lập, không trực thuộc các tổ chức trên; nhãn hiệu thuộc chủ sở hữu" chỉ nằm trong LICENSE-CONTENT.md, không có trên giao diện. Giao diện không nêu "Top 2%" không phải đánh giá của Elsevier/Scopus.
- Nhãn "Hồ sơ có thể gộp nhầm nhiều người" (suspectTag): chỉ 3 hồ sơ (Mika E. T. Sillanpää 698, Hijaz Ahmad 785, Jie Yang 2509 công trình), từ ngữ hướng vào hồ sơ dữ liệu, không vào năng lực/đạo đức người thật, kèm suspectNote có nêu quyền yêu cầu đính chính: rủi ro phỉ báng thấp. Gợi ý nhỏ: đổi thành "Dữ liệu hồ sơ OpenAlex có thể gộp nhầm" để rõ lỗi thuộc nguồn dữ liệu.
- Gợi ý: thêm một dòng nhãn hiệu + "độc lập" vào chân trang.

## Đối chiếu pháp lý tổng quát (không phải tư vấn pháp lý; cần luật sư xác nhận)
- ProFind xử lý dữ liệu cá nhân công khai (tên, đơn vị, ORCID, công trình) của khoảng 6.876 người. Khuôn khổ tại Việt Nam gồm Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (có hiệu lực từ 01/01/2026; tôi nhớ như vậy, chưa kiểm tra nguồn trong phiên này). Dữ liệu công khai vẫn có thể cần: thông báo xử lý, mục đích rõ, quyền truy cập/đính chính/xóa/phản đối, và với người dùng không ở VN thì xem thêm GDPR. Cơ chế hiện có (trang đính chính, gỡ luôn được thực hiện) là nền tốt; thiếu: thông báo quyền riêng tư, thời hạn xử lý, người chịu trách nhiệm, đánh giá tác động/chuyển dữ liệu ra nước ngoài (Vercel, Resend, Upstash). Việc xếp hạng/chấm điểm người thật là hồ sơ hóa (profiling): tuyên bố "chỉ để tham khảo" đã có ở băng rôn đầu trang trên mọi trang (đạt), nên giữ cố định.
- NC: ISA Vietnam xác nhận vận hành phi thương mại (LICENSE-NC.md); nếu hệ sinh thái ISA (Ami, Mây, ...) có thu phí hoặc quảng cáo thì cần luật sư đánh giá, và cân nhắc xin phép Elsevier hoặc bỏ nhãn.

## Mục đã kiểm đạt
- Có đủ 94 = 42 khớp + 52 review; số khớp 42 khớp với 42 hồ sơ có `top2` trong profind.json; không có hồ sơ `suspect` nào mang nhãn Top 2%.
- Chân trang (gồm ghi công Top 2%, giấy phép, link "Báo lỗi/đính chính") hiển thị trên mọi trang đã thử (trang chủ, #/dinh-chinh, #/tac-gia/..., #/nganh/...), không chỉ trang chủ.
- Có nêu "dựa trên dữ liệu Scopus" (chân trang và tooltip), có nêu "không có trong danh sách không có nghĩa ít trích dẫn" (chân trang), có ghi NC và liên kết đến trang bộ dữ liệu (HTTP 200).
- data/top2/LICENSE-NC.md nêu đủ tác giả, tiêu đề, phiên bản 8, DOI, URL, giấy phép, "dựa trên Scopus", câu "không có tên không có nghĩa...". Cột số bài bị rút bài đã bỏ khỏi trích đoạn.
- Cơ chế đính chính/gỡ hồ sơ hoạt động trong giao diện, có fallback email; băng rôn "chỉ để tham khảo" trên mọi trang; bản quyền tác giả (Lương Việt Hoàng, ISA Vietnam) và MIT/CC BY nhất quán giữa LICENSE, package.json, README, LICENSE-CONTENT.
- dist có LICENSE-fonts.txt cho phông chữ.
