'use strict';

// Trần Phú and Cẩm Kim. Footprints set the widths, setbacks and orientation.
// Reference views and the limits of the reconstruction are in streetscape/hoi-an-frontages.txt.
window.SurveyedStreetFronts=(()=>{
  const specific={
    w626704907:{kind:'hotel',height:6.9,street:[108.326889,15.877082]},
    w632392120:{kind:'stone',height:4.65,street:[108.311714,15.870650]},
    w632392119:{kind:'ochre',height:4.7,street:[108.311714,15.870650]}
  };
  const town={kind:'trading'},village={kind:'porch'};
  // Consecutive segments of the two photographed Cẩm Kim lanes. At a fork
  // keep the continuation of the lane, not the perpendicular service road.
  const laneEdges=new Set([419036,419037,419038,417927,417928,417929]);
  function profile(id,lon,lat){
    if(id[0]!=='w'||lon<108.309||lon>108.333||lat<15.865||lat>15.879)return null;
    if(specific[id])return specific[id];
    if(lon>=108.326&&lon<=108.332&&lat>=15.8765&&lat<=15.8782)return town;
    // Restrict the village patterns to the two photographed streets.
    for(const [x,y] of [[108.311714,15.870650],[108.322097,15.867500]]){
      if(Math.hypot((lon-x)*107100,(lat-y)*110900)<135)return village;
    }
    return null;
  }
  function select(record,ring,roads,graph,contains){
    const anchor=record.street&&graph.point(...record.street);
    let best=null,bestDistance=Infinity;
    for(let i=0;i<ring.length;i++){
      const a=ring[i],end=ring[(i+1)%ring.length],dx=end.x-a.x,dz=end.y-a.y;
      const len=Math.hypot(dx,dz);if(len<.2)continue;
      const ux=dx/len,uz=dz/len,prev=ring[(i+ring.length-1)%ring.length];
      // OSM often splits a straight façade at the entrance node.
      function collinear(x,z){
        const length=Math.hypot(x,z);
        return length>.01&&(ux*x+uz*z)/length>.997;
      }
      if(collinear(a.x-prev.x,a.y-prev.y))continue;
      let j=(i+1)%ring.length,b=end;
      const edges=new Set([i]);
      while(j!==i){
        const next=ring[(j+1)%ring.length];
        if(!collinear(next.x-b.x,next.y-b.y)||Math.abs((next.x-a.x)*uz-(next.y-a.y)*ux)>.12)break;
        edges.add(j);j=(j+1)%ring.length;b=next;
      }
      const half=a.distanceTo(b)/2;
      if(half<1.6||half>9)continue;
      const x=(a.x+b.x)/2,z=(a.y+b.y)/2;
      let nx=uz,nz=-ux;
      if(contains(x+nx*.12,z+nz*.12)){nx=-nx;nz=-nz;}
      let distance=Infinity;
      if(anchor){
        const rx=anchor.x-x,rz=anchor.z-z,d=Math.hypot(rx,rz);
        if(rx*nx+rz*nz>.6*d)distance=d;
      }else for(const s of roads){
        if(record===town&&s.name!=='Trần Phú')continue;
        if(record===village&&!laneEdges.has(s.id))continue;
        const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.length2));
        const rx=s.a.x+s.dx*t-x,rz=s.a.z+s.dz*t-z,d=Math.hypot(rx,rz);
        if(d-s.w>(record===town?5.5:15)||d<s.w+.08||rx*nx+rz*nz<d*.9)continue;
        distance=Math.min(distance,d);
      }
      if(distance>=bestDistance||distance>55)continue;
      const inset=Math.min(record===town?.73:1.12,half*.25);
      // Keep both reveals in the same solid footprint, including concave lots.
      const shoulder=Math.min(.45,half*.2);
      if(![-half+shoulder,0,half-shoulder].every(u=>contains(x+ux*u-nx*inset,z+uz*u-nz*inset)))continue;
      best={x,z,nx,nz,ux,uz,half,inset,shoulder,edges,surveyKind:record.kind};
      bestDistance=distance;
    }
    return best;
  }

  function wallColour(kind,seed){
    if(kind==='stone')return 0x69665a;
    if(kind==='ochre')return 0xcbad76;
    if(kind==='hotel')return 0xd4a554;
    if(kind==='porch')return [0xc7c2aa,0xcac3b3,0xc9a294,0xd8c48e][seed%4];
    return null;
  }

  function draw(T,f,eave,wall,roofTint,emit){
    const {half,inset,shoulder,surveyKind}=f;
    const village=['porch','stone','ochre'].includes(surveyKind);
    const upper=surveyKind==='hotel'||(surveyKind==='trading'||surveyKind==='porch')&&eave>=4.95;
    const soffit=upper?Math.min(3.12,eave*.54):eave-.36;
    const floor=.19, span=half-shoulder,back=-inset,post=-.12;
    const timber=surveyKind==='hotel'?0x554032:0x534438,shadow=0x3d372e;
    const stone=0xa49c8c,cream=0xd7c7a8,pan=0x786e61;
    const colours=new Map();
    const colour=v=>{if(typeof v!=='number')return v;if(!colours.has(v))colours.set(v,new T.Color(v));return colours.get(v);};
    function face(a,b,c,d,col,finish){
      const tint=colour(col);
      finish??=col===wall?(surveyKind==='stone'?3:6):col===timber?5:col===stone||col===pan?3:0;
      const horizontal=a[1]===b[1]&&b[1]===c[1];
      const returnFace=Math.abs(a[0]-b[0])+Math.abs(a[0]-c[0])<.001;
      for(const p of [a,b,c,a,c,d]){
        const [u,y,v]=p;
        emit(f.x+f.ux*u+f.nx*v,y,f.z+f.uz*u+f.nz*v,returnFace?v:u,finish===1||horizontal?v:y,tint,finish);
      }
    }
    function panel(left,right,low,high,depth,col){
      face([left,low,depth],[right,low,depth],[right,high,depth],[left,high,depth],col);
    }
    function slab(left,right,low,high,rear,front,col){
      panel(left,right,low,high,front,col);
      face([left,high,front],[right,high,front],[right,high,rear],[left,high,rear],col);
      for(const u of [left,right])face([u,low,rear],[u,low,front],[u,high,front],[u,high,rear],col);
    }
    // Side piers, deep door and floor are all behind the mapped building line.
    // Even where the street comes right up to the wall, the step stays inside.
    for(const side of [-1,1]){
      const u=side*span;
      panel(Math.min(side*half,u),Math.max(side*half,u),0,eave,0,wall);
      face([u,floor,0],[u,floor,back],[u,eave,back],[u,eave,0],wall);
    }
    slab(-span,span,0,floor*.49,back,-.006,stone);
    slab(-span,span,floor*.49,floor,back,Math.max(back+.03,-.23),pan);
    panel(-span,span,floor,eave,back,wall);
    face([-span,eave,0],[span,eave,0],[span,eave,back],[-span,eave,back],wall);
    const bays=surveyKind==='hotel'?3:Math.max(2,Math.min(5,Math.round(2*span/(village?2.55:1.9))));
    const pitch=2*span/bays,aperture=pitch*(village?.66:.87);
    const head=soffit-.18;
    for(let i=0;i<bays;i++){
      const u=(i+.5)*pitch-span,left=u-aperture*.5,right=u+aperture*.5,door=i===Math.floor(bays/2);
      const sill=door||!village?floor:Math.min(1.03,head*.48);
      panel(left,right,sill,head,back+.025,shadow);
      for(const jamb of [left,right-.07])slab(jamb,jamb+.07,sill,head+.07,back+.027,back+.09,timber);
      slab(left,right,head,head+.085,back+.027,back+.09,timber);
      if(!door&&surveyKind!=='hotel'){
        const slats=village?6:8;
        for(let s=0;s<slats;s++){
          const y=sill+(head-sill)*s/slats;
          panel(left+.09,right-.09,y+.022,y+(head-sill)/slats-.012,back+.045,s%3===0?0x625144:timber);
        }
      }else{
        slab(left+.09,left+.30,sill,head-.04,back+.04,back+.17,timber);
      }
    }
    const lip=Math.min(soffit+.12,eave-.04);
    slab(-half,half,soffit-.11,soffit,back,-.014,village?wall:timber);
    if(upper){
      // The balcony gallery is set back, with daylight between its balusters.
      for(let i=0;i<bays;i++){
        const u=(i+.5)*pitch-span;
        panel(u-aperture*.4,u+aperture*.4,soffit+.12,eave-.29,back+.032,timber);
        slab(u-.045,u+.045,soffit+.12,eave-.27,back+.04,back+.09,wall);
      }
      slab(-span,span,soffit,soffit+.12,back,0,pan);
      const railTop=Math.min(soffit+1.04,eave-.2);
      slab(-span,span,railTop-.07,railTop,post-.05,post+.05,timber);
      slab(-span,span,soffit+.22,soffit+.29,post-.05,post+.05,timber);
      const sticks=Math.ceil(2*span/.29);
      for(let n=0;n<=sticks;n++){
        const u=(n/sticks*2-1)*span;
        slab(u-.025,u+.025,soffit+.24,railTop,post-.036,post+.036,timber);
      }
    }
    // Roof tiles use the same scale-aware shader as the existing clay roofs.
    const roofTop=eave-.04;
    face([-half,roofTop,back],[half,roofTop,back],[half,roofTop-.17,0],[-half,roofTop-.17,0],roofTint,1);
    if(!upper&&soffit>.7){
      face([-span,lip+.18,back],[span,lip+.18,back],[span,lip,-.01],[-span,lip,-.01],roofTint,1);
    }
    for(let i=0;i<=bays;i++){
      const u=i*pitch-span,top=upper?eave-.15:soffit;
      if(!village&&i>0&&i<bays&&!upper)continue;
      const w=village?.105:.067,material=village?wall:timber;
      if(surveyKind==='stone'){
        // Fluted round columns stand between the heavy square end piers.
        const r=i===0||i===bays?.19:.14;
        if(i===0||i===bays)slab(u-r,u+r,floor,top,post-.23,0,wall);
        else for(let k=0;k<12;k++){
          const a=k*Math.PI/6,b=(k+1)*Math.PI/6,z=post-r;
          const ax=u+Math.cos(a)*r,az=z+Math.sin(a)*r,bx=u+Math.cos(b)*r,bz=z+Math.sin(b)*r;
          face([ax,floor,az],[bx,floor,bz],[bx,top,bz],[ax,top,az],k%2?wall:0x625f54,3);
        }
        slab(u-r-.035,u+r+.035,top-.25,top-.15,post-.31,-.005,wall);
      }else slab(u-w,u+w,floor,top,post-.08,post+.045,material);
      if(village){
        slab(u-w-.035,u+w+.035,floor,floor+.18,post-.10,post+.065,stone);
        slab(u-w-.038,u+w+.038,top-.16,top-.06,post-.10,post+.065,cream);
      }
    }
    if(surveyKind==='stone'){
      // A pierced parapet, raised central pediment and finials silhouette the
      // dark house in the Cẩm Kim reference, above a deep moulded cornice.
      slab(-half,half,eave-.27,eave-.14,back,-.004,wall);
      slab(-half,half,eave-.15,eave+.03,back,-.04,0x555449);
      slab(-half,half,eave+.03,eave+.18,back,-.08,wall);
      const rail=eave+.60;
      slab(-half,half,rail-.09,rail,back,-.085,wall);
      for(let n=0;n<=6;n++){
        const u=(n/3-1)*(half-.16),w=n%2===0?.16:.10;
        slab(u-w,u+w,eave+.16,rail,back,-.12,wall);
        if(n%2===0){
          slab(u-w-.03,u+w+.03,rail,rail+.09,back,-.09,wall);
          slab(u-w*.64,u+w*.64,rail+.09,rail+.23,back,-.15,wall);
        }
      }
      const w=Math.min(.87,span*.32);
      for(let i=0;i<9;i++){
        const left=(i/9*2-1)*w,right=((i+1)/9*2-1)*w;
        const crown=u=>rail+.24+.28*Math.sqrt(Math.max(0,1-(u/w)**2));
        face([left,rail,-.10],[right,rail,-.10],[right,crown(right),-.10],[left,crown(left),-.10],wall);
        face([left,crown(left),-.10],[right,crown(right),-.10],[right,crown(right),back],[left,crown(left),back],wall);
      }
    }
    if(surveyKind==='hotel'){
      // Four round lanterns hang from the street gallery.
      for(const offset of [-.73,-.30,.30,.73]){
        const u=offset*span,v=post-.22,r=Math.min(.20,pitch*.09),y=soffit-r*1.36;
        const rings=[[.32,-1],[.88,-.62],[1,0],[.88,.62],[.32,1]];
        function point(angle,[width,level]){
          return [u+Math.cos(angle)*r*width,y+level*r,v+Math.sin(angle)*r*width];
        }
        for(let j=1;j<rings.length;j++)for(let k=0;k<8;k++){
          const l=k*Math.PI/4,h=(k+1)*Math.PI/4;
          face(point(l,rings[j-1]),point(h,rings[j-1]),point(h,rings[j]),point(l,rings[j]),k%2?0x9d463a:0x963d32);
        }
        panel(u-.011,u+.011,y-r-.12,y+r*1.4,v,0x745644);
      }
    }
    return {top:soffit,balcony:upper?inset:0};
  }
  return {profile,select,draw,wallColour};
})();
