'use strict';
function createTourDistrict(T,scene,plaster,structures,osmBuildings,nightLights){
  const parts=createVietnamOsmBuildings('sight-building-parts/',Infinity);
  const group=new T.Group();group.name='OSM building footprints';scene.add(group);
  const wall=plaster.clone();wall.vertexColors=true;wall.side=T.DoubleSide;
  const roof=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.9});
  roof.onBeforeCompile=shader=>{
    const vary='varying vec2 visitorRoofUv; varying float visitorRoofFinish;\n';
    shader.vertexShader=vary+'attribute float roofFinish;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n visitorRoofUv=uv;visitorRoofFinish=roofFinish;');
    shader.fragmentShader=vary+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(visitorRoofFinish>.5){
        vec2 tile=visitorRoofUv*vec2(5.8,3.6);
        vec2 aa=max(vec2(.001),fwidth(tile));float fade=1.-smoothstep(.14,.8,max(aa.x,aa.y));
        float crest=.5+.5*cos(tile.x*6.283);
        float lip=smoothstep(.71,.95,fract(tile.y));
        if(visitorRoofFinish>1.5)lip=0.;
        diffuseColor.rgb*=1.+fade*(.24*(crest-.5)-.16*lip);
      }`);
  };
  // Window bays follow the measured edge length and the floor count. Shade them
  // in the wall pass, so a dense city block costs the same two draws on a phone.
  wall.onBeforeCompile=shader=>{
    shader.uniforms.nightLights=nightLights;
    shader.vertexShader='attribute vec2 bays; attribute float openingStyle; varying float opening; varying vec2 vBays;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vBays=bays;opening=openingStyle;');
    shader.fragmentShader='uniform float nightLights; varying float opening; varying vec2 vBays;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec3 roomLight=vec3(0.);
      if(opening<.5)diffuseColor.rgb=mix(vec3(.72),diffuseColor.rgb,.59);
      if(vBays.x>=0.){
        vec2 p=fract(vBays),aa=clamp(fwidth(vBays),vec2(.008),vec2(.18));
        vec2 pane=smoothstep(vec2(.2,.25)-aa,vec2(.2,.25)+aa,p)*(1.-smoothstep(vec2(.8,.78)-aa,vec2(.8,.78)+aa,p));
        float frame=1.-smoothstep(.013,.013+aa.x,abs(p.x-.5));
        float reveal=smoothstep(.20,.26,p.x)*(1.-smoothstep(.69,.78,p.y));
        float light=.77+.22*sin(dot(floor(vBays),vec2(7.2,3.9)));
        vec3 glazing=mix(vec3(.056,.084,.088),vec3(.25,.36,.38),p.y)*light;
        if(opening>.5 && opening<1.5){
          float bars=1.-smoothstep(.04,.12+aa.x,abs(fract(p.x*5.)-.5));
          float rails=1.-smoothstep(.045,.13+aa.y,abs(fract(p.y*4.)-.5));
          glazing=mix(vec3(.063,.05,.035),vec3(.24,.125,.068),max(bars,rails));frame=0.;
        }else if(opening>1.5){
          float side=(p.x-.5)/.3;
          float arch=opening>2.5?sqrt(max(0.,1.-side*side)):1.-abs(side);
          pane.y*=1.-smoothstep(.55+arch*.23-aa.y,.55+arch*.23+aa.y,p.y);
        }
        float openingMask=pane.x*pane.y;
        float sill=smoothstep(.17,.20,p.x)*(1.-smoothstep(.80,.83,p.x));
        sill*=smoothstep(.19-aa.y,.22,p.y)*(1.-smoothstep(.227,.25+aa.y,p.y));
        diffuseColor.rgb*=1.-.24*sill;
        diffuseColor.rgb=mix(diffuseColor.rgb,mix(glazing*(.67+.33*reveal),vec3(.18,.17,.15),frame),openingMask);
        if(opening<.5){
          float room=fract(sin(dot(floor(vBays),vec2(17.3,41.7))+opening*230.)*4375.5);
          roomLight=mix(vec3(.48,.19,.059),vec3(.62,.47,.29),room)
                    *nightLights*smoothstep(.55,.64,room)*openingMask*reveal*(1.-.9*frame);
        }
      }`).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=roomLight;');
  };
  const palette=[0xf3e1c6,0xd3d9cc,0xe9d0bb,0xf0d9a7,0xb9c6c9,0xeae6db].map(v=>new T.Color(v));
  const roofs=[0x9f6757,0xa09a8e,0x798d92,0xaca69c].map(v=>new T.Color(v));
  const concrete=new T.Color(0x989186);
  const doorway=new T.Color(0x354647);
  let indexPromise,available,grid,scale=100000,loadedGraph,signature,loaded=[],cells=new Map(),serial=0;
  const cache=new Map(),blocks=new Map(),cell=32,streetFronts=[];
  async function load(graph,x,z){
    const seq=++serial;
    try{
      indexPromise??=fetch('tour-buildings/index.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();})
        .then(data=>{available=new Set(data.tiles);grid=data.grid;scale=data.scale;}).catch(e=>{indexPromise=null;throw e;});
      await indexPromise;
      const [lon,lat]=graph.geo(x,z),keys=[],reach=1100;
      for(let i=Math.floor((lon-reach/graph.mx)*grid);i<=Math.floor((lon+reach/graph.mx)*grid);i++)
        for(let j=Math.floor((lat-reach/graph.my)*grid);j<=Math.floor((lat+reach/graph.my)*grid);j++){
          const key=i+'_'+j;if(available.has(key))keys.push(key);
        }
      const next=keys.join('/');if(graph===loadedGraph&&next===signature)return false;
      const data=await Promise.all(keys.map(k=>{
        if(!cache.has(k))cache.set(k,fetchMapTile('tour-buildings/'+k+'.gz').catch(e=>{cache.delete(k);throw e;}));
        return cache.get(k);
      }));
      if(seq!==serial)return false;
      for(const k of cache.keys())if(!keys.includes(k))cache.delete(k);
      loaded=data.flat();loadedGraph=graph;signature=next;return true;
    }catch{return false;}
  }
  function decode(raw,graph){
    let lon=0,lat=0;
    const ring=[];
    for(let i=0;i<raw.length;i+=2){lon+=raw[i];lat+=raw[i+1];const p=graph.point(lon/scale,lat/scale);ring.push(new T.Vector2(p.x,p.z));}
    return ring;
  }
  function contact(x,z,r){
    let hit;
    for(const b of cells.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]){
      if(b.bottom>2.2)continue;
      if(x<b.minX-r||z<b.minZ-r||x>b.maxX+r||z>b.maxZ+r)continue;
      let inside=false,min=Infinity,px,pz;
      for(const ring of b.rings){
        for(let j=0,k=ring.length-1;j<ring.length;k=j++){
          const a=ring[k],c=ring[j],dx=c.x-a.x,dz=c.y-a.y;
          if((a.y>z)!==(c.y>z)&&x<a.x+(z-a.y)*dx/dz)inside=!inside;
          const f=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz||1)));
          const xx=a.x+f*dx,zz=a.y+f*dz,d=(x-xx)**2+(z-zz)**2;
          if(d<min){min=d;px=xx;pz=zz;}
        }
      }
      const d=Math.sqrt(min),depth=r+(inside?d:-d);
      if(depth<=0||hit&&hit.depth>=depth)continue;
      const dir=inside?-1:1;
      hit={nx:d?dir*(x-px)/d:1,nz:d?dir*(z-pz)/d:0,depth,pointX:px,pointZ:pz,height:b.h,kind:'building',id:b.id};
    }
    return hit;
  }
  function insideRing(x,z,ring){
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];
      if((a.y>z)!==(b.y>z)&&x<(b.x-a.x)*(z-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  }
  function insideBuilding(x,z,rings){
    return insideRing(x,z,rings[0])&&!rings.slice(1).some(hole=>insideRing(x,z,hole));
  }
  function overlapsSight(landmarks,rings,box,inferred){
    if(!landmarks)return false;
    for(const {ring:area,bounds} of landmarks.buildingAreas){
      if(box.maxX<bounds.min.x||box.minX>bounds.max.x||box.maxZ<bounds.min.y||box.minZ>bounds.max.y)continue;
      if(insideRing(rings[0][0].x,rings[0][0].y,area)||insideBuilding(area[0].x,area[0].y,rings))return true;
      for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i],dx=b.x-a.x,dz=b.y-a.y;
        for(let k=0,l=area.length-1;k<area.length;l=k++){
          const p=area[l],q=area[k],ex=q.x-p.x,ez=q.y-p.y,det=dx*ez-dz*ex;
          if(Math.abs(det)<1e-8)continue;
          const px=p.x-a.x,pz=p.y-a.y,t=(px*ez-pz*ex)/det,u=(px*dz-pz*dx)/det;
          if(t>=0&&t<=1&&u>=0&&u<=1)return true;
        }
      }
    }
    if(inferred)for(const {x,z,r} of landmarks.gardens){
      if(x+r<box.minX||x-r>box.maxX||z+r<box.minZ||z-r>box.maxZ)continue;
      if(insideBuilding(x,z,rings))return true;
      for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i],dx=b.x-a.x,dz=b.y-a.y;
        const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz||1)));
        if((a.x+t*dx-x)**2+(a.y+t*dz-z)**2<=r*r)return true;
      }
    }
    return false;
  }
  function overlapsMapped(rings,box){
    const seen=new Set();
    for(let i=Math.floor(box.minX/cell);i<=Math.floor(box.maxX/cell);i++){
      for(let j=Math.floor(box.minZ/cell);j<=Math.floor(box.maxZ/cell);j++){
        for(const b of cells.get(i+','+j)||[]){
          if(!b.surveyed||seen.has(b))continue;
          seen.add(b);
          const left=Math.max(box.minX,b.minX),right=Math.min(box.maxX,b.maxX);
          const top=Math.max(box.minZ,b.minZ),bottom=Math.min(box.maxZ,b.maxZ);
          if(right-left<.6||bottom-top<.6)continue;
          const area=Math.min((box.maxX-box.minX)*(box.maxZ-box.minZ),(b.maxX-b.minX)*(b.maxZ-b.minZ));
          if((right-left)*(bottom-top)<area*.18)continue;
          let same=0;
          for(const u of [.2,.5,.8])for(const v of [.2,.5,.8]){
            const x=left+(right-left)*u,z=top+(bottom-top)*v;
            if(insideBuilding(x,z,rings)&&insideBuilding(x,z,b.rings))same++;
          }
          if(same>=3)return true;
        }
      }
    }
    return false;
  }
  function build(graph,cx,cz,landmarks,ground=()=>0,edges=[],visitorGround=()=>false){
    for(const mesh of [...group.children]){group.remove(mesh);mesh.geometry.dispose();}
    cells.clear();blocks.clear();streetFronts.length=0;if(!graph)return;
    const pieces=parts.rows(graph,cx,cz);
    const replaced=new Set(pieces.flatMap(row=>[row[6]?.parent,row[6]?.sourceId]).filter(Boolean));
    const shells=[...(graph===loadedGraph?loaded:[]),...osmBuildings.rows(graph,cx,cz)];
    const surveyed=[...pieces,...shells.filter(row=>!replaced.has(row[0]))];
    const extra=structures.rows(graph,cx,cz);
    // Satellite outlines can be displaced onto a carriageway. Only index the
    // road segments close enough to test a footprint in this view.
    const roadCells=new Map(),roadCell=48;
    for(const edge of edges)for(let n=1;n<edge.points.length;n++){
      const a=edge.points[n-1],b=edge.points[n],w=worldRoadHalfWidth(edge),dx=b.x-a.x,dz=b.z-a.z;
      const segment={a,dx,dz,length2:dx*dx+dz*dz,w};
      const margin=w+18;
      const left=Math.max(cx-850,Math.min(a.x,b.x)-margin),right=Math.min(cx+850,Math.max(a.x,b.x)+margin);
      const top=Math.max(cz-850,Math.min(a.z,b.z)-margin),bottom=Math.min(cz+850,Math.max(a.z,b.z)+margin);
      for(let i=Math.floor(left/roadCell);i<=Math.floor(right/roadCell);i++)for(let j=Math.floor(top/roadCell);j<=Math.floor(bottom/roadCell);j++){
        const key=i+','+j;if(!roadCells.has(key))roadCells.set(key,[]);
        roadCells.get(key).push(segment);
      }
    }
    function obstructsRoad(rings,box,x,z){
      const seen=new Set();
      for(let i=Math.floor(box.minX/roadCell);i<=Math.floor(box.maxX/roadCell);i++){
        for(let j=Math.floor(box.minZ/roadCell);j<=Math.floor(box.maxZ/roadCell);j++){
          for(const s of roadCells.get(i+','+j)||[]){
            if(seen.has(s)||!s.length2)continue;
            seen.add(s);
            const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.length2));
            const px=s.a.x+t*s.dx,pz=s.a.z+t*s.dz;
            const len=Math.sqrt(s.length2);
            for(const offset of [0,-s.w*.65,s.w*.65]){
              if(insideBuilding(px-offset*s.dz/len,pz+offset*s.dx/len,rings))return true;
            }
          }
        }
      }
      return false;
    }
    const batches=[wall,roof].map(mat=>({mat,pos:[],uv:[],cols:[],bays:[],styles:[]}));
    let baseY=0,opening=0,facadeSeed=0;
    function vertex(b,x,y,z,u,v,tint,finish=0){
      b.pos.push(x-cx,baseY+y,z-cz);b.uv.push(u,v);b.cols.push(tint.r,tint.g,tint.b);
      b.styles.push(b.mat===wall?opening+facadeSeed:finish);
    }
    function quad(b,a,c,lo,hi,tint,count,floors){
      const span=a.distanceTo(c);
      for(const [p,y,u] of [[a,lo,0],[c,lo,span],[a,hi,0],[c,lo,span],[c,hi,span],[a,hi,0]]){
        vertex(b,p.x,y,p.y,u/5,y/4,tint);b.bays.push(count?u/span*count:-1,Math.max(0,y)/hi*floors);
      }
    }
    // Fit a shaded doorway to the street-facing wall of a narrow low-rise.
    // The outline and height are mapped; the shutter and canopy are scenery.
    function streetFront(outer,h,tint,seed,zone){
      let best=null,bestGap=18;
      for(let i=0;i<outer.length;i++){
        const a=outer[i],b=outer[(i+1)%outer.length],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz);
        if(len<2.5||len>15)continue;
        const x=(a.x+b.x)/2,z=(a.y+b.y)/2;
        for(const s of roadCells.get(Math.floor(x/roadCell)+','+Math.floor(z/roadCell))||[]){
          if(!s.length2)continue;
          const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.length2));
          const rx=s.a.x+t*s.dx-x,rz=s.a.z+t*s.dz-z,dist=Math.hypot(rx,rz),gap=dist-s.w;
          if(gap<1.1||gap>=bestGap||Math.abs(dx*rx+dz*rz)>.45*len*dist)continue;
          let nx=-dz/len,nz=dx/len;
          if(nx*rx+nz*rz<0){nx=-nx;nz=-nz;}
          if(insideRing(x+nx*.2,z+nz*.2,outer))continue;
          best={x,z,nx,nz,ux:dx/len,uz:dz/len,half:Math.min(len*.43,3.2)};bestGap=gap;
        }
      }
      if(!best)return;
      const {x,z,nx,nz,ux,uz,half}=best,top=Math.min(2.8,h*.77);
      const panel=(lo,hi,back,front,col,left=-half,right=half)=>{
        for(const [u,y,d] of [[left,lo,back],[right,lo,back],[right,hi,front],[left,lo,back],[right,hi,front],[left,hi,front]])
          vertex(batches[1],x+ux*u+nx*d,y,z+uz*u+nz*d,0,0,col);
      };
      if(seed%3===0){
        panel(.12,top,.06,.06,concrete);
        for(let y=.25;y<top;y+=.22)panel(y,y+.028,.075,.075,tint);
      }else{
        panel(.12,top,.06,.06,doorway);
        for(let u=-half+.4;u<half-.1;u+=1.3)panel(.12,top,.08,.08,concrete,u,u+.055);
        panel(top*.78,top*.78+.065,.08,.08,concrete);
      }
      panel(top+.22,top,.07,.84,tint);
      if(h>=6.4&&seed%4!==0){
        panel(3.25,3.25,.06,.90,concrete);panel(3.13,3.25,.90,.90,concrete);
        panel(3.28,3.60,.87,.87,concrete);panel(4.09,4.15,.87,.87,tint);
        for(const u of [-half,0,half-.055])panel(3.55,4.12,.87,.87,tint,u,u+.055);
      }
      if(zone)streetFronts.push({x:x-cx,y:baseY,z:z-cz,nx,nz,ux,uz,half,top,h,seed,zone});
    }
    const ids=new Set(),surveyedIds=new Set(surveyed.map(row=>row[0]));
    const [lon,lat]=graph.geo(cx,cz);
    const pins=VietnamTourism.nearby(lon,lat,720/graph.mx,720/graph.my)
      .filter(p=>p.id.startsWith('osm-node-')&&p.kind==='Công trình tín ngưỡng')
      .map(site=>({...graph.point(site.lon,site.lat),site}));
    for(const [id,kind,tagH,levels,raw,shape,part] of [...surveyed,...extra]){
      if(ids.has(id)||landmarks?.modeledBuildings.has(id))continue;
      const first=graph.point(raw[0][0]/scale,raw[0][1]/scale);
      if(Math.abs(first.x-cx)>850||Math.abs(first.z-cz)>850)continue;
      const rings=raw.map(r=>decode(r,graph)).filter(r=>r.length>=3);
      if(!rings.length)continue;
      const outer=rings[0];let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;
      for(const p of outer){minX=Math.min(minX,p.x);minZ=Math.min(minZ,p.y);maxX=Math.max(maxX,p.x);maxZ=Math.max(maxZ,p.y);}
      const x=(minX+maxX)/2,z=(minZ+maxZ)/2;
      if(Math.hypot(x-cx,z-cz)>620+Math.hypot(maxX-minX,maxZ-minZ)/2)continue;
      const original=surveyedIds.has(id),box={minX,minZ,maxX,maxZ};
      if(overlapsSight(landmarks,rings,box,!original))continue;
      if(!original&&(visitorGround(x,z)||overlapsMapped(rings,box)||obstructsRoad(rings,box,x,z)))continue;
      ids.add(id);
      // Keep floors level, and seat the plinth against the terrain around the
      // entire footprint, including courtyard edges and long downhill walls.
      baseY=ground(x,z);
      const profiles=rings.map(ring=>ring.map((a,j)=>{
        const c=ring[(j+1)%ring.length],steps=Math.max(1,Math.ceil(a.distanceTo(c)/12)),samples=[];
        for(let k=0;k<steps;k++){
          const t=k/steps,px=a.x+(c.x-a.x)*t,pz=a.y+(c.y-a.y)*t,h=ground(px,pz);
          baseY=Math.max(baseY,h);samples.push({x:px,z:pz,h});
        }
        return samples;
      }));
      let seed=0;for(let i=0;i<id.length;i++)seed=(Math.imul(seed,31)+id.charCodeAt(i))>>>0;
      const warehouse=/warehouse|industrial|shed|garage|roof|barn/.test(kind);
      facadeSeed=(seed%997)/2493;
      const ref='osm-'+(id[0]==='w'?'way':'relation')+'-'+id.slice(1).split(':')[0];
      const pin=original&&pins.find(p=>p.x>=minX&&p.x<=maxX&&p.z>=minZ&&p.z<=maxZ&&insideBuilding(p.x,p.z,rings));
      const site=original&&(VietnamTourism.byId.get(ref)||pin?.site);
      const tagged=original&&(window.VietnamSightDetails?.[ref]||window.VietnamSightDetails?.[pin?.site.id]);
      const detail=part?{...tagged,...part}:tagged;
      const use=detail?.building||kind,faith=detail?.religion;
      const label=site?.name||'';
      opening=use==='temple'||['buddhist','vietnamese_folk','chinese_folk','Phật_Giáo'].includes(faith)||/^(chùa|đền|đình|miếu)\s/iu.test(label)?1:
        /church|cathedral|chapel/.test(use)||faith==='christian'||/^nhà thờ\s/iu.test(label)?2:use==='mosque'||faith==='muslim'?3:0;
      const bottom=part?.min_height||part?.['building:min_level']*3.3||0;
      const rise=parseFloat(detail?.['roof:height'])||detail?.['roof:levels']*3.3;
      const h=Math.min(850,Math.max(bottom+.3,2,tagH||parseFloat(detail?.height)||(levels&&levels*3.3+(part&&rise||0))||structures.heightAt(graph,x,z)||(warehouse?5.4:3.7+seed%3*3)));
      const b={id,h,bottom,parent:part?.parent,rings,...box,surveyed:original};
      const block=Math.floor(x/70)+','+Math.floor(z/70);blocks.set(block,(blocks.get(block)||0)+1);
      for(let i=Math.floor((minX-12)/cell);i<=Math.floor((maxX+12)/cell);i++)for(let j=Math.floor((minZ-12)/cell);j<=Math.floor((maxZ+12)/cell);j++){
        const key=i+','+j;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(b);
      }
      const [bLon,bLat]=graph.geo(x,z),zone=window.CentralStreetscapes?.zoneAt(bLon,bLat);
      const zWalls=zone?zone.walls:null,zRoofs=zone?zone.roofs:null;
      const flat=rings.flat(),roofColor=detail?.['roof:colour']?new T.Color(detail['roof:colour']):zRoofs?new T.Color(zRoofs[opening===1?0:seed%zRoofs.length]):roofs[opening===1?0:seed%roofs.length];
      const base=detail?.['building:colour']?new T.Color(detail['building:colour']):detail?.['building:material']==='wood'?new T.Color(0x99765a):zWalls?new T.Color(zWalls[seed%zWalls.length]):palette[seed%palette.length];
      if(!part&&!opening&&Math.hypot(x-cx,z-cz)<185&&h>=3&&h<17&&maxX-minX<32&&maxZ-minZ<32&&
        /^(yes|residential|house|terrace|apartments|retail|commercial|building)$/.test(kind))streetFront(outer,h,roofColor,seed,zone);
      let eave=h;
      const lowRiseRoof=!part&&h<(zone?.forcePitched?10.5:7.2)&&(warehouse||zone?.forcePitched||seed%5<2)?'gabled':null;
      const roofShape=shape||detail?.['roof:shape']||(opening===1?'hipped':opening===2?'gabled':lowRiseRoof);
      const pitched=['hipped','gabled','pyramidal','hipped-and-gabled','side_hipped','round','skillion','onion','dome','saltbox','mansard'].includes(roofShape);
      const visitorRoof=original&&(site||opening||part||shape)&&pitched&&buildVisitorRoof(T,rings,roofShape,h,
        rise,roofColor,base,([px,py,pz],[u,v],tint,tiles)=>{
          const finish=tiles&&(/metal/.test(detail?.['roof:material'])?2:opening===1||detail?.['roof:material']==='roof_tiles'?1:0);
          vertex(batches[1],px,py,pz,u,v,tint,Number(finish));
        },opening===1,detail,bottom);
      if(visitorRoof){
        eave=visitorRoof;
      }else if(rings.length===1&&outer.length===4&&pitched){
        const start=outer[0].distanceTo(outer[1])>=outer[1].distanceTo(outer[2])?0:1;
        const [a,c,d,f]=Array.from({length:4},(_,i)=>outer[(start+i)%4]);
        eave=h-Math.min(h*.25,3,a.distanceTo(f)*.25);
        const l=a.clone().lerp(f,.5),r=c.clone().lerp(d,.5);
        const inset=roofShape==='gabled'?0:roofShape==='pyramidal'?.5:.2;
        const highL=l.clone().lerp(r,inset),highR=r.clone().lerp(l,inset);
        for(const tri of [[a,c,highR],[a,highR,highL],[f,highL,highR],[f,highR,d],[f,a,highL],[c,d,highR]]){
          for(const p of tri)vertex(batches[1],p.x,p===highL||p===highR?h:eave,p.y,0,0,roofColor);
        }
      }else{
        for(const tri of T.ShapeUtils.triangulateShape(outer,rings.slice(1)))for(const index of [tri[0],tri[2],tri[1]]){
          const p=flat[index];vertex(batches[1],p.x,h,p.y,0,0,roofColor);
        }
      }
      if(bottom>0)for(const tri of T.ShapeUtils.triangulateShape(outer,rings.slice(1)))for(const k of tri){
        const p=flat[k];vertex(batches[1],p.x,bottom,p.y,0,0,concrete);
      }
      for(let ri=0;ri<rings.length;ri++)for(let j=0;j<rings[ri].length;j++){
        const ring=rings[ri],profile=profiles[ri];
        const a=ring[j],c=ring[(j+1)%ring.length],length=a.distanceTo(c);
        if(length<.2)continue;
        const count=warehouse?0:Math.floor(length/(opening?3.8:2.85)),floors=opening?Math.max(1,levels||1):Math.max(1,Math.round(h/3.3));
        const samples=profile[j],next=profile[(j+1)%ring.length][0],wallBatch=batches[0];
        if(bottom>0){quad(wallBatch,a,c,bottom,Math.max(bottom,eave),base,count,floors);continue;}
        // On nearly level blocks the wall itself can reach beneath the grass.
        if(samples.every(p=>baseY-p.h<.16)&&baseY-next.h<.16){
          quad(wallBatch,a,c,-.39,eave,base,count,floors);continue;
        }
        quad(wallBatch,a,c,0,eave,base,count,floors);
        for(let k=0;k<samples.length;k++){
          const l=samples[k],r=samples[k+1]||profile[(j+1)%ring.length][0];
          // The grass mesh sits 17 cm below the nominal ground.
          const lowL=l.h-baseY-.22,lowR=r.h-baseY-.22;
          for(const [p,y] of [[l,lowL],[r,lowR],[l,0],[r,lowR],[r,0],[l,0]]){
            vertex(wallBatch,p.x,y,p.z,Math.hypot(p.x-a.x,p.z-a.y)/5,y/4,concrete);
            wallBatch.bays.push(-1,0);
          }
        }
      }
    }
    for(const b of batches){
      if(!b.pos.length)continue;
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));
      g.setAttribute(b.mat===wall?'openingStyle':'roofFinish',new T.Float32BufferAttribute(b.styles,1));
      g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(b.cols,3));if(b.bays.length)g.setAttribute('bays',new T.Float32BufferAttribute(b.bays,2));g.computeVertexNormals();
      const mesh=new T.Mesh(g,b.mat);mesh.receiveShadow=true;mesh.castShadow=true;group.add(mesh);
    }
  }
  function footprint(site,x,z){
    const id=site.map?.match(/\/(way|relation)\/(\d+)$/);
    const near=cells.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[];
    if(id){
      const key=id[1][0]+id[2],match=near.find(b=>b.id.split(':')[0]===key||b.parent?.split(':')[0]===key);
      if(match)return match;
    }
    if(!['Công trình tín ngưỡng','Bảo tàng','Kiến trúc','Phòng trưng bày'].includes(site.kind))return null;
    return near.find(b=>b.surveyed&&insideBuilding(x,z,b.rings));
  }
  return {load:async(g,x,z)=>(await Promise.all([load(g,x,z),parts.load(g,x,z)])).some(Boolean),
    build,contact,footprint,overlapsSight,streetFronts,builtUp:(x,z)=>cells.has(Math.floor(x/cell)+','+Math.floor(z/cell)),
    mappedBlock:(x,z)=>(blocks.get(Math.floor(x/70)+','+Math.floor(z/70))||0)>=3};
}
