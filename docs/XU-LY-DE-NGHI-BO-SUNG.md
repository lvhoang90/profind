# Xử lý đề nghị bổ sung nhà nghiên cứu

Người dùng gửi "Đề nghị bổ sung nhà nghiên cứu" từ trang ProFind (`api/correction.js`, `kind=add`). Hệ thống chỉ gửi email báo cho quản trị viên (tiêu đề `[ProFind] Đề nghị bổ sung nhà nghiên cứu - ...`); **không tự sửa dữ liệu**. Người quản trị quyết định và xử lý. Tài liệu này là quy trình tra cứu nhanh để đưa ra đề xuất.

Khi quản trị viên gửi ảnh chụp email đề nghị cho trợ lý AI và nhờ "tra đề nghị này", trợ lý làm đúng các bước dưới đây rồi báo kết quả. Trợ lý **không** tự thêm hồ sơ, không gửi thư cho người gửi và không sửa dữ liệu; chỉ đề xuất.

## Các bước tra

1. **Đã có trong ProFind chưa.** Tìm trong `public/data/suggest.json` (mỗi dòng của `a`: mã, tên, đơn vị, số công trình, trích dẫn, năm gần nhất, ORCID ở vị trí thứ 7, ...). Tìm theo ORCID trước, rồi theo tên (bỏ dấu, đảo thứ tự họ tên). Trùng ORCID thì đó là hồ sơ đã có, chỉ cần hướng dẫn người gửi bấm "Đây là hồ sơ của tôi" và xác thực.
2. **ORCID công khai** (không cần khóa): `https://pub.orcid.org/v3.0/<ORCID>/record` với `Accept: application/json`. Xem: có tồn tại không, tên có khớp người gửi không, nơi làm việc hiện tại, số nhóm công trình, Scopus Author ID, ResearcherID, từ khóa.
3. **OpenAlex** (cần khóa miễn phí `OPENALEX_API_KEY`, cách đặt ở mục dưới): `https://api.openalex.org/authors?filter=orcid:<ORCID>&api_key=...&mailto=<email quản trị>`. Xem: đã có hồ sơ tác giả chưa (mã `A...`), số công trình, trích dẫn, đơn vị hiện tại. Không có khóa thì báo rõ "chưa kiểm được OpenAlex", không đoán.
4. **Đối chiếu người gửi**: tên trong email có khớp tên trên ORCID không; email là email tổ chức (`edu`, `gov`, `ac` trong tên miền) hay cá nhân; đường dẫn Google Scholar có đúng định dạng.
5. **Đề xuất**, theo một trong các hướng:
   - **Đã có hồ sơ**: báo mã hồ sơ, hướng dẫn người gửi xác nhận và xác thực.
   - **Chưa có trong ProFind nhưng đã có trên OpenAlex**: đề xuất thêm vào dữ liệu theo quy trình trong `docs/DATA-PIPELINE.md` (nạp tác giả từ OpenAlex, dựng lại chỉ mục).
   - **Chưa có trên OpenAlex**: ProFind không tự dựng được hồ sơ từ nguồn công khai; đề xuất ghi nhận yêu cầu và trả lời người gửi.
   - **Không khớp hoặc đáng ngờ** (ORCID không tồn tại, tên không khớp, trùng người khác): đề nghị hỏi thêm, không xử lý.
6. **Thư trả lời** (nếu quản trị viên cần): ngắn, báo đã nhận và hướng xử lý. Không hứa thời hạn.

## Nguyên tắc

- Chỉ dùng dữ liệu công khai (ORCID, OpenAlex, chỉ mục ProFind). Không tra thông tin riêng tư, không dùng số điện thoại.
- Email cá nhân (Gmail…) không bao giờ tự duyệt xác thực; việc thêm hồ sơ không thay thế bước xác thực.
- Không đưa tên người thật vào ví dụ, kiểm thử hay tài liệu mô tả tính năng.
- Báo kết quả theo mẫu: *đã có/chưa có trong ProFind · ORCID · OpenAlex · khớp người gửi · đề xuất*, và nói rõ điều nào chưa kiểm được.

## Đặt khóa OpenAlex để trợ lý tra giúp

Khóa miễn phí, tạo tại <https://openalex.org/settings/api>. Tên biến thống nhất với các script nạp dữ liệu: `OPENALEX_API_KEY`.

1. Mở phiên Claude Code trên web, bấm menu môi trường ở thanh tiêu đề phiên, chọn **Edit**.
2. Thêm khóa vào mục **Network secrets** (hoặc **API credentials** ở bản cũ) nếu có; nếu không có thì thêm làm **biến môi trường** tên `OPENALEX_API_KEY`.
3. Lưu. Phiên mới sẽ đọc được khóa; phiên đang mở thì mở phiên mới.
4. **Không dán khóa vào khung chat, email hay lưu vào kho mã.**

Các script nạp dữ liệu (`scripts/ingest-openalex.mjs`, `scripts/extend-authors.mjs`, ...) cũng đọc biến này khi chạy trên máy.
