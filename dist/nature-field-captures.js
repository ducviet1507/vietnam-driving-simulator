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
  function dakLak(node,name,scope){
    const url='https://vr360.com.vn/projects/ban-do-so-du-lich-daklak/#node'+node;
    return {name,url,source:url,credit:'Bản đồ số du lịch tỉnh Đắk Lắk · VR360',scope};
  }
  function video(name,id,credit,scope){
    return {name,url:'https://www.youtube-nocookie.com/embed/'+id,source:'https://www.youtube.com/watch?v='+id,credit,scope};
  }
  function goThap(name,scene,scope){
    const url='https://smarttravel-vr.mobifone.vn/vr-tour/khu-di-tich-go-thap/'+scene;
    return {name,url,source:url,credit:'Khu di tích Gò Tháp · Smart Travel MobiFone Khu vực 9',scope};
  }
  function dongThap(folder,scene,name,scope){
    const url='https://vr3d.com.vn/'+folder+'/?startscene='+scene;
    return {name,url,source:url,credit:'Cổng du lịch tỉnh Đồng Tháp · VR3D',scope};
  }
  function nguyenSinhSac(scene,name,scope){
    // The publisher serves X-Frame-Options: SAMEORIGIN. Use its original viewer.
    const source='https://dongthap.hochiminh.vn/?startscene='+scene+'&skipintro=true';
    return {name,source,credit:'Cổng thông tin điện tử Hồ Chí Minh',scope:scope+' Ảnh mở trong tab riêng.'};
  }
  return {
    'osm-node-10314905409':[
      dakLak(41,'Cổng đình Lạc Giao','Nhìn từ mặt phố vào cổng và bức tường bao dưới tán cây.'),
      dakLak(39,'Sân trước chính điện','Từ sân lát gạch có thể nhìn bao quát chính điện, dãy nhà bên và cây cổ thụ.'),
      dakLak(35,'Hiên trước chính điện','Góc từ hàng cột nhìn ra sân và quay vào các cánh cửa gỗ.'),
      dakLak(36,'Gian thờ chính','Nhìn quanh bàn thờ, đồ thờ, các hàng cột và bộ binh khí nghi lễ.')
    ],
    'osm-node-1730268393':[
      dakLak(146,'Toàn cảnh Nhà đày Buôn Ma Thuột','Ảnh trên cao cho thấy tường bao và các dãy nhà mái ngói trong khu di tích.'),
      dakLak(147,'Bên trong dãy lao','Ảnh ghi lại không gian trưng bày với các tượng tái hiện sinh hoạt của tù nhân bên sạp nằm.'),
      ...phuYen('Từ cổng vào các dãy lao','nha-day-buon-ma-thuot',446,
        'Bắt đầu ở cổng vàng. Theo các mũi tên trong ảnh để đến sân giữa, các dãy lao, nhà tưởng niệm, phòng trưng bày và khu xà lim.')
    ],
    'biet-dien-bao-dai-bmt':[
      dakLak(5,'Sân và cầu thang biệt điện','Từ sân phía nam nhìn lên hiên vàng giữa hai đầu hồi.'),
      dakLak(6,'Hành lang trên hiên','Từ đầu cầu thang nhìn dọc hiên và qua cửa vào phòng trưng bày.'),
      dakLak(13,'Phòng làm việc','Bàn gỗ đặt dưới chân dung, bên cạnh hai ghế bành và tủ trưng bày.'),
      dakLak(16,'Phòng ngủ','Đứng giữa giường, tủ và các ghế gỗ trong phòng.'),
      dakLak(26,'Hầm rượu','Xuống tầng dưới, có thể nhìn quanh căn hầm và những chiếc ché.')
    ],
    'osm-way-1244769154':[
      dongThap('dongthap/nguyensinhsac','scene_kdtnss-canh-2-30m','Toàn cảnh làng Hòa An','Nhìn từ trên cao xuống khu cây xanh, các mái nhà và ao nước trong khu di tích.'),
      nguyenSinhSac('pano74','Bậc lên vòm mộ','Nhìn gần các bậc đá và mái vòm trắng che nơi an nghỉ của cụ Nguyễn Sinh Sắc.'),
      nguyenSinhSac('pano75','Bên dưới vòm lá sen','Đứng dưới vòm nhìn về phần mộ, bàn thờ và khoảng sân bên ngoài.'),
      nguyenSinhSac('pano14','Cổng vào khu di tích','Góc chụp ngoài đường cho thấy cổng, trạm nhỏ và lối vào dưới hàng cây.'),
      dongThap('dongthap/nguyensinhsac','scene_kdtnss-canh-7','Phòng trưng bày','Nhìn quanh phòng, xem các vật dụng trưng bày và cảnh quan được giới thiệu trên tường.'),
      dongThap('dongthap/nguyensinhsac','scene_kdtnss-canh-13','Nhà gỗ ở làng Hòa An','Điểm chụp bên mái hiên, nơi có thể nhìn dọc vách gỗ và lối đi dưới tán cây.')
    ],
    'osm-node-13518302230':[
      dongThap('dongthap/langhoasadec','scene_lhsd-canh-3-30m','Đường hoa nhìn từ trên cao','Theo trục đường xuyên qua khu trồng hoa, nhìn các nhà vườn ở hai bên.'),
      dongThap('dongthap/langhoasadec','scene_lhsd-canh-15-30m','Luống cây kiểng tán tròn','Nhìn ngang qua những dãy chậu cây được tỉa tán tròn.'),
      dongThap('dongthap/langhoasadec','scene_lhsd-canh-16-30m','Những hàng cây giống','Góc chụp tại vườn cho thấy khoảng cách giữa các hàng cây và lối đi bên luống.'),
      dongThap('dongthap/langhoasadec','scene_lhsd-canh-17-30m','Những luống hoa đang nở','Từ lối giữa vườn nhìn sang các luống hoa màu cam và phần nhà vườn bên kia đường.'),
      dongThap('dongthap/langhoasadec','scene_lhsd-canh-20-30m','Vườn bên Đường Hoa Sa Đéc','Góc từ trên cao ở gần ghim của vườn, nhìn xuống các hàng chậu và mái nhà.')
    ],
    'dong-thap-nam-phuong-linh-tu':[
      dongThap('public/phuongnam','scene_vuonhoasancanh1','Mái đền nhìn từ vườn phía tây','Từ phía tây nhìn qua vườn và mặt nước tới cụm mái của hai ngôi điện.'),
      dongThap('public/phuongnam','scene_vuonhoasancanh2','Sân đền nhìn từ vườn phía đông nam','Góc nhìn chéo qua hàng cây cho thấy mái ngói, sân và những dãy hành lang.')
    ],
    'osm-node-8437362637':[
      dongThap('public/phuongnam','scene_View_flycam_-_t___ng_quan_1','Toàn cảnh khu văn hóa Phương Nam','Từ trên cao nhìn dọc trục qua các sân, dãy hành lang và mái đền.'),
      dongThap('public/phuongnam','scene_View_m___t______t_-_Nh___Chu__ng','Nhà Chuông','Điểm nhìn dưới mái gỗ, cạnh quả chuông và bộ khung treo.'),
      dongThap('public/phuongnam','scene_View_m___t______t_-_Nh___Tr___ng','Nhà Trống','Đứng bên chiếc trống lớn, nhìn qua hàng cột ra ngoài sân.'),
      dongThap('public/phuongnam','scene_View_m___t______t_-_____n_T____Thu','Đàn Tế Thu','Quan sát bậc lên và khoảng sân phía trước đàn.'),
      dongThap('public/phuongnam','scene_View_m___t_____t_nh___c____nam_b____-_Nh___xay_l__a_','Nhà xay lúa','Xem gian nhà mái lá và các dụng cụ đặt bên trong.'),
      dongThap('public/phuongnam','scene_PNam_museum1','Bảo tàng Phương Nam','Góc chụp trong nhà trưng bày hiện vật của khu văn hóa.')
    ],
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
