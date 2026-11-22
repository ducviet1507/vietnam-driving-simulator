'use strict';
(() => {
  const A = window.CentralArch;
  const park = 'https://phongnhakebang.vn/';
  const oxalis = 'https://oxalisadventure.com/';
  const tau = 2*Math.PI;
  const sites = window.VietnamSights ??= [];

  const {batch,boulder,grotto,river,finish,walkway}=globalThis.VietnamKarst;
  const register=(node,settings,build)=>globalThis.VietnamKarst.register(sites,node,settings,build);

  // Rào Thương enters this mapped mouth from the south (OSM w874635531)
  // and continues northwest underground (w1150913681). Oxalis describes a
  // small river entrance below the sunlit chamber, and a beach on its bank.
  register(6358064546,{source:oxalis+'cave/hang-en-cave',yaw:0,width:62,depth:63,
    mappedEntrance:true,arrivalNote:'Xe đỗ trên đường ô tô, cách Hang Én khoảng 2,6 km theo đường thẳng. Góc ngắm đưa bạn tới cửa hang bên dòng Rào Thương.',
    shots:[['Rào Thương vào hang',0,0,11,39,.21,.13],['Bãi cát bên sông ngầm',-2,-6,8,16,.31,.10]],
    description:'Rào Thương len dưới vòm đá rồi đổi hướng về tây bắc. Một dải cát nằm sát mép nước trong vùng sáng gần cửa Hang Én.'},
    (T,kit)=>{
      const rock=batch(T);
      grotto(rock,[[0,0,9.8,5.4,0],[6,-1,11,10,0],[14,-5,15,17,0],[24,-12,14,15,0],[31,-17,7,9,0]],30,25,.7,true);
      river(T,kit.group,[-28,26],z=>z<0?z*.48:.032*z,z=>4.2+1.3*Math.cos(z*.11));
      rock.grid(12,21,(u,t)=>{
        const z=-19+25*t,x=Math.min(0,z*.48)+3.2+u*(3.8+1.6*Math.sin(t*Math.PI));
        return [x,.14+1.28*Math.sin(u*Math.PI*.7)*Math.sin(t*Math.PI),z,0xd2bb8c,.90+.08*Math.cos(2*z)];
      });
      for(let i=0;i<22;i++){
        const z=-4+kit.random()*25,side=i%2?1:-1,sz=.3+kit.random()*1.35;
        boulder(rock,side*(5+kit.random()*5),0,z,sz*1.7,sz,sz*1.3,i);
      }
      finish(T,kit,rock);
    });

  register(3157796075,{source:oxalis+'vi/tour/tham-hiem-son-doong-4n3d/',yaw:.32,width:38,depth:25,
    mappedEntrance:true,arrivalNote:'Xe đỗ trên đường ô tô, cách hang khoảng 3,3 km theo đường thẳng. Từ đây máy ảnh chuyển tới Sơn Đoòng.',
    shots:[['Miệng hang trong rừng',0,0,10,26,.04,.31],['Khe đá xuống hang',.2,-1.8,7,12,-.12,.25]],
    description:'Lối vào Sơn Đoòng khuất trong rừng. Qua khe mở hẹp là dốc đá đổ xuống bóng tối. Góc ngắm mô phỏng đoạn đầu, còn ảnh 360° cho thấy hành trình tới các hố sụt.'},
    (T,kit)=>{
      const rock=batch(T);
      grotto(rock,[[0,0,3.7,5.4,3.4],[3,-.5,3.1,6.3,1.7],[7,-1.7,3.4,6.6,.6],[12,-4,2.8,5.3,.1]],18,14,3.4);
      // Uneven limestone lip falls away into the cleft.
      rock.grid(26,22,(u,v)=>{
        const z=-9+16*v,x=(2*u-1)*(2.65+.45*Math.cos(v*4))-.22*Math.max(0,-z);
        const y=z<0?Math.max(0,3.4+z*.41):3.4*Math.max(0,1-z/7);
        return [x,.12+y+.18*Math.cos(x*2+z*.5),z,0xa6a392,.58+.32*v];
      });
      for(let i=0;i<24;i++){
        const side=i%2?1:-1,x=side*(4+kit.random()*9),z=-1+kit.random()*8;
        const size=1+kit.random()*2.2;
        boulder(rock,x,0,z,size*1.15,size*(1.1+.7*kit.random()),size,i,true);
      }
      for(let i=0;i<22;i++){
        const x=(kit.random()-.5)*4.8,z=kit.random()*6;
        const y=3.4*(1-z/7),size=.22+kit.random()*.45;
        boulder(rock,x,y,z,size*1.3,size*.82+.36,size,i,true);
      }
      finish(T,kit,rock);
    });

  // OSM w1416099207 enters the dry cave from the north. The first small
  // flight and a fluted curtain distinguish it from the river mouth below.
  register(3499399985,{source:park+'cave/dong-tien-son-1',yaw:Math.PI,width:30,depth:40,
    shots:[['Bậc đá trước cửa động',0,0,5.1,20,.16,.20],['Rèm nhũ đá',-1,-4,4.7,8,.18,.11]],
    description:'Từ sườn núi, các bậc cấp dẫn vào động khô Tiên Sơn. Dưới trần hang, những nếp rèm và cột nhũ đá đón ánh sáng từ cửa động.'},
    (T,kit)=>{
      const rock=batch(T);
      grotto(rock,[[0,0,4.6,4.8,1.38],[4,0,6.4,5.9,.8],[9,.4,7.8,7.1,.5],[18,1.4,7,6,.3]],15,12,1.9);
      for(let i=0;i<13;i++){
        const z=5.9-i*.47,h=.11*(i+1);
        kit.box(0xaaa695,0,h/2,z,2.45,h,.49);
      }
      for(const side of [-1,1]){
        for(let i=0;i<4;i++)kit.box(0x615b48,side*1.15,.59+.43*i,5.9-i*1.88,.075,.96,.075);
        A.strut(T,kit,0x615b48,side*1.15,1.08,5.9,side*1.15,2.35,.26,.044);
      }
      // Interleaved calcite curtains sag along their hem. Keep channels
      // between the folds so the close camera can see the warmer lining.
      for(let i=0;i<3;i++)rock.grid(64,10,(u,v)=>{
        const x=-3.2+u*(3.7-i*.38),drop=(1.15+.26*i+1.4*Math.sin(Math.PI*u)**.72+
          .37*Math.cos(u*19+i))*v;
        const flutes=Math.sin(41*u+.7*i)+.29*Math.sin(77*u-i);
        return [x+.12*drop*Math.sin(7*u),6.05-drop,-4.45-i*.44+flutes*(.12+.29*v),
          i%2?0xcba77d:0xe3caa1,.77+.18*Math.cos(41*u+.7*i)];
      });
      for(const [x,z,height,r] of [[-3.4,-4.6,5.6,.68],[-3.95,-5.4,4.7,.77],[3.8,-7.1,5.4,.52]]){
        rock.grid(28,16,(u,v)=>{
          const a=tau*u,w=r*(.52+1.2*(2*v-1)**4+.14*Math.cos(8*a+v*3));
          return [x+w*Math.cos(a),.4+height*v,z+w*Math.sin(a),0xcbb28e,.80+.13*Math.cos(8*a+v*3)];
        });
      }
      for(let i=0;i<5;i++)boulder(rock,4+i*.45,0,-3+i*.68,.8,1.6+i*.27,.7,i);
      finish(T,kit,rock);
    });

  register(5063396623,{source:park+'travel/tuyen-du-lich-song-chay-hang-toi5-en',yaw:Math.PI,width:42,depth:46,
    shots:[['Lối gỗ ven Hang Tối',0,0,6.8,26,-.23,.19],['Mặt nước dưới vòm đá',.5,-1,5.2,12,.24,.12]],
    description:'Lối gỗ có lan can men theo một bên vách. Ánh sáng từ phía sông Chày soi rõ nước xanh và các mỏm đá sát cửa, rồi nhạt dần trong hang.'},
    (T,kit)=>{
      const rock=batch(T);
      grotto(rock,[[0,0,6.8,6.9,0],[5,-.4,7.2,7,0],[11,-2,5.8,5.9,0],[19,-4,4.7,5.8,0]],20,17,4.1);
      river(T,kit.group,[-18,21],z=>-1.2+.14*Math.min(z,0)+Math.sin(z*.14)*.55,z=>4.4+.85*Math.sin(z*.18));
      walkway(T,kit,[[5.9,13],[4.6,6],[4.1,0],[3.1,-5],[2.5,-10]],1.22,1.1,0x81624c);
      for(let i=0;i<17;i++){
        const z=-5+kit.random()*23,sz=.4+kit.random()*1.2;
        boulder(rock,-4-kit.random()*3,.03,z,sz*1.3,sz*1.4,sz,i,true);
      }
      finish(T,kit,rock);
    });

  register(5353612634,{source:park+'tin-tuc/hang-tam-co-khong-chi-la-mot-dia-danh-lich-su',yaw:-1.21,width:14,depth:12,
    shots:[['Cửa hang và lư hương',0,0,3.2,9.5,.1,.14],['Bậc thềm và bia tưởng niệm',3,1,3,6,.18,.14]],
    description:'Dưới vách đá bên Đường 20 Quyết Thắng là bàn thờ nhỏ. Trước cửa hang có lư hương bằng đồng, bậc thềm và tấm bia tưởng niệm.'},
    (T,kit)=>{
      const rock=batch(T),stone=0xaaa698,bronze=0x8e7852;
      grotto(rock,[[0,0,1.48,2.3,.38],[1.5,-.3,1.17,1.9,.38],[2.7,-.45,.9,1.5,.38]],6.4,5.7,.2);
      for(const [x,z,r,h] of [[-2.4,.35,1.3,2.5],[-3.9,-.9,1.6,3.5],[2.4,-1,1.1,3.1]])
        boulder(rock,x,0,z,r,h,r*1.1,x,true);
      kit.palette({stone,metal:bronze,timber:0x603c2d});
      for(let i=0;i<4;i++)kit.box(stone,.5,.07+i*.13,2.65-i*.62,7.2,.14+i*.26,.64);
      kit.box(0x603c2d,0,.86,-.59,1.55,.17,.66);
      for(const x of [-.63,.63])for(const z of [-.8,-.38])kit.box(0x603c2d,x,.58,z,.12,.52,.12);
      // Arc-topped stone surround and inset dark plaque. No invented epitaph.
      const frame=new T.Shape();frame.moveTo(-.78,0);frame.lineTo(.78,0);frame.lineTo(.78,1.76);
      frame.quadraticCurveTo(0,2.56,-.78,1.76);frame.closePath();
      kit.box(stone,3,.44,.5,2,.27,1.02);
      kit.profile(frame,stone,3,.57,.35,.23);
      kit.box(0x444642,3,1.48,.596,1.22,1.58,.04);
      kit.sign('NƠI ĐÂY',3,2.08,.62,.97,.16,true);
      const urnX=1.73,urnZ=1.17;
      for(const side of [-1,1])kit.box(bronze,urnX+.22*side,.61,urnZ,.13,.38,.14,0,0,-side*.18);
      kit.tapered(bronze,urnX,.86,urnZ,.22,.45,.33,1,28);
      kit.tapered(bronze,urnX,1.12,urnZ,.45,.36,.19,1,28);
      kit.tapered(bronze,urnX,1.24,urnZ,.39,.46,.08,1,28);
      const ring=new T.TorusGeometry(.18,.045,6,18);
      for(const side of [-1,1])kit.stamp(ring,bronze,urnX+side*.44,1.18,urnZ,.75,1.15,.9);
      ring.dispose();
      finish(T,kit,rock);
    });

  // The atlas pin is the roadside marker. The recreation area is about 136 m
  // NE at OSM n4409288093. Retain the original saved ID and driving arrival.
  register(4387487189,{name:'Suối Nước Moọc',source:park+'du-lich/diem-du-lich-sinh-thai-suoi-nuoc-mooc7',
    lon:106.2367793,lat:17.5561169,approachMeters:undefined,yaw:.18,width:40,depth:49,
    shots:[['Cầu tre qua ghềnh',0,0,4.2,27,.38,.42],['Ghềnh đá giữa dòng',-.5,3.8,3,10,.08,.23]],
    description:'Dưới tán rừng, nhánh nước trong chảy giữa những tảng đá tròn phủ rêu. Cầu ván hẹp với tay vịn tre gấp khúc qua ghềnh. Cảnh mô phỏng một đoạn ở khu du lịch.'},
    (T,kit)=>{
      const rock=batch(T),centre=z=>2*Math.sin(z*.1+.2),width=z=>6.9+1.9*Math.cos(z*.16);
      river(T,kit.group,[-24,24],centre,width,true);
      for(let i=0;i<62;i++){
        const z=(kit.random()-.5)*45,side=i%2?1:-1;
        const x=centre(z)+side*width(z)*(.72+kit.random()*.79);
        const sz=.45+2.05*kit.random();
        boulder(rock,x,0,z,sz*1.46,sz,sz*1.14,i,true);
      }
      for(const [x,z,r] of [[-1.4,5.7,1.6],[3.4,-7.1,1.35],[.7,-2,1],[-1.4,10.6,1.45]])
        boulder(rock,x,0,z,r*1.2,r,r*.85,x,true);
      for(let i=0;i<48;i++){
        const z=-22+kit.random()*44,side=i%2?1:-1;
        const x=centre(z)+side*(width(z)+2+kit.random()*6),h=3.5+kit.random()*6.5;
        if(x>4&&z>3)continue;
        rock.trees.push([x,0,z,h*.87,h,i*2.4]);
      }
      for(let i=0;i<80;i++){
        const z=kit.random()*42-21,side=i%2?1:-1;
        rock.ferns.push([centre(z)+side*(width(z)+kit.random()*2.6),.08,z,.45+.65*kit.random(),i*2.4]);
      }
      walkway(T,kit,[[-11,7],[-2.6,2.3],[2.4,-3.6],[9.6,-4.8]],1.35,1.55,0xa48359);
      finish(T,kit,rock);
    });
})();
