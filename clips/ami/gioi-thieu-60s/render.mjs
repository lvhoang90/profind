import { chromium } from "/opt/node-tools/node_modules/playwright/index.mjs";
import fs from "fs";
const dir="/tmp/ami/v", FPS=30, N=60*FPS;
const arg=process.argv[2]; const tl=JSON.parse(fs.readFileSync(dir+"/tl.json")).scenes;
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium",args:["--no-sandbox","--allow-file-access-from-files"]});
const p=await(await b.newContext({viewport:{width:1080,height:1920}})).newPage();
await p.goto("file://"+dir+"/scene.built.html"); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(600);
fs.mkdirSync(dir+"/frames",{recursive:true});
if(arg==="sheet"){ // mỗi cảnh 1 ảnh ở giữa
  for(let i=0;i<tl.length;i++){const t=(tl[i].v+Math.min(tl[i].dur,4.5)*.9);await p.evaluate(t=>window.draw(t),Math.min(t,tl[i].end-.3));await p.screenshot({path:`${dir}/frames/sheet${String(i).padStart(2,"0")}.png`});}
} else {
  for(let i=0;i<N;i++){await p.evaluate(t=>window.draw(t),i/FPS);await p.screenshot({path:`${dir}/frames/f${String(i).padStart(4,"0")}.jpg`,type:"jpeg",quality:92}); if(i%150===0)console.log("frame",i);}
}
await b.close();
