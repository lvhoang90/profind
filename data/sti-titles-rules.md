# Quy tắc bổ sung chức danh từ STI.gov.vn

Script: `scripts/build-sti-titles.mjs` (`npm run d:sti-titles`, không chạy trong `npm run build`). Kết quả: `public/data/sti-titles.json` (`{ meta, by: { <mã tác giả ProFind>: "PGS.TS" } }`).

**Quyết định của quản trị viên (Lương Việt Hoàng, Viện ISA) ngày 13/10/2026**, khi STI.gov.vn chưa trả lời thư xin phép; quản trị viên chịu trách nhiệm và liên hệ STI song song. Nếu STI từ chối, xóa `public/data/sti-titles.json` và gỡ `src/StiTitle.tsx`.

## Phạm vi

Lần đầu (PR #196) chỉ bật 5 trường (`ENABLED_UNITS`: hmu, hust, ctu, yds, ctump); mẫu kiểm tay 90/100. Theo yêu cầu của quản trị viên, đã **mở rộng cho mọi đơn vị** (`--units all`, `meta.units: "all"`) sau khi siết/bổ sung quy tắc ánh xạ cơ quan và kiểm lại mẫu mới: 95/100 (xem `docs/STI-DOI-CHIEU.md` mục 4.4). Ánh xạ cơ quan dùng tên, tên Anh, viết tắt của đơn vị và bảng đơn vị cha-con `data/unit-parent.json`; khóa tên cơ quan mơ hồ (nhiều đơn vị cùng khóa) bị bỏ. Muốn quay về 5 trường: `npm run d:sti-titles -- --raw <tệp>` (không có `--units`).

## Điều kiện khớp (đủ cả năm)

- (a) Họ tên chuẩn hóa (bỏ dấu, bỏ danh xưng, cho phép xoay vòng thứ tự tiếng) **duy nhất ở cả hai phía trong cùng đơn vị**: không có hồ sơ ProFind thứ hai cùng tên trong đơn vị; không có hồ sơ STI thứ hai cùng tên mà cơ quan khớp (chắc hoặc lỏng) đơn vị. Tên ProFind có dấu thì dấu phải trùng STI (Cường ≠ Cương); tên không dấu thì STI trong đơn vị chỉ được có một cách viết có dấu. Loại tên dưới 3 tiếng/viết tắt và tên phổ biến (từ 5 hồ sơ cùng tên trong toàn ProFind).
- (b) Cơ quan STI ánh xạ CHẮC: đúng toàn chuỗi với tên/viết tắt/tên Anh/biệt danh của đơn vị (sau khi bỏ ngoặc và hậu tố bộ chủ quản), hoặc dạng "Trường/Viện/Khoa/Phòng/Trung tâm/Bộ môn X - hoặc , <đơn vị>". Bệnh viện thuộc trường không tính. Hồ sơ ProFind phải có đơn vị đó là đơn vị hiện tại.
- (c) Lĩnh vực nghiên cứu STI (mã số; mã chữ không dùng) tương thích ngành chính của ProFind (ngành chiếm từ 30%) theo bảng `FIELD_COMPAT`. Thiếu mã thì không khớp.
- (d) Hồ sơ ProFind không `suspect`, không có trong `data/merge-risk.json`, `split-candidates.json`, `split-hold.json`, không nhóm nghiên cứu lớn (`bigFlag`), không thuộc nước ngoài là chính, dưới 300 công trình, tối đa 3 đơn vị hiện tại, các ngành nằm trọn trong một cụm liền mạch (y-sinh, kỹ thuật-tự nhiên, xã hội-nhân văn).
- (e) Không mâu thuẫn đơn vị giữa hai bên (xem b).

Chức danh ghi: học hàm GS/PGS và học vị TS/TSKH/ThS (`GS.TS`, `PGS.TSKH`, `TS`, `ThS`...). Các bằng khác (CN, KS, BS...) bỏ.

## Không làm

Không ghi đè đơn vị, không đưa vào PRO-SCORE1000™/hạng, không tạo hồ sơ mới. Tệp kết quả không có họ tên, mã cán bộ, giới tính, cơ quan thô, `pCccd`. Dữ liệu thô tải từ STI chỉ ở thư mục tạm ngoài kho, không commit, xóa khi xong.

## Giao diện

Dòng "PGS.TS · theo STI.gov.vn" cạnh tên (`src/StiTitle.tsx`), chú thích "chưa được chính chủ xác nhận", liên kết "Báo sai" tới `#/dinh-chinh/<mã>`. Hồ sơ đã ẩn/gỡ theo yêu cầu (`hid.profile`, và `hid.score`) không hiển thị.
