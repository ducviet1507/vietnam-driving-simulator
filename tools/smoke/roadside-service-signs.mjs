import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';

const T=createRequire(import.meta.url)('../../dist/three.min.js');
const painted=[];
const canvas={getContext:()=>({save(){},restore(){},translate(){},fillRect(){},fillText(text){painted.push(text);}})};
const context={document:{createElement:()=>canvas}};
runInNewContext(readFileSync(new URL('../../dist/national-streetscape.js',import.meta.url),'utf8'),context);
const labels={bank:'Ngân hàng',cafe:'Cà phê',fuel:'Trạm xăng',hospital:'Cơ sở y tế',hotel:'Lưu trú',market:'Chợ',
  pharmacy:'Nhà thuốc',restaurant:'Quán ăn',school:'Trường học',shop:'Cửa hàng',bus:'Điểm dừng xe buýt'};
for(const mode of ['building','freestanding','estimated']){
  for(const [kind,label] of Object.entries(labels)){
    painted.length=0;
    const group=new T.Group(),road={ax:-20,az:0,fx:1,fz:0,nx:0,nz:1,len:40,w:3};
    const point={x:0,z:11,id:17,kind,detail:kind==='bus'?['Hotel EXAMPLE','2;47B;EXAMPLE',false]:'EXAMPLE'};
    const ctx={points:[point],cx:0,cz:0,cellRoads:()=>[road],group,radius:200,
      district:{businessFront:()=>mode==='building'?{id:19,x:0,z:11,nx:0,nz:-1,width:3.7,h:6,base:0}:null,streetFronts:[]},
      grounds:{occupy(){},memorialAt:()=>false},ground:()=>0,blocked:()=>false,builtLand:()=>mode==='estimated',register(){},placeBox(){}};
    for(const _ of context.buildNationalStreetscape(T,ctx)){}
    const [sign]=group.userData.roadsideSurvey.signs;
    assert.equal(sign?.name,label,kind+' '+mode);
    assert.deepEqual(painted,kind==='bus'?[label,'2 · 47B']:[label]);
    group.userData.disposeSurvey();group.children[0].geometry.dispose();
  }
}
console.log('PASS service sign lettering on façades, standalone boards, estimated shops and transit stops.');
