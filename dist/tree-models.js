'use strict';

// All species grow from (0,0,0) to unit height. Scale X and Z by the crown
// diameter so the visible trunk and its collision pivot stay on the same spot.
function createTreeModels(T){
  const cache=new Map();
  const detail=new T.TextureLoader().load('streetscape/tree-detail.webp');
  detail.colorSpace=T.SRGBColorSpace;
  const material=new T.MeshLambertMaterial({map:detail,vertexColors:true,alphaTest:.42});
  const palmMaterial=material.clone();
  palmMaterial.side=T.DoubleSide; // Both surfaces of each folded frond are visible.
  function variantAt(x,z){
    const hash=Math.imul(Math.round(x*4),73856093)^Math.imul(Math.round(z*4),19349663);
    return (Math.imul(hash^(hash>>>16),0x45d9f3b)>>>16)%4;
  }
  function geometry(kind,compact=false,variant=0){
    const key=kind+(compact?' grove ':' roadside ')+variant;
    if(cache.has(key))return cache.get(key);
    const positions=[],colors=[],uv=[],indices=[],seams=[],color=new T.Color();
    const tau=Math.PI*2;
    function vertex(x,y,z,tint,light,u,v){
      positions.push(x,y,z);color.setHex(tint).multiplyScalar(light);
      colors.push(color.r,color.g,color.b);uv.push(u,v);return positions.length/3-1;
    }
    // The left half of the atlas is fully opaque, including the entire crown.
    // Only the small terminal sprays sample the cutout in the right half.
    function surface(rows,sides,point,tint,bark=false){
      const start=positions.length/3;
      for(let j=0;j<rows;j++){
        for(let i=0;i<=sides;i++){
          const a=(i%sides)*tau/sides,[x,y,z,light]=point(j,a);
          const n=vertex(x,y,z,tint,light,(bark?.254:.004)+.242*i/sides,.01+.98*j/(rows-1));
          if(j&&i){
            const b=n-sides-1;
            indices.push(b-1,n-1,b,b,n-1,n);
          }
        }
        seams.push([start+j*(sides+1),start+j*(sides+1)+sides]);
      }
    }
    function stem(x,y,z,tx,ty,tz,r0,r1,sides=6){
      surface(2,sides,(j,a)=>{
        const r=j?r1:r0;
        return [(j?tx:x)+r*Math.cos(a),j?ty:y,(j?tz:z)+r*Math.sin(a),.78+.16*Math.cos(a*3)+j*.12];
      },kind==='palm'?0x9b9075:0x83715a,true);
    }
    function sprays(x,y,z,rx,ry,rz,phase,tint,count){
      for(let k=0;k<count;k++){
        const a=phase+k*tau/count,c=Math.cos(a),s=Math.sin(a);
        const width=.61+.11*Math.sin(k*5),height=.22*Math.cos(k*2+phase);
        function point(r,side,h,u,v,light){
          return vertex(x+rx*(r*c-side*s),y+ry*(h+height),
            z+rz*(r*s+side*c),tint,light,.505+.49*u,.01+.98*v);
        }
        const base=positions.length/3;
        for(const [r,h,v,light] of [[.64,.70,1,1.04],[1.02,.14,.53,.94],[1.10,-.70,0,.76]]){
          point(r,-width,h,0,v,light);point(r+.10,0,h+.07,.5,v,light);point(r,width,h,1,v,light);
        }
        for(let j=0;j<2;j++)for(let i=0;i<2;i++){
          const p=base+j*3+i;indices.push(p,p+1,p+3,p+1,p+4,p+3);
        }
      }
    }
    function crown(x,y,z,rx,ry,rz,phase,tint,sides){
      const widths=[0,.79,1,.73,0],heights=[-1,-.56,.05,.63,1];
      surface(5,sides,(j,a)=>{
        const turn=a+phase+.12*Math.sin(j),lobe=Math.cos(3*a+phase)+.6*Math.sin(5*a-j*.7);
        const r=widths[j]*(1+.11*lobe);
        return [x+rx*r*Math.cos(turn),y+ry*(heights[j]+.13*widths[j]*lobe),
          z+rz*r*Math.sin(turn),.57+.095*j+.055*lobe];
      },tint);
      sprays(x,y,z,rx,ry,rz,phase,tint,compact?4:6);
    }
    if(kind==='tree'||kind==='tea'){
      // Spreading rain tree, upright oval crown, tiered tropical almond and a
      // low forked shade tree. Dimensions describe the silhouette at maturity.
      const [spread,base,depth,limbs,lean,leafTint]=[
        [1.03,.62,.16,6,.028,0x819852],[.63,.49,.26,4,-.027,0x688752],
        [.88,.46,.12,7,.008,0x89934c],[1.00,.46,.21,5,-.09,0x66884c]
      ][variant];
      if(kind!=='tea'){
        stem(0,-.022,0,lean*.42,base*.57,-.008,.038,.023);
        stem(lean*.42,base*.57,-.008,lean,base+.22,.023,.024,.011);
      }
      if(kind==='tea'){
        crown(0,.50,0,.50,.50,.43,.7,0x809a52,9);
      }else if(compact){
        const bottom=base-depth;
        crown(lean,(1+bottom)/2,0,.46*spread,(1-bottom)/2,.43*spread,.51+variant,leafTint,10);
        if(variant===2)crown(0,.53,0,.45,.12,.40,1.2,0x70864b,7);
      }else{
        for(let i=0;i<limbs;i++){
          const f=i/(limbs-1),a=i*2.4+.33+variant,dx=Math.cos(a),dz=Math.sin(a);
          const r=(.21+.045*Math.sin(i*7))*(variant===2?1-.56*f:1)*spread;
          const y=base+(variant===2?.37:.18)*f;
          stem(lean*.42,base*.54+.10*f,-.008,lean+dx*r,y+.025,dz*r,.021,.009,5);
          crown(lean+dx*r,y,dz*r,(.25+.032*Math.cos(i))*spread,depth*(.77+.16*f),.24*spread,
            a,i%3===1?0x708548:leafTint,9);
        }
        const topDepth=variant===2?.125:variant===1?.26:.19;
        crown(lean,1-topDepth,.018,.30*spread,topDepth,.28*spread,.92,leafTint,9);
      }
    }else if(kind==='pine'){
      stem(0,-.02,0,.012,.92,-.01,.033,.007);
      const tiers=(compact?3:5)+(variant%2),sides=compact?8:14;
      const apron=[.39,.47,.32,.43][variant],skirt=[.19,.28,.14,.36][variant];
      for(let i=0;i<tiers;i++){
        const f=i/(tiers-1),y=skirt+(.80-skirt)*f,w=apron*(1-.69*f),top=.34-.14*f;
        surface(3,sides,(j,a)=>{
          const turn=a+i*1.79+variant*.73,tip=Math.cos(a*sides/2);
          const r=j===0?.025:j===1?w*(.85+.16*tip+.11*Math.sin(a*3+i)):0;
          const h=j===0?y+.035:j===1?y+.055-.046*tip+.025*Math.sin(a*3+i):y+top;
          return [r*Math.cos(turn)+.012*f,h,r*Math.sin(turn),j===0?.51:j===1?.79+.11*tip:1.06];
        },[0x56794e,0x648054,0x52735a,0x71885b][(variant+i%2)%4]);
        if(!compact)sprays(.012*f,y+.05,0,w*.88,top*.49,w*.88,i*1.79,0x697f56,7);
      }
    }else if(kind==='palm'){
      const bend=[.08,-.16,.026,.20][variant],head=[.85,.80,.89,.83][variant];
      stem(0,-.018,0,bend*.16,.39,.012,.045,.029,8);
      stem(bend*.16,.39,.012,bend*.82,head-.10,.01,.029,.021,8);
      stem(bend*.82,head-.10,.01,bend,head,0,.021,.030,8);
      // Fold the blades about an arched midrib. Each pair of leaflets sweeps
      // back to the stem, leaving real slots between the tapered outer tips.
      const lower=6+variant;
      for(let i=0;i<lower+4;i++){
        const a=i*2.4+variant*.72,dx=Math.cos(a),dz=Math.sin(a),upper=i>=lower;
        const span=upper?.28:.44+.035*Math.cos(i+variant),drop=upper?.015:.17+variant*.045+.035*Math.cos(i);
        const lift=upper?1-head:.115,n=compact?4:upper?8:11,tint=i%3===0?0x8c9b51:0x708d49;
        function point(t,side,width,sag,light){
          return vertex(bend+dx*span*t-dz*width*side,head+lift*Math.sin(t*Math.PI)-drop*t*t-sag,
            dz*span*t+dx*width*side,tint,light,.008+.236*t,side<0?.07:.92);
        }
        for(let j=0;j<n;j++){
          const t=j/n,end=(j+1)/n,m=(t+end)/2,w=.095*(.18+.82*Math.sin(m*Math.PI));
          const base=point(t,0,0,0,1.08),tip=point(end,0,0,0,1.02);
          for(const side of [-1,1]){
            const outer=point(Math.min(1,end+.057),side,w,w*.44,.78);
            const inner=point(m,side,w*.67,w*.31,.90);
            indices.push(base,inner,outer,base,outer,tip);
          }
        }
      }
    }
    const g=new T.BufferGeometry();
    g.name='Tree model: '+key;
    g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setIndex(indices);g.computeVertexNormals();
    const normals=g.attributes.normal,left=new T.Vector3(),right=new T.Vector3();
    for(const [first,last] of seams){
      left.fromBufferAttribute(normals,first).add(right.fromBufferAttribute(normals,last)).normalize();
      normals.setXYZ(first,left.x,left.y,left.z);normals.setXYZ(last,left.x,left.y,left.z);
    }
    cache.set(key,g);return g;
  }
  function grove(group,stems,compact=true){
    if(!stems.length)return;
    const groups=[[],[],[],[]],pose=new T.Object3D();
    for(const stem of stems)groups[variantAt(stem[0],stem[2])].push(stem);
    groups.forEach((rows,variant)=>{
      if(!rows.length)return;
      const mesh=new T.InstancedMesh(geometry('tree',compact,variant),material,rows.length);
      rows.forEach(([x,y,z,w,h,angle],i)=>{
        pose.position.set(x,y,z);pose.rotation.y=angle;pose.scale.set(w,h,w);
        pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
      });
      mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
    });
  }
  return {geometry,material,palmMaterial,variantAt,grove};
}
