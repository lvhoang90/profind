# Báo cáo kiểm thử 12: Tính đúng đắn dữ liệu tác giả ProFind

Phạm vi: public/data/profind.json (6.876 tác giả, 124.120 công trình), public/data/works/*.json, data/author-meta.json, data/journals.json, data/sjr-rules.json, scripts/build-index.mjs, src/App.tsx (hàm fold). Không gọi OpenAlex; có 25 lần GET ORCID public. Script phân tích: /tmp/claude-0/qa/scripts-12/a1..a8.py, o.py. Kết quả ORCID thô: /tmp/claude-0/qa/shots/12-orcid.json.

## Lỗi đã xác minh

### 12-A1 (P1) Hồ sơ gộp nhầm nhiều người không bị gắn suspect
- Ở đâu: build-index.mjs dòng 71 (suspect chỉ khi >=500 công trình hoặc >150 công trình/năm). Chỉ 3 hồ sơ bị gắn (Jie Yang A5100404947, Hijaz Ahmad A5114376646, Mika E. T. Sillanpää A5068175005).
- Tái hiện: đọc profind.json, lọc tác giả có >=5 đơn vị: 18 hồ sơ, không hồ sơ nào suspect. Ví dụ: T N P Nguyen A5128700301 (26 đơn vị, 135 công trình), Thuy Nguyen A5043524211 (20 đơn vị), T D K Nguyen A5124893580 (10 đơn vị), Nguyễn Thị Thu Hà A5031466622 (7 đơn vị; tạp chí y học nhưng công trình đầu tiên là "Simultaneous retrieval of optical water quality indicators" viễn thám), Nguyễn Thị Thu Hương A5100771613 (4 đơn vị; 150 bài trong một tạp chí Hồng Bàng, đề tài từ statin tới dạy tiếng Nhật OMO).
- Mong đợi: hồ sơ gộp nhầm bị gắn cờ/ẩn. Thực tế: hiển thị như tác giả thật, nằm trong bảng xếp hạng.
- Bằng chứng ORCID (xem A8): ORCID trong hồ sơ thuộc người khác, tên khác hẳn.
- Gợi ý: thêm tiêu chí suspect: >=5 đơn vị khác loại, hoặc >=3 ngành, hoặc >40 công trình/năm khi >=100 công trình, hoặc tên chỉ gồm chữ cái viết tắt + >=5 đơn vị. Các hồ sơ có >=60 công trình/năm còn lại chưa gắn: Aseel Smerat A5114535738 (276 bài, 168 bài năm 2025, 274 bài đồng tác giả), Arivalagan Pugazhendhi A5060225029 (420), Lajos Hanzo A5091122305 (393), Thị Phương Thúy Nguyễn A5146792985 (118 bài trong 2 năm, một tạp chí).

### 12-A2 (P1) Tìm kiếm lệch do dấu gạch nối U+2010/U+2013, NBSP, khoảng trắng kép trong tên
- Ở đâu: src/App.tsx dòng 13 (fold chỉ bỏ dấu và đ), dữ liệu name.
- Tái hiện: 123 tên chứa U+2010 (ví dụ "Dinh‐Toi Chu" A5003368566, "The‐Long Phan" A5054227606, "Sy Duong‐Quy" A5027031429, "Xuan‐Thanh Bui" A5080216121), 10 tên chứa U+2013 ("Minh–Triet Tran" A5053495766, "Thang – Ngoc Hoang" A5062752220), 2 tên chứa NBSP ("Nghia Huu Truong" A5128842109, "Nguyen Thi Mai Huong" A5129156633), 9 tên có khoảng trắng kép/NBSP ("Anh  Duc Nguyen" A5100693031, "Hai  Nhu Tran" A5125744321). Gõ "dinh-toi chu" (dấu - thường) vào ô tìm kiếm: fold không đổi U+2010 nên không khớp.
- Mong đợi: tìm "dinh-toi" ra Dinh‐Toi Chu. Thực tế: không khớp. Lưu ý các tên này lại thuộc nhóm đông công trình (Dinh‐Toi Chu 60.650 trích dẫn, cao nhất).
- Gợi ý: chuẩn hóa tên khi build (thay [‐‑‒–—−] bằng "-", NBSP bằng space, gộp khoảng trắng) và thêm vào fold; nên fold bỏ luôn "-" để "Duc Tan" khớp "Duc-Tan".

### 12-A3 (P2) Tên NFD / dấu rời trộn lẫn, tên gõ sai kiểu
- Ở đâu: 10 tên NFD (A5155559791 Nguyễn Thị Bích Thủy, A5147046497 Vũ Kim Thoa, A5154427033, A5154997803, A5140497991, A5154461158, A5154636044, A5155734846, A5154372541, A5154596694): chuỗi không NFC. Hai tên dấu rời có khoảng trắng: "Quô ́c B. Nguyê ̃n" A5009055800, "Biê ́t V. Huỳnh" A5041686655.
- Mong đợi: NFC, không khoảng trắng chen dấu. Thực tế: sắp xếp theo tên/so khớp chuỗi chính xác lệch; fold của "Quô ́c" thành "quo c" nên tìm "quoc" không ra.
- Gợi ý: normalize("NFC") và loại space đứng trước dấu kết hợp khi build.

### 12-A4 (P2) Tên viết tắt, chỉ chữ cái, đảo thứ tự, tên có chức danh
- 88 tên dạng viết tắt: "T D K Nguyen" A5124893580, "T N P Nguyen" A5128700301 (cả hai là hồ sơ đa đơn vị gộp nhầm), "T U O N G Nguyen" A5101269814 (chữ tách rời), "T. L." A5020714994, "D Yang" A5136434025.
- 34 tên IN HOA toàn bộ: "HAN GIA NGUYEN" A5000141797, "HỒ TRÚC VI" A5012106975, "NGUYEN VAN HUY" A5053015767; 1 tên chữ thường "huong ngo" A5101294014.
- 14 tên một từ: "Lê" A5110495264, "Tâm" A5112019742, "Minh" A5083708437; 2 hồ sơ "Anonymous" A5140531958, A5130768013 (0 công trình).
- Tên kèm chức danh/ngoặc: "Dr. NGUYEN THI NGA" A5125525664, "Dr. Nguyen Minh Hang" A5121882929, "Dr.Mai Thị Mai" A5122761318, "Dr. Ruchi Biswas" A5155393115, "Trung Quang Vo (PhD. Pharm)" A5155068724; "Nguyễn Thị Mẫu Nguyễn Thị Mẫu" A5115622832 (tên lặp; "Mẫu" là tên đệm thật, KHÔNG phải sót "(mẫu)" của demo, meta.demo=false và không có tác giả demo).
- 14 tên Cyrillic (nhiều bản phiên âm tiếng Nga của tên Việt: "Тран Дай Лам" A5069855201 (xuất hiện 18 lần trong nhóm trùng tên với tên Latin), "Нгуен Ти Хуан Ту" A5012189200), 3 Hàn/Nhật ("류근호" A5015251680, "서이수" A5008488910, "平山 敦大" A5029412883), Thái ("สุดใจ ทูลพานิชยวิจ" A5153946443), tên song ngữ "Laongdown Sangla ละอองดาว แสงหล้า" A5061150241. Không có ký tự điều khiển, tên rỗng, hay ID trùng.
- Thứ tự tên không nhất quán: "Văn Đức Nguyễn"/"Nguyen Van Duc"/"Thi Thu Nguyen Ha"/"Hà Trần Thị Thu". Có 785 nhóm tên cùng tập từ nhưng khác thứ tự/dấu.
- Gợi ý: đưa vào corrections.rename/lọc; không hiển thị hồ sơ "Anonymous"; tách chức danh khỏi tên; thêm cột "tên chuẩn hóa" để nhóm.

### 12-A5 (P1) Trùng lặp hồ sơ một người
- Phương pháp: chuẩn hóa tên (bỏ dấu, sắp tập từ) + chia sẻ >=1 đơn vị. Kết quả: 877 cặp, 1.208 hồ sơ (17,6%) thuộc nhóm nghi trùng; trong đó 131 cặp cả hai có ORCID khác nhau (có thể người khác nhau, hoặc một người có 2 ORCID), 746 cặp có ít nhất một hồ sơ chưa có ORCID (khả năng trùng cao hơn). Nhóm cùng tên (kể cả không chung đơn vị): 861 nhóm / 2.231 hồ sơ.
- Không có ORCID trùng (bước gộp theo ORCID hoạt động; 0 vi phạm). 3.282 hồ sơ (47,7%) không có ORCID nên không gộp được. data/corrections.json: merge/remove/rename đều rỗng, nghĩa là chưa có đính chính thủ công nào.
- Ví dụ: Xuan Vinh Vo: A5001100407 (265 bài, ORCID 0000-0002-3868-8176), A5108697522 (43 bài, ORCID 0000-0002-4725-6914), A5152338300 "Vo Xuan Vinh" (1 bài) - cùng đơn vị vien-nghien-cuu-kinh-doanh. Hung Viet Pham: A5002648627 + A5101414960 (và A5084671242 "Pham Hung Viet"). Lê Anh Tuấn: A5061680998, A5054486481, A5100753115 (cùng hust). Tu Bao Ho: A5101646487, A5147385768 (viasm), A5081464274 (0 bài).
- Hệ quả: điểm/xếp hạng của một người bị chia nhỏ, danh sách tìm kiếm lặp.
- Gợi ý: dựng danh sách đề xuất gộp (tên chuẩn hóa + chung đơn vị + chưa có ORCID hoặc ORCID khác), duyệt rồi nạp vào corrections.merge.

### 12-A6 (P2) 838 hồ sơ (12,2%) có 0 công trình vẫn nằm trong dữ liệu
- Thực tế: firstYear/lastYear = null, rankWorks=6039 và rankScore=3954 đều hạng chung; 53 hồ sơ có ORCID; 168 hồ sơ foreign=true. Ví dụ A5014924659 "Catherine M. Kaicher" (6 đơn vị, 0 công trình), A5140531958 "Anonymous".
- Mong đợi: hồ sơ không công trình bị ẩn hoặc nhãn "chưa có công trình từ 2021". Hậu quả: khoảng 1/8 danh sách là hồ sơ rỗng, làm loãng tìm kiếm.
- Gợi ý: lọc khỏi bảng mặc định hoặc không xuất bản khi worksCount=0.

### 12-A7 (P1) Ngành suy ra không đáng tin với tạp chí đa ngành; "Luyện kim" phình to
- Nguyên nhân (đã xác minh): data/journals.json byIssn + sjr-rules.sjrByIssn gán ISSN vào nhiều ngành: 30.696/50.140 ISSN (61%) thuộc >=2 ngành, 5.459 ISSN (10,9%) có luyen-kim, 5.359 trong số đó là đa ngành (ví dụ 1859-4794 thuộc 25 ngành, 1859-2333 17 ngành; nhiều tạp chí khoa học tổng hợp trường đại học). build-index.mjs bước ngành cộng 1 phiếu cho MỌI ngành của tạp chí rồi giữ ngành >=25% hoặc ngành đầu bảng, nên với tạp chí hóa/vật liệu (RSC Advances -> hoa-thuc-pham+luyen-kim, ACS Omega, Polymers, Ceramics International, J. Alloys Compd) luyen-kim luôn đồng hạng đầu.
- Thực tế: 681 tác giả (9,9%) có "luyen-kim", 283 chỉ có đúng luyen-kim. Nguyễn Hữu Hiếu A5026220137: chủ yếu hóa học vật liệu/xúc tác quang (ZnO-TiO2/rGO, g-C3N4), nhưng ngành = chỉ ['luyen-kim']; scoreDiscipline các bài là hoa-thuc-pham/vat-ly/co-khi. Hoang Quan Nguyen A5063782589 (bài bê tông thấm nước, J. Science and Transport Technology) = luyen-kim, đúng ra xây dựng/giao thông.
- Mẫu ngẫu nhiên 40 hồ sơ (seed 12): khoảng 8/40 không hợp lý: A5069575164 Trần Lưu Phúc (bài tương tác thuốc đái tháo đường) = chan-nuoi/co-khi/dien-tu; A5048466081 Linh Thi Thuy Nguyen (GWAS cây trồng QTL) = y-hoc; A5155911995 Nguyen Ngoc Huy (pháp luật đất đai) = giao-duc/kinh-te/ngon-ngu (không có luat); A5059441509 Doãn Phương Linh (giáo dục THCS) = duoc/ngon-ngu/y-hoc; A5115661418 Thị Mỹ Dung Phạm (nông nghiệp công nghệ cao) = duoc/giao-duc/kinh-te; A5113953438 Cao Đông Vũ (phân tích nguyên tố, J. Arch. Science) = su-hoc (có thể chấp nhận); A5100616334 DUC DINH NGUYEN (cánh turbine, Ocean Eng.) = nong-lam/sinh-hoc; A5028568602 Huy Vuong Nguyen (nước ngầm) = chan-nuoi/cntt/co-hoc. Phần còn lại hợp lý (cntt, y-hoc, giao-duc...).
- 1.305 hồ sơ (19%) không có ngành: 838 do 0 công trình, 467 có công trình nhưng matchedRate=0.
- Gợi ý: chia phiếu theo 1/số ngành của tạp chí (hoặc bỏ tạp chí có >=4 ngành khỏi bỏ phiếu), ưu tiên ngành từ ngành Scopus ASJC/OpenAlex topic; dùng tiêu đề công trình làm phụ.

### 12-A8 (P1) ORCID của hồ sơ không khớp tên: bằng chứng gộp nhầm
Đối chiếu 25 ORCID (16 ngẫu nhiên + 9 nghi vấn):
- Khớp rõ: A5071781127 Joseph Donovan; A5058270838 Anna B. Vassilieva; A5062731707 Sangyoung Han; A5101726934 Manh Hung Tran; A5101634257 Quan Nguyen; A5070726803 Minh‐Ngoc Vu; A5070035360 Thai‐Ha Le; A5085607636 Tran Viet Dung; A5103019792 Khanh Do; A5058987661 Đỗ Thị Thảo; A5065522420 Nguyen Thi Bao My; A5026299963 Thanh Tran; A5002648627 Hung Viet Pham; A5061790610 Duc–Tan Tran; A5005792924 Wray Buntine; A5027186980 Cong Tam Trinh; A5031466622 (Hà Nguyễn).
- KHÔNG khớp: A5109244060 "Hang Nga Nguyen" (ORCID: Hai NGUYEN); A5088853151 "Nguyễn Quốc Huy" (ORCID: Quang Huy Nguyen); A5043524211 "Thuy Nguyen" (ORCID: Thien Tao Nguyen); A5128700301 "T N P Nguyen" (ORCID: Nguyen Trong Hai); A5100771613 "Nguyễn Thị Thu Hương" (ORCID: Nguyen Xuan Giao); A5124893580 "T D K Nguyen" (ORCID: Thang Nguyen); A5093822229 "Anh Thi Tu Phi" (ORCID: PHÍ THỊ KIỀU ANH).
- Tỉ lệ sai: 7/25 (28%) (mẫu thiên lệch do có 9 hồ sơ chọn vì nghi vấn; trong 16 ngẫu nhiên: 3 sai = 19%: A5093822229, A5109244060, A5088853151).
- Gợi ý: so tên ORCID với tên hồ sơ khi build (so tập từ sau chuẩn hóa), gắn cờ "orcidMismatch" và ẩn liên kết ORCID khi lệch.

### 12-A9 (P2) Cờ foreign: 548 null, 150 rỗng quy thành false
- 548 hồ sơ foreign=null (8,0%, trong đó 523 có công trình): không có trong author-meta.json (6.636 mục). enrich-authors.mjs chưa chạy cho nhóm này (cần OpenAlex, không thử lại).
- 150 hồ sơ có countries rỗng trong meta nhưng foreign=false (do .some trên mảng rỗng): "không biết" bị báo thành "không nước ngoài".
- foreign chỉ dựa last_known_institutions: Anand Nayyar A5091880648 = false vì meta chỉ có VN (Duy Tân University là nơi phụ); 563 hồ sơ foreign=false có tên không có họ Việt, nhiều người nước ngoài: Saeed Shirazian A5112512208, Masoud Afrand A5034312242, Ilyas Khan A5101478466, Sarita Gajbhiye Meshram A5036538864, Narayan Chandra Debnath A5111936306, Nigel K. Downes A5009637491 (CTU), Wray Buntine A5005792924 (VinUni). Ngược lại 661 hồ sơ foreign=true có tên Việt (đa số là người Việt hợp tác nước ngoài, đúng ngữ nghĩa "có đơn vị ngoài VN").
- Heuristic đề xuất: (1) countries rỗng -> null; (2) tên không có âm tiết họ Việt + đơn vị VN chỉ 1 đơn vị tư thục (dtu, tdtu, vlu, nttu, ctu...) + ORCID/OpenAlex country khác; (3) tỉ lệ công trình có affiliation ngoài VN trong dữ liệu works; (4) >50 bài/năm với đơn vị VN duy nhất kèm tên không Việt -> "visiting/affiliated". Nên dùng nhãn riêng "chỉ đơn vị phụ tại VN".

### 12-A10 (P3) Ngưỡng suspect
- 500 công trình hoặc >150/năm (span tính từ firstYear tới lastYear, tối thiểu 1 năm) chỉ bắt 3 hồ sơ cực đoan. Phân bố: 6 hồ sơ >=60/năm, 17 hồ sơ >=40/năm, 170 hồ sơ >=100 công trình chưa gắn. Với tác giả mới có firstYear=lastYear=2026, span=1: D Yang A5136434025 47 bài trong 2026 (43 là arXiv), Nam Anh Quach A5126888718 37 bài (29 SSRN, toàn bộ lead). Gợi ý: ngưỡng 60 công trình/năm cho hồ sơ >=100 bài hoặc >40/năm cộng nhiều đơn vị/viết tắt; với năm hiện tại chưa trọn (2026) nên chia theo tháng đã qua.

### 12-A11 (P3) Điểm công trình = 0 được tính là countedWorks
- 8 công trình có score=0 (không null) thì build coi là counted (counted = lead && score !== null). Ảnh hưởng nhỏ nhưng số "công trình tính điểm" cao hơn thực tế. Gợi ý: counted = score > 0.

## Mục kiểm đã đạt
- ID tác giả duy nhất (0 trùng); ORCID đúng định dạng, 0 ORCID trùng giữa hồ sơ; tên rỗng 0; ký tự điều khiển 0; không có "(mẫu)"/demo (demo=false toàn bộ).
- Năm: firstYear >=2021 cho mọi hồ sơ, lastYear <=2026, không công trình năm tương lai; citations không âm (cao nhất 60.650 Dinh‐Toi Chu, 52.098 Mehdi Hosseinzadeh: đều đúng tổng công trình).
- Dựng lại từ works/*.json: worksCount, countedWorks, totalScore (làm tròn 0,01), citations, firstYear/lastYear khớp 100% (0 lệch / 6.876); matchedRate trong [0,1]; countedWorks <= worksCount.
- Điểm mọi hồ sơ là bội của 0,25; điểm mỗi công trình tối đa 3; totalScore <= countedWorks x 3 mọi hồ sơ.
- rankWorks và rankScore đếm lại độc lập (hạng đồng điểm cùng hạng, kiểu competition): 0 sai/6.876 cho cả hai.
- Chỉ 7 hồ sơ >300 công trình (kể cả suspect 3): Pugazhendhi 420, Hanzo 393, Rillig 331, Dai‐Viet N. Vo 329 chưa gắn suspect nhưng là các nhà nghiên cứu năng suất cao có thật (xem A10).
- Tên có chữ Hán/Hàn/Nhật hiển thị đúng (3 hồ sơ), tên đơn vị không rỗng; số đơn vị: 6.342 hồ sơ có 1 đơn vị, 18 hồ sơ >=5 (đã nêu ở A1).
