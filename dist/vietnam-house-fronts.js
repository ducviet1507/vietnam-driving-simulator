'use strict';

// Recesses are carved into ordinary street-facing footprints. Surveyed façades,
// monuments and structures with an open ground floor are selected by the caller.
window.VietnamHouseFronts=(()=>{
  // Clip a ring edge to the interior of a rectangular room. This detects a thin
  // courtyard or notch even when it falls entirely between the room's corners.
  function cutsRoom(u,v,du,dv,span,depth){
    let entry=0,exit=1;
    for(const [start,delta,lo,hi] of [[u,du,-span,span],[v,dv,.002,depth]]){
      if(Math.abs(delta)<1e-10){
        if(start<lo||start>hi)return false;
      }else{
        const a=(lo-start)/delta,b=(hi-start)/delta;
        entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
        if(entry>exit)return false;
      }
    }
    return true;
  }

  function roomFits(f,rings,contains){
    const span=f.half-f.shoulder;
    if(!contains(f.x-f.nx*f.inset,f.z-f.nz*f.inset))return false;
    for(const ring of rings){
      let a=ring[ring.length-1];
      for(const b of ring){
        const ax=a.x-f.x,az=a.y-f.z,dx=b.x-a.x,dz=b.y-a.y;
        if(cutsRoom(ax*f.ux+az*f.uz,-ax*f.nx-az*f.nz,
          dx*f.ux+dz*f.uz,-dx*f.nx-dz*f.nz,span+.012,f.inset+.015))return false;
        a=b;
      }
    }
    return true;
  }

  function select(rings,roads,contains,options){
    const {h,kind,zone}=options;
    if(h<3||h>=25||zone?.id==='hoi-an'||
      !['yes','building','residential','house','terrace','apartments','detached','retail','commercial','shop'].includes(kind))return null;
    const ring=rings[0];
    // Adjacent OSM ids often differ by just one digit. Hash all bits before
    // choosing joinery so a whole terrace does not share one balcony design.
    let seed=options.seed>>>0;seed=Math.imul(seed^(seed>>>16),0x21f0aaad);
    seed=Math.imul(seed^(seed>>>15),0x735a2d97);seed=(seed^(seed>>>15))>>>0;
    let best=null,bestGap=18;
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],dx=b.x-a.x,dz=b.y-a.y,len=Math.hypot(dx,dz);
      if(len<.35||len>14)continue;
      const ux=dx/len,uz=dz/len,previous=ring[(i+ring.length-1)%ring.length];
      // Join only truly collinear, forward-pointing edges. Each removed edge
      // must coincide with the straight outer frame that replaces its wall.
      function collinear(px,pz){return Math.abs(px*uz-pz*ux)<.0001&&px*ux+pz*uz>0;}
      if(collinear(a.x-previous.x,a.y-previous.y))continue;
      let j=(i+1)%ring.length,end=b;
      while(j!==i){
        const next=ring[(j+1)%ring.length];
        if(!collinear(next.x-a.x,next.y-a.y)||!collinear(next.x-end.x,next.y-end.y))break;
        end=next;j=(j+1)%ring.length;
      }
      const half=Math.hypot(end.x-a.x,end.y-a.y)/2;
      if(half<1.25||half>7||j===i)continue;
      const x=(a.x+end.x)/2,z=(a.y+end.y)/2;
      let nx=uz,nz=-ux;
      if(contains(x+nx*.06,z+nz*.06)){nx=-nx;nz=-nz;}
      if(!contains(x-nx*.06,z-nz*.06))continue;
      let gap=bestGap,street='';
      for(const road of roads){
        if(!road.length2)continue;
        const t=Math.max(0,Math.min(1,((x-road.a.x)*road.dx+(z-road.a.z)*road.dz)/road.length2));
        const rx=road.a.x+t*road.dx-x,rz=road.a.z+t*road.dz-z,d=Math.hypot(rx,rz),g=d-road.w;
        if(g<.06||g>=gap||nx*rx+nz*rz<.89*d)continue;
        gap=g;street=road.name||'';
      }
      if(gap>=bestGap)continue;
      const f={x,z,nx,nz,ux,uz,half,seed,kind,gap,levels:options.levels,southern:options.lat<13,coastal:options.lat>=13&&options.lat<18,shoulder:Math.min(.65,.17+half*.085),
        inset:Math.min(2.05,.42+half*.34+((seed>>>3)%4)*.09)};
      // Try a shallower entrance on tapering or shallow lots. Anything that
      // still crosses a boundary retains its ordinary uncut wall.
      if(!roomFits(f,rings,contains)){
        f.inset*=.59;
        if(f.inset<.56||!roomFits(f,rings,contains))continue;
      }
      f.edges=new Set();
      for(let k=i;k!==j;k=(k+1)%ring.length)f.edges.add(k);
      // Christophe95's 2018 street photograph shows the junction of Hàng Bạc
      // and Hàng Đào. Use the joinery study only on the adjoining street block.
      f.hangBac=options.lon>=105.85060&&options.lon<=105.85134&&
        Math.abs(options.lat-21.03405)<.00016&&/^(?:Phố )?Hàng Bạc$/iu.test(street);
      best=f;bestGap=gap;
    }
    return best;
  }

  function draw(T,f,eave,wall,roof,emit){
    const {half,shoulder,inset,seed}=f,span=half-shoulder,back=-inset;
    const storeys=Math.max(1,Math.min(7,Math.floor(eave/2.55),
      f.levels>0?Math.round(f.levels):Math.round(eave/3.35)));
    const first=storeys===1?eave:Math.min(4.15,eave/storeys+.22);
    const upperRise=storeys>1?(eave-first)/(storeys-1):0;
    const commercial=f.kind==='retail'||f.kind==='commercial'||f.kind==='shop';
    const colours=new Map();
    const shade=wall.clone().multiplyScalar(.74),soffit=wall.clone().lerp(new T.Color(0xded6c5),.34);
    const limestone=0xb4ad9e,plinth=0x7e7970,glass=0x667c7d;
    const frame=[0x494f4d,0x696d64,0x655044,0x58686a][(seed>>>6)%4];
    const screen=[0x686d61,0x4c655f,0x69564a][(seed>>>10)%3];
    const sideEntry=span>1.65&&(commercial||seed%3===1);
    const shutter=seed%4===0&&!commercial;
    let triangles=0;
    function face(a,b,c,d,tint,finish=0){
      if(typeof tint==='number'){
        if(!colours.has(tint))colours.set(tint,new T.Color(tint));
        tint=colours.get(tint);
      }
      const horizontal=a[1]===b[1]&&b[1]===c[1],side=a[0]===b[0]&&b[0]===c[0];
      const pts=[a,b,c,d],fitted=finish===7||finish>=11;
      for(const i of [0,1,2,0,2,3]){
        const [u,y,v]=pts[i],uvx=fitted?Number(i===1||i===2):side?v:u;
        const uvy=fitted?Number(i>=2):horizontal?v:y;
        emit(f.x+f.ux*u+f.nx*v,y,f.z+f.uz*u+f.nz*v,uvx,uvy,tint,finish);
      }
      triangles+=2;
    }
    function panel(l,r,lo,hi,v,tint,finish){
      if(hi-lo<.001||r-l<.001)return;
      face([l,lo,v],[r,lo,v],[r,hi,v],[l,hi,v],tint,finish);
    }
    function shelf(l,r,y,rear,front,tint){
      face([l,y,front],[r,y,front],[r,y,rear],[l,y,rear],tint);
    }
    function jamb(u,lo,hi,rear,front,tint){
      face([u,lo,rear],[u,lo,front],[u,hi,front],[u,hi,rear],tint);
    }
    function beam(l,r,lo,hi,rear,front,tint){
      panel(l,r,lo,hi,front,tint);shelf(l,r,lo,rear,front,soffit);
      shelf(l,r,hi,rear,front,tint);
    }

    // The unmoved outer piers meet the adjacent original walls exactly. The
    // covered vestibule floor, walls and ceiling run back into the plot.
    const floor=.17,head=first-.28;
    for(const side of [-1,1]){
      const u=side*span;
      panel(Math.min(u,side*half),Math.max(u,side*half),0,.31,0,plinth);
      panel(Math.min(u,side*half),Math.max(u,side*half),.31,eave,0,wall,6);
      jamb(u,0,eave,back,0,shade);
    }
    beam(-span,span,0,floor*.48,back,-.012,plinth);
    beam(-span,span,floor*.48,floor,back,-inset*.26,limestone);
    beam(-span,span,head,first,back,0,wall);
    const shopWidth=span*Math.min(.92,.79+((seed>>>9)%5)*.024),doorFront=back+inset*.29;
    const doorHead=Math.min(head-.08,2.78),doorTop=doorHead+.08;
    // Open lower bay: the rear wall lies behind both jambs and the overhead
    // rolling grille. Shop counters and glazing sit within this room.
    panel(-span,span,floor,head,back,commercial?0x81766a:0x605e55);
    panel(-span,-shopWidth,floor,head,doorFront,shade);panel(shopWidth,span,floor,head,doorFront,shade);
    for(const u of [-shopWidth,shopWidth])jamb(u,floor,doorTop,back,doorFront,frame);
    panel(-shopWidth,shopWidth,doorTop,head,doorFront,shade);
    shelf(-shopWidth,shopWidth,doorTop,back,doorFront,soffit);
    if(commercial){
      const r=shopWidth*(seed%2?.13:.48);
      beam(-shopWidth,r,floor+.58,floor+.85,back+.045,doorFront-.025,limestone);
      panel(-shopWidth,r,floor,floor+.58,doorFront-.025,frame);
      const end=back+inset*.10;
      panel(-shopWidth,shopWidth,doorHead-.43,doorHead,end,glass,7);
      // Receding tiled shelf and the bottom of the rolled grille remain visible
      // above the counter when looking along a row of ground-floor shops.
      beam(-shopWidth+.08,r,1.25,1.31,back+.025,back+inset*.16,limestone);
      panel(-shopWidth,shopWidth,doorHead-.28,doorHead,doorFront-.018,0x767a72,8);
    }else if((seed>>>7)%3===1){
      // A fitted door panel sits at the back of its masonry reveal.
      panel(-shopWidth,shopWidth,floor+.035,doorHead,back+.037,wall,11+((seed>>>13)%4));
    }else if(shutter){
      panel(-shopWidth,shopWidth,floor+.04,doorHead,doorFront-.055,0x778680,8);
      panel(-shopWidth,shopWidth,floor+.04,floor+.105,doorFront-.042,frame);
    }else{
      const v=back+inset*.10;
      panel(-shopWidth,shopWidth,floor+.29,doorHead,v,glass,7);
      const n=shopWidth>1.8?4:2;
      for(let i=1;i<n;i++){
        const u=shopWidth*(2*i/n-1);
        panel(u-.029,u+.029,floor,doorHead,v+.018,frame);
      }
      panel(-shopWidth,shopWidth,doorHead-.43,doorHead-.37,v+.018,frame);
    }
    if(sideEntry){
      const entry=Math.min(1.03,shopWidth*.71),left=shopWidth-entry,v=doorFront+.10;
      // A separate leaf beside the wider ground-floor bay has its own reveal.
      panel(left-.11,left+.08,floor,doorHead,v,wall);
      jamb(left-.11,floor,doorHead,back,v,shade);jamb(left+.08,floor,doorHead,back,v,shade);
      panel(left+.08,shopWidth,floor,doorHead-.33,v-.11,screen);
      for(let j=1;j<5;j++){
        const u=left+.08+j*(entry-.08)/5;
        panel(u-.012,u+.012,floor+.07,doorHead-.39,v-.087,frame);
      }
      panel(left+.08,shopWidth,doorHead-.33,doorHead-.28,v-.075,frame);
    }

    for(let level=1;level<storeys;level++){
      const y=first+(level-1)*upperRise,high=level===storeys-1?eave:y+upperRise;
      const gallery=level===1||((seed>>>level)&3)!==0;
      const facade=gallery?back+inset*.16:back*.47,windowPlane=facade-inset*.105;
      const open=span*(span>2.8?.77:.84),sill=y+(gallery?.33:.66),lintel=high-.43;
      // The beam at the top of the previous storey supplies this loggia's floor.
      panel(-span,span,y,sill,facade,wall,6);panel(-span,span,lintel,high,facade,wall,6);
      panel(-span,-open,sill,lintel,facade,wall,6);panel(open,span,sill,lintel,facade,wall,6);
      for(const u of [-open,open])jamb(u,sill,lintel,windowPlane,facade,shade);
      shelf(-open,open,sill,windowPlane,facade,limestone);shelf(-open,open,lintel,windowPlane,facade,soffit);
      panel(-open,open,sill,lintel,windowPlane,glass,7);
      const lights=Math.min(5,Math.max(2,Math.round(2*open/1.2)));
      for(let i=1;i<lights;i++){
        const u=(2*i/lights-1)*open;
        panel(u-.025,u+.025,sill,lintel,windowPlane+.02,frame);
      }
      panel(-open,open,lintel-.37,lintel-.325,windowPlane+.02,frame);
      if(level===1&&seed%3===1){
        // A partly opened louvred shutter reveals the glazed sash at an angle.
        const l=-open,r=l+Math.min(.68,open*.62),v=facade+.026,wing=v+Math.min(.25,-v*.6);
        const pitch=(lintel-sill)/7;
        for(let i=0;i<7;i++){
          const y0=sill+i*pitch;
          face([l,y0,v],[r,y0,wing],[r,y0+.75*pitch,wing-.026],[l,y0+.75*pitch,v-.026],screen);
        }
      }
      if(gallery&&level===1&&open>1&&(seed>>>8)%3===0){
        // A condenser and its wall brackets sit inside the covered balcony.
        const l=-open+.06,r=l+.76,b=y+.18,t=b+.51,v=facade+.35;
        panel(l,r,b,t,v,0xb3b0a3);jamb(l,b,t,facade,v,shade);jamb(r,b,t,facade,v,shade);
        shelf(l,r,t,facade,v,limestone);
        for(let k=1;k<=5;k++)panel(l+.05,r-.15,b+k*.07,b+k*.07+.018,v+.007,frame);
      }
      if(gallery&&level===1&&(f.southern||f.coastal)&&(seed>>>9)%3===1){
        const v=facade+.12,w=Math.min(-.07,facade+inset*.6),cloth=[0x8d805e,0x637b78,0x927364][seed%3];
        face([-open,lintel+.04,v],[open,lintel+.04,v],[open,lintel-.40,w],[-open,lintel-.40,w],cloth);
        panel(-open,open,lintel-.49,lintel-.40,w,cloth);
      }
      if(gallery){
        const front=-Math.min(.12,inset*.12),railTop=y+Math.min(.98,upperRise*.34);
        const lattice=f.hangBac&&seed%3!==0,rails=!lattice&&(seed>>>6)%3===1;
        const railEnd=lattice?high-.22:railTop;
        const opaque=!lattice&&(seed>>>2)%3===1,base=y+(opaque?.65:.18);
        panel(-span,span,y,base,front,opaque?wall:limestone);
        beam(-span,span,railEnd-.065,railEnd,front-.08,front+.018,frame);
        const bars=Math.min(9,Math.max(3,Math.round(span*2/(rails?1.3:lattice?.72:.56))));
        for(let i=1;i<bars;i++){
          const u=(2*i/bars-1)*span;
          panel(u-.026,u+.026,base,railEnd,front-.012,frame);
          jamb(u+.026,base,railEnd,front-.047,front-.012,frame);
        }
        if(lattice||!opaque)panel(-span,span,railTop-.32,railTop-.28,front,frame);
        if(rails&&!opaque)panel(-span,span,railTop-.55,railTop-.50,front,frame);
        if(!lattice&&span>=1.35&&(seed>>>3)%3!==1){
          // A return wall shelters one side of the loggia. A short fixed
          // sunscreen, open on the other side, breaks up the full-width bay.
          const leftSide=(seed&1)===0,side=leftSide?-span:span;
          const inner=side+(leftSide?1:-1)*Math.min(span*.56,.88);
          const l=Math.min(side,inner),r=Math.max(side,inner),v=front+.032;
          const start=(seed>>>3)%3===2?railTop:y;
          if(start===y){
            panel(l,r,y,high-.19,v,wall,6);
            jamb(inner,y,high-.19,facade,v,shade);
          }else{
            const pitch=(high-.23-start)/5;
            for(let j=0;j<5;j++){
              const lo=start+j*pitch;
              face([l,lo,front-.07],[r,lo,front-.07],[r,lo+.56*pitch,v],[l,lo+.56*pitch,v],screen);
            }
          }
        }
      }
      beam(-span,span,high-.19,high,back,0,level===storeys-1?roof:wall);
    }
    return {top:head,balcony:storeys>1?inset-Math.min(.12,inset*.12):0,triangles};
  }
  return {select,draw};
})();
