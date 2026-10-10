# Clip Ami (nguồn dựng)

Hai clip dọc 1080×1920, 30 khung/giây, 60 giây, tiếng Việt, không phụ đề:

| Thư mục | Nội dung |
|---|---|
| `gioi-thieu-60s/` | Giới thiệu Ami: nhập tóm tắt, chấm điểm, đoạn trích, trích dẫn, riêng tư, Giáo sư phản biện, hệ sinh thái |
| `giao-su-phan-bien-60s/` | Tính năng cao cấp "Giáo sư phản biện" |

Nội dung lấy từ trang công khai của Ami (aaa.isavietnam.app, trang hướng dẫn). Tên, điểm và câu hỏi trong clip là dữ liệu minh họa.

## Tệp trong mỗi thư mục
- `scene.html`: toàn bộ hình ảnh, hàm `window.draw(t)` vẽ khung hình tại giây `t`. Có chỗ giữ `__TL__` và `__QR__`.
- `tl.json`: mốc thời gian từng cảnh (`start`, `end`, `v` là giây bắt đầu lời đọc, `dur` là độ dài câu đọc).
- `build.py`: ghép `tl.json` và `qr.svg` vào `scene.html`, ra `scene.built.html`.
- `render.mjs`: Playwright chụp 1800 khung (`frames/f0000.jpg`…); `node render.mjs sheet` chụp mỗi cảnh một ảnh để xem nhanh.
- `tts.py`: bản dùng giọng máy Piper (chỉ để thử; chất lượng kém, đã quyết định thay bằng ElevenLabs).
- `mix.py`: nhạc nền và hiệu ứng tổng hợp bằng numpy/scipy, hạ nhạc khi có lời; đọc `s1.npy…` (lời từng câu).
- `loi-dan.md`: lời dẫn từng câu và giây bắt đầu.

## Dựng lại
Các tập lệnh đang trỏ vào `/tmp/ami/{v,a}` (clip giới thiệu) và `/tmp/gs/{v,a}` (Giáo sư phản biện); đổi đường dẫn cho khớp chỗ đặt tệp. Phông Inter cài trong hệ thống. Trình tự: `python3 build.py` → `node render.mjs` → tạo lời đọc → `python3 mix.py` → ghép:

```
ffmpeg -framerate 30 -i frames/f%04d.jpg -i mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 60 clip.mp4
```

## Giọng ElevenLabs (đã làm)
Giọng **Việt Hoàng** (Sài Gòn, `aBSlddZX2jwWE6N7Tr5X`), Multilingual v2, Stability 40%, Similarity 80%, Style 40%, speed 1.15, Speaker boost; khóa trong biến `ELEVENLABS_API_KEY`.
Giọng này đọc chậm hơn giọng máy nên lời dẫn đã rút gọn cho vừa từng cảnh (xem `loi-dan.md`).

```
python3 eleven.py gioi-thieu-60s            # tạo vo/s*.mp3, s*.npy, cập nhật v và dur trong tl.json
python3 eleven.py gioi-thieu-60s --only 6   # chỉ tạo lại câu 6 (xóa vo/s6.mp3 trước nếu đổi lời)
```
Từ tiếng Anh được viết lại cách đọc trong `eleven.py` (bảng `RESPELL`); chỉnh bảng đó nếu nghe chưa đúng. Sau đó: `python3 build.py` → `node render.mjs` → `python3 mix.py` → ghép bằng lệnh ffmpeg ở trên. `tts.py` (Piper) chỉ còn để thử.

## Bản tiếng Anh (giọng Việt Hoàng nói tiếng Anh)
Lời tiếng Anh nằm ở trường `en` của từng cảnh trong `tl.json` (hình giữ nguyên tiếng Việt, không phụ đề).
```
python3 eleven.py gioi-thieu-60s --lang en   # ra vo-en/, en_s*.npy, tl.en.json
python3 mix.py en                            # ra mix.en.wav
ffmpeg -framerate 30 -i frames/f%04d.jpg -i mix.en.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 60 clip.en.mp4
```
