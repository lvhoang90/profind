"""Tạo lời đọc ElevenLabs (giọng Việt Hoàng, Sài Gòn) cho một clip Ami.
Dùng: python3 eleven.py <thư mục clip> [--only 1,2,3] [--lang en] [--voice <id> --tag <tên>]   (--lang en: đọc trường "en", ra vo-en/, en_s*.npy, tl.en.json)
Đọc <thư mục>/tl.json, gửi từng câu (nguyên văn), cắt khoảng lặng, ép nhanh tối đa 1.15 nếu câu dài hơn cảnh,
ghi <thư mục>/s1.npy… (44,1 kHz), <thư mục>/vo/s*.mp3 và cập nhật `v`, `dur` trong tl.json. Khóa: biến ELEVENLABS_API_KEY."""
import sys, os, json, subprocess, urllib.request, numpy as np, soundfile as sf
VOICE = "aBSlddZX2jwWE6N7Tr5X"   # Việt Hoàng (vi-southern)
MODEL = "eleven_flash_v2_5"   # ép language_code, đã nghe chọn
SETTINGS = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": 1.0}   # mặc định của giọng
SR = 44100; LEAD = 0.3; MAXSPEED = 1.15
def spoken(t): return t   # gửi nguyên văn, không viết lại cách đọc
d = sys.argv[1]; only = None
LANG = sys.argv[sys.argv.index("--lang") + 1] if "--lang" in sys.argv else "vi"
if "--voice" in sys.argv: VOICE = sys.argv[sys.argv.index("--voice") + 1]   # giọng khác, kèm --tag để ra tệp riêng
TAG = sys.argv[sys.argv.index("--tag") + 1] if "--tag" in sys.argv else ("" if LANG == "vi" else LANG)
SUF = "." + TAG if TAG else ""; VO = "vo-" + TAG if TAG else "vo"; PFX = TAG + "_" if TAG else ""
if "--only" in sys.argv: only = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")}
key = os.environ["ELEVENLABS_API_KEY"]
tlp = os.path.join(d, "tl" + SUF + ".json"); tl = json.load(open(tlp if os.path.exists(tlp) else os.path.join(d, "tl.json"), encoding="utf-8"))
os.makedirs(os.path.join(d, VO), exist_ok=True)
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse"
def conv(src, dst, speed):
    tempo = f",atempo={speed:.3f}" if abs(speed - 1) > 1e-3 else ""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", f"{TRIM}{tempo},highpass=f=80,loudnorm=I=-16:TP=-1.5", "-ar", str(SR), "-ac", "1", dst], check=True)
    a, _ = sf.read(dst); return a
ONETAKE = "--onetake" in sys.argv
if ONETAKE:   # cả bài trong MỘT lần đọc để giọng và ngữ điệu đồng nhất, rồi cắt theo khoảng lặng
    import librosa
    one = os.path.join(d, VO, "onetake.mp3"); texts = [spoken(sc["text"]) if LANG == "vi" else sc["en"] for sc in tl["scenes"]]
    if not (os.path.exists(one) and os.path.getsize(one) > 1000):
        body = json.dumps({"text": ' <break time="1.5s" /> '.join(texts), "model_id": MODEL, "language_code": LANG, "voice_settings": SETTINGS}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128", body, {"Content-Type": "application/json", "xi-api-key": key})
        data = urllib.request.urlopen(req).read(); open(one, "wb").write(data)
    y, _ = librosa.load(one, sr=SR); segs = None
    for db in (38, 34, 42, 30, 46):
        iv = librosa.effects.split(y, top_db=db, frame_length=2048, hop_length=512); m = []
        for a, b in iv:
            if m and (a - m[-1][1]) / SR < 0.9: m[-1][1] = b
            else: m.append([a, b])
        if len(m) == len(texts): segs = m; break
    if segs is None: sys.exit(f"Không cắt được đúng {len(texts)} đoạn (ra {len(m)}); thử tăng khoảng nghỉ.")
    for i, (a, b) in enumerate(segs, 1):
        sf.write(os.path.join(d, VO, f"s{i}.raw.wav"), y[max(0, a - int(.05 * SR)):b + int(.08 * SR)], SR)
for i, sc in enumerate(tl["scenes"], 1):
    if only and i not in only: continue
    mp3 = os.path.join(d, VO, f"s{i}.raw.wav" if ONETAKE else f"s{i}.mp3")
    if not ONETAKE and not (os.path.exists(mp3) and os.path.getsize(mp3) > 1000):
        body = json.dumps({"text": spoken(sc["text"]) if LANG == "vi" else sc[LANG], "model_id": MODEL, "language_code": LANG, "voice_settings": {**SETTINGS, **({"speed": sc["speed"]} if "speed" in sc else {})}}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128", body, {"Content-Type": "application/json", "xi-api-key": key})
        open(mp3, "wb").write(urllib.request.urlopen(req).read())
    wav = os.path.join(d, VO, f"s{i}.wav")
    base = sc["speed"] if ONETAKE and sc.get("speed", 1) < 1 else 1.0   # câu cảm xúc đọc chậm lại (giữ cao độ)
    a = conv(mp3, wav, base); dur = len(a) / SR
    room = sc["end"] - sc["start"] - LEAD - 0.1
    if dur > room:
        a = conv(mp3, wav, base * min(MAXSPEED, dur / room + 0.01)); dur = len(a) / SR
    np.save(os.path.join(d, f"{PFX}s{i}.npy"), a.astype(np.float32))
    sc["v"] = round(sc["start"] + LEAD, 2); sc["dur"] = round(dur, 2)
    print(i, f"{dur:.2f}s / {room:.2f}s", "VƯỢT cảnh" if dur > room else "ok")
tl["sr"] = SR; json.dump(tl, open(tlp, "w"), ensure_ascii=False, indent=1)
