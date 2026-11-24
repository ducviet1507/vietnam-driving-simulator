'use strict';
// Street-level references and OSM survey IDs are in landmark-references.txt.
// u runs east along the frontage, v points from the temple towards Hồ Văn.
window.QuocTuGiamStreet=(()=>{
  const templeEnd=[105.8357014,21.0273173],templeWest=[105.8351368,21.0275348];
  // Tree spacing and crown dimensions are reconstructed from the street views.
  const shadeTrees=[[-88,2.8,14],[-73,2.4,16],[-59,2.8,15],[-43,2.5,16],[-30,3.2,15],
    [-14,2.8,17],[6,-2.8,14],[15,2.7,17],[27,2.6,16],[-8,14.4,11],[21,14.7,10],[35,14.5,12],
    [-88,-9,13],[-76,-14,12],[-62,-7,14],[-52,-11,12],[-39,-8,14],[-24,-9,13],[17,-11,12],[26,-10,13]];
  let assets;
  function createAssets(T){
    const box=new T.BoxGeometry(1,1,1),round=new T.CylinderGeometry(.5,.5,1,12);
    const stone=new T.MeshStandardMaterial({roughness:.91});
    function photoAtlas(file,count,width){
      const map=new T.TextureLoader().load(file);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      const material=new T.MeshStandardMaterial({map,roughness:.92});
      const panels=Array.from({length:count},(_,i)=>{
        const geo=new T.PlaneGeometry(1,1),uv=geo.attributes.uv,margin=1/width;
        for(let k=0;k<uv.count;k++)uv.setX(k,i/count+margin+uv.getX(k)*(1/count-2*margin));
        return geo;
      });
      return {material,panels};
    }
    const panels=photoAtlas('landmark-scans/van-mieu-street-panels.webp',6,768);
    const signs=photoAtlas('streetscape/quoc-tu-giam-signs.webp',4,1024);
    const balconies=photoAtlas('streetscape/quoc-tu-giam-balconies.webp',5,1280);
    const sign=document.createElement('canvas');sign.width=sign.height=128;
    const pen=sign.getContext('2d');pen.fillStyle='#154880';pen.fillRect(0,0,128,128);
    pen.fillStyle='#e8ece6';pen.font='bold 46px sans-serif';pen.textAlign='center';pen.fillText('38',64,82);
    const busMap=new T.CanvasTexture(sign);busMap.colorSpace=T.SRGBColorSpace;
    // Repeating ironwork drawn at the actual spacing. Open cells also let
    // the courtyard and branches show through obliquely from the carriageway.
    const c=document.createElement('canvas');c.width=64;c.height=256;
    const ctx=c.getContext('2d');ctx.fillStyle=ctx.strokeStyle='#ffffff';ctx.lineWidth=5;
    ctx.fillRect(27,26,10,230);ctx.beginPath();ctx.moveTo(32,0);ctx.lineTo(41,34);
    ctx.lineTo(32,28);ctx.lineTo(23,34);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.ellipse(32,53,25,12,0,0,Math.PI*2);ctx.stroke();
    ctx.fillRect(0,36,64,6);ctx.fillRect(0,220,64,6);
    const map=new T.CanvasTexture(c);map.wrapS=T.RepeatWrapping;
    map.anisotropy=4;
    const ironwork=new T.MeshStandardMaterial({map,color:0x254236,alphaTest:.36,side:T.DoubleSide,roughness:.77});
    return {box,round,stone,ironwork,panels,signs,balconies,plane:new T.PlaneGeometry(1,1),
      busSign:new T.MeshStandardMaterial({map:busMap,roughness:.85})};
  }
  function near(graph,cx,cz){
    if(!graph)return null;
    const origin=graph.point(105.8353999,21.0273914);
    if(Math.hypot(origin.x-cx,origin.z-cz)>520)return null;
    const west=graph.point(...templeWest),east=graph.point(...templeEnd);
    const length=Math.hypot(east.x-west.x,east.z-west.z);
    const fx=(east.x-west.x)/length,fz=(east.z-west.z)/length,ox=origin.x-cx,oz=origin.z-cz;
    const yaw=Math.atan2(-fz,fx);
    const at=(u,v)=>[ox+u*fx-v*fz,oz+u*fz+v*fx];
    const local=(x,z)=>[(x-ox)*fx+(z-oz)*fz,-(x-ox)*fz+(z-oz)*fx];
    const edge=graph.edges?.get(19626);
    if(!edge)return null;
    const line=edge.points.map(p=>local(p.x-cx,p.z-cz));
    function curb(u,lake){
      // The centreline bends away from the park at the Văn Miếu junction.
      // Intersect the actual road edge with this cross-section of pavement.
      for(let i=1;i<line.length;i++){
        const [a,b]=line[i-1],[c,d]=line[i];
        if(u>Math.max(a,c)||u<Math.min(a,c)||Math.abs(a-c)<.01)continue;
        const slope=(d-b)/(c-a);
        return b+(u-a)*slope+(lake?1:-1)*worldRoadHalfWidth(edge)*Math.hypot(1,slope);
      }
      return lake?12.3:4.5;
    }
    const gardens=window.VanMieuSurvey?.byRef;
    const parcels=['w1582901993','w1582902103','w178995315'].map(ref=>
      (gardens?.get(ref)?.rings[0]||[]).map(p=>{const q=graph.point(...p);return [q.x-cx,q.z-cz];}));
    function reserved(x,z){
      const [u,v]=local(x,z);
      if(u < -111||u>48||v < -50||v>75)return false;
      if((u>=-96&&u<=33&&v>=-5&&v<4.5)||(u>=-104&&u<=43&&v>12&&v<20))return true;
      return parcels.some(ring=>{
        let hit=false;
        for(let i=0,j=ring.length-1;i<ring.length;j=i++){
          const [a,b]=ring[i],[c,d]=ring[j];
          if((b>z)!==(d>z)&&x<(c-a)*(z-b)/(d-b)+a)hit=!hit;
        }
        return hit;
      });
    }
    function replacesWall(x,z,dx,dz){
      const [u,v]=local(x,z);
      return u>=-97&&u<=32.3&&Math.abs(v+4.1)<1&&Math.abs(dx*fx+dz*fz)>.97;
    }
    function reserveFixtures(occupy){
      for(const [u,v] of shadeTrees)occupy(...at(u,v),2.6,'tree');
      for(let u=-95;u<32;u+=3)occupy(...at(u,.3),3.1,'frontage');
      for(let u=-12;u<43;u+=3)occupy(...at(u,15.5),1.7,'frontage');
    }
    function build(T,group,ground,plant,obstacle){
      assets??=createAssets(T);
      const {stone,box,round,plane}=assets;
      const batches=new Map(),dummy=new T.Object3D(),white=0xffffff;
      const panels=[],panelUV=[];
      function instance(geo,mat,u,v,y,w,h,d,color,ry=0,rx=0,rz=0){
        const [x,z]=at(u,v);
        dummy.position.set(x,y,z);dummy.rotation.set(rx,yaw+ry,rz,'YXZ');dummy.scale.set(w,h,d);dummy.updateMatrix();
        let byMat=batches.get(geo);if(!byMat)batches.set(geo,byMat=new Map());
        let batch=byMat.get(mat);if(!batch)byMat.set(mat,batch=[]);
        batch.push([dummy.matrix.clone(),color]);
      }
      const height=(u,v)=>ground(...at(u,v));
      const block=(u,v,w,d,bottom,top,color)=>instance(box,stone,u,v,(bottom+top)/2,w,top-bottom,d,color);
      function collision(id,u,v,w,d,h){
        const [x,z]=at(u,v);obstacle({id:'quoc-tu-giam:'+id,kind:'barrier',x,z,fx,fz,w:w/2,d:d/2,height:h,parts:[]});
      }
      function fence(start,end,v0,v1,lake=false){
        const bays=Math.max(1,Math.round((end-start)/2.75));
        for(let i=0;i<bays;i++){
          const a=start+(end-start)*i/bays,b=start+(end-start)*(i+1)/bays,u=(a+b)/2;
          const av=v0+(v1-v0)*i/bays,bv=v0+(v1-v0)*(i+1)/bays,v=(av+bv)/2;
          const y=height(u,v),base=.62,top=2.04,grey=0x73736a,green=0x274338;
          block(u,v,b-a+.02,.35,y-.17,y+base,grey);
          block(u,v,b-a+.02,.39,y+base-.06,y+base+.018,0x87877d);
          const [ax,az]=at(a,av),[bx,bz]=at(b,bv),ay=height(a,av),by=height(b,bv);
          panels.push(ax,ay+base,az,bx,by+base,bz,bx,by+top,bz,ax,ay+base,az,bx,by+top,bz,ax,ay+top,az);
          const bars=Math.round((b-a)/.14);panelUV.push(0,0,bars,0,bars,1,0,0,bars,1,0,1);
          for(const j of i===0?[i,i+1]:[i+1]){
            const t=j/bays,p=start+(end-start)*t,q=v0+(v1-v0)*t,g=height(p,q);
            block(p,q,.13,.13,g+base,g+top+.04,green);
            block(p,q,.22,.22,g+top,g+top+.08,green);
            if(lake){
              block(p,q,.25,.22,g+top+.08,g+top+.42,0xc29c61);
              block(p,q,.28,.25,g+top+.41,g+top+.45,green);
            }
          }
          collision('rail:'+start+':'+i,u,v,b-a,.38,top);
        }
      }
      // The west garden has its own pedestrian opening, separate from the
      // four pillars. Preserve the break already cut in the national wall tile.
      fence(-96.6,-82.5,-3.6,-4.1);fence(-82.5,-34.4,-4.1,-4.3);
      fence(-31.3,-3.75,-4.31,-4.31);fence(4.88,32.1,-4.31,-4.31);
      fence(-12.4,5.55,15.39,15.47,true);fence(14.15,43.07,15.51,15.64,true);
      // Red and grey paving on the temple side, grey slabs on the lake side.
      // Group tiles in one instanced draw with open squares around the trunks.
      function pavement(start,end,near,far,lake){
        const across=Math.round((far-near)/(lake?.62:.76)),depth=(far-near)/across,w=lake?.75:1;
        for(let j=0;j<across;j++){
          for(let a=start-(j%2)*w/2;a<end;a+=w){
            const left=Math.max(start,a),right=Math.min(end,a+w),u=(left+right)/2;
            const boundary=curb(u,lake),lo=Math.max(near+j*depth,lake?boundary+.035:near);
            const hi=Math.min(near+(j+1)*depth,lake?far:boundary-.035);
            if(hi-lo<.045)continue;
            const v=(lo+hi)/2;
            if(shadeTrees.some(([tx,tz])=>Math.abs(tx-u)<.82&&Math.abs(tz-v)<.82))continue;
            const y=height(u,v)+.142,t=Math.sin(31.7*a+13.1*j);
            const tint=lake?(t>.3?0xa49f92:0x999689):(t>.55?0xaf8d7d:t<-.4?0x9b8a7d:0xb59a87);
            block(u,v,Math.max(.01,right-left-.014),hi-lo-.014,y-.13,y,tint);
          }
        }
      }
      pavement(-95,29,-4.1,5.3,false);pavement(-12.4,40,9.0,15.48,true);
      for(const [u,v,h] of shadeTrees){
        const [x,z]=at(u,v);plant('tree',x,z,h,h*(v<5?1.24:.92),u*.32);
      }
      for(let u=-95;u<-35;u+=3.3){
        const [x,z]=at(u,-5.9+.35*Math.sin(u));
        plant('tree',x,z,2.85+.35*Math.cos(u*.3),4.5,u);
      }
      const pillarStone=0xb8af9c,trim=0x989181;
      for(const [i,u] of [-6.05,-2.40,2.40,6.05].entries()){
        const inner=i===1||i===2,m=inner?1:.84,v=0,y=height(u,v)+.14;
        const course=(w,b,t,color)=>block(u,v,w*m,w*m,y+b*m,y+t*m,color);
        course(1.55,-.13,.24,trim);course(1.42,.24,.50,pillarStone);course(1.51,.50,.61,trim);
        course(1.12,.61,4.70,pillarStone);course(1.24,4.70,4.83,trim);
        course(1.28,4.83,5.61,pillarStone);course(1.43,5.61,5.75,trim);course(1.52,5.75,5.85,pillarStone);
        for(const side of [-1,1]){
          block(u,v+side*.565*m,.83*m,.035,y+.79*m,y+4.52*m,trim);
          block(u,v+side*.591*m,.75*m,.03,y+.85*m,y+4.45*m,0xcac3af);
        }
        const panel=(index,rotation,du,dv,base,top,w)=>{
          instance(assets.panels.panels[index],assets.panels.material,u+du*m,v+dv*m,y+(top+base)*m/2,w*m,(top-base)*m,1,white,rotation);
        };
        if(inner){
          panel(i,0,0,.613,.76,4.58,.92);
          panel(4,0,0,.65,4.85,5.57,1.10);
          if(i===2){
            panel(3,Math.PI/2,.566,0,.76,4.58,.92);
            panel(5,Math.PI/2,.65,0,4.85,5.57,1.10);
          }
        }else if(i===0)panel(0,Math.PI/2,.566,0,.76,4.58,.92);
        if(inner){
          // Seated nghê turn toward the opposite pillar.
          const face=i===1?1:-1;
          instance(round,stone,u-.11*face,v,y+6.04,.77,.42,.60,trim);
          instance(round,stone,u+.15*face,v,y+6.34,.48,.51,.46,trim,0,0,face*.17);
          block(u+.30*face,v,.44,.39,y+6.49,y+6.76,pillarStone);
          block(u+.52*face,v,.24,.28,y+6.50,y+6.63,trim);
        }else{
          for(let k=0;k<4;k++){
            const angle=k*Math.PI/2;
            instance(round,stone,u+.30*Math.cos(angle),v+.30*Math.sin(angle),y+6.04*m,.33*m,.52*m,.30*m,trim);
            instance(round,stone,u+.12*Math.cos(angle),v+.12*Math.sin(angle),y+6.32*m,.16*m,.69*m,.16*m,pillarStone,angle,0,-.31);
          }
        }
        collision('pillar:'+i,u,v,1.55*m,1.55*m,6.8*m);
      }
      // The OSM stop marks the boarding edge. The post is set into the pavement.
      const bu=-23.78,bv=3.86,by=height(bu,bv)+.14;
      block(bu,bv,.38,.74,by,by+3.03,0x353939);
      block(bu,bv,.82,1.62,by+2.00,by+2.10,0x454749);
      for(const side of [-1,1]){
        instance(plane,assets.busSign,bu+side*.197,bv,by+2.59,.66,.73,1,white,side*Math.PI/2);
        block(bu+side*.196,bv,.02,.58,by+.32,by+1.85,0xa6b3ad);
      }
      collision('bus-stop',bu,bv,.38,.74,3);
      // The photo sequence puts the bookshop, pharmacy and printing shops
      // between the lake and Tôn Đức Thắng. Keep the mouth of alley 65 open.
      const balconies=new Map([[-13,4],[-37,1],[-43,0],[-69.5,2],[-79,3]]);
      const fronts=[
        [-13,-20,6.1,0xb7ab96],[-20,-25.4,9.2,0xc6bba4],[-25.4,-31,11.8,0xb8c7be],
        [-31,-37,8.3,0xe3d5ac],[-37,-43,9.7,0xc3bbaa],[-43,-48.6,9.2,0xc9c59a,0],
        [-48.6,-54,7.8,0xb8bfaf],[-54,-60.4,12.2,0xbfc2b5,1],[-60.4,-64.6,8.9,0xd0b476],
        [-69.5,-74,8.8,0xc8ab7c,2],[-74,-79,8.6,0xa3968c],[-79,-85,12.8,0xbdb3a2],
        [-85,-90,9.9,0xb3c0b6],[-90,-96.5,12.5,0xbeae99],[-96.5,-103,9.1,0xd3c298]];
      for(const [east,west,h,paint,sign] of fronts){
        const u=(east+west)/2,w=east-west,v=16.6+.46*Math.sin(u),y=height(u,v);
        block(u,v+2.4,w-.06,4.8,y-.17,y+h,paint);
        block(u,v-.025,w*.84,.06,y+.16,y+2.62,0x424b4a);
        block(u,v-.12,w*.96,.42,y+2.55,y+2.70,0x86877d);
        const image=balconies.get(east);
        if(image!==undefined){
          instance(assets.balconies.panels[image],assets.balconies.material,u,v-.09,y+(h+3.7)/2,w-.13,h-3.7,1,white,Math.PI);
          block(u,v-.34,w+.10,.78,y+h-.12,y+h+.02,0x8d8275);
        }
        for(let level=3.8;image===undefined&&level<h-1.1;level+=2.75){
          for(const side of [-1,1]){
            block(u+side*w*.217,v-.05,w*.35,.12,y+level,y+level+1.55,0x4a636b);
            block(u+side*w*.217,v-.13,.055,.065,y+level,y+level+1.55,0xd8d1b8);
          }
          block(u,v-.26,w*.94,.65,y+level-.39,y+level-.22,0xc6bca6);
          for(let j=0;j<9;j++)block(u+w*(j/9-.45),v-.56,.045,.045,y+level-.23,y+level+.42,0x68716a);
          block(u,v-.56,w*.93,.06,y+level+.40,y+level+.46,0x636b66);
        }
        for(const side of [-1,1])block(u+side*w*.28,v-.055,.06,.08,y+.20,y+2.55,0xa7a397);
        block(u,v-.46,w*.95,.88,y+2.66,y+2.78,paint);
        if(sign!==undefined)instance(assets.signs.panels[sign],assets.signs.material,u,v-.4,y+3.1,w*.93,1.35,1,white,Math.PI);
        collision('shop:'+east,u,v+2.4,w,4.8,h);
      }
      const crossingU=24,crossingV=curb(crossingU,false)-.34,sy=height(crossingU,crossingV);
      block(crossingU,crossingV,.075,.075,sy,sy+2.54,0xa6a39a);
      for(let k=0;k<3;k++)block(crossingU,crossingV,.08,.08,sy+.25+k*.46,sy+.45+k*.46,0xb1483b);
      instance(assets.signs.panels[3],assets.signs.material,crossingU+.05,crossingV,sy+2.38,.74,.74,1,white,Math.PI/2);
      collision('crossing-sign',crossingU,crossingV,.1,.1,2.75);
      if(panels.length){
        const g=new T.BufferGeometry();
        g.setAttribute('position',new T.Float32BufferAttribute(panels,3));g.setAttribute('uv',new T.Float32BufferAttribute(panelUV,2));
        g.computeVertexNormals();const mesh=new T.Mesh(g,assets.ironwork);mesh.name='Quốc Tử Giám · hàng rào';group.add(mesh);
      }
      const tint=new T.Color();
      for(const [geo,mats] of batches)for(const [mat,rows] of mats){
        const mesh=new T.InstancedMesh(geo,mat,rows.length);
        rows.forEach(([matrix,color],i)=>{mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,tint.setHex(color));});
        mesh.name='Quốc Tử Giám · mặt phố';mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
      }
    }
    return {reserved,replacesWall,reserveFixtures,build};
  }
  return {near};
})();
