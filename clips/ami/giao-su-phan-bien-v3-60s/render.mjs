import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const dir=path.dirname(fileURLToPath(import.meta.url)), FPS=30, N=60*FPS;
const arg=process.argv[2]; const tl=JSON.parse(fs.readFileSync(dir+"/tl.json")).scenes;
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium",args:["--no-sandbox","--allow-file-access-from-files"]});
const p=await(await b.newContext({viewport:{width:1080,height:1920}})).newPage();
await p.goto("file://"+dir+"/scene.built.html"); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
fs.mkdirSync(dir+"/frames",{recursive:true});
if(arg==="sheet"){ // mỗi cảnh 1 ảnh (u = giây trong cảnh, mặc định ~65% độ dài cảnh)
  for(let i=0;i<tl.length;i++){const t=tl[i].start+(tl[i].end-tl[i].start)*.65;await p.evaluate(t=>window.draw(t),t);await p.screenshot({path:`${dir}/frames/sheet${String(i).padStart(2,"0")}.png`});}
} else {
  for(let i=0;i<N;i++){await p.evaluate(t=>window.draw(t),i/FPS);await p.screenshot({path:`${dir}/frames/f${String(i).padStart(4,"0")}.jpg`,type:"jpeg",quality:92}); if(i%150===0)console.log("frame",i);}
}
await b.close();
