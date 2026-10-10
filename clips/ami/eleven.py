"""Tạo lời đọc ElevenLabs (giọng Việt Hoàng, Sài Gòn) cho một clip Ami.
Dùng: python3 eleven.py <thư mục clip> [--only 1,2,3] [--lang en]   (--lang en: đọc trường "en", ra vo-en/, en_s*.npy, tl.en.json)
Đọc <thư mục>/tl.json, gửi từng câu (đã viết lại cách đọc), cắt khoảng lặng, ép nhanh tối đa 1.15 nếu câu dài hơn cảnh,
ghi <thư mục>/s1.npy… (44,1 kHz), <thư mục>/vo/s*.mp3 và cập nhật `v`, `dur` trong tl.json. Khóa: biến ELEVENLABS_API_KEY."""
import sys, os, json, re, subprocess, urllib.request, numpy as np, soundfile as sf
VOICE = "aBSlddZX2jwWE6N7Tr5X"   # Việt Hoàng (vi-southern)
SETTINGS = {"stability": 0.40, "similarity_boost": 0.80, "style": 0.40, "use_speaker_boost": True, "speed": 1.15}
SR = 44100; LEAD = 0.3; MAXSPEED = 1.15
RESPELL = [  # thử và chỉnh theo tai nghe
    (r"\bA I\b", "ây ai"), (r"\bP D F\b", "pi đi ép"), (r"\bA P A\b", "ây pi ây"), (r"\bI triple E\b", "ai tờ ri pồ i"),
    (r"\bAmi\b", "A mi"), (r"\bEduFind\b", "E đu phai"), (r"\bProFind\b", "Pờ rô phai"), (r"\bWord\b", "Quớt"),
    (r"\bHarvard\b", "Ha vớt"), (r"\bVancouver\b", "Van cu vờ"),
]
def spoken(t):
    for p, r in RESPELL: t = re.sub(p, r, t)
    return t
d = sys.argv[1]; only = None
LANG = sys.argv[sys.argv.index("--lang") + 1] if "--lang" in sys.argv else "vi"
SUF = "" if LANG == "vi" else "." + LANG; VO = "vo" if LANG == "vi" else "vo-" + LANG; PFX = "" if LANG == "vi" else LANG + "_"
if "--only" in sys.argv: only = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",")}
key = os.environ["ELEVENLABS_API_KEY"]
tlp = os.path.join(d, "tl" + SUF + ".json"); tl = json.load(open(tlp if os.path.exists(tlp) else os.path.join(d, "tl.json"), encoding="utf-8"))
os.makedirs(os.path.join(d, VO), exist_ok=True)
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse"
def conv(src, dst, speed):
    tempo = f",atempo={speed:.3f}" if speed > 1.001 else ""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", f"{TRIM}{tempo},highpass=f=80,loudnorm=I=-16:TP=-1.5", "-ar", str(SR), "-ac", "1", dst], check=True)
    a, _ = sf.read(dst); return a
for i, sc in enumerate(tl["scenes"], 1):
    if only and i not in only: continue
    mp3 = os.path.join(d, VO, f"s{i}.mp3")
    if not (os.path.exists(mp3) and os.path.getsize(mp3) > 1000):
        body = json.dumps({"text": spoken(sc["text"]) if LANG == "vi" else sc[LANG], "model_id": "eleven_multilingual_v2", "voice_settings": SETTINGS}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128", body, {"Content-Type": "application/json", "xi-api-key": key})
        open(mp3, "wb").write(urllib.request.urlopen(req).read())
    wav = os.path.join(d, VO, f"s{i}.wav")
    a = conv(mp3, wav, 1.0); dur = len(a) / SR
    room = sc["end"] - sc["start"] - LEAD - 0.1
    if dur > room:
        a = conv(mp3, wav, min(MAXSPEED, dur / room + 0.01)); dur = len(a) / SR
    np.save(os.path.join(d, f"{PFX}s{i}.npy"), a.astype(np.float32))
    sc["v"] = round(sc["start"] + LEAD, 2); sc["dur"] = round(dur, 2)
    print(i, f"{dur:.2f}s / {room:.2f}s", "VƯỢT cảnh" if dur > room else "ok")
tl["sr"] = SR; json.dump(tl, open(tlp, "w"), ensure_ascii=False, indent=1)
