"""Nhạc nền + hiệu ứng cho clip Giáo sư phản biện v3 (Quay ngược một đêm).
Dùng: python3 mix.py <tag giọng>   (đọc tl.<tag>.json và <tag>_s1.npy…, ra mix.<tag>.wav)"""
import sys, json, numpy as np, soundfile as sf
from scipy.signal import butter, lfilter
tag = sys.argv[1]
SR = 44100; T = 60.0; n = int(SR * T); t = np.arange(n) / SR
tl = json.load(open(f'tl.{tag}.json'))['scenes']
rng = np.random.default_rng(11)
def put(buf, x, t0, g=1.0):
    i = int(round(t0 * SR))
    if i < 0 or i >= len(buf): return
    x = x[:len(buf) - i]; buf[i:i + len(x)] += x * g
def tt(d): return np.arange(int(SR * d)) / SR
def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def lp(x, fc): b, a = butter(2, fc / (SR / 2), 'low'); return lfilter(b, a, x)
def hp(x, fc): b, a = butter(2, fc / (SR / 2), 'high'); return lfilter(b, a, x)
M = lambda m: 440 * 2 ** ((m - 69) / 12)
# ---- giọng
vo = np.zeros(n)
for i, s in enumerate(tl):
    a = np.load(f'{tag}_s{i+1}.npy').astype(np.float64); a /= max(1e-6, np.max(np.abs(a))); put(vo, a, s['v'], .95)
vo = hp(vo, 90); vo = np.tanh(vo * 1.6) / 1.25
# ---- hiệu ứng
def whoosh(d=.5, lo=300, hi=7000): x = tt(d); nz = rng.standard_normal(len(x)); f = lo * (hi / lo) ** (x / d); return bp(nz, 300, 9000) * np.sin(np.pi * x / d) ** 2 * (.6 + .4 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * .35
def pop(f=640, d=.14): x = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.0 * np.exp(-x * 55)) / 1) / SR) * np.exp(-x * 28) * .5
def ding(f=1318.5, d=1.0): x = tt(d); return (np.sin(2 * np.pi * f * x) * np.exp(-x * 5) + .4 * np.sin(2 * np.pi * f * 2.01 * x) * np.exp(-x * 9)) * .35
def pluck(f, d=.7): x = tt(d); s = sum(np.sin(2 * np.pi * f * k * x + k) * (1 / k ** 1.3) * np.exp(-x * (4 + 2.5 * k)) for k in range(1, 7)); return s * np.minimum(1, x / .003) * .25
def pad(f, d, g): x = tt(d); e = np.minimum(1, x / 1.6) * np.minimum(1, (d - x) / 1.6); return (np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 2.002 * x) + .3 * np.sin(2 * np.pi * f * .5 * x)) * e * g
def thump(f=55, d=.5, g=1.0): x = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.6 * np.exp(-x * 30)) / 1) / SR) * np.exp(-x * 9) * g
def tick(f=2200, d=.03): x = tt(d); return np.sin(2 * np.pi * f * x) * np.exp(-x * 120) * .25
def riser(d, g=.5): x = tt(d); return bp(rng.standard_normal(len(x)), 800, 9000) * (x / d) ** 2 * g
def crowd(d, g=.3): x = tt(d); nz = bp(rng.standard_normal(len(x)), 1200, 6000); env = lp(np.abs(rng.standard_normal(len(x))), 60) * 6; return nz * np.clip(env, 0, 1) * np.minimum(1, x / .4) * np.minimum(1, (d - x) / .8) * g
sfx = np.zeros(n)
def noise_bed(d, lo, hi, g): x = tt(d); return bp(rng.standard_normal(len(x)), lo, hi) * g * np.minimum(1, x / 1.0) * np.minimum(1, (d - x) / 1.0)
# cảnh 1–2: mưa, bước chân, nhịp tim căng dần, bút đỏ đập
put(sfx, noise_bed(11.0, 2500, 9000, .10), 0.0)
for k in range(4): put(sfx, thump(70, .18, .35), 0.9 + k * .62)
tm = 6.4
while tm < 11:
    bpm = 66 + (tm - 6.4) * 9; put(sfx, thump(52, .35, .6), tm); put(sfx, thump(62, .3, .38), tm + .2); tm += 60 / bpm
for a in (6.5, 7.5, 8.6):
    put(sfx, thump(48, .8, 1.3), a); put(sfx, hp(rng.standard_normal(int(SR * .25)), 3000) * np.exp(-tt(.25) * 14) * .5, a - .05)   # nét bút + cú đập
put(sfx, riser(1.4, .5), 9.6)
# cảnh 3: tua ngược
rw = tt(4.2); rev = bp(rng.standard_normal(len(rw)), 400, 9000) * (rw / 4.2) ** 1.8 * .6; put(sfx, rev, 11.0)                    # cymbal đảo ngược dâng lên
put(sfx, noise_bed(3.3, 2500, 9000, .14), 11.0)
f_t = 4.0; tc = 11.0
while tc < 15.2:   # đồng hồ chạy lùi, tick dày dần
    put(sfx, tick(1400, .02), tc, .7); f_t = 4 + 38 * ((tc - 11) / 4.2) ** 2; tc += 1 / f_t
put(sfx, whoosh(4.0, 150, 6000), 11.0, .7)
put(sfx, thump(40, 1.4, 1.8), 15.2); put(sfx, ding(1568, 2.0), 15.25, 1.1); put(sfx, ding(2093, 1.6), 15.45, .55)
# cảnh 4–7: chức năng (dịch +3 giây so với v2)
put(sfx, whoosh(3.5, 200, 5000), 17.5, 1.0)
for a, f in zip([.45, .9, 1.35, 1.85, 2.4, 2.9], [880, 740, 988, 740, 880, 1047]): put(sfx, pop(f), 17.3 + a, .9); put(sfx, ding(f * 2, .5), 17.35 + a, .35)
put(sfx, whoosh(.9, 600, 3000), 23.9, .6); put(sfx, whoosh(1.0, 400, 2400), 25.0, .7)
put(sfx, ding(1318.5, 1.4), 26.0, 1.1); put(sfx, ding(1760, 1.0), 26.1, .6); put(sfx, thump(80, .3, .8), 26.0)
for k in range(46): put(sfx, tick(1800 + 25 * k), 29.45 + k * .056, .9)
put(sfx, lp(rng.standard_normal(int(SR * .5)), 400) * .6 * np.exp(-tt(.5) * 5), 32.7); put(sfx, thump(60, .5, 1.0), 32.7)
put(sfx, thump(40, 1.2, 1.7), 33.0); put(sfx, pop(300, .3), 33.0, .6)
for a0 in (35.4, 37.2, 39.0):
    put(sfx, whoosh(.45, 400, 3500), a0, .7); put(sfx, pop(520), a0 + .35, .6)
    for k in range(18): put(sfx, tick(900 + rng.integers(0, 400), .025), a0 + .7 + k * .05, .8)
for c in (36.9, 38.7, 40.5): put(sfx, ding(1318.5, .7), c, .7)
# cảnh 8: nắng, bước ra, mỉm cười, vỗ tay nhẹ
put(sfx, riser(1.3, .35), 41.0); put(sfx, lp(rng.standard_normal(int(SR * 1.6)), 500) * np.sin(np.pi * tt(1.6) / 1.6) * .5, 42.3)
for k in range(5): put(sfx, thump(75, .16, .28), 42.9 + k * .6)
put(sfx, ding(1568, 1.2), 45.0, .9); put(sfx, ding(2093, 1.0), 45.2, .5); put(sfx, crowd(1.9, .6), 45.3)
# cảnh 9: Word, 30 tệp, cam kết
put(sfx, pop(700), 48.1, .8)
for i in range(30): put(sfx, pop(380 + i * 14, .08), 48.0 + .5 + i * .02 + .2, .5)
put(sfx, whoosh(.5, 400, 3500), 49.6, .5); put(sfx, ding(1046.5, 1.4), 49.9, .8)
# cảnh 10
put(sfx, ding(1568, 2.0), 54.2, 1.0); put(sfx, ding(2093, 1.6), 54.35, .55); put(sfx, ding(2637, 1.4), 54.5, .35)
# ---- nhạc
mus = np.zeros(n)
for f, g in ((55, .09), (82.4, .05), (110, .04)): put(mus, pad(f, 9.5, g), 0.0)          # bè trầm lạnh
for f, g in ((55, .08), (110, .04)): put(mus, pad(f, 5.0, g), 10.8)
mus[int(SR * 15.0):int(SR * 15.35)] = 0                                                  # khựng ngay lúc bật sáng
prog = [(57, 60, 64, 67), (53, 57, 60, 65), (48, 52, 55, 60), (55, 59, 62, 67)]
bar = 60 / 96 * 4
def play(t0, t1, padg, arpg, tempo=1.0):
    b = bar / tempo; k = 0
    while 15.4 + k * b < t1:
        tb = 15.4 + k * b
        if tb >= t0:
            ch = prog[k % 4]
            for m in ch: put(mus, pad(M(m - 12), b + 1.2, padg), tb)
            for j in range(8): put(mus, pluck(M(ch[j % 4] + 12), .55 / tempo), tb + j * b / 8, arpg * (1.0 if j % 2 == 0 else .6))
            put(mus, pluck(M(ch[0] - 12), .9), tb, arpg * 1.4)
        k += 1
play(15.4, 35, .045, .8); play(35, 42, .06, 1.05); play(42, 48, .075, 1.25); play(48, 54, .05, .9)
for m in (60, 64, 67, 72): put(mus, pad(M(m), 5.2, .07), 54.0)
env = np.abs(vo); w = int(SR * .3); env = np.convolve(env, np.ones(w) / w, 'same'); duck = 1 - .62 * np.clip(env * 7, 0, 1)
mus *= duck * np.minimum(1, np.minimum(t / 1.2, (T - t) / 2.0)) * .8
mixd = vo * 1.0 + mus + sfx * .8
pk = np.max(np.abs(mixd)); mixd = mixd / max(1, pk / .9)
sf.write(f'mix.{tag}.wav', mixd.astype(np.float32), SR); print('ok', pk)
