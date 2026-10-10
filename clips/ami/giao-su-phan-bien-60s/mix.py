import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, lfilter
SR=44100; T=60.0; n=int(SR*T); t=np.arange(n)/SR
tl=json.load(open('tl.json'))['scenes']; S=lambda i:tl[i]['start']
rng=np.random.default_rng(11)
def put(buf,x,t0,g=1.0):
    i=int(round(t0*SR))
    if i<0 or i>=len(buf): return
    x=x[:len(buf)-i]; buf[i:i+len(x)]+=x*g
def tt(d): return np.arange(int(SR*d))/SR
def bp(x,lo,hi): b,a=butter(2,[lo/(SR/2),hi/(SR/2)],'band'); return lfilter(b,a,x)
def hp(x,fc): b,a=butter(2,fc/(SR/2),'high'); return lfilter(b,a,x)
def lp(x,fc): b,a=butter(2,fc/(SR/2),'low'); return lfilter(b,a,x)
vo=np.zeros(n)
for i,s in enumerate(tl):
    a=np.load(f's{i+1}.npy'); a=a.astype(np.float64); a/=max(1e-6,np.max(np.abs(a))); put(vo,a,s['v'],.95)
b,a_=butter(2,90/(SR/2),'high'); vo=lfilter(b,a_,vo); vo=np.tanh(vo*1.6)/1.25
M=lambda m:440*2**((m-69)/12)
def whoosh(d=.5,g=.35): x=tt(d); nz=rng.standard_normal(len(x)); f=300*(7000/300)**(x/d); return bp(nz,300,9000)*np.sin(np.pi*x/d)**2*(.6+.4*np.sin(2*np.pi*np.cumsum(f)/SR))*g
def riser(d): x=tt(d); nz=rng.standard_normal(len(x)); f=200*(9000/200)**((x/d)**2); return (hp(nz,1500)*(x/d)**2*.5+np.sin(2*np.pi*np.cumsum(f)/SR)*(x/d)**3*.25)
def boom(d=2.2): x=tt(d); return (np.sin(2*np.pi*np.cumsum(38+90*np.exp(-x*9))/SR)*np.exp(-x*1.7)*1.1+lp(rng.standard_normal(len(x)),600)*np.exp(-x*6)*.8)
def kick(): x=tt(.3); return np.sin(2*np.pi*np.cumsum(50+110*np.exp(-x*30))/SR)*np.exp(-x*11)
def thump(): x=tt(.35); return np.sin(2*np.pi*np.cumsum(46+60*np.exp(-x*25))/SR)*np.exp(-x*9)
def ding(f=1318.5,d=1.2,g=.35): x=tt(d); return (np.sin(2*np.pi*f*x)*np.exp(-x*5)+.4*np.sin(2*np.pi*f*2.01*x)*np.exp(-x*9)+.2*np.sin(2*np.pi*f*3.02*x)*np.exp(-x*14))*g
def pop(f=640,d=.14): x=tt(d); return np.sin(2*np.pi*np.cumsum(f*(1+np.exp(-x*55)))/SR)*np.exp(-x*28)*.5
def tick(f=2400): x=tt(.03); return np.sin(2*np.pi*f*x)*np.exp(-x*120)*.3
def pluck(f,d=.6,g=.25): x=tt(d); s=sum(np.sin(2*np.pi*f*k*x+k)*(1/k**1.3)*np.exp(-x*(4+2.5*k)) for k in range(1,7)); return s*np.minimum(1,x/.003)*g
def pad(f,d,g): x=tt(d); e=np.minimum(1,x/1.8)*np.minimum(1,(d-x)/1.8); return (np.sin(2*np.pi*f*x)+.5*np.sin(2*np.pi*f*2.003*x)+.35*np.sin(2*np.pi*f*.5*x)+.2*np.sin(2*np.pi*f*3.01*x))*e*g
def chime(f,d=2.5,g=.25): x=tt(d); return sum(a*np.sin(2*np.pi*f*r*x)*np.exp(-x*dc) for r,a,dc in((1,1,1.8),(2,.45,2.6),(3,.25,3.4),(4.2,.12,5)))*g
mus=np.zeros(n); sfx=np.zeros(n)
# trống nền: drone Am dưới mọi cảnh, dâng dần
for k in range(0,60,6): put(mus,pad(M(33),8,.13),k,1); put(mus,pad(M(40),8,.08),k,1)
# cảnh 0: tim đập (lub-dub) 66 nhịp/phút, tăng dần
for k in range(int(S(1)/0.9)+1):
    t0=k*.9+.4
    if t0<S(1)-.3: g=.5+.6*(t0/S(1)); put(sfx,thump(),t0,g); put(sfx,thump(),t0+.22,g*.6)
# riser dẫn vào tựa đề + va chạm
put(sfx,riser(2.3),S(1)-2.2,.9); put(sfx,boom(),S(1)+.02,1.0); put(sfx,ding(1760,2,.25),S(1)+.1,1); put(sfx,chime(M(81),3,.22),S(1)+.4,1)
# nhạc chính từ cảnh 2: Am F C G, 100 nhịp/phút
prog=[(57,60,64,67),(53,57,60,65),(48,52,55,60),(55,59,62,67)]; bar=60/100*4
k=0;t0=S(2)
while t0<T:
    ch=prog[k%4]; inten=min(1,(t0-S(2))/20+.35)
    for m in ch: put(mus,pad(M(m-12),bar+1.4,.05*inten+.02),t0,1)
    for j in range(16): put(mus,pluck(M(ch[j%4]+12+(12 if j%8>=4 else 0)),.45,.2*inten),t0+j*bar/16,1.0 if j%4==0 else .55)
    put(mus,pluck(M(ch[0]-12),1.0,.5),t0,1)
    if t0>=S(3)-.2:
        for b4 in range(4): put(sfx,kick(),t0+b4*bar/4,.55*inten)
        for b8 in range(8): put(sfx,tick(6000)*0.4,t0+b8*bar/8+bar/16,.5*inten)
    k+=1; t0+=bar
# SFX theo cảnh
for i in range(1,len(tl)):
    if i!=1: put(sfx,whoosh(.45),S(i)-.1,.9); put(sfx,pop(),S(i)+.3,.8)
for j in range(24): put(sfx,tick(2000+(j%4)*300),S(3)+.5+j*.15,1.0)               # đọc toàn văn
put(sfx,ding(1568),S(4)+4.05,1.2); put(sfx,thump(),S(4)+4.0,1.0)                   # dấu đối chiếu
put(sfx,ding(1318.5,1.5,.45),S(5)+2.6,1.2)                                         # điểm 72
put(sfx,boom(1.4),S(5)+6.3,.5); put(sfx,ding(440,1,.4),S(5)+6.6,1)                 # lỗi nghiêm trọng
put(sfx,pop(880),S(7)+2.05,1.2); put(sfx,ding(1760),S(7)+2.5,.8); put(sfx,pop(700),S(7)+3.1,1)  # +, tổng, tải
for j in range(30): put(sfx,ding(900+(j%6)*140,.35,.15),S(8)+.5+j*.087,1)            # 30 bài lần lượt
put(sfx,ding(1318.5,1.2,.5),S(8)+3.5,1)
for q in range(3): put(sfx,ding(1046.5*(1+q*.25),1.0,.4),S(10)+.9+q*1.4,1)         # 3 bước
put(sfx,chime(M(84),3,.3),S(10)+5.2,1)                                              # mở khóa
# kết: hợp âm lên
put(sfx,boom(2.5),S(11),.7)
for m in (57,64,69,72,76): put(mus,pad(M(m),6.5,.09),S(11),1)
put(sfx,chime(M(88),3,.3),S(11)+1.2,1)
env=np.abs(vo); w=int(SR*.3); env=np.convolve(env,np.ones(w)/w,'same'); duck=1-.6*np.clip(env*7,0,1)
fade=np.minimum(1,np.minimum(t/.6,(T-t)/1.8))
mus*=duck*fade*.8; sfx*=(1-.35*np.clip(env*7,0,1))
mix=vo+mus+sfx*.85
mix=np.tanh(mix*1.15)/1.0
pk=np.max(np.abs(mix)); mix=mix/max(1,pk/.92)
sf.write('mix.wav',mix.astype(np.float32),SR); print('ok',pk)
