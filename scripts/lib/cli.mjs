// Tiện ích dùng chung cho script: đọc tham số dòng lệnh, địa chỉ liên hệ gửi cho OpenAlex/Crossref ("polite pool"), thư mục tạm.
import os from "node:os";
import path from "node:path";
/** --khóa giá trị -> giá trị, hoặc mặc định d. */
export const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
/** Địa chỉ liên hệ khi gọi API công khai: đặt bằng biến môi trường CONTACT_MAILTO (hoặc --mailto ở từng script). */
export const MAILTO = process.env.CONTACT_MAILTO ?? "luongviethoang.safi@gmail.com";
/** Đường dẫn tệp tạm theo hệ điều hành (thay cho "/tmp/..." cứng). */
export const tmpFile = (name) => path.join(os.tmpdir(), name);
