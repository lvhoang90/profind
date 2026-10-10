import json
s=open('scene.html').read()
s=s.replace('__TL__',open('tl.json').read()).replace('__QR__',open('qr.svg').read().replace('<svg ','<svg style="width:100%;height:100%" ',1))
open('scene.built.html','w').write(s)
