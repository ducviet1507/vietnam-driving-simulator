'use strict';

// The OSM position and name identify the place. Sign designs and untagged
// dimensions are representative. A building-mounted sign needs a containing outline.
const roadsideSignStyles={
  bank:['Ngân hàng','#274e67'],cafe:['Cà phê','#63493b'],fuel:['Trạm xăng','#275971'],
  hospital:['Y tế','#376566'],hotel:['Lưu trú','#554f59'],market:['Chợ','#8e553a'],
  pharmacy:['Nhà thuốc','#256654'],restaurant:['Quán ăn','#944b37'],school:['Giáo dục','#903e38'],
  shop:['Cửa hàng','#3b5662'],bus:['Điểm dừng xe buýt','#245487']
};

function* buildNationalStreetscape(T,ctx){
  const {points,district,grounds,cx,cz,cellRoads,blocked,ground,placeBox,plant,register,group,radius,compact}=ctx;
  const signs=[],trees=[],usedBuildings=new Set();
  const distance=p=>p.x*p.x+p.z*p.z;
  const sorted=[...points].sort((a,b)=>distance(a)-distance(b));
  function nearest(x,z,reach){
    let best=null,closest=reach;
    for(const s of cellRoads(x,z,reach)){
      const t=Math.max(0,Math.min(s.len,(x-s.ax)*s.fx+(z-s.az)*s.fz));
      const rx=s.ax+s.fx*t,rz=s.az+s.fz*t,dist=Math.hypot(rx-x,rz-z);
      if(dist>=closest)continue;
      best={s,rx,rz,dist};closest=dist;
    }
    return best;
  }
  function offRoad(x,z){
    for(const s of cellRoads(x,z,1)){
      const t=Math.max(0,Math.min(s.len,(x-s.ax)*s.fx+(z-s.az)*s.fz));
      if(Math.hypot(x-s.ax-s.fx*t,z-s.az-s.fz*t)<s.w+.22)return false;
    }
    return true;
  }
  let work=0;
  // Individual mapped trunks take precedence over interpolated tree-row stations.
  for(const row of [false,true])for(const p of sorted){
    if((++work&31)===0)yield;
    if((p.kind==='row')!==row||(!row&&!['tree','pine','palm'].includes(p.kind)))continue;
    if(trees.length>=(compact?85:180)||distance(p)>Math.min(radius,330)**2)break;
    const kind=row?p.detail[0]:p.kind,h=(row?p.detail[1]:p.detail)||8;
    const road=nearest(p.x,p.z,52);
    if(!road||road.s.elevated||road.s.authoredPavement||!ctx.plantable(p.x,p.z)||
      grounds.nearFixture(p.x,p.z,row?3.5:.7))continue;
    grounds.occupy(p.x,p.z,row?1.4:.7,'mapped-trunk');
    plant(kind,p.x,p.z,h,h*(kind==='pine'?.47:kind==='palm'?.6:.86),Number.parseInt(p.id,10)%31,
      register({id:'survey-tree:'+p.id,kind:'tree',x:p.x,z:p.z,radius:Math.max(.13,h*.022),height:h,parts:[]}));
    trees.push(p);
  }
  for(const p of sorted){
    if((++work&15)===0)yield;
    if(signs.length>=(compact?24:48)||distance(p)>Math.min(250,radius)**2)break;
    if(!Object.hasOwn(roadsideSignStyles,p.kind))continue;
    const bus=p.kind==='bus',road=nearest(p.x,p.z,bus?24:48);
    if(!road||road.s.elevated||road.s.authoredPavement||road.s.kind?.startsWith('motorway'))continue;
    const {s,rx,rz,dist}=road;
    if(dist<.4||dist-s.w>(bus?12:34))continue;
    const side=(p.x-rx)*s.nx+(p.z-rz)*s.nz>=0?1:-1;
    let x=p.x,z=p.z,nx=-s.nx*side,nz=-s.nz*side;
    let width,height,y,base,bay,shopShell,mounted=false,shelter=false;
    const name=bus?p.detail[0]||p.detail[1]||'Điểm dừng xe buýt':p.detail;
    const front=!bus&&district.businessFront(cx+x,cz+z,cx+rx,cz+rz);
    if(front){
      if(usedBuildings.has(front.id)||p.kind===front.authoredBusinessKind)continue;
      nx=front.nx;nz=front.nz;
      // Mount above the shop canopy and just in front of the wall. Keep low
      // buildings below the eave, and tall buildings at ground-floor level.
      width=Math.min(front.width,4.8);height=Math.min(1.0,width*.26,front.h*.21);
      y=Math.min(front.h-height*.55,3.48);base=front.base;
      x=front.x-cx+nx*.19;z=front.z-cz+nz*.19;mounted=true;
      bay=district.streetFronts.find(f=>Math.hypot(f.x-x,f.z-z)<2.4&&nx*f.nx+nz*f.nz>.92);
      if(bay){
        const balcony=bay.h>=6.4&&bay.seed%4!==0;
        x=bay.x+bay.nx*(balcony?bay.balcony+.10:.18);z=bay.z+bay.nz*(balcony?bay.balcony+.10:.18);
        nx=bay.nx;nz=bay.nz;width=Math.min(width,bay.half*1.86);
        y=balcony?3.67:Math.min(front.h-height*.52,bay.top+.55);
      }
    }else{
      if(bus){
        // A platform on the road ribbon can be a lane-centre stop_position.
        // Only a surveyed side of the carriageway establishes a kerb here.
        if(dist<Math.max(.8,s.w*.48))continue;
        const offset=Math.max(0,s.w+.85-dist);
        x-=nx*offset;z-=nz*offset;
        width=1.00;height=.78;y=2.38;
      }else{
        if(dist<s.w+.75||dist>s.w+18)continue;
        const large=['fuel','market','school','hospital','hotel'].includes(p.kind);
        width=large?2.45:1.25;height=large?.94:.78;y=large?2.2:.91;
        // A named street business on built land supplies the use, but not a
        // footprint. Fit a small estimated shop only on an entirely clear plot.
        if(['shop','pharmacy','restaurant','cafe'].includes(p.kind)&&ctx.builtLand(x,z)&&dist-s.w>2){
          const w=3.7,d=4.8,bx=x-nx*d*.5,bz=z-nz*d*.5,r=Math.hypot(w,d)*.5+.25;
          const beds=[ground(bx,bz)];
          for(const u of [-w*.5,w*.5])for(const v of [-d*.5,d*.5])
            beds.push(ground(bx+nz*u+nx*v,bz-nx*u+nz*v));
          if(!blocked(bx,bz,r)&&Math.max(...beds)-Math.min(...beds)<.65){
            shopShell={w,d,bx,bz,r,foot:Math.max(...beds)-Math.min(...beds)+.18,base:Math.max(...beds)};
            width=w-.2;height=.74;y=3.08;
          }
        }
      }
      base=shopShell?.base??ground(x,z);
      if(blocked(x,z,width*.52))continue;
      shelter=bus&&p.detail[2]&&!blocked(x-nx*1.3,z-nz*1.3,2.4);
    }
    if(grounds.memorialAt(cx+x,cz+z)||signs.some(other=>Math.hypot(x-other.x,z-other.z)<
      (name===other.name?12:Math.max(width,other.width)*.65)))continue;
    const yaw=Math.atan2(nx,nz),ux=nz,uz=-nx;
    const clearFace=(extent,depth)=>[-extent,0,extent].every(u=>offRoad(x+ux*u+nx*depth,z+uz*u+nz*depth));
    if(!clearFace(width*.52,.08))continue;
    function box(u,v,level,w,h,d,colour,mat='white'){
      const px=x+ux*u+nx*v,pz=z+uz*u+nz*v;
      placeBox(mat,px,base+level-ground(px,pz),pz,w,h,d,yaw,colour);
    }
    if(mounted||shopShell){
      if(shopShell){
        const {w,d,bx,bz,r,foot}=shopShell;
        grounds.occupy(bx,bz,r,'shop');
        const tint={shop:0xe1d1b5,cafe:0xcdb38f,restaurant:0xe6c9ab,pharmacy:0xd4ddd2}[p.kind];
        box(0,-d*.5-.09,(3.65-foot)*.5,w,3.65+foot,d,tint,'wall');
        box(0,-d*.5-.09,3.72,w+.21,.14,d+.19,0xa7a095);
        register({id:'survey-shop:'+p.kind+':'+p.detail+':'+(cx+x)+':'+(cz+z),kind:'building',
          x:bx,z:bz,fx:ux,fz:uz,w:w*.5,d:d*.5,baseY:base-foot,height:3.8+foot});
      }else usedBuildings.add(front.id);
      const frontage=['shop','pharmacy','restaurant','cafe','bank','hotel'].includes(p.kind);
      if(frontage&&!bay){
        const doorHeight=Math.min(2.6,y-height*.5-.09),doorWidth=width*.80;
        box(0,-.08,doorHeight/2,doorWidth,doorHeight,.075,0x60736e,'glass');
        for(const u of [-.5,0,.5])box(doorWidth*u,-.025,doorHeight/2,.045,doorHeight,.055,0xd0c6ab);
        box(0,-.025,doorHeight*.74,doorWidth,.055,.055,0xd0c6ab);
        // A short fabric canopy fits between the real wall and the carriageway.
        const canopy=Math.min(1.05,(rx-x)*nx+(rz-z)*nz-s.w-.65);
        if(canopy>.36&&clearFace(width*.51,canopy)&&['restaurant','cafe','shop'].includes(p.kind)){
          group.userData.eaves?.push([x+nx*canopy,base+doorHeight-.13,z+nz*canopy,ux,uz,width]);
          const stripes=7,colour=p.kind==='cafe'?0x946543:p.kind==='restaurant'?0xb36a4c:0x617a6e;
          for(let i=0;i<stripes;i++){
            const u=width*((i+.5)/stripes-.5),cloth=i%2?0xd4c8a8:colour;
            box(u,canopy*.47,doorHeight+.04,width/stripes,.07,canopy,cloth);
            box(u,canopy-.03,doorHeight-.045,width/stripes,.17,.045,cloth);
          }
        }
      }
      // Prefer the recorded business over regional stock advertising here.
      for(const f of district.streetFronts)if(Math.hypot(f.x-x,f.z-z)<4.5)f.named=true;
    }else{
      grounds.occupy(x,z,Math.min(2,width*.55),'business');
      const pole=bus||width<1.5;
      for(const u of pole?[0]:[-width*.4,width*.4]){
        box(u,-.065,y*.5,.075,y,.085,0x989b92);
        register({id:'survey-post:'+p.kind+':'+(cx+x)+':'+(cz+z)+':'+u,kind:'pole',
          x:x+ux*u,z:z+uz*u,radius:.06,height:y,parts:[]});
      }
      if(shelter){
        group.userData.eaves?.push([x-nx*.45,base+2.60,z-nz*.45,ux,uz,3.75]);
        box(0,-1.33,2.67,3.75,.14,1.76,0xa7b1ad);
        for(const u of [-1.55,1.55]){
          box(u,-1.92,1.34,.095,2.68,.095,0x898d88);
          register({id:'bus-shelter:'+p.id+':'+u,kind:'pole',x:x+ux*u-nx*1.92,z:z+uz*u-nz*1.92,radius:.07,height:2.68,parts:[]});
        }
        box(0,-1.72,.47,2.75,.12,.44,0x657b77);
        for(const u of [-1,1])box(u,-1.72,.23,.10,.46,.28,0x828780);
        register({id:'bus-seat:'+p.id,kind:'barrier',x:x-nx*1.72,z:z-nz*1.72,fx:ux,fz:uz,w:1.38,d:.22,height:.53,parts:[]});
        grounds.occupy(x-nx*1.35,z-nz*1.35,2,'shelter');
      }
    }
    box(0,0,y,width+.055,height+.055,.12,0xbbb9aa);
    signs.push({x,z,nx,nz,y:base+y,width,height,name,kind:p.kind,mounted:mounted||!!shopShell,estimated:!!shopShell,shelter,
      ref:bus?p.detail[1]:'',anchorX:p.x,anchorZ:p.z});
  }
  if(signs.length)mountRoadsideSigns(T,group,signs);
  group.userData.roadsideSurvey={signs,trees:trees.length};
}

function mountRoadsideSigns(T,group,signs){
  const cols=4,rows=Math.ceil(signs.length/cols),w=384,h=112;
  const canvas=document.createElement('canvas');canvas.width=cols*w;canvas.height=rows*h;
  const ctx=canvas.getContext('2d'),vertices=[],uv=[];
  for(const [i,s] of signs.entries()){
    const left=i%cols*w,top=Math.floor(i/cols)*h,[type,bg]=roadsideSignStyles[s.kind];
    ctx.save();ctx.translate(left,top);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    let inset=0;
    if(s.kind==='bus'){
      inset=65;ctx.fillStyle='#f4f4e8';ctx.fillRect(12,28,45,48);ctx.fillRect(17,72,8,11);ctx.fillRect(44,72,8,11);
      ctx.fillStyle=bg;ctx.fillRect(17,34,35,20);ctx.fillRect(17,64,7,5);ctx.fillRect(45,64,7,5);
    }else if(s.kind==='pharmacy'){
      inset=67;ctx.fillStyle='#ecf8eb';ctx.fillRect(28,32,16,47);ctx.fillRect(12,48,48,16);
    }
    const textX=(w+inset)*.5,maxWidth=w-inset-24;
    const heading=s.kind==='bus'&&s.ref?type+' · '+s.ref:type;
    const repeated=s.name.toLocaleLowerCase('vi').startsWith(heading.toLocaleLowerCase('vi'));
    ctx.fillStyle=s.kind==='school'?'#ffdf8e':'#fff7e4';ctx.textAlign='center';ctx.textBaseline='middle';
    if(!repeated){
      ctx.font='600 19px Arial';ctx.fillText(heading.toLocaleUpperCase('vi'),textX,22,maxWidth);
      ctx.fillRect(inset+16,37,w-inset-32,2);
    }
    const font=['hotel','cafe'].includes(s.kind)?'Georgia':'Arial';
    ctx.font='bold 46px '+font;
    const words=s.name.trim().split(/\s+/);
    if(ctx.measureText(s.name).width>maxWidth&&words.length>1){
      let split=1;
      while(split<words.length-1&&words.slice(0,split).join(' ').length<s.name.length*.45)split++;
      ctx.font='bold '+(repeated?37:30)+'px '+font;
      ctx.fillText(words.slice(0,split).join(' '),textX,repeated?33:58,maxWidth);
      ctx.fillText(words.slice(split).join(' '),textX,repeated?77:91,maxWidth);
    }else ctx.fillText(s.name,textX,repeated?56:74,maxWidth);
    ctx.restore();
    // Render legible outward faces on both sides of a freestanding sign.
    for(const dir of s.mounted?[1]:[1,-1]){
      for(const [u,v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){
        const dx=(u-.5)*s.width*dir;
        vertices.push(s.x+s.nz*dx+s.nx*.066*dir,s.y+(v-.5)*s.height,s.z-s.nx*dx+s.nz*.066*dir);
        uv.push((left+2+(w-4)*u)/canvas.width,1-(top+2+(h-4)*(1-v))/canvas.height);
      }
    }
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
  const material=new T.MeshLambertMaterial({map:texture});
  const mesh=new T.Mesh(geometry,material);mesh.name='Biển hiệu theo địa điểm OSM';mesh.receiveShadow=true;
  group.add(mesh);group.userData.disposeSurvey=()=>{material.dispose();texture.dispose();};
}
