"""Photo-referenced Hyperdrive chassis. Units are relative, not measured CAD."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parts=[]
def part(name,p,v,f,c,g=0,alpha=1,explode=None,**extra):
 parts.append(dict(name=name,p=p,v=v,f=f,c=c,g=g,alpha=alpha,explode=explode or [0,.7+g*.3,0],**extra))
def box(name,p,s,c,g=0,alpha=1,angle=0,explode=None,rx=0,**extra):
 if alpha==1 and min(s)>.025:
  # Small machined edge breaks catch the studio light without rounding the part away.
  b=min(.012,min(s)*.16);v=[]
  for yy,inset in [(-s[1]/2,b),(-s[1]/2+b,0),(s[1]/2-b,0),(s[1]/2,b)]:
   hx=s[0]/2-inset;hz=s[2]/2-inset;ch=min(b,hx*.3,hz*.3)
   for xx,zz in [(-hx+ch,-hz),(hx-ch,-hz),(hx,-hz+ch),(hx,hz-ch),(hx-ch,hz),(-hx+ch,hz),(-hx,hz-ch),(-hx,-hz+ch)]:
    vx=xx*math.cos(angle)-yy*math.sin(angle);vy=xx*math.sin(angle)+yy*math.cos(angle)
    v.append([vx,vy*math.cos(rx)-zz*math.sin(rx),vy*math.sin(rx)+zz*math.cos(rx)])
  f=[list(range(7,-1,-1)),list(range(24,32))]
  f.extend([[j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i] for j in range(3) for i in range(8)])
  part(name,p,v,f,c,g,alpha,explode,**extra);return
 v=[]
 for z in [-1,1]:
  for y in [-1,1]:
   for x in [-1,1]:
    xx=x*s[0]/2; yy=y*s[1]/2
    vx=xx*math.cos(angle)-yy*math.sin(angle);vy=xx*math.sin(angle)+yy*math.cos(angle);vz=z*s[2]/2
    v.append([vx,vy*math.cos(rx)-vz*math.sin(rx),vy*math.sin(rx)+vz*math.cos(rx)])
 part(name,p,v,[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]],c,g,alpha,explode,**extra)
def cyl(name,p,r,length,c,g=1,axis='x',n=20,explode=None,**extra):
 v=[]
 for end in [-1,1]:
  for i in range(n):
   a=i*math.tau/n;xy=[r*math.cos(a),end*length/2,r*math.sin(a)]
   if axis=='x':xy=[xy[1],xy[0],xy[2]]
   if axis=='z':xy=[xy[0],xy[2],xy[1]]
   v.append(xy)
 f=[list(range(n-1,-1,-1)),list(range(n,n*2))]
 f.extend([[i,(i+1)%n,(i+1)%n+n,i+n] for i in range(n)])
 part(name,p,v,f,c,g,explode=explode,**extra)
def lathe(name,p,profile,c,g=0,axis='y',n=32,**extra):
 """Closed radial profile: real bores and socket cavities, not black decals."""
 v=[]
 for radius,height in profile:
  for i in range(n):
   a=math.tau*i/n; q=[radius*math.cos(a),height,radius*math.sin(a)]
   if axis=='x':q=[q[1],q[0],q[2]]
   if axis=='z':q=[q[0],q[2],q[1]]
   v.append(q)
 f=[]
 for j in range(len(profile)):
  for i in range(n):f.append([j*n+i,j*n+(i+1)%n,((j+1)%len(profile))*n+(i+1)%n,((j+1)%len(profile))*n+i])
 part(name,p,v,f,c,g,**extra)
def merge_since(start,name,**extra):
 """Keep the manufactured object's detail together during disassembly."""
 pieces=parts[start:]; base=pieces[0]; vertices=[];faces=[]
 for piece in pieces:
  k=len(vertices);vertices.extend([[v[j]+piece['p'][j]-base['p'][j] for j in range(3)] for v in piece['v']]);faces.extend([[i+k for i in face] for face in piece['f']])
 base.update(name=name,v=vertices,f=faces,**extra);parts[start:]=[base]
def screw(name,p,g=0,axis='x',length=.11,explode=None,wheel=None):
 start=len(parts); opts={'explode':explode,'system':'drive' if g==1 else 'frame' if g==0 else 'electronics','hardware':True,'material':'metal'}
 if wheel is not None:opts['wheel']=wheel
 # Chamfered socket head with a recessed six-sided Allen drive.
 lathe(name,p,[(.030,-.015),(.038,-.010),(.038,.018),(.032,.026),(.018,.026),(.018,.010),(.001,.010),(.001,-.015)],'#9caab4',g,axis,n=6,**opts)
 lathe('Captive steel washer',p,[(.022,-.021),(.049,-.021),(.049,-.016),(.022,-.016)],'#bdc6cc',g,axis,n=24,**opts)
 lathe('Threaded steel shank',p,[(.001,-length),(.021,-length),(.021,-.014),(.001,-.014)],'#7c8c96',g,axis,n=16,**opts)
 # A continuous helical crest, joined into the bolt mesh rather than separate rings.
 verts=[];faces=[];turns=max(3,round(length/.014));steps=turns*12
 for i in range(steps+1):
  a=math.tau*i/12;h=-length+(length-.019)*i/steps
  for r,dh in [(.020,-.003),(.026,0),(.020,.003)]:
   q=[r*math.cos(a),h+dh,r*math.sin(a)]
   if axis=='x':q=[q[1],q[0],q[2]]
   if axis=='z':q=[q[0],q[2],q[1]]
   verts.append(q)
 for i in range(steps):
  for j in range(2):faces.append([i*3+j,(i+1)*3+j,(i+1)*3+j+1,i*3+j+1])
 part('Helical thread crest',p,verts,faces,'#aebbc3',g,**opts)
 merge_since(start,name,hardware=True,fastenerAxis=axis,detail='Recessed hex socket, captive washer and helical thread')
 if axis=='x' and p[0]<0:
  parts[-1]['v']=[[ -v[0],v[1],v[2]] for v in parts[-1]['v']]
  parts[-1]['f']=[face[::-1] for face in parts[-1]['f']]
def channel(name,p,length,axis='z',explode=None):
 start=len(parts)
 # Open U-section with visible wall thickness and an internal cavity.
 for center,size in [([0,-.029,0],[.10,.018,length]),([-.043,.008,0],[.014,.074,length]),([.043,.008,0],[.014,.074,length])]:
  if axis=='x':center=[center[2],center[1],center[0]];size=[size[2],size[1],size[0]]
  box(name,[p[j]+center[j] for j in range(3)],size,'#bac4cc',0,explode=explode,material='metal')
 merge_since(start,name,detail='Hollow aluminium U-channel')
def ring():
 n=40;profile=[(.315,-.15),(.435,-.15),(.475,-.11),(.475,.11),(.435,.15),(.315,.15),(.275,.11),(.275,-.11)]
 v=[[r*math.cos(i*math.tau/n),y,r*math.sin(i*math.tau/n)] for i in range(n) for r,y in profile]
 f=[[i*8+j,((i+1)%n)*8+j,((i+1)%n)*8+(j+1)%8,i*8+(j+1)%8] for i in range(n) for j in range(8)]
 part('Yellow CORE held at front',[0,.81,2.02],v,f,'#eec54e',2,explode=[0,.75,1.1],core=True)
# Low, open rectangular chassis, clear acrylic sides, silver channel frame.
box('Clear lower chassis deck',[0,.51,0],[2.65,.07,3.25],'#afc9d1',0,.23,explode=[0,-.12,0])
for x in [-1.3,1.3]:
 side=1 if x>0 else -1
 box('Acrylic side plate',[x,.94,0],[.055,.8,3.26],'#bbd8df',0,.18,explode=[side*.75,.12,0])
 for z in [-1.57,1.57]:
  box('Side plate upright',[x,.94,z],[.055,.83,.055],'#bac4c7',0,explode=[side*.6,.12,0])
 for y in [.58,1.32]:
  channel('Longitudinal aluminium channel',[x,y,0],3.26,explode=[side*.55,0,0])
 for z in [-1.4,-1,-.6,-.2,.2,.6,1,1.4]:
  screw('Chassis mounting socket screw',[x+side*.06,1.16,z],axis='x',explode=[side*.75,.12,0])
for z in [-1.57,-.55,.65,1.57]:
 channel('Cross chassis support',[0,.65,z],2.55,axis='x',explode=[0,-.2,z*.25])
box('Clear rear wall',[0,1.02,-1.62],[2.65,.72,.055],'#bbd8df',0,.2,explode=[0,.3,-.55])
# Four conventional rubber traction wheels, not mecanum or omni rollers.
for x in [-1.57,1.57]:
 side=1 if x>0 else -1
 for z in [-1.06,1.06]:
  center=[x,.56,z];exp=[side*.9,0,z*.25]
  cyl('Rubber traction wheel',center,.54,.39,'#202427',1,explode=exp,wheel=center)
  for i in range(16):
   a=i*math.tau/16
   box('Tyre tread lug',[x,.56+.535*math.cos(a),z+.535*math.sin(a)],[.415,.075,.15],'#303538',1,explode=exp,wheel=center,rx=a)
  cyl('Silver wheel hub',[x+side*.205,.56,z],.29,.035,'#bcc2c3',1,explode=exp,wheel=center)
  cyl('Hub center',[x+side*.23,.56,z],.095,.05,'#747f84',1,n=12,explode=exp,wheel=center)
  cyl('DC drive motor',[side*.95,.56,z],.17,.53,'#aab0b4',1,explode=[side*.45,.15,z*.25])
  box('Gearbox housing',[side*1.2,.56,z],[.22,.36,.34],'#797f83',1,explode=[side*.55,.1,z*.25])
# Central battery, front black linkage carriage, servo and twin rails.
box('Battery pack',[-.48,.77,-.6],[.65,.35,1.1],'#1c2228',2,explode=[-.35,.7,-.2])
box('Battery strap',[-.48,.96,-.6],[.16,.035,1.12],'#38434a',2,explode=[-.35,.75,-.2])
for x in [-.49,.49]:
 box('Front mechanism side rail',[x,.94,.89],[.085,.085,1.96],'#424b50',2,explode=[x*.7,.5,.55])
 for z in [.2,.8,1.4]:
  box('Front mechanism cross brace',[0,.94,z],[1.05,.065,.065],'#aeb9be',2,explode=[0,.5,.5])
 box('Upright linkage mount',[x,1.18,.0],[.08,.58,.1],'#30393f',2,explode=[x*.7,.55,.4])
box('Front servo body',[0,1.03,-.04],[.48,.4,.32],'#142836',2,explode=[0,.85,.2])
box('Blue servo bracket',[0,1.28,-.04],[.62,.08,.42],'#166591',2,explode=[0,.9,.2])
for x in [-.3,.3]:
 box('CORE support fork',[x,.68,1.87],[.07,.07,.85],'#53626a',2,explode=[x*.7,.45,.9])
box('Front gripper crosspiece',[0,.69,1.52],[.72,.1,.1],'#2f3b43',2,explode=[0,.45,.85])
ring()
# Visible PCB and connectors on right rear of chassis, no invented sensor mast.
box('Controller mounting plate',[.57,.98,-.66],[.95,.05,1.39],'#b7cbd0',2,.22,explode=[.25,.9,-.2])
box('Control board',[.57,1.08,-.66],[.87,.065,1.22],'#217b77',2,explode=[.25,1.05,-.2])
for x,z in [(.35,-.45),(.68,-.85),(.38,-.93)]:
 box('PCB integrated circuit',[x,1.145,z],[.22,.065,.22],'#26363c',2,explode=[.25,1.05,-.2])
for z in [-1.12,-.92,-.72,-.52,-.32]:
 box('Controller connection header',[.94,1.17,z],[.12,.12,.13],'#e1d6ae',2,explode=[.25,1.05,-.2])
box('Controller USB connector',[.25,1.17,-.65],[.16,.13,.24],'#b5c1c6',2,explode=[.25,1.05,-.2])
for x in [.28,.85]:
 for z in [-1.18,-.14]:lathe('Brass threaded standoff',[x,1.03,z],[(.018,-.065),(.043,-.065),(.043,.065),(.018,.065)],'#ad8d4d',2,n=6,explode=[.25,.95,-.2],system='electronics',material='metal')
# Curved individual wire routes; each wire is a single continuous tube mesh.
def tube(name,start,end,color,index):
 points=[];n=24;sides=8
 for i in range(n):
  t=i/(n-1);arc=math.sin(t*math.pi)
  points.append([start[j]*(1-t)+end[j]*t+arc*([.16,.28,.12][j]) for j in range(3)])
 vertices=[]
 for i,point in enumerate(points):
  a=points[max(0,i-1)];b=points[min(n-1,i+1)];d=[b[j]-a[j] for j in range(3)];l=math.sqrt(sum(v*v for v in d));d=[v/l for v in d]
  ref=[0,1,0] if abs(d[1])<.9 else [1,0,0]
  cross=lambda a,b:[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
  u=cross(d,ref);l=math.sqrt(sum(v*v for v in u));u=[v/l for v in u];v=cross(d,u)
  for k in range(sides):vertices.append([point[j]+.018*(u[j]*math.cos(k*math.tau/sides)+v[j]*math.sin(k*math.tau/sides)) for j in range(3)])
 faces=[[i*sides+k,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,(i+1)*sides+k] for i in range(n-1) for k in range(sides)]
 exp=[-3.5-index*.15,1.8+(index%4)*.42,-1.5+(index//4)*2.5]
 part(name,[0,0,0],vertices,faces,color,2,explode=exp,system='wiring',wire=True,delay=.48+index*.018)
 for endno,point in enumerate([start,end]):
  box('Wire %02d terminal %d'%(index+1,endno+1),point,[.08,.06,.12],'#d6bd83',2,explode=[exp[0]-.14,exp[1]+.15,exp[2]],system='electronics')
routes=[
 ('Servo signal',[-.3,1.18,0],[.92,1.18,-.7],'#ee9e34'),
 ('Battery positive',[-.7,.91,-.7],[.8,1.18,-1.12],'#d64543'),
 ('Battery ground',[-.65,.93,-.8],[.3,1.18,-.3],'#26343b'),
 ('Front left motor power',[-.3,1.18,0],[-1,.77,1.04],'#e8ae3d'),
 ('Front left motor return',[.84,1.18,-.52],[-1,.72,1.04],'#2e3d47'),
 ('Front right motor power',[.94,1.18,-.32],[1,.76,1.04],'#d95543'),
 ('Rear left motor power',[.92,1.18,-.92],[-1,.75,-1.06],'#e9b743'),
 ('Rear right motor power',[.94,1.18,-1.12],[1,.76,-1.06],'#d74d43'),
 ('Rear left motor return',[.83,1.19,-.88],[-1,.71,-1.06],'#35434b'),
 ('Rear right motor return',[.84,1.18,-.72],[1,.71,-1.06],'#36424a')]
for index,(name,a,b,color) in enumerate(routes):tube(name,a,b,color,index)
# More visible mechanical detail: hub bolts, axles, ventilated motor endcaps.
for x in [-1.57,1.57]:
 side=1 if x>0 else -1
 for z in [-1.06,1.06]:
  center=[x,.56,z]
  for k in range(6):
   a=k*math.tau/6
   screw('Hub socket bolt',[x+side*.25,.56+.19*math.cos(a),z+.19*math.sin(a)],g=1,axis='x',explode=[side*1.0,0,z*.25],wheel=center)
  cyl('Drive axle',[side*1.3,.56,z],.055,.6,'#c9d6df',1,n=12,explode=[side*1.5,-.18,z*.65])
  cyl('Motor end cap',[side*.67,.56,z],.174,.04,'#59626b',1,n=20,explode=[side*.85,.38,z*.65])
# Physical mounting hardware: bored bearing rings, flanged motor plates, nuts and gussets.
for side in [-1,1]:
 for z in [-1.06,1.06]:
  exp=[side*.55,.12,z*.25]
  lathe('Flanged axle bearing',[side*1.31,.56,z],[(.060,-.025),(.115,-.025),(.128,-.015),(.128,.015),(.115,.025),(.060,.025)],'#89969f',1,axis='x',explode=exp,system='drive',material='metal')
  for dz in [-.20,.20]:
   screw('Motor mount cap screw',[side*1.37,.68,z+dz],g=1,axis='x',length=.14,explode=exp)
  start=len(parts)
  box('Motor mounting foot',[side*1.16,.70,z],[.38,.035,.52],'#99a8b4',1,explode=exp)
  box('Motor mounting cheek',[side*1.30,.56,z],[.035,.31,.52],'#99a8b4',1,explode=exp)
  merge_since(start,'Folded motor mounting bracket',material='metal',system='drive')
 for z in [-1.48,1.48]:
  exp=[side*.55,.15,z*.22]
  start=len(parts)
  box('Corner angle horizontal',[side*1.18,.70,z],[.30,.032,.27],'#9eaeb8',0,explode=exp)
  box('Corner angle vertical',[side*1.30,.82,z],[.032,.27,.27],'#9eaeb8',0,explode=exp)
  merge_since(start,'Chassis corner angle bracket',material='metal',system='frame')
  for dz in [-.07,.07]:screw('Corner bracket socket screw',[side*1.18,.744,z+dz],axis='y',explode=exp)
for x in [.28,.85]:
 for z in [-1.18,-.14]:
  screw('PCB mounting socket screw',[x,1.145,z],g=2,axis='y',length=.16,explode=[.25,1.05,-.2])
# Tyre tread is integral to the tyre, so combine its mesh instead of exploding rubber lugs.
for wheel in [p for p in parts if p['name']=='Rubber traction wheel']:
 lugs=[p for p in parts if p['name']=='Tyre tread lug' and p['wheel']==wheel['wheel']]
 for lug in lugs:
  offset=len(wheel['v']);wheel['v'].extend([[v[j]+lug['p'][j]-wheel['p'][j] for j in range(3)] for v in lug['v']]);wheel['f'].extend([[i+offset for i in f] for f in lug['f']]);parts.remove(lug)
# Distinct physical parts have individual assembly lanes, timings and materials.
counts={}
for item in parts:
 name=item['name']
 system=item.get('system') or ('drive' if item['g']==1 else 'frame' if item['g']==0 else 'electronics' if any(k in name for k in ['Controller','Control board','PCB','Board standoff','Battery']) else 'mechanism')
 item['system']=system;idx=counts.get(system,0);counts[system]=idx+1
 if system=='wiring':continue
 if system=='frame':
  exp=item['explode'];item['explode']=[exp[0]*3.2+(idx%3-1)*.12,exp[1]*2.4+(idx%4)*.18,exp[2]*3+(idx%5-2)*.16]
  if 'fastener' in name:item['explode']=[(-1 if item['p'][0]<0 else 1)*3.2,.7+(idx%4)*.27,(idx//4%4-1.5)*.72]
  item['delay']=.02+(idx%6)*.018
 elif system=='drive':
  item['explode']=[item['explode'][0]*2.2,item['explode'][1]*2+(idx%3)*.18,item['explode'][2]*2.8];item['delay']=.13+(idx%4)*.025
 elif system=='mechanism':
  item['explode']=[item['explode'][0]*2+(idx%3-1)*.5,item['explode'][1]*2.4,item['explode'][2]*2.5+(idx%3)*.24];item['delay']=.27+(idx%4)*.025
 else:
  item['explode']=[3.6+(idx%4)*.6,.6+(idx//4)*.26,-2.2+(idx%3)*.55];item['delay']=.37+(idx%5)*.02
 item['material']=item.get('material') or ('glass' if item.get('alpha',1)<1 else 'rubber' if 'Rubber' in name else 'metal' if any(k in name.lower() for k in ['hub','aluminium','support','bolt','axle','fastener','screw','rail','motor','standoff','bracket']) else 'polymer')
 if item.get('hardware'):
  axis=item['fastenerAxis'];direction=-1 if axis=='x' and item['p'][0]<0 else 1
  item['explode']=[0,0,0];item['explode'][{'x':0,'y':1,'z':2}[axis]]=direction*(2.4 if axis=='x' else 2.1)
  item['delay']=.015
def compact(value):
 if isinstance(value,float):return round(value,5)
 if isinstance(value,list):return [compact(v) for v in value]
 if isinstance(value,dict):return {k:compact(v) for k,v in value.items()}
 return value
(ROOT/'assets/robot.json').write_text(json.dumps(compact(parts),separators=(',',':'))+'\n')
print(f'Built {len(parts)} independent components including {counts["wiring"]} continuous wire routes; proportions approximate.')
