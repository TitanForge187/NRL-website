let brushedMetalTexture,boardSurface,rubberSurface;
function boardFinish(){
 if(boardSurface)return boardSurface;
 const tile=document.createElement('canvas');tile.width=tile.height=512;const ctx=tile.getContext('2d');
 ctx.fillStyle='#224b43';ctx.fillRect(0,0,512,512);ctx.lineWidth=2;
 for(let i=0;i<24;i++){const x=24+(i*67)%460,y=24+(i*43)%460;ctx.strokeStyle=i%3?'#67876c':'#b9b58a';ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x,y);ctx.lineTo(x+24,y+24);ctx.lineTo(490,y+24);ctx.stroke();}
 for(let i=0;i<60;i++){const x=24+(i*79)%455,y=22+(i*53)%460;ctx.fillStyle='#c5c2a7';ctx.fillRect(x,y,9,4);ctx.fillRect(x+18,y,9,4);ctx.fillStyle='#17242a';ctx.fillRect(x+9,y-1,9,6);}
 ctx.strokeStyle='#e2e1cb';ctx.lineWidth=1;for(let i=0;i<5;i++)ctx.strokeRect(45+i*83,55+i*61,58,38);
 ctx.fillStyle='#dadbd0';ctx.font='16px monospace';ctx.fillText('TF / 187',24,486);
 boardSurface=new THREE.CanvasTexture(tile);boardSurface.colorSpace=THREE.SRGBColorSpace;return boardSurface;
}
function rubberFinish(){
 if(rubberSurface)return rubberSurface;
 const tile=document.createElement('canvas');tile.width=tile.height=128;const ctx=tile.getContext('2d');
 for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){const v=100+((x*73+y*37)%53);ctx.fillStyle='rgb('+v+','+v+','+v+')';ctx.fillRect(x,y,2,2);}
 rubberSurface=new THREE.CanvasTexture(tile);rubberSurface.wrapS=rubberSurface.wrapT=THREE.RepeatWrapping;rubberSurface.repeat.set(12,12);return rubberSurface;
}
function mechanicalGrain(){
 if(brushedMetalTexture)return brushedMetalTexture;
 const tile=document.createElement('canvas');tile.width=tile.height=128;const ctx=tile.getContext('2d');
 ctx.fillStyle='#929292';ctx.fillRect(0,0,128,128);
 for(let y=0;y<128;y++){const shade=126+Math.round(25*Math.sin(y*17.37));ctx.strokeStyle='rgb('+shade+','+shade+','+shade+')';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y);ctx.stroke();}
 brushedMetalTexture=new THREE.CanvasTexture(tile);brushedMetalTexture.wrapS=brushedMetalTexture.wrapT=THREE.RepeatWrapping;brushedMetalTexture.repeat.set(3,3);return brushedMetalTexture;
}
function makeRobotMeshes(group){
 return parts.map(part=>{
   const vertices=[],normals=[],uvs=[],adj=part.v.map(()=>[]);
   const pcb=part.name==='Control board',minX=Math.min(...part.v.map(v=>v[0])),maxX=Math.max(...part.v.map(v=>v[0])),minZ=Math.min(...part.v.map(v=>v[2])),maxZ=Math.max(...part.v.map(v=>v[2]));
   const faces=part.f.map(face=>{
    const a=new THREE.Vector3().fromArray(part.v[face[0]]),b=new THREE.Vector3().fromArray(part.v[face[1]]),c=new THREE.Vector3().fromArray(part.v[face[2]]);
    const n=b.sub(a).cross(c.sub(a)).normalize();face.forEach(k=>adj[k].push(n));return {face,n};
   });
   for(const {face,n} of faces)for(let j=1;j<face.length-1;j++)for(const k of [face[0],face[j],face[j+1]]){
    const v=part.v[k];vertices.push(...v);const normal=new THREE.Vector3();for(const neighbor of adj[k])if(neighbor.dot(n)>.75)normal.add(neighbor);normal.normalize();normals.push(normal.x,normal.y,normal.z);
    const dominant=Math.abs(n.y)>.6?1:Math.abs(n.x)>.6?0:2;if(pcb)uvs.push((v[0]-minX)/(maxX-minX),(v[2]-minZ)/(maxZ-minZ));else uvs.push(v[dominant===0?2:0]*2,v[dominant===1?2:1]*2);
   }
   const shape=new THREE.BufferGeometry();shape.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));shape.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));shape.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
   const metal=part.material==='metal',glass=part.material==='glass',rubber=part.material==='rubber';
   const material=new THREE.MeshPhysicalMaterial({color:glass?0xe5f1ed:part.c,metalness:metal?.88:0,roughness:glass?.07:metal?(part.hardware?.22:.30):rubber?.93:.52,clearcoat:metal?.10:0,clearcoatRoughness:.35,side:THREE.DoubleSide,transparent:glass,opacity:glass?.20:1,depthWrite:!glass,envMapIntensity:metal?1.1:.7});
   if(metal){material.bumpMap=mechanicalGrain();material.bumpScale=.0012;}
   if(rubber){material.bumpMap=rubberFinish();material.bumpScale=.0025;}
   if(pcb){material.color.setHex(0xffffff);material.map=boardFinish();material.roughness=.62;}
   const mesh=new THREE.Mesh(shape,material);mesh.castShadow=!glass;mesh.receiveShadow=true;mesh.position.fromArray(part.p);group.add(mesh);mesh.userData.part=part;return {mesh,part};
  });
}

// Physically based studio renderer; the classic Canvas viewer remains the fallback.
function mountStudio(host,fallback,{hero=false}={}){
 let renderer;
 try {
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:hero,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=hero?THREE.PCFSoftShadowMap:THREE.VSMShadowMap;
  const scene=new THREE.Scene();if(!hero){scene.background=new THREE.Color('#dadcda');scene.fog=new THREE.Fog('#dadcda',22,65);}
  const camera=new THREE.PerspectiveCamera(34,1,.1,150);
  // Local softbox environment: no network textures or third-party asset dependencies.
  const room=new THREE.Scene();room.background=new THREE.Color(hero?'#303038':'#a0a6aa');
  for(const [position,size,color,intensity] of [[[-4,6,3],[3,5,.1],0xeaf3ff,4],[[5,4,0],[2,4,.1],0xffffff,3],[[0,5,-5],[5,2,.1],hero?0xff2848:0xe2eaff,2]]){
   const panel=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity)}));panel.position.set(...position);panel.lookAt(0,1,0);room.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.08);scene.environment=environment.texture;pmrem.dispose();
  room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  scene.add(new THREE.HemisphereLight(0xe9eff5,hero?0x292027:0x8c8e87,hero?.8:1.15));
  const key=new THREE.DirectionalLight(0xfff8ec,hero?3.2:2.7);key.position.set(-3,9,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:28});key.shadow.bias=-.00015;key.shadow.normalBias=.012;key.shadow.radius=5;key.shadow.blurSamples=8;scene.add(key);
  const rim=new THREE.DirectionalLight(hero?0xff2449:0xc9ddff,1.5);rim.position.set(4,3,-4);scene.add(rim);
  const robot=new THREE.Group();scene.add(robot);
  const meshes=makeRobotMeshes(robot);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0xd3d5d1,metalness:0,roughness:.83}));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;floor.receiveShadow=true;if(hero){floor.material.dispose();floor.material=new THREE.ShadowMaterial({opacity:.28});floor.position.y=-.035;}scene.add(floor);
  const canvas=renderer.domElement;canvas.className='robot-canvas';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Studio-lit Hyperdrive robot. Drag to orbit.');
  host.append(canvas);fallback.style.display='none';host.classList.add('has-3d');
  if(!hero)document.querySelector('#render-status').textContent='MECHANICAL 3D · '+parts.length+' PARTS';
  let yaw=.55,pitch=.55,visible=true,drag=false,lastX=0,lastY=0,last=0,paused=false,previousFocus='',lastSeparation=-1;
  const rotate=document.querySelector('#rotate'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),box=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3(),target=new THREE.Vector3(0,.8,0);
  if(!hero)rotate.addEventListener('input',()=>yaw=Number(rotate.value)*Math.PI/180);
  canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-lastX)*.008;pitch=clamp(pitch+(e.clientY-lastY)*.004,.12,1.25);lastX=e.clientX;lastY=e.clientY;if(!hero)rotate.value=Math.round(yaw*180/Math.PI);});
  canvas.onpointerup=canvas.onpointercancel=()=>drag=false;
  if(hero)document.querySelector('#hero-orbit').addEventListener('click',e=>{paused=!paused;e.currentTarget.textContent=paused?'RESUME ROTATION ▷':'PAUSE ROTATION Ⅱ';e.currentTarget.setAttribute('aria-pressed',String(paused));});
  new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.updateProjectionMatrix();}).observe(host);
  new IntersectionObserver(e=>visible=e[0].isIntersecting,{rootMargin:'80px'}).observe(host);
  let radius=4,heroPointerX=0,heroPointerY=0,heroTiltX=0,heroTiltY=0,selected=null,preset=null,downX=0,downY=0;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  if(hero){host.addEventListener('pointermove',e=>{const rect=host.getBoundingClientRect();heroPointerX=(e.clientX-rect.left)/rect.width-.5;heroPointerY=(e.clientY-rect.top)/rect.height-.5;});host.addEventListener('pointerleave',()=>{heroPointerX=0;heroPointerY=0;});}
  if(!hero){
   canvas.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;preset=null;});
   canvas.addEventListener('pointerup',e=>{
    if(Math.hypot(e.clientX-downX,e.clientY-downY)>6)return;
    const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(meshes.filter(x=>x.mesh.visible).map(x=>x.mesh),false)[0];
    selected=hit?.object||null;const info=document.querySelector('#component-info');
    info.textContent=selected?selected.userData.part.name+' / '+selected.userData.part.system:'Click any component to identify it';
   });
   document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{
    const poses={perspective:[.55,.55],front:[0,.18],top:[0,1.52],side:[Math.PI/2,.18]};preset=poses[button.dataset.camera];
    document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   }));
  }
  // Physical orbital graphics and floating sparks give the hero spatial depth.
  const orbitals=new THREE.Group();scene.add(orbitals);
  const pulseLight=new THREE.PointLight(0xff214b,hero?18:0,18,2);pulseLight.position.set(-2,2,3);scene.add(pulseLight);
  let scan=null,ignition=0;
  if(hero){
   for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(3+i*.22,.014,6,120),new THREE.MeshBasicMaterial({color:i===1?0xff647f:0xa51635,transparent:true,opacity:.35}));ring.rotation.set(Math.PI/2+i*.22,0,i*.3);ring.position.y=.8;orbitals.add(ring);}
   const scanMaterial=new THREE.MeshBasicMaterial({color:0xff3154,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});scan=new THREE.Mesh(new THREE.PlaneGeometry(4.8,4.8),scanMaterial);scan.rotation.x=-Math.PI/2;scene.add(scan);
   const pos=[];for(let i=0;i<100;i++)pos.push(Math.sin(i*2.4)*(3+i%4),.2+(i%31)*.13,Math.cos(i*1.7)*(3+i%4));const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));orbitals.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xff4967,size:.025,transparent:true,opacity:.6})));
  }
  renderer.setAnimationLoop(time=>{
   if(!visible||document.hidden||time-last<33)return;const dt=Math.min((time-last)/1000,.05);last=time;
   const frozen=document.body.classList.contains('paused')||reduced.matches;
   if(preset){const amount=frozen?1:1-Math.exp(-dt*7);yaw+=(preset[0]-yaw)*amount;pitch+=(preset[1]-pitch)*amount;rotate.value=Math.round(yaw*180/Math.PI);}
   if(hero&&!frozen&&!paused){ignition+=(Number(host.dataset.ignition||0)-ignition)*(1-Math.exp(-dt*3));orbitals.rotation.y+=dt*(.08+ignition*.22);orbitals.scale.setScalar(1+ignition*.08);orbitals.rotation.z=Math.sin(time*.00025)*.10;pulseLight.intensity=18+ignition*32+Math.sin(time*.001)*7;scan.material.opacity=.12+ignition*.12;scan.position.y=.35+(Math.sin(time*.00065)+1)*.7;heroTiltX+=(heroPointerX*.16-heroTiltX)*.06;heroTiltY+=(heroPointerY*.1-heroTiltY)*.06;}
   if(hero&&!paused&&!drag&&!frozen)yaw+=dt*.10;
   const separation=hero?0:Number(host.dataset.separation||0),focus=hero?'all':host.dataset.system||'all',wire=!hero&&document.querySelector('#wire').getAttribute('aria-pressed')==='true';
   for(const {mesh,part} of meshes){mesh.position.fromArray(offsetPart(part,separation));if(part.hardware)mesh.rotation[part.fastenerAxis]=clamp(separation/.28)*Math.PI*8;mesh.visible=focus==='all'||part.system===focus;mesh.material.wireframe=wire;mesh.material.emissive.setHex(mesh===selected?0x77142d:0x000000);const xray=!hero&&document.querySelector('#xray')?.getAttribute('aria-pressed')==='true';const glass=part.material==='glass';mesh.material.transparent=glass||xray;mesh.material.opacity=xray?(mesh===selected?1:.16):(glass?.20:1);mesh.material.depthWrite=!glass&&!xray;}
   if(separation!==lastSeparation||focus!==previousFocus){
    box.makeEmpty();for(const {mesh} of meshes)if(mesh.visible)box.expandByObject(mesh);box.getCenter(center);box.getSize(size);radius=size.length()*.52;previousFocus=focus;lastSeparation=separation;
   }
   target.lerp(center,frozen?1:1-Math.exp(-dt*8));
   const zoom=hero?(host.clientWidth>600?1.17:1.04):Number(document.querySelector('#zoom')?.value||100)/100;
   const cameraYaw=yaw+(hero?heroTiltX:0),cameraPitch=pitch+(hero?heroTiltY:0);
   const distance=fitCameraDistance(box.min.toArray(),box.max.toArray(),{yaw:cameraYaw,pitch:cameraPitch,aspect:camera.aspect,fov:camera.fov,padding:hero?1.12:1.18})/zoom;
   camera.position.set(target.x+Math.sin(cameraYaw)*Math.cos(cameraPitch)*distance,target.y+Math.sin(cameraPitch)*distance,target.z+Math.cos(cameraYaw)*Math.cos(cameraPitch)*distance);camera.lookAt(target);
   renderer.render(scene,camera);host.dataset.renderedSeparation=separation.toFixed(3);
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);canvas.remove();mountViewer(host,fallback,{hero,softwareOnly:true});});
  return true;
 }catch(error){renderer?.dispose();renderer?.domElement.remove();console.info('Using offline-compatible Canvas renderer.',error);return false;}
}
