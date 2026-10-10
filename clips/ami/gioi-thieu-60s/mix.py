import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, lfilter
SR=44100; T=60.0; n=int(SR*T); t=np.arange(n)/SR
tl=json.load(open('/tmp/ami/v/tl.json'))['scenes']
rng=np.random.default_rng(7)
def put(buf,x,t0,g=1.0):
    i=int(round(t0*SR)); 
    if i<0 or i>=len(buf): return
    x=x[:len(buf)-i]; buf[i:i+len(x)]+=x*g
vo=np.zeros(n)
for i,s in enumerate(tl):
    a=np.load(f's{i+1}.npy'); a=resample_poly(a,2,1).astype(np.float64)   # 22050 -> 44100
    a/= max(1e-6,np.max(np.abs(a))); put(vo,a,s['v'],0.95)
# giọng: lọc cao nhẹ + nén mềm
b,a_=butter(2,90/(SR/2),'high'); vo=lfilter(b,a_,vo); vo=np.tanh(vo*1.6)/1.25
def tt(d): return np.arange(int(SR*d))/SR
def bp(x,lo,hi): b,a=butter(2,[lo/(SR/2),hi/(SR/2)],'band'); return lfilter(b,a,x)
def hp(x,fc): b,a=butter(2,fc/(SR/2),'high'); return lfilter(b,a,x)
def whoosh(d=.5): x=tt(d); nz=rng.standard_normal(len(x)); f=300*(7000/300)**(x/d); return bp(nz,300,9000)*np.sin(np.pi*x/d)**2*(.6+.4*np.sin(2*np.pi*np.cumsum(f)/SR))*.35
def pop(f=640,d=.14): x=tt(d); return np.sin(2*np.pi*np.cumsum(f*(1+1.0*np.exp(-x*55))/1)/SR)*np.exp(-x*28)*.5
def ding(f=1318.5,d=1.0): x=tt(d); return (np.sin(2*np.pi*f*x)*np.exp(-x*5)+.4*np.sin(2*np.pi*f*2.01*x)*np.exp(-x*9))*.35
def pluck(f,d=.7): x=tt(d); s=sum(np.sin(2*np.pi*f*k*x+k)*(1/k**1.3)*np.exp(-x*(4+2.5*k)) for k in range(1,7)); return s*np.minimum(1,x/.003)*.25
def pad(f,d,g): x=tt(d); e=np.minimum(1,x/1.6)*np.minimum(1,(d-x)/1.6); return (np.sin(2*np.pi*f*x)+.5*np.sin(2*np.pi*f*2.002*x)+.3*np.sin(2*np.pi*f*.5*x))*e*g
sfx=np.zeros(n)
for i,s in enumerate(tl):
    if i>0: put(sfx,whoosh(.45),s['start']-.1,.9); put(sfx,pop(),s['start']+.3,.8)
put(sfx,ding(),tl[4]['start']+2.6,1.0)           # điểm 87
put(sfx,ding(1568),tl[5]['start']+4.4,.9)        # khớp nguyên văn
put(sfx,pop(880),tl[6]['start']+4.2,1.2); put(sfx,ding(1760),tl[6]['start']+4.4,.8)   # sao chép
put(sfx,ding(1046.5),tl[11]['start']+1.3,.9)
mus=np.zeros(n)
M=lambda m:440*2**((m-69)/12)
prog=[(57,60,64,67),(53,57,60,65),(48,52,55,60),(55,59,62,67)]    # Am7 Fmaj7 C G
bar=60/96*4
for k in range(int(T/bar)+1):
    ch=prog[k%4]; t0=k*bar
    for m in ch: put(mus,pad(M(m-12),bar+1.2,.045),t0,1)
    for j in range(8): put(mus,pluck(M(ch[j%4]+12),.55),t0+j*bar/8,1.0 if j%2==0 else .6)
    put(mus,pluck(M(ch[0]-12),.9),t0,1.4)
env=np.abs(vo); w=int(SR*.3); env=np.convolve(env,np.ones(w)/w,'same'); duck=1-.62*np.clip(env*7,0,1)
mus*=duck*np.minimum(1,np.minimum(t/1.5,(T-t)/2.5))*.75
mix=vo*1.0+mus+sfx*.8
pk=np.max(np.abs(mix)); mix=mix/max(1,pk/.9)
sf.write('mix.wav',mix.astype(np.float32),SR); print('ok',pk)
