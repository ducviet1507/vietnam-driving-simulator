'use strict';

function roadSpeedLimit(cursor){
  const speed=cursor.edge.traffic?.speed;
  return Array.isArray(speed)?speed[cursor.dir>0?0:1]:speed;
}

function roadLaneOffset(cursor,scooter=false){
  const {edge,dir}=cursor,half=worldRoadHalfWidth(edge),lanes=edge.traffic?.lanes;
  if(lanes){
    const width=2*half/lanes;
    if(lanes===1)return edge.oneway?0:half*.43;
    const forward=edge.traffic.forward??(lanes%2===0?lanes/2:null);
    if(edge.oneway||forward!==null){
      const count=edge.oneway?lanes:dir>0?forward:lanes-forward;
      return half-width*(scooter?.5:Math.min(count,2)-.5);
    }
  }
  return scooter?Math.min(3.3,half*.7):Math.min(2.05,half*.47);
}

// Perpendicular approaches alternate, opposite approaches share a phase.
// The clock is simulated and shared by the lenses, the HUD and the vehicles.
function roadSignalPhase(yaw,seconds){
  const phase=(seconds+(Math.abs(Math.cos(yaw))>=Math.abs(Math.sin(yaw))?0:28))%56;
  return phase<23?'green':phase<26?'amber':'red';
}

function signalApplies(control,edge,dir){
  return (control.flags&4)&&(!control.direction||control.direction===dir)
    &&(dir>0?control.s:edge.length-control.s)>.05;
}

function roadControlAhead(graph,cursor,seconds,signalsOnly=false){
  let c=cursor,travelled=0;
  const visited=new Set();
  while(travelled<65&&!visited.has(c.edge.id)){
    visited.add(c.edge.id);
    let best=null;
    for(const point of c.edge.controls||[]){
      const distance=travelled+(point.s-c.s)*c.dir;
      if(distance<-.05||distance>65||(best&&best.distance<=distance))continue;
      const signal=signalApplies(point,c.edge,c.dir);
      if(!signal&&(signalsOnly||!(point.flags&1)))continue;
      const yaw=graph.sample({edge:c.edge,dir:c.dir,s:point.s}).yaw;
      best={distance,phase:signal?roadSignalPhase(yaw,seconds):null};
    }
    if(best)return best;
    travelled+=c.dir>0?c.edge.length-c.s:c.s;
    if(travelled>=65)break;
    const options=graph.options(c);
    if(options.length!==1)break;
    c={...options[0],kind:cursor.kind};
  }
  return null;
}

function createMappedTrafficLights(T,scene,small){
  const capacity=small?48:96;
  const material=new T.MeshLambertMaterial({color:0x353b3b});
  const poles=new T.InstancedMesh(new T.CylinderGeometry(.075,.095,1,7),material,capacity);
  const heads=new T.InstancedMesh(new T.BoxGeometry(.48,1.28,.34),material,capacity);
  const bulbs=new T.InstancedMesh(new T.SphereGeometry(.156,10,8),new T.MeshBasicMaterial(),capacity*3);
  const pose=new T.Object3D(),color=new T.Color();
  const objects=[poles,heads,bulbs],phases=['red','amber','green'];
  const lit=[0xff312a,0xffb825,0x2afb70],dim=[0x482221,0x45371f,0x183d2b];
  for(const mesh of objects){mesh.count=0;mesh.frustumCulled=false;scene.add(mesh);}
  let active=[],lastTick=-1;
  function update(seconds){
    const tick=Math.floor(seconds);
    if(lastTick===tick)return;
    lastTick=tick;
    active.forEach(({yaw},i)=>{
      const phase=roadSignalPhase(yaw,seconds);
      phases.forEach((name,j)=>bulbs.setColorAt(3*i+j,color.setHex(name===phase?lit[j]:dim[j])));
    });
    if(bulbs.instanceColor)bulbs.instanceColor.needsUpdate=true;
  }
  function place(mesh,i,x,y,z,height,yaw){
    pose.position.set(x,y,z);pose.scale.set(1,height,1);pose.rotation.set(0,-yaw,0);
    pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
  }
  function rebuild(graph,edges,cx,cz,ground){
    const candidates=[];
    for(const edge of edges)for(const point of edge.controls||[]){
      for(const dir of edge.oneway?[1]:[1,-1]){
        if(!signalApplies(point,edge,dir))continue;
        const p=graph.sample({edge,dir,s:point.s},worldRoadHalfWidth(edge)+.65);
        const x=p.x-cx,z=p.z-cz,distance=Math.hypot(x,z);
        if(distance<450)candidates.push({x,z,yaw:p.yaw,distance,node:point.node,edge,s:point.s});
      }
    }
    active=[];
    for(const p of candidates.sort((a,b)=>a.distance-b.distance)){
      if(active.length===capacity)break;
      if(active.some(q=>p.node===q.node&&Math.cos(p.yaw-q.yaw)>.86))continue;
      const {x,z,yaw}=p,i=active.length,y=ground(x+cx,z+cz,p.edge,p.s);
      active.push(p);place(poles,i,x,y+1.65,z,3.3,yaw);place(heads,i,x,y+3.65,z,1,yaw);
      for(let j=0;j<3;j++)place(bulbs,3*i+j,x-.19*Math.sin(yaw),y+4.03-j*.38,z+.19*Math.cos(yaw),1,yaw);
    }
    poles.count=heads.count=active.length;bulbs.count=3*active.length;
    for(const mesh of objects)mesh.instanceMatrix.needsUpdate=true;
    lastTick=-1;update(performance.now()/1000);
  }
  return {rebuild,update};
}
