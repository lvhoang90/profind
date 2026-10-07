# Báo cáo kiểm thử 11 - Tính đúng đắn dữ liệu ĐƠN VỊ (ProFind)

Phạm vi: data/institutions.json (602 đơn vị), public/data/profind.json (212 đơn vị có tác giả, 6.876 tác giả), moet.unmatched.json, institutions.review.json, ror-audit.json, src/App.tsx (chỉ đọc).
Phương pháp chung: script Python/node tại /tmp/claude-0/qa/scripts-11/ (ror.py, cmp.py, list.py, a.py, b.py, c.py). Đã GỌI ROR API v2 (GET) cho TOÀN BỘ 351 mã ROR khác nhau trong dữ liệu (350 lần thành công, 1 lần `hnue` bị reset kết nối rồi gọi lại thành công: tên "Hanoi National University of Education / Trường Đại học Sư phạm Hà Nội", Hanoi). Kết quả lưu ở /tmp/claude-0/qa/scripts-11/ror.json. Đối chiếu bằng mắt 212 cặp của đơn vị có tác giả + ~140 cặp còn lại (Wikipedia/MOET). Bản test http://127.0.0.1:4300/data/profind.json giống hệt public/data/profind.json (cmp).

Kết luận nhanh về ROR: KHÔNG tìm thấy cặp (đơn vị -> mã ROR) nào còn gắn sai thực thể trong 351 mã (không có mã ROR trùng giữa 2 đơn vị; 40 đơn vị mang cờ rorSuspect đã bị gỡ ror hoặc đã trỏ đúng). Lưu ý giới hạn: 127 đơn vị nguồn "ror.org" có tên lấy thẳng từ ROR nên đối chiếu tên là vòng tròn (chỉ kiểm được thành phố/loại). Lỗi nghiêm trọng nằm ở: cột `city`, trùng lặp đơn vị, tên EN, nhãn type và độ phủ.

---

## LỖI

### 11-A1 (P1) Cột `city` sai hàng loạt: trường ở TP.HCM bị ghi "Hà Nội" / "Phú Thọ"
- Ở đâu: data/institutions.json -> trường `city`; đi vào public/data/profind.json (institutions[].city).
- Tái hiện: `python3 -I` đọc institutions.json, so `city` với vị trí lấy từ ROR (`locations[].geonames_details.name`) của cùng đơn vị.
- Mong đợi: Đại học Y Dược TP.HCM, ĐH Công nghiệp TP.HCM, ĐH Tôn Đức Thắng, ĐH Văn Lang... có city = TP. Hồ Chí Minh.
- Thực tế: 37 đơn vị có ROR ở "Ho Chi Minh City" nhưng city sai (21 trong số đó có tác giả): `yds, iuh, huit, hub, tdtu, stu, gdu, hsu, uef, huflit, nttu, hiu, siu, vhu, vlu, dai-hoc-binh-duong` = "Hà Nội"; `ho-chi-minh-university-law, nlu, hcmute, hcmue, hcmou, vgu` = "Phú Thọ" (rõ ràng lấy nhầm tên phường Phú Thọ hoặc lệch cột); `dai-hoc-an-ninh-nhan-dan` = "Bắc Ninh"; `vaa` (Học viện Hàng không, ROR ở HCM) = "Hà Nội"; `sict` (ĐH Công nghiệp Hà Nội) city = "Bộ Công thương" (tên cơ quan chủ quản); `danang-university-technology-and-education` (ROR Da Nang) city = "Vinh"; `vnuhcm-university-technology` city = null.
- Bằng chứng: kèm ROR ví dụ yds -> "University of Medicine and Pharmacy at Ho Chi Minh City", loc "Ho Chi Minh City", city "Hà Nội".
- Gợi ý sửa: lấy city từ ROR/geonames hoặc từ địa chỉ MOET, chuẩn hóa theo bảng tỉnh mới (sau sáp nhập 2025); đặt kiểm tra tự động "city khớp ROR location".
- Ghi chú UI: App.tsx hiện KHÔNG hiển thị city/abbr nên chưa lộ ra mắt người dùng; nhưng dữ liệu xuất ra profind.json sai và sẽ lộ ngay khi thêm bộ lọc tỉnh.

### 11-A2 (P2) `city` lẫn nhiều định dạng/ngôn ngữ, giá trị không phải tỉnh, và null nhiều
- Ở đâu: institutions.json `city`.
- Thực tế: 206/602 đơn vị city = null (7/212 trong profind). Cùng một thành phố có nhiều cách ghi: "Hà Nội" (117) vs "Hanoi" (106); "Ho Chi Minh City" (30) vs "TP. Hồ Chí Minh" (1); "Đà Nẵng" (9) vs "Da Nang" (6); "Thái Nguyên" (7) vs "Thai Nguyen" (3); "Cần Thơ" vs "Can Tho". Trong profind: "Hanoi" 91 vs "Hà Nội" 47. Giá trị không phải tỉnh/thành: "Nha Trang", "Long Xuyen", "Da Lat", "Vinh", "Gia Lộc", "Văn Giang", "Phủ Từ Sơn", "Thuận Nam", "Đông Hà", "Bộ Công thương". Trộn tỉnh cũ-mới: Hải Dương/Thái Bình/Long An/Kon Tum... đã quy về tỉnh mới (Hải Phòng, Hưng Yên, Tây Ninh) cho nguồn MOET nhưng nguồn ROR giữ tên thành phố (Nha Trang, Vinh).
- Gợi ý sửa: một danh mục tỉnh/thành chuẩn (34 tỉnh sau 2025), ánh xạ từ mọi biến thể.

### 11-A3 (P1) Trùng lặp: cùng một cơ sở có 2 id (Wikipedia/ROR + MOET), chỉ một bản có tác giả -> tác giả bị chia đôi / tìm theo tên tiếng Việt thấy 0 tác giả
- Ở đâu: institutions.json; profind.json chỉ chứa bản có tác giả.
- Tái hiện: so khớp tên đã bỏ dấu/viết hoa + trùng `en` + `rorSuspect` trỏ tới ror của đơn vị khác (script c.py).
- Các cặp đã xác minh (bản có tác giả -> bản trùng 0 tác giả):
  - `institute-mathematics` "Institute of Mathematics" (50) <-> `v59` "Viện Toán học" (0) (ROR 04jr71r83 chính là Institute of Mathematics).
  - `national-institute-nutrition` (50) <-> `v66` "Viện Dinh dưỡng" (0).
  - `national-institute-animal-sciences` (50) <-> `vcn` "Viện Chăn nuôi" (0).
  - `institute-transport-science-and-technology` (28) <-> `v13` "Viện Khoa học và Công nghệ Giao thông vận tải" (0).
  - `research-institute-for-aquaculture-no1` (50) <-> `vts` "Viện Nghiên cứu Nuôi trồng thuỷ sản I" (0).
  - `siu` "Trường Đại học Quốc tế Sài Gòn" (48, ROR 03x8feb02) <-> `ttq` "Trường Đại Học Tư Thục Quốc Tế Sài Gòn" (0).
  - `dai-hoc-anh-quoc-tai-viet-nam` <-> `buv` (ROR 01vtndz62 trùng nhau, cả hai 0 tác giả).
  - `apag` "Học viện Hành chính và Quản trị công" <-> `hch` "Học Viện Hành Chính Quốc Gia" (cùng tên EN).
  - `vien-cong-nghe-thong-tin` <-> `vien-cong-nghe-thong-tin-2`: KHÔNG phải trùng thật (ROR 03g6wh580 ITI/ĐHQGHN và 04yzbtf37 IOIT/VAST) nhưng tên hiển thị gần như giống nhau, cả hai có tác giả (46 và 47), 9 tác giả có cả hai -> người dùng không phân biệt được (xem 11-A8).
  - 16 cặp thành viên ĐHQG/ĐH vùng: các bản MOET dạng "Trường Đại Học X - Đại Học Quốc Gia ..." (0 tác giả) trùng với bản Wikipedia "(ĐHQGHN)/(ĐHQG-HCM)": qhy~vnu-university-medicine-and-pharmacy, vju~vnu-vietnam-japan-university, qhl~vnu-university-laws, qhi~vnu-university-engineering-and-technology, qhs~vnu-university-education, qhe~vnu-university-economics-and-business, qhf~vnu-university-languages..., qhx~vnu-hanoi-university-social-sciences-and-humanities, qsb~**vnuhcm-university-technology (50 tác giả)**, qsc~vnuhcm-university-information-and-technology, qsk~vnuhcm-university-economics-and-law, qsx~vnuhcm-university-social-sciences-and-humanities, qsq (ĐH Quốc tế HCM), tag~vnuhcm-an-giang-university, vku~vietnam-korea-university-information-technology-and-communication, dtc~thai-nguyen-university-information-and-communication-technology. Hai bản có cùng tên EN/ROR nhưng id khác.
  - Cặp trùng chính xác tên: `cao-dang-binh-phuoc` & `-2`, `cao-dang-kon-tum` & `-2`.
- Mong đợi: một đơn vị = một id; MOET chỉ làm giàu `moetCode`.
- Thực tế: ~30 cặp. Với bản có tác giả (ví dụ vnuhcm-university-technology) thì mã MOET/`official` bị mất; với bản 0 tác giả thì tìm tên tiếng Việt trả về rỗng.
- Gợi ý sửa: khi nhập MOET, khớp theo tên đã chuẩn hóa bỏ hậu tố "- Đại Học Quốc Gia ..."/", Đại Học Huế", theo ROR và theo EN; gộp và giữ id có tác giả.

### 11-A4 (P2) Tên trùng nhau giữa các đại học vùng/thành viên, không có hậu tố phân biệt, sai ở bản có tác giả
- Ở đâu: `name` trong institutions.json; hiển thị ở App.tsx (dòng 65, 125: `i.name`).
- Thực tế: "Trường Đại học Sư phạm" là tên của 3 id khác nhau (Thái Nguyên, Huế, Đà Nẵng); "Trường Đại học Khoa học", "Nông Lâm", "Y Dược", "Kinh tế", "Ngoại ngữ" cũng trùng 2-3 lần. Quan trọng nhất: `danang-university-technology-and-education` (50 tác giả) hiển thị là "Trường Đại học Sư phạm Kỹ thuật" (thiếu "Đà Nẵng", city "Vinh"), dễ nhầm với ĐH SPKT TP.HCM (spk) / SPKT Vinh (vute)/ SPKT Hưng Yên.
- Gợi ý sửa: thêm hậu tố "(Đại học Đà Nẵng)" v.v. như các trường ĐHQG đã làm.

### 11-A5 (P2) Tên tiếng Anh (`en`) sai/không phải tên: là tên tỉnh hoặc trùng nguyên tên tiếng Việt
- Ở đâu: institutions.json `en`.
- Thực tế: 6 đơn vị có en = tên tỉnh: `an-giang` ("Trường Cao đẳng Sư phạm Kiên Giang" -> en "An Giang"), `an-giang-2` (CĐ Y tế Kiên Giang), `an-giang-3` (CĐ Kiên Giang), `gia-lai` (CĐ Y tế Bình Định), `gia-lai-2` (CĐ KT-CN Quy Nhơn); đây còn là nguyên nhân id sai ("an-giang" cho trường ở Kiên Giang, "tp-hcm" cho trường ở Bà Rịa, "gia-lai" cho trường ở Bình Định). Đây chính là sự cố "cột tỉnh bị nhận nhầm" vẫn còn sót. 267/602 đơn vị có en chứa dấu tiếng Việt (en == name); trong profind 83/212. Giao diện EN sẽ hiển thị tên tiếng Việt cho các đơn vị này. 313 đơn vị en == name.
- Một số tên của đơn vị ROR là tiếng Anh trong giao diện tiếng Việt: 38 đơn vị trong profind, `name` là tên Anh (ví dụ "Institute of Materials Science", "Institute of Oceanography", "National Institute of Nutrition"), trong khi các đơn vị cùng loại lại dùng "Viện ..." -> danh sách đơn vị ở bộ lọc lẫn Việt/Anh.
- Gợi ý sửa: bỏ en khi chỉ là tỉnh; lấy en từ ROR (names type label/alias) hoặc để trống và fallback; đặt `name` tiếng Việt từ ROR alias "vi" khi có.

### 11-A6 (P3) Tên: viết hoa kiểu Title-Case ("Đại Học", "Cao Đẳng") không thống nhất; lỗi chính tả trong tên nguồn Wikipedia
- Ở đâu: 53 đơn vị nguồn MOET dùng "Trường Đại Học/Cao Đẳng/Học Viện ..." (không còn viết hoa toàn bộ như sự cố cũ) trong khi 300+ đơn vị khác dùng "Trường Đại học". 8 tên Wikipedia chữ thường: "Phân hiệu Trường đại học tài chính - makerting tại Quảng Ngãi" (sai chính tả "makerting", cũng ở `hfa`), "Trường đại học lao động - xã hội cơ sở II tại TP.HCM", "Học viện cao đài Tiên Thiên". Tên thiếu dấu/ký tự lạ: không phát hiện.
- Gợi ý sửa: chuẩn hóa viết hoa theo quy tắc "Trường Đại học X"; sửa "makerting".

### 11-A7 (P3) `abbr` là mã MOET hoặc tên tỉnh/trùng
- Ở đâu: institutions.json `abbr`; ghi vào profind.json.
- Thực tế: 6 đơn vị trong profind dùng mã MOET làm abbr: `vyl` "VYL", `vud` "VUD", `v45` "V45", `v27` "V27", `v04` "V04", `vln` "VLN" (không phải viết tắt thật; V27 = Viện Vệ sinh Dịch tễ TW, thật là NIHE). Các phân hiệu `dms,hfa,hck,hcd` có abbr = mã tự đặt ("DMS"...). 4 trường dùng abbr "TP.HCM" (tp-hcm..tp-hcm-4: trường ở Bà Rịa, Bình Dương, HCM; "TP.HCM" là tỉnh). Trùng abbr: DTU x2 (Duy Tân/Đồng Tháp), NTU x2 (Nha Trang/Nguyễn Trãi), VMU x2, TLU x2 (Thủy lợi/Thăng Long), DNU x2 (Đồng Nai/Đại Nam), IER x2. 208/602 không có abbr. Kiểm tra giao diện: App.tsx và types.ts có trường `abbr` nhưng KHÔNG dùng để hiển thị hay tìm kiếm (grep: không có `.abbr`), nên chưa ảnh hưởng người dùng.
- Gợi ý sửa: không lấy mã MOET làm abbr; bỏ abbr trùng hoặc để rỗng.

### 11-A8 (P2) Hai viện cùng tên "Viện Công nghệ Thông tin" tại Hà Nội, cùng có tác giả, không phân biệt được
- Ở đâu: `vien-cong-nghe-thong-tin` (ROR 03g6wh580, ITI trực thuộc ĐHQGHN, 46 tác giả) và `vien-cong-nghe-thong-tin-2` (ROR 04yzbtf37, IOIT thuộc VAST, 47 tác giả); 9 tác giả có cả hai.
- Mong đợi: tên có hậu tố "(ĐHQGHN)" / "(Viện Hàn lâm KH&CN VN)". Thực tế: chỉ khác chữ hoa "Thông tin"/"thông tin" (và en giống nhau là Vietnamese).

### 11-A9 (P2) Bộ lọc "Loại đơn vị" liệt kê 7 loại nhưng dữ liệu chỉ có 3 loại -> 4 lựa chọn dẫn tới kết quả rỗng
- Ở đâu: src/App.tsx dòng 84 `Object.entries(d.types)`; public/data/profind.json `types` có 7 khóa, nhưng `institutions` chỉ có institute (132), private-univ (44), public-univ (36).
- Tái hiện: mở bộ lọc "Loại đơn vị" -> chọn "Cao đẳng, dự bị đại học", "Đại học nước ngoài tại Việt Nam", "Cơ sở tôn giáo" hoặc "Đại học (chưa phân loại công/tư)" -> không có đơn vị nào.
- Về "university-unclassified": 42/602 trong institutions.json (toàn bộ nguồn MOET: qhy, qhl, qsb, dkq, dks, dca, buv, dvt, nvs, ccm, các trường thành viên Huế/Thái Nguyên/Đà Nẵng...), 0 trong profind; nhãn "Đại học (chưa phân loại công/tư)" đọc được nhưng vô nghĩa khi lọc. Lý do: import-moet.mjs gán mặc định "university-unclassified" cho mọi tên không chứa "tư thục"/"dân lập". Hầu hết là công lập (ví dụ ĐHQG, ĐH Huế, ĐH Thái Nguyên, ĐH Trà Vinh...), buv là trường nước ngoài.
- Gợi ý sửa: ẩn loại không có kết quả (đếm theo profind) và phân loại lại theo managedBy.

### 11-A10 (P3) Phân loại `type` chưa chuẩn cho một số nhóm
- `hoc-vien-tu-phap`, `hoc-vien-canh-sat-nhan-dan`, `hoc-vien-quoc-phong`, `hoc-vien-hau-can`, `academy-cryptography-techniques` (Học viện) bị xếp "institute" (nhãn "Viện nghiên cứu, cơ sở khác") -> sai nhóm so với Học viện Tài chính/Ngân hàng (public-univ). `can-tho-university-institute-food-and-biotechnology` (viện) = public-univ; `thai-nguyen-technology-and-economics-college` (cao đẳng) = public-univ; `ibt` "Viện Thánh kinh Thần học" = other; `buv`/ĐH Anh Quốc ở 2 loại khác nhau (unclassified vs foreign-univ). `tdtu` (Tôn Đức Thắng, công lập tự chủ) = public-univ là đúng; không phát hiện trường tư bị xếp công lập trong profind.
- Gợi ý sửa: thêm loại "academy" hoặc đưa Học viện vào public-univ.

### 11-A11 (P2) Độ phủ tác giả: nhiều trường/viện lớn có trong dữ liệu nhưng 0 tác giả; số tác giả mỗi đơn vị bị chặn trần 50
- Ở đâu: public/data/profind.json.
- Thực tế: phân bố số tác giả/đơn vị: 86 đơn vị đúng 50, 21 đơn vị 49, 13 đơn vị 48 -> dấu hiệu trần 50 tác giả mỗi đơn vị (hoặc top-N), nên các đơn vị lớn (HUST, NEU, CTU, UEH... đều "50") không phản ánh đúng quy mô, và tác giả hạng thấp bị loại. 8 đơn vị có 3 tác giả, 8 đơn vị có 1 tác giả, 2 đơn vị có 2: ví dụ `vien-nang-suat-viet-nam`(1), `vien-bien-dong`(1), `vien-quy-hoach-do-thi-va-nong-thon-quoc-gia`(1), `institute-for-policy-studies-and-media-development`(1), `vien-so-huu-tri-tue-quoc-gia`(2). Không có đơn vị nào trong profind có 0 tác giả (tốt) và không có tác giả trỏ tới id đơn vị không tồn tại.
- Độ phủ 30 đơn vị lớn (có trong dữ liệu / số tác giả): HUST 50; NEU 50; CTU 50; UEH 49; HMU 50; ĐHQGHN 49; ĐHQG-HCM 50; ĐH Huế 50; ĐH Đà Nẵng 50; ĐH Thái Nguyên 50; FTU 50; HNUE 50; TDTU 50; DTU 50; Vinh 50; ĐH Y Dược TP.HCM 50; ĐH Dược Hà Nội 50; HUCE 50; UTC 50; TLU 50; PTIT 50; VAST 50; VASS 49; VNUA 50; Phenikaa 50; VinUni 50; FPT 50; BK-ĐHQG-HCM 50 — CÓ đủ. KHÔNG CÓ tác giả (0): ĐH Mở TP.HCM `hcmou`, ĐH Thương mại `tmu`, ĐH Sài Gòn `sgu`, ĐH Y tế Công cộng `huph`, ĐH Nha Trang `ntu`, ĐH Y Dược Cần Thơ `ctump`, ĐH Y Dược Huế `hue-university-medicine-and-pharmacy`, ĐH Khoa học Tự nhiên (cả 2 ĐHQG) `vnu-hanoi-university-science` / `vnuhcm-university-science`, ĐH Công nghệ ĐHQGHN, ĐH CNTT ĐHQG-HCM, ĐH Kinh tế ĐHQGHN, ĐH Hà Nội `hanu`, ĐH Lâm nghiệp `vnuf`, ĐH Đà Lạt `dlu`, ĐH Hàng hải `vmu`, ĐH Điện lực `epu`, USTH `usth`, HUTECH, Học viện KH&CN `gust`, ĐH Sư phạm TP.HCM có (49).
- Hệ quả: các trường thành viên ĐHQG đều 0 tác giả (tác giả đang gộp vào `dhqghn`/`dhqg-hcm`), nên người dùng không lọc được "ĐH Công nghệ - ĐHQGHN" hay "ĐH Khoa học Tự nhiên" mặc dù đây là nơi tập trung nhiều nghiên cứu.
- Đơn vị lạ: 1.239 tác giả cờ `foreign`; tác giả `T N P Nguyen` gắn 26 đơn vị, `Thuy Nguyen` 20 đơn vị, `Catherine M. Kaicher` (0 công bố, foreign) gắn 6 đơn vị VN -> hồ sơ OpenAlex gộp nhầm nhiều người (P2, nằm ngoài phạm vi đơn vị nhưng nên báo nhóm dữ liệu tác giả). 46 tác giả cùng gắn UEF và UEH (dấu hiệu gộp nhầm UEF -> UEH ở OpenAlex).

---

## MỤC ĐÃ KIỂM ĐẠT
- 351/351 mã ROR gọi API ROR được và quốc gia VN (trừ 1 reset kết nối, thử lại đạt); không có mã ROR trùng giữa 2 id; không có id trùng.
- 212 cặp (đơn vị có tác giả -> ROR) đối chiếu bằng mắt: tên VN/EN và thành phố khớp thực thể ROR; các ca dễ nhầm đều đúng: ĐH Huế (00qaa6j11 = Hue University), ĐH Quy Nhơn, ĐH Mở Hà Nội, ĐH Luật Hà Nội, ĐH Dược Hà Nội, Công Thương TP.HCM vs Công nghiệp TP.HCM, Thăng Long vs Thủy lợi, Bách khoa ĐHQG-HCM, SPKT Đà Nẵng, Tôn Đức Thắng, Học viện Nông nghiệp (04... đã gỡ nhầm ĐH Nông nghiệp/VAAS), Yersin Đà Lạt.
- Các mã rorSuspect (40) đã được gỡ hoặc ghi lại ở giá trị khác; không còn đơn vị trong profind trỏ vào mã của đơn vị khác.
- Không còn tên viết hoa toàn bộ (0/602), không ký tự lạ, không khoảng trắng thừa, không `en` rỗng.
- Mọi id trong `authors[].institutions` đều tồn tại trong `institutions`; mọi đơn vị trong profind có >=1 tác giả; không có đơn vị trùng tên hoặc trùng `en` trong profind (nhưng có trong institutions.json, xem 11-A3).
- Loại công/tư của 80 trường trong profind (36 công, 44 tư) đúng với hiểu biết (Phenikaa, Duy Tân, FPT, VinUni, Nam Cần Thơ... = tư thục; Tôn Đức Thắng = công lập tự chủ).
- profind.json trên bản test trùng khớp với tệp trong kho.
