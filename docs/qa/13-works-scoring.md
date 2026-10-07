# Báo cáo kiểm thử 13: Chấm điểm công trình (HĐGSNN) - ProFind
Phạm vi: 124.120 công trình trong public/data/works/*.json (6.038 tệp), dữ liệu gốc data/raw-authors.json (163.381 dòng, 7.680 tác giả), journals.json, sjr-rules.json. Script: /tmp/claude-0/qa/scripts-13/*.py. Không gọi OpenAlex, không sửa mã nguồn.
Lưu ý: build thật đọc data/raw-authors.json (không phải data/raw/*.json).

## Kết luận nhanh
Cài lại độc lập thuật toán: khớp 124.120/124.120 (100%) cả score, scoreDiscipline, scoreKind. Không có công trình nào sai về mặt tính toán. Lỗi nằm ở dữ liệu đầu vào và các giả định.

## Lỗi đã xác minh

### 13-A1 | P1 | Chọn ngành điểm cao nhất làm thổi phồng điểm khoảng 18-23%
- Ở đâu: scripts/build-index.mjs, bước 2 (vòng lặp qua mọi `js` và `sj`, lấy max không phân biệt ngành).
- Tái hiện: với 28.208 công trình lead có điểm, tính lại ba cách. Tổng theo max mọi ngành = 52.637,75; theo ngành đầu tiên khớp = 42.927 (-18,5%); theo ngành chính của tác giả (disciplines[0]) = 44.490,75 (-15,5%). 9.661 công trình thấp hơn khi chấm theo ngành của tác giả; 17.775 công trình có ứng viên điểm khác nhau; 6.554 công trình khớp từ 5 ngành trở lên.
- Mong đợi: điểm theo hội đồng ngành của tác giả (hoặc hiển thị khoảng min-max). Thực tế: luôn lấy max.
- Bằng chứng: tạp chí Journal of Science and Transport Technology (ISSN 2734-9942, 8 ngành, 0,25 đến 2): A5061880584-W7202217166, A5051204336-W7214735332 (điểm 2, ngành đầu chỉ 0,25). CTU Journal of Innovation and Sustainable Development: A5055893517-W4380682698 (2 so với 0,5). Tác giả lệch nhiều nhất: Jie Yang A5100404947 (873 so với 285 theo luyen-kim), Lê Thanh Hà A5006943571 (321,75 so với 140,5), Pugazhendhi A5060225029 (422 so với 186).
- Gợi ý: ưu tiên ngành của tác giả khi có ứng viên; ghi chú trên UI rằng điểm là "tối đa trong mọi hội đồng ngành".

### 13-A2 | P1 | Tác giả liên hệ thiếu trong OpenAlex (corr=0) làm role "co" oan, điểm thấp hơn thực tế
- Ở đâu: scripts/ingest-openalex.mjs dòng 45-46 và 75-76 (lead = first || (is_corresponding && nCorr===1)).
- Số liệu: lead chỉ 37.762/124.120 (30,4%). 36.302 công trình role=co có corr=0 (29% tổng); trong đó 26.835 công trình ở tạp chí có điểm tiềm năng (điểm tối đa nếu được tính khoảng 41.000). Tác giả có thể là tác giả liên hệ duy nhất nhưng OpenAlex không gắn nhãn, nên không tính được. 9.964 công trình lead chỉ nhờ đứng đầu (corr=0).
- Tạp chí gần như không bao giờ có nhãn liên hệ: Tạp chí Y học Dự phòng 1.251/1.251 corr=0, Tạp chí Y học Cộng đồng 956/979, IEEE Access 755/781, Phytotaxa 512/512, Zootaxa 425/435, Tạp chí Dược liệu 169/169 (21 tạp chí >=100 công trình có >=95% corr=0, tổng 9.485 công trình).
- Mẫu ngẫu nhiên 40 công trình (seed 13): 14 co/corr0, 5 lead/corr0, 8 co/corr2, 7 co/corr1, 4 lead/corr1, 1 co/corr3, 1 lead/corr2 - vai trò khớp quy tắc, nhưng gần một nửa mẫu (19/40) rơi vào corr=0.
- Mong đợi: UI/ghi chú phân biệt "không phải tác giả chính" và "không xác định được (thiếu dữ liệu tác giả liên hệ)". Thực tế: cả hai cùng hiển thị "Không tính (không phải tác giả chính)".
- Gợi ý: thêm role "unknown" khi corr=0 và tác giả không đứng đầu; hiển thị điểm tiềm năng riêng; cảnh báo ở hồ sơ.

### 13-A3 | P2 | Tra ISSN trong journals.json trỏ nhầm sang tạp chí khác (ISSN tái sử dụng/alias sai) làm tăng điểm trong nước
- Ở đâu: data/journals.json, byIssn: 30/2.247 mục có ISSN không nằm trong `issn` của tạp chí đích.
- Tái hiện: byIssn["1859-0012"] gồm 'Journal of Economics and Development' (kinh-te:29, issn 1859-0020/2632-5330, điểm 2 từ 2024), nhưng 1859-0012 là Tạp chí Kinh tế và Phát triển (giao-thong:29, 0,5). byIssn["1859-3682"] (Tạp chí Công nghệ Ngân hàng) -> Asian Journal of Economics and Banking (2615-9821). byIssn["2734-9306"] (Tạp chí KH ĐH Mở TP.HCM - Kinh tế) -> issn 2734-9314/2734-9586. Cũng có 2734-9942 -> kinh-te:130 (issn 2734-9950, Scopus).
- Ảnh hưởng: 76 công trình lead có điểm chỉ nhờ mục sai (59 công trình thuần là điểm không đáng có, còn lại bị nâng; tổng nâng 72 điểm).
- Bằng chứng: A5045038324-W4399701117 (Kinh tế và Phát triển 2024, điểm 2 thay vì 0,5), A5045038324-W4385151540 (1,5 thay vì 0,5), A5043496586-W4396776042, A5052413692-W7151469638 (1,5 thay vì 0,75), A5116480142-W4408094100 (1,25, không có khớp hợp lệ).
- Gợi ý: kiểm tra chéo byIssn với journal.issn khi dựng; hoặc so khớp thêm tên tạp chí.

### 13-A4 | P2 | Cùng một công trình xuất hiện nhiều bản và được tính điểm nhiều lần
- Ở đâu: build-index.mjs (khử trùng chỉ theo authorId+mã W; không theo tiêu đề).
- Số liệu: 2.916 nhóm trùng (cùng tác giả, cùng tiêu đề chuẩn hóa), 3.230 dòng thừa. 110 nhóm có >=2 bản đều có điểm, cộng thừa 204,75 điểm (97 nhóm cùng tạp chí, 13 nhóm khác tạp chí).
- Bằng chứng: A5001039414-W7164926753 và A5001039414-W7164955965 (Research 2026, đều 2 điểm); A5090430450-W4387677775 và -W4387712848 (Health Risk Analysis 2023, đều 1,5); A5078074629-W4404858942 (1) và -W4404791870 (0,5), cùng tiêu đề, hai tạp chí Việt; A5100771694-W4400914715 và -W4400149598 (tạp chí khác nhau, 1,5 và 3, cùng tiêu đề).
- arXiv/SSRN: 6.633 công trình (3.521 arXiv, 3.112 SSRN) đều không điểm (đúng), nhưng làm tăng worksCount và hạ matchedRate.
- Gợi ý: gộp theo (authorId, tiêu đề chuẩn hóa, năm), giữ bản điểm cao nhất; loại preprint khi đã có bản chính.

### 13-A5 | P2 | Công trình lead khớp tạp chí trong nước nhưng ngoài khoảng năm hiển thị "Chưa xác định điểm" gây hiểu nhầm
- Ở đâu: src/App.tsx dòng 140 (score===null và role lead -> t("unmatched")).
- Số liệu: trong 9.554 công trình lead không điểm, 9.447 thật sự không khớp tạp chí; 107 công trình có khớp tạp chí nhưng năm chưa/không được hội đồng công nhận (tier fromYear/toYear). Giao diện không phân biệt, cũng không có liên kết "Tra tạp chí trên EduFind".
- Bằng chứng: A5101431327-W4390055312 (Lạc Hồng 2023, tier từ 2024), A5101431327-W4312661502 và A5041190464-W4225854694 (Y học lâm sàng BV TW Huế 2022, tier từ 2025), A5023760366-W4402534599 (Nghiên cứu Tài chính - Marketing 2024, tier từ 2025), A5100632422-W4312849522 (VNU JEB 2021, tier từ 2022).
- Gợi ý: hiển thị "Tạp chí có trong danh mục nhưng chưa được tính ở năm X" cho trường hợp này.

### 13-A6 | P2 | Hồ sơ nghi gộp nhầm (suspect) vẫn chiếm hạng điểm #1 ở trang hồ sơ
- Ở đâu: build-index.mjs bước 3 (rankScore tính trên mọi tác giả kể cả suspect/nước ngoài).
- Bằng chứng: Jie Yang A5100404947 (2.509 công trình, suspect=true, 873 điểm) rankScore=1; kéo thứ hạng người khác lùi một bậc. Hijaz Ahmad A5114376646 (785 công trình, suspect) top 6 theo điểm. Danh sách mặc định (scope "vn") ẩn họ nhưng số hạng "#" ở hồ sơ vẫn tính cả.
- Gợi ý: tính hạng sau khi loại suspect (hoặc tính hạng theo phạm vi đang xem).

### 13-A7 | P3 | Công trình tiêu đề rỗng
- 8 công trình có title rỗng (UI để ô trống): A5067088014-W7129510917 (lead, 1,5 điểm), A5108316742-W4318819583 (lead, 0,75), A5011546218-W4240098937, A5037059087-W7118169973, A5104100674-W4285230292, A5032091221-W3156669414, A5034556187-W4403104787, A5101748213-W7171678845.
- Gợi ý: hiển thị "(không có tiêu đề)" hoặc loại bỏ khi không có tiêu đề.

### 13-A8 | P3 | Công trình điểm 0 vẫn tính là "được tính"
- 8 công trình domestic ngành y-hoc có score=0 (tier maxScore 0), được tính vào countedWorks (counted = score!==null) nên chỉ số "đã tính/tổng" cao hơn thực chất; UI hiện "0". Gợi ý: counted = score>0 hoặc ghi chú.

### 13-A9 | P3 | Sách/kỷ yếu có ISSN Scopus và tạp chí "Proceedings" lẫn lộn; không phát hiện tạp chí ngừng chỉ mục
- LNCS (997), LNNS (1.276), CCIS (694), LNCE, LNME, LNEE, IOP/AIP/E3S... đều không điểm (đúng quy tắc, không tính kỷ yếu). 138 công trình có điểm có tên chứa "Proceedings/Conference" nhưng đều là tạp chí thật (Proc. IMechE, Proc. Amer. Math. Soc....) ngoại trừ 7 công trình 'IET conference proceedings.' (ISSN 2732-4494, dien-tu, điểm Scopus) - kỷ yếu hội nghị được tính điểm.
- sjr-rules.json không có coverageStart/coverageEnd nên không phát hiện được tạp chí bị ngừng chỉ mục (ví dụ Computers, Materials & Continua 47 công trình, Sustainable Futures 20, IJACSA 20 đều được điểm Scopus theo năm bất kỳ). Đây là hạn chế dữ liệu; nên ghi chú hoặc nhập thêm coverage.

### 13-A10 | P3 | ISSN sai checksum từ OpenAlex
- 286 lượt (31 ISSN duy nhất) trong 124.120 công trình có checksum sai (ví dụ 0381-5235 Journal of Electronic Materials, 1064-7564, 1474-9728, 0617-8043). Không ISSN nào trùng với journals.json/sjr nên không gây sai điểm, nhưng các công trình này (Journal of Electronic Materials...) có thể bị thiếu điểm Scopus do ISSN sai (khớp tạp chí chỉ theo ISSN). Gợi ý: bổ sung khớp theo issn_l đúng/tên tạp chí.

## Mục đã kiểm đạt
- Cài lại độc lập: 124.120/124.120 khớp (score, ngành, loại, và cả null).
- Tier theo năm: logic fromYear/toYear đúng (chọn tier fromYear lớn nhất; 102 tier có toYear); năm công bố 2021-2026, không có năm tương lai (>2026) hay <2021; không có journal rỗng, issn rỗng, citations âm.
- Công trình vừa trong nước vừa Scopus: 423 công trình lead, 256 dùng điểm trong nước, còn lại dùng Scopus; max đúng.
- scopus_q1_hi, scopus_esci cho ngành quartile_if_listed/listed: đúng (8 công trình Scopus không có quartile -> esci).
- Quy tắc lead khớp dữ liệu corr: không có công trình co với corr=1 mâu thuẫn được suy từ dữ liệu có sẵn (không có author_position trong dữ liệu thô nên không kiểm sâu hơn).
- Hiển thị UI (đọc src/App.tsx): role=co hiện "Không tính (không phải tác giả chính)"; lead không khớp hiện "Chưa xác định điểm"; điểm 0 hiện "0"; ô Scopus hiện hạng Q; CSV điểm null để trống.
- Top 30 tác giả điểm cao nhất được kiểm tay: điểm = tổng điểm công trình, phần lớn là tác giả nước ngoài làm việc tại DTU/TDTU/VLU với 50-150 công trình lead hợp lý; ngoại lệ: Jie Yang (suspect, xem 13-A6) và Rillig A5068567739 gắn đơn vị vien-sinh-hoc (có thể ghép đơn vị sai, ngoài phạm vi). Top công trình: tất cả 3 điểm (Q1 ngành hoa-thuc-pham/luyen-kim...), đúng công thức.
