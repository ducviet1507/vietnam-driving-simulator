'use strict';
// Profiles are sampled at equal stations along the original OSM edge, including
// both junctions. Their absolute heights use the same datum as the relief atlas.
function createPassRoadGrades(){
  let manifest;
  const cache=new Map(),graphs=new WeakMap();
  function index(){
    if(!manifest)manifest=fetch('pass-road-grades/index.json').then(async r=>{
      if(!r.ok)throw Error('Missing pass road index');
      const m=await r.json();return {...m,tiles:new Set(m.tiles)};
    }).catch(error=>{manifest=null;throw error;});
    return manifest;
  }
  function read(key){
    if(!cache.has(key)){
      const promise=fetchMapTile('pass-road-grades/'+key+'.json.gz').catch(error=>{
        if(cache.get(key)===promise)cache.delete(key);throw error;
      });
      cache.set(key,promise);
      if(cache.size>16)cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }
  async function load(g,x,z){
    if(!g?.geo)return false;
    let spec;try{spec=await index();}catch{return false;}
    if(g.sourceSha256&&spec.sourceSha256!==g.sourceSha256)return false;
    const [w,n]=g.geo(x-3500,z-3500),[e,s]=g.geo(x+3500,z+3500),keys=[];
    for(let i=Math.floor(w*spec.grid);i<=Math.floor(e*spec.grid);i++)
      for(let j=Math.floor(s*spec.grid);j<=Math.floor(n*spec.grid);j++)
        if(spec.tiles.has(i+'_'+j))keys.push(i+'_'+j);
    let state=graphs.get(g);
    if(!state){state={loaded:'',tiles:new Map()};graphs.set(g,state);}
    const signature=keys.join(',');
    if(state.pending?.signature===signature)return state.pending.promise;
    if(state.loaded===signature){state.pending=null;return false;}
    const request={signature};state.pending=request;
    request.promise=Promise.allSettled(keys.map(key=>state.tiles.get(key)??read(key))).then(results=>{
      if(state.pending!==request)return false;
      state.pending=null;const tiles=new Map();
      for(let i=0;i<keys.length;i++)if(results[i].status==='fulfilled')tiles.set(keys[i],results[i].value);
      const loaded=[...tiles.keys()].join(',');
      if(loaded===state.loaded)return false;
      state.tiles=tiles;state.loaded=loaded;return true;
    });
    return request.promise;
  }
  return {load,tiles:g=>graphs.get(g)?.tiles};
}

// Match the surveyed junction on side roads that leave a graded region.
// Spread any vertical datum difference over the connected approach, even
// when the first OSM edge is shorter than the required transition.
function connectPassRoadEnds(graph,edges,profiles,terrain,cx,cz,radius){
  const limits=new Map();
  if(!graph.nodes?.size||!profiles.size)return limits;
  const anchors=new Map(),corrections=new Map(),branches=new Set(),rate=.065;
  for(const edge of edges){
    const data=profiles.get(edge.id);if(!data)continue;
    for(const [node,p,height] of [[edge.start,edge.points[0],data[0]],[edge.end,edge.points.at(-1),data.at(-1)]]){
      if(Math.max(Math.abs(p.x-cx),Math.abs(p.z-cz))>radius)continue;
      const adjacent=graph.nodes.get(node);
      if(!anchors.has(node)&&adjacent?.some(other=>!profiles.has(other.id))){
        const offset=.1*height-terrain.base-terrain.ground(p.x,p.z);
        anchors.set(node,offset);
      }
    }
  }
  for(const sign of [1,-1]){
    const queue=[];
    for(const [node,offset] of anchors)if(sign*offset>.08){
      corrections.set(node,offset);queue.push([node,sign*offset]);
    }
    const best=new Map(queue);
    for(let i=0;i<queue.length;i++){
      const [node,offset]=queue[i];if(offset<best.get(node))continue;
      for(const edge of graph.nodes.get(node)||[]){
        if(profiles.has(edge.id)||edge.traffic?.bridge||edge.traffic?.tunnel)continue;
        branches.add(edge);
        const next=node===edge.start?edge.end:edge.start,remaining=offset-rate*edge.length;
        if(anchors.has(next)||remaining<=Math.max(.08,best.get(next)??0))continue;
        best.set(next,remaining);queue.push([next,remaining]);
      }
    }
    for(const [node,value] of best)if(!anchors.has(node))corrections.set(node,(corrections.get(node)||0)+sign*value);
  }
  function decay(value,distance){return Math.sign(value)*Math.max(0,Math.abs(value)-rate*distance);}
  for(const edge of branches){
    const a=anchors.get(edge.start)??corrections.get(edge.start)??0,b=anchors.get(edge.end)??corrections.get(edge.end)??0;
    const count=Math.max(1,Math.ceil(edge.length/12)),data=new Float64Array(count+1);
    const meets=Math.abs(a-b)>edge.length*rate;
    const spans=meets?[edge.length,0]:[Math.abs(a)/rate,edge.length-Math.abs(b)/rate];
    for(let i=0;i<=count;i++){
      const f=i/count,s=edge.length*f,p=graph.sample({edge,s,dir:1});
      const left=decay(a,s),right=decay(b,edge.length-s);
      const offset=meets?a+(b-a)*f:Math.max(0,left,right)+Math.min(0,left,right);
      data[i]=10*(terrain.base+terrain.ground(p.x,p.z)+offset);
    }
    profiles.set(edge.id,data);limits.set(edge.id,spans);
  }
  return limits;
}

// Build the local earthworks from the survey, in the same projection as the car.
// Keep the riverbed under bridges and the rock above tunnel bores.
function createPassRoadFormation(graph,tiles,terrain,cx,cz,radius,halfWidth){
  if(!tiles?.size||!graph?.nearby)return null;
  const bucketSize=32,fine=4,feather=40,padding=60,buckets=new Map(),profiles=new Map();
  const key=(i,j)=>i+1048576*j;
  function profileHeight(edge,profile,station){
    const pos=Math.max(0,Math.min(profile.length-1,station/edge.length*(profile.length-1)));
    const i=Math.min(profile.length-2,Math.floor(pos));
    return (profile[i]+(profile[i+1]-profile[i])*(pos-i))*.1-terrain.base;
  }
  const edges=graph.nearby(cx,cz,radius+padding+850);
  for(const edge of edges){
    for(const tile of tiles.values()){
      const profile=tile[edge.id];
      if(profile?.length>=2){profiles.set(edge.id,profile);break;}
    }
  }
  const limits=connectPassRoadEnds(graph,edges,profiles,terrain,cx,cz,radius+850);
  for(const edge of edges){
    const profile=profiles.get(edge.id);if(!profile)continue;
    const spans=limits.get(edge.id);
    if(edge.traffic?.bridge||edge.traffic?.tunnel)continue;
    const width=halfWidth(edge),reach=width+feather;
    for(let i=1;i<edge.points.length;i++){
      if(spans&&edge.dist[i-1]>spans[0]&&edge.dist[i]<spans[1])continue;
      const a=edge.points[i-1],b=edge.points[i],dx=b.x-a.x,dz=b.z-a.z;
      const x0=Math.min(a.x,b.x)-reach,x1=Math.max(a.x,b.x)+reach,z0=Math.min(a.z,b.z)-reach,z1=Math.max(a.z,b.z)+reach;
      if(x0>cx+radius||x1<cx-radius||z0>cz+radius||z1<cz-radius)continue;
      const len=edge.dist[i]-edge.dist[i-1];
      const seg={ax:a.x,az:a.z,fx:dx/len,fz:dz/len,len,width,edge,profile,start:edge.dist[i-1]};
      for(let bx=Math.floor(Math.max(x0,cx-radius)/bucketSize);bx<=Math.floor(Math.min(x1,cx+radius)/bucketSize);bx++)
        for(let bz=Math.floor(Math.max(z0,cz-radius)/bucketSize);bz<=Math.floor(Math.min(z1,cz+radius)/bucketSize);bz++){
          const k=key(bx,bz);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(seg);
        }
    }
  }
  if(!profiles.size)return null;
  function affected(x,z){return buckets.has(key(Math.floor(x/bucketSize),Math.floor(z/bucketSize)));}
  const heights=new Map();
  function earthNode(i,j){
    const hash=key(i,j),cached=heights.get(hash);if(cached!==undefined)return cached;
    const x=i*fine,z=j*fine,raw=terrain.ground(x,z),list=buckets.get(key(Math.floor(x/bucketSize),Math.floor(z/bucketSize)));
    if(!list)return raw;
    let best=null,bestDist=Infinity,along=0,ceiling=Infinity;
    for(const seg of list){
      const dx=x-seg.ax,dz=z-seg.az,d=Math.max(0,Math.min(seg.len,dx*seg.fx+dz*seg.fz));
      const dist=(dx-d*seg.fx)**2+(dz-d*seg.fz)**2;
      if(dist<bestDist){best=seg;bestDist=dist;along=d;}
      // All three vertices of a ground triangle under a paved edge need to
      // clear it, including between neighbouring arms of a hairpin.
      if(dist<=(seg.width+fine*Math.SQRT2)**2){
        const crown=profileHeight(seg.edge,seg.profile,seg.start+d);
        ceiling=Math.min(ceiling,crown-.20-.018*Math.min(seg.width,Math.sqrt(dist)));
      }
    }
    const cross=Math.sqrt(bestDist),outside=Math.max(0,cross-best.width);
    let h=raw;
    if(outside<feather){
      const t=Math.max(0,(outside-5)/(feather-5)),w=1-t*t*(3-2*t);
      const bed=Math.min(ceiling,profileHeight(best.edge,best.profile,best.start+along)-.16-.018*Math.min(best.width,cross));
      // The coarse horizon continues the original terrain past the near mesh.
      // Rejoin it beyond the farthest rendered carriageways, before the seam.
      const reach=Math.max(Math.abs(x-cx),Math.abs(z-cz))/radius;
      const far=Math.max(0,Math.min(1,(reach-.68)/.22));
      h+=(bed-h)*w*(1-far*far*(3-2*far));
    }
    heights.set(hash,h);return h;
  }
  function ground(x,z){
    if(!affected(x,z))return terrain.ground(x,z);
    const i=Math.floor(x/fine),j=Math.floor(z/fine),u=x/fine-i,v=z/fine-j;
    if(u===0&&v===0)return earthNode(i,j);
    const b=earthNode(i+1,j),c=earthNode(i,j+1);
    if(u+v<=1){const a=earthNode(i,j);return a+(b-a)*u+(c-a)*v;}
    const d=earthNode(i+1,j+1);return d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  function roadHeight(edge,s){
    const profile=profiles.get(edge.id),spans=limits.get(edge.id);
    if(!profile||(spans&&s>spans[0]&&s<spans[1]))return null;
    return profileHeight(edge,profile,s);
  }
  function intersects(x0,z0,x1,z1){
    for(let i=Math.floor(x0/bucketSize);i<=Math.floor(x1/bucketSize);i++)
      for(let j=Math.floor(z0/bucketSize);j<=Math.floor(z1/bucketSize);j++)
        if(buckets.has(key(i,j)))return true;
    return false;
  }
  return {ground,roadHeight,hasRoad:edge=>profiles.has(edge.id),affected,intersects,fine};
}

// The verge and its cut or embankment share the wheel terrain grid. Only refine
// occupied land cells. Water banks already replace their own cells.
function* meshPassRoadFormation(T,formation,land,gx,gz,width){
  const geometry=land.geometry,segments=geometry.parameters.widthSegments,coarse=width/segments;
  const left=gx-width/2,top=gz-width/2,index=geometry.index.array,steps=coarse/formation.fine;
  const pitch=segments+2,occupied=new Uint8Array(pitch*pitch);
  let cells=0;
  for(let p=0;p<index.length;p+=6){
    const first=index[p],i=first%(segments+1),j=Math.floor(first/(segments+1));
    if(formation.affected(left+(i+.5)*coarse,top+(j+.5)*coarse)){
      occupied[(j+1)*pitch+i+1]=1;cells++;
    }
    if(p%1536===0)yield;
  }
  if(!cells)return null;
  // Count corners, shared edge points and interiors. Shore cells can leave
  // holes in the grid; allocate only the vertices that will actually be drawn.
  let vertexCount=cells*(steps-1)**2;
  for(let j=0;j<=segments;j++){
    for(let i=0;i<=segments;i++){
      const k=(j+1)*pitch+i+1,se=occupied[k],sw=occupied[k-1],ne=occupied[k-pitch];
      if(se||sw||ne||occupied[k-pitch-1])vertexCount++;
      if(se||ne)vertexCount+=steps-1;
      if(se||sw)vertexCount+=steps-1;
    }
  }
  const verts=new Float32Array(vertexCount*3),uv=new Float32Array(vertexCount*2);
  const IndexArray=vertexCount>65535?Uint32Array:Uint16Array;
  const triangles=new IndexArray(cells*steps*steps*6),remaining=new index.constructor(index.length-cells*6);
  const rowSize=segments*steps+1;
  const vertices=new Uint32Array(rowSize*rowSize);
  const bands=[];
  let low=Infinity,high=-Infinity,nextVertex=0,nextIndex=0,nextLand=0;
  function vertex(i,j){
    const k=i+j*rowSize;if(vertices[k])return vertices[k]-1;
    const px=i*formation.fine-width/2,pz=j*formation.fine-width/2,v=nextVertex++;
    const height=formation.ground(gx+px,gz+pz);
    low=Math.min(low,height);high=Math.max(high,height);
    verts[v*3]=px;verts[v*3+1]=-pz;verts[v*3+2]=height;
    uv[v*2]=px/width+.5;uv[v*2+1]=.5-pz/width;
    vertices[k]=v+1;return v;
  }
  for(let p=0;p<index.length;p+=6){
    // PlaneGeometry stores each cell as (NW, SW, NE), (SW, SE, NE).
    const first=index[p],i=first%(segments+1),j=Math.floor(first/(segments+1));
    if(!occupied[(j+1)*pitch+i+1]){
      for(let k=p;k<p+6;k++)remaining[nextLand++]=index[k];continue;
    }
    // The index stream is ordered by coarse terrain row, even with shore cells removed.
    const bandId=Math.floor(j/4);
    let band=bands[bands.length-1];
    if(band?.id!==bandId){
      band={id:bandId,start:nextIndex,bounds:new T.Box3()};
      bands.push(band);
    }
    const box=band.bounds;
    box.min.x=Math.min(box.min.x,i*coarse-width/2);box.max.x=Math.max(box.max.x,(i+1)*coarse-width/2);
    box.min.y=Math.min(box.min.y,width/2-(j+1)*coarse);box.max.y=Math.max(box.max.y,width/2-j*coarse);
    for(let z=j*steps;z<(j+1)*steps;z++)for(let x=i*steps;x<(i+1)*steps;x++){
      const a=vertex(x,z),b=vertex(x+1,z),c=vertex(x,z+1),d=vertex(x+1,z+1);
      triangles[nextIndex++]=a;triangles[nextIndex++]=c;triangles[nextIndex++]=b;
      triangles[nextIndex++]=b;triangles[nextIndex++]=c;triangles[nextIndex++]=d;
    }
    if((p%24)===0)yield;
  }
  const patch=new T.BufferGeometry();patch.setAttribute('position',new T.BufferAttribute(verts,3));
  patch.setAttribute('uv',new T.BufferAttribute(uv,2));
  patch.setAttribute('shoreSediment',new T.BufferAttribute(new Float32Array(vertexCount),1));
  patch.setIndex(new T.BufferAttribute(triangles,1));yield* updateTerrainNormals(T,patch);
  const mesh=new T.Mesh(patch,land.material);mesh.name='Mountain road cuts and embankments';mesh.receiveShadow=true;
  if(bands.length>1){
    for(const {bounds} of bands){bounds.min.z=low;bounds.max.z=high;bounds.expandByScalar(.25);}
    const frustum=new T.Frustum(),clip=new T.Matrix4();
    let originalStart,originalCount;
    // Omit only leading/trailing bands fully outside this camera. Keep one draw
    // and the original triangle order for the road, water and reflection cameras.
    mesh.onBeforeRender=(renderer,scene,camera)=>{
      originalStart=patch.drawRange.start;originalCount=patch.drawRange.count;
      clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(mesh.matrixWorld);
      frustum.setFromProjectionMatrix(clip);
      let first=0,last=bands.length-1;
      while(first<=last&&!frustum.intersectsBox(bands[first].bounds))first++;
      while(last>=first&&!frustum.intersectsBox(bands[last].bounds))last--;
      const begin=Math.max(originalStart,bands[first]?.start??patch.index.count);
      const end=Math.min(originalStart+originalCount,bands[last+1]?.start??patch.index.count);
      patch.setDrawRange(begin,Math.max(0,end-begin));
    };
    mesh.onAfterRender=()=>patch.setDrawRange(originalStart,originalCount);
  }
  const original=geometry.index;geometry.setIndex(new T.BufferAttribute(remaining,1));land.add(mesh);
  return {dispose(){land.remove(mesh);patch.dispose();geometry.setIndex(original);}};
}
