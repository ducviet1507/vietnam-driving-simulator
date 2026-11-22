'use strict';
// Publisher-hosted photographic tours. Each key is the actual game destination.
window.NatureFieldCaptures=(()=>{
  function haiPhong(name,folder,scope,media){
    const url='https://vr360dulich.haiphong.gov.vn/teracom-vr360/'+folder+'/index.htm'+
      (media?'?media-name='+encodeURIComponent(media):'');
    return [{name,url,source:url,credit:'Hải Phòng Go · Sở Văn hóa, Thể thao và Du lịch Hải Phòng',scope}];
  }
  function phuYen(name,page,tour,scope){
    return [{name,url:'https://daklakvrtour.com/tour/'+tour+'/index.html',
      source:'https://daklakvrtour.com/'+page+'.html',credit:'Đắk Lắk – Phú Yên VR Tour',scope}];
  }
  function video(name,id,credit,scope){
    return {name,url:'https://www.youtube-nocookie.com/embed/'+id,source:'https://www.youtube.com/watch?v='+id,credit,scope};
  }
  function goThap(name,scene,scope){
    const url='https://smarttravel-vr.mobifone.vn/vr-tour/khu-di-tich-go-thap/'+scene;
    return {name,url,source:url,credit:'Khu di tích Gò Tháp · Smart Travel MobiFone Khu vực 9',scope};
  }
  return {
    'osm-node-8459780109':[
      goThap('Toàn cảnh Gò Tháp','64c1dfd73ac0811fa5dbafcc','Nhìn từ trên cao xuống giồng đất, các mái nhà và đồng ruộng bao quanh khu di tích.'),
      goThap('Nền đền Vishnu ở Gò Tháp Mười','64c7810b3ac0811fa5dbb038','Quan sát phế tích gạch tại điểm khai quật.'),
      goThap('Hiện vật đá văn hóa Óc Eo','64c782223ac0811fa5dbb03a','Xem các khối đá kiến trúc được trưng bày tại di tích.'),
      goThap('Đền thần Mặt Trời phía nam chùa Tháp Linh','64c7d0573ac0811fa5dbb043','Xem nền đền ở phía nam khuôn viên chùa.'),
      goThap('Chánh điện chùa Tháp Linh','64c7d37f3ac0811fa5dbb065','Nhìn quanh không gian thờ Phật trong chánh điện.'),
      goThap('Đền Shiva ở Gò Minh Sư','64c7d0573ac0811fa5dbb047','Xem các lớp gạch còn lại tại Gò Minh Sư.'),
      goThap('Tượng Thiên hộ Võ Duy Dương','64c7d37f3ac0811fa5dbb060','Điểm chụp trong khu đền tưởng niệm nghĩa quân Gò Tháp.'),
      goThap('Chánh điện Miếu Bà Chúa Xứ','64c7d37f3ac0811fa5dbb05e','Xem không gian thờ Bà phía trong tiền điện.')
    ],
    'osm-relation-21425134':[{
      name:'Tham quan trưng bày thường xuyên',url:'https://3d.vnfam.vn/vi',source:'https://3d.vnfam.vn/vi',
      credit:'Bảo tàng Mỹ thuật Việt Nam',scope:'Đi qua các phòng trưng bày trên ba tầng và chọn hiện vật để nghe thuyết minh.'
    }],
    'osm-node-3157796075':[
      {name:'Theo đoàn thám hiểm vào Sơn Đoòng',url:'https://sondoong360.com/?media-name=THE%20ENTRANCE',
        source:'https://edstrom.photo/projects/son-doong-360/',credit:'Martin Edström và đoàn Sơn Đoòng 360 · 2015',
        scope:'Ảnh cầu và âm thanh thu tại hang, từ cửa hang qua dòng sông ngầm tới khu rừng dưới hố sụt.'},
      video('Sơn Đoòng qua ống kính 360°','RLk0M70Rfig','Oxalis Adventure',
        'Phim quay trong hang với lời kể của Hồ Khanh và Howard Limbert.')
    ],
    'osm-node-6358064546':[video('Trong lòng Hang Én','LGjfYE3me0Q','Oxalis Adventure',
      'Phim 360° quay tại Hang Én trong Vườn quốc gia Phong Nha – Kẻ Bàng.')],
    'osm-node-6474418794':haiPhong('Động Trung Trang','Dong-Trung-Trang',
      'Theo cầu thang lên cửa động, nhìn các khoang đá và lối ra trên đảo Cát Bà.'),
    'osm-node-4508895511':haiPhong('Hang Quân Y','Hang-Quan-Y',
      'Từ cửa hang vào hành lang bệnh viện, phòng điều trị và phòng hậu phẫu.'),
    'osm-node-3494799892':haiPhong('Động Hoa Cương','v3/Dong-Hoa-Cuong',
      'Hai nhánh trong động, lối đi bên phải và cầu thang lên nhánh bên trái.'),
    'osm-node-3494827665':haiPhong('Động Thiên Long','v3/Dong-Thien-Long',
      'Nhìn từ cửa động rồi lần theo các điểm chụp trong lòng núi.'),
    'hai-dang-hon-dau':haiPhong('Hải đăng và đảo Hòn Dấu','v2/Dao-Hon-Dau',
      'Chọn “Ngọn Hải Đăng” để ngắm tháp đèn. Các điểm khác đưa tới cảng tàu và rừng trên đảo.'),
    // The tour player matches these media names exactly, including its
    // published combination of precomposed letters and combining tone marks.
    'osm-node-4858968321':[
      ...haiPhong('Toàn cảnh vịnh Lan Hạ','Vinh-Lan-Ha','Nhìn từ trên cao xuống các dải đảo và luồng nước.'),
      ...haiPhong('Làng chài nhìn từ trên cao','Vinh-Lan-Ha','Quan sát các bè nổi giữa những sườn đá.','Flycam La\u0300ng Cha\u0300i'),
      ...haiPhong('Bãi tắm Vạn Bội','Vinh-Lan-Ha','Nhìn từ mép bãi cát ra vịnh.','Ba\u0303i Tă\u0301m Va\u0323n Bô\u0323i'),
      ...haiPhong('Đảo Năm Cát','Vinh-Lan-Ha','Xem cảnh thực địa ở đảo Năm Cát.','Đa\u0309o Năm Ca\u0301t')
    ],
    'osm-node-13388093801':haiPhong('Đảo Cát Dứa (Đảo Khỉ)','Vinh-Lan-Ha','Ảnh cầu trên đảo Cát Dứa.','Đảo Khỉ'),
    'ban-gioc':[{name:'Thác Bản Giốc – Đức Thiên nhìn từ trên cao',url:'https://www.airpano.com/embed.php?3D=detian-falls',
      source:'https://www.airpano.com/360photo/detian-falls/',credit:'Ảnh của Sergey Semenov · AirPano',
      scope:'Ảnh cầu từ trên sông Quây Sơn và các điểm nhìn hai phía thác trên biên giới Việt Nam – Trung Quốc.'}],
    'dray-nur':phuYen('Thác Dray Nur','thac-dray-nur',197,
      'Ngắm dòng thác ở cự ly gần, bãi đá, cầu treo và lối vào hang cạnh thác.'),
    'thac-vuc-hom':phuYen('Thác Vực Hòm','thac-vuc-hom',103,
      'Năm điểm chụp ghi lại toàn cảnh, lòng thác, hai bên vách đá và góc từ trên cao.'),
    'osm-node-10745434207':phuYen('Thác Vực Song','thac-vuc-song',402,
      'Quan sát thác từ giữa lòng suối, từ bờ và từ trên cao.'),
    'osm-node-5841472185':phuYen('Thác Cây Đu','thac-cay-du',333,
      'Đi từ lối vào qua suối tới điểm chụp sát thác.'),
    'ganh-da-dia':phuYen('Gành Đá Đĩa','ganh-da-dia',43,
      'Các điểm chụp trải dọc bãi đá, cả lối phía nam, phía bắc và phần giữa gành.'),
    'hai-dang-dai-lanh':phuYen('Hải đăng Đại Lãnh và Bãi Môn','mui-dien-bai-mon',46,
      'Theo đường lên hải đăng, xem tháp từ phía đông và phía tây rồi nhìn xuống Bãi Môn.'),
    'osm-node-9992439396':[video('Rừng tràm Trà Sư','d1s5-SnOPuQ','NguyenTai1001 Vlog',
      'Phim thực địa 360° giữa vùng rừng tràm ở Tịnh Biên, An Giang.')]
  };
})();
