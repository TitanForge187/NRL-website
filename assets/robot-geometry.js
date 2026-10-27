// Shared geometry for the WebGL and Canvas renderers. Y is up; +Z is the intake.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// Fit the actual camera-space bounds, not a bounding sphere. A sphere pulled
// the wide, shallow robot far away and made it look like a miniature icon.
export function fitCameraDistance(lo,hi,{yaw,pitch,aspect,fov=34,padding=1.12}){
 const c=lo.map((v,i)=>(v+hi[i])/2),t=Math.tan(fov*Math.PI/360);
 const right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)],near=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
 const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);let distance=0;
 for(const x of [lo[0],hi[0]])for(const y of [lo[1],hi[1]])for(const z of [lo[2],hi[2]]){
  const p=[x-c[0],y-c[1],z-c[2]],depth=dot(p,near);
  distance=Math.max(distance,depth+padding*Math.abs(dot(p,up))/t,depth+padding*Math.abs(dot(p,right))/(t*Math.max(.1,aspect)));
 }
 return Math.max(1,distance);
}
export function offsetPart(part,separation){
  const t=clamp((separation-(part.delay??part.g*.12))/(1-(part.delay??part.g*.12)));
  const amount=t*t*(3-2*t);
  return part.p.map((v,i)=>v+(part.explode?.[i]||0)*amount);
}
export function projectPoint(point,{yaw,pitch,width,height,scale=1,distance=8}){
  let [x,y,z]=point;
  const xx=x*Math.cos(yaw)+z*Math.sin(yaw);
  let zz=x*Math.sin(yaw)-z*Math.cos(yaw);
  y-=.78;
  const yy=y*Math.cos(pitch)+zz*Math.sin(pitch);
  zz=-y*Math.sin(pitch)+zz*Math.cos(pitch);
  const f=Math.min(width*1.15,height*1.8)*scale/Math.max(1,distance+zz);
  return [width/2+xx*f,height*.52-yy*f,zz];
}
export function polygonsFor(parts,separation,view,spin=0){
  const polygons=[];
  for(const part of parts){
    const p=offsetPart(part,separation);
    const world=part.v.map(v=>{
      let q=v.map((v,i)=>v+p[i]);
      if(part.wheel){const center=part.wheel.map((v,i)=>v+p[i]-part.p[i]),y=q[1]-center[1],z=q[2]-center[2];q[1]=center[1]+y*Math.cos(spin)-z*Math.sin(spin);q[2]=center[2]+y*Math.sin(spin)+z*Math.cos(spin);}
      return q;
    });
    const verts=world.map(p=>projectPoint(p,view));
    const rgb=[1,3,5].map(k=>parseInt(part.c.slice(k,k+2),16));
    for(const face of part.f){
      const a=world[face[0]],b=world[face[1]],c=world[face[2]];
      const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const length=Math.hypot(...n)||1;
      const diffuse=Math.abs((n[0]*-.4+n[1]*.85+n[2]*.35)/length);
      const metallic=part.material==='metal';
      const cameraNormal=(n[0]*Math.sin(view.yaw)*Math.cos(view.pitch)+n[1]*Math.sin(view.pitch)+n[2]*Math.cos(view.yaw)*Math.cos(view.pitch))/length;
      const sheen=metallic?.32*Math.pow(Math.abs(cameraNormal),8):0;
      const light=.24+.74*diffuse+sheen;
      const points=face.map(i=>verts[i]);
      polygons.push({points,z:points.reduce((s,p)=>s+p[2],0)/points.length,color:rgb.map(c=>Math.min(255,Math.round(c*light))),alpha:part.alpha??1,name:part.name,system:part.system,material:part.material});
    }
  }
  return polygons.sort((a,b)=>b.z-a.z);
}
export function fitPolygons(polygons,width,height,padding=30){
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of polygons)for(const [x,y] of p.points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 if(!polygons.length)return polygons;
 const scale=Math.min((width-2*padding)/Math.max(1,maxX-minX),(height-2*padding)/Math.max(1,maxY-minY));
 const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 return polygons.map(p=>({...p,points:p.points.map(([x,y,z])=>[width/2+(x-cx)*scale,height/2+(y-cy)*scale,z])}));
}
