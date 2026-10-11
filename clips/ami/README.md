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
Giọng **Việt Hoàng** (Sài Gòn, `aBSlddZX2jwWE6N7Tr5X`), model **Flash v2.5** có ép `language_code` (`vi` hoặc `en`), thiết lập mặc định của giọng (Stability 0.5, Similarity 0.75, Style 0, speed 1.0, Speaker boost); khóa trong biến `ELEVENLABS_API_KEY`.
Lời gửi nguyên văn, không viết lại cách đọc (AI, PDF, APA, EduFind… giữ nguyên). Giọng đọc nhanh nên mỗi câu kết thúc sớm hơn cảnh; nếu muốn đầy lời hơn, có thể nới lại `loi-dan.md`.

```
python3 eleven.py gioi-thieu-60s            # tạo vo/s*.mp3, s*.npy, cập nhật v và dur trong tl.json
python3 eleven.py gioi-thieu-60s --only 6   # chỉ tạo lại câu 6 (xóa vo/s6.mp3 trước nếu đổi lời)
```
Sau đó: `python3 build.py` → `node render.mjs` → `python3 mix.py` → ghép bằng lệnh ffmpeg ở trên. `tts.py` (Piper) chỉ còn để thử.

## Bản tiếng Anh (giọng Việt Hoàng nói tiếng Anh)
Lời tiếng Anh nằm ở trường `en` của từng cảnh trong `tl.json` (hình giữ nguyên tiếng Việt, không phụ đề).
```
python3 eleven.py gioi-thieu-60s --lang en   # ra vo-en/, en_s*.npy, tl.en.json
python3 mix.py en                            # ra mix.en.wav
ffmpeg -framerate 30 -i frames/f%04d.jpg -i mix.en.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 60 clip.en.mp4
```

## Giọng khác (Việt Hoàng - BĐS `Q41cVOX7gNI7pCt6A3QP`, MC `QmaUyIgRDGUtoCDXqZWY`)
```
python3 eleven.py giao-su-phan-bien-60s --voice Q41cVOX7gNI7pCt6A3QP --tag bds   # ra vo-bds/, bds_s*.npy, tl.bds.json
python3 mix.py bds                                                                 # ra mix.bds.wav → ghép thành clip.bds.mp4
```

## Giáo sư phản biện v2 (`giao-su-phan-bien-v2-60s/`)
Dựng theo `giao-su-phan-bien-60s/storyboard-v2.md`: kể một đêm trước ngày bảo vệ (lạnh → ấm → sáng), 11 cảnh. `scene.html` dựng thuần DOM/canvas theo `window.draw(t)`; `mix.py <tag>` có nhạc và hiệu ứng khớp từng khoảnh khắc (nhịp tim, tia quét, đếm điểm, vỗ tay…). Lời trong `tl.json` có trường `speed` để đọc chậm các câu cảm xúc.
```
python3 build.py && node render.mjs                                  # 1800 khung
python3 ../eleven.py giao-su-phan-bien-v2-60s --voice QmaUyIgRDGUtoCDXqZWY --tag mc   # (chạy từ clips/ami)
python3 mix.py mc
ffmpeg -framerate 30 -i frames/f%04d.jpg -i mix.mc.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 60 clip.mc.mp4
```

## Giáo sư phản biện v3 (`giao-su-phan-bien-v3-60s/`) và giọng đồng nhất
Dựng theo `giao-su-phan-bien-60s/storyboard-v3-draft.md` ("Quay ngược một đêm"). Chạy từ `clips/ami`:
```
python3 eleven.py giao-su-phan-bien-v3-60s --voice QmaUyIgRDGUtoCDXqZWY --tag mc --onetake
cd giao-su-phan-bien-v3-60s && python3 build.py && node render.mjs && python3 mix.py mc
ffmpeg -framerate 30 -i frames/f%04d.jpg -i mix.mc.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t 60 clip.mc.mp4
```
`--onetake`: gửi cả bài trong **một lần đọc** (các câu cách nhau `<break time="1.5s"/>`), rồi cắt theo khoảng lặng (tự thử nhiều ngưỡng, dừng nếu không ra đủ số câu). Một lần đọc giữ giọng và ngữ điệu đồng nhất từ đầu tới cuối; đọc từng câu riêng thì mỗi lần gọi có thể lệch giọng (lúc Nam, lúc Bắc). Trường `speed` < 1 trong `tl.json` làm chậm câu cảm xúc (giữ cao độ).
