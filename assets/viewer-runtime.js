// This file is combined with the model and geometry by scripts/build-preview.py.
// Classic script: no imports, fetch requests, or WebGL are required.
function mountViewer(host,fallback,{hero=false,softwareOnly=false}={}){
 if(!softwareOnly&&mountStudio(host,fallback,{hero}))return;
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 canvas.className='robot-canvas';canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label',hero?'Animated three-dimensional Hyperdrive chassis. Drag to rotate.':'Interactive Hyperdrive chassis. Drag to rotate, or use the rotation, assembly and wireframe controls.');
 host.append(canvas);fallback.style.display='none';host.classList.add('has-3d');
 if(!hero)document.querySelector('#render-status').textContent='LIVE 3D · 179 COMPONENTS';
 let w=0,h=0,yaw=.55,pitch=.56,visible=true,drag=false,x=0,y=0,previous=0,frames=0;
 const rotate=document.querySelector('#rotate'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(!hero){rotate.min=-180;rotate.max=180;rotate.value=32;rotate.setAttribute('aria-label','Orbit Hyperdrive chassis');rotate.addEventListener('input',()=>yaw=Number(rotate.value)*Math.PI/180);}
 new ResizeObserver(()=>{w=host.clientWidth;h=host.clientHeight;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);}).observe(host);
 new IntersectionObserver(e=>visible=e[0].isIntersecting,{rootMargin:'80px'}).observe(host);
 canvas.onpointerdown=e=>{drag=true;x=e.clientX;y=e.clientY;canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(!drag)return;yaw+=(e.clientX-x)*.009;pitch=Math.max(.15,Math.min(1.1,pitch+(e.clientY-y)*.004));x=e.clientX;y=e.clientY;if(!hero)rotate.value=Math.round(yaw*180/Math.PI);};
 canvas.onpointerup=canvas.onpointercancel=()=>drag=false;
 let lastPolygons=[],pointerDown=null;
 if(!hero){
  document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{const pose={perspective:[.55,.56],front:[0,.18],top:[0,1.52],side:[Math.PI/2,.18]}[button.dataset.camera];[yaw,pitch]=pose;rotate.value=Math.round(yaw*180/Math.PI);document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
  canvas.addEventListener('pointerdown',e=>pointerDown=[e.clientX,e.clientY]);
  canvas.addEventListener('pointerup',e=>{
   if(!pointerDown||Math.hypot(e.clientX-pointerDown[0],e.clientY-pointerDown[1])>6)return;
   const bounds=canvas.getBoundingClientRect(),x=e.clientX-bounds.left,y=e.clientY-bounds.top;
   const inside=points=>{let found=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [xi,yi]=points[i],[xj,yj]=points[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)found=!found;}return found;};
   const hit=[...lastPolygons].reverse().find(p=>inside(p.points));document.querySelector('#component-info').textContent=hit?hit.name+' / '+hit.system:'Click any component to identify it';
  });
 }
 let heroPaused=false;const toggle=document.querySelector('#hero-orbit');
 if(hero)toggle.addEventListener('click',()=>{heroPaused=!heroPaused;toggle.textContent=heroPaused?'RESUME ROTATION ▷':'PAUSE ROTATION Ⅱ';toggle.setAttribute('aria-pressed',String(heroPaused));});
 function render(time){
  requestAnimationFrame(render);
  if(!visible||document.hidden||time-previous<40||!w||!h)return;
  const dt=Math.min((time-previous)/1000,.06);previous=time;
  const frozen=document.body.classList.contains('paused')||reduced.matches;
  if(hero&&!frozen&&!heroPaused&&!drag)yaw+=dt*.22;
  const separation=hero?0:Number(host.dataset.separation||0);
  const view={yaw,pitch,width:w,height:h,scale:hero?.93:1,distance:8+separation*9};
  const focus=hero?'all':host.dataset.system||'all';
  const wire=!hero&&document.querySelector('#wire').getAttribute('aria-pressed')==='true';
  ctx.globalAlpha=1;ctx.clearRect(0,0,w,h);
  if(!hero){
   const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#141418');bg.addColorStop(.5,'#24242a');bg.addColorStop(1,'#0d0d11');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
   ctx.lineWidth=.6;ctx.strokeStyle='#ffffff06';
   for(let i=0;i<w;i+=36){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke();}
   for(let i=0;i<h;i+=36){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(w,i);ctx.stroke();}
  }
  // Soft contact shadow grounds the assembled chassis and fades during disassembly.
  ctx.save();ctx.translate(w*.5,h*.77);ctx.scale(1,.21);
  const shadow=ctx.createRadialGradient(0,0,2,0,0,w*.3);shadow.addColorStop(0,'rgba(0,0,0,'+(.6-separation*.3)+')');shadow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shadow;ctx.fillRect(-w*.35,-w*.35,w*.7,w*.7);ctx.restore();
  const scene=polygonsFor(parts,separation,view);
  const polygons=fitPolygons(focus==='all'?scene:scene.filter(p=>p.system===focus),w,h,hero?Math.max(60,w*.1):Math.max(38,Math.min(w,h)*.08));
  const zoom=hero?1:Number(document.querySelector('#zoom').value)/100;
  lastPolygons=polygons.map(poly=>({...poly,points:poly.points.map(([x,y,z])=>[w/2+(x-w/2)*zoom,h/2+(y-h/2)*zoom,z])}));
  const xray=!hero&&document.querySelector('#xray').getAttribute('aria-pressed')==='true';
  for(const {points,color,alpha,name,system,material} of lastPolygons){
   const selected=focus==='all'||focus===system;
   ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
   if(!wire){ctx.globalAlpha=(selected?1:.065)*alpha*(xray?.16:1);ctx.fillStyle='rgb('+color.join(',')+')';ctx.fill();}
   ctx.globalAlpha=(selected?1:.08)*(wire?.8:material==='glass'?.55:material==='metal'?.16:.10);
   ctx.strokeStyle=wire?(selected?'#ff5478':'#71334b'):material==='glass'?'#cce4ef':material==='rubber'?'#303238':'#b2bac0';ctx.lineWidth=wire?.55:material==='glass'?.65:.25;ctx.stroke();
  }
  host.dataset.renderedSeparation=separation.toFixed(3);
  ctx.globalAlpha=1;frames++;if(frames%15===0)host.dataset.frames=frames;
 }
 requestAnimationFrame(render);
}
mountViewer(document.querySelector('.hero-art'),document.querySelector('.hero-robot'),{hero:true});
mountViewer(document.querySelector('#lab-stage'),document.querySelector('#lab-robot'));

// Video controls initialize separately from either renderer.
const video=document.querySelector('#simulation-video'),videoScreen=document.querySelector('.sim-screen');
document.querySelector('.sim-note a[download]').href=video.querySelector('source').src;
const start=document.querySelector('#video-start'),playback=document.querySelector('#playback-status');
let requestId=0;
function ready(){
 if(video.readyState>=1)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(new Error('The video is taking too long to load.')),15000);
  const loaded=()=>finish(),error=()=>finish(new Error('The video could not be loaded.'));
  function finish(err){clearTimeout(timer);video.removeEventListener('loadedmetadata',loaded);video.removeEventListener('error',error);err?reject(err):resolve();}
  video.addEventListener('loadedmetadata',loaded,{once:true});video.addEventListener('error',error,{once:true});
  if(video.networkState===3||video.error)video.load();
 });
}
async function playClip(at){
 const id=++requestId;playback.textContent='Loading the simulation…';start.disabled=true;
 try{
  await ready();if(id!==requestId)return;
  if(Number.isFinite(at))video.currentTime=Math.min(at,Math.max(0,video.duration-.1));
  await video.play();playback.textContent='Playing · 720p · silent';
 }catch(error){playback.textContent='Use the video’s play button, or download the MP4 below. '+error.message;}
 finally{start.disabled=false;}
}
start.addEventListener('click',()=>playClip(video.ended?0:undefined));
document.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>playClip(Number(button.dataset.chapter))));
video.addEventListener('playing',()=>{videoScreen.classList.add('is-playing');playback.textContent='Playing · 720p · silent';});
video.addEventListener('pause',()=>{videoScreen.classList.remove('is-playing');start.textContent=video.ended?'REPLAY SIMULATION ↻':'CONTINUE SIMULATION ▷';if(!video.ended)playback.textContent='Paused';});
video.addEventListener('ended',()=>{videoScreen.classList.remove('is-playing');start.textContent='REPLAY SIMULATION ↻';playback.textContent='Finished · choose a chapter or replay';});
video.addEventListener('error',()=>{videoScreen.classList.remove('is-playing');playback.textContent='Video unavailable. Extract the entire ZIP, including the assets folder, or open Titan-Forge-Preview.html.';});
video.addEventListener('timeupdate',()=>{
 document.querySelector('#sim-time').textContent=video.currentTime.toFixed(1)+' / '+(Number.isFinite(video.duration)?video.duration.toFixed(1):'18.0')+'s';
 document.querySelectorAll('[data-chapter]').forEach((b,i)=>{const on=Math.min(2,Math.floor(video.currentTime/6))===i;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&!video.paused)video.pause();},{threshold:0}).observe(video);
document.querySelector('#motion').addEventListener('click',()=>{if(document.body.classList.contains('paused'))video.pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
