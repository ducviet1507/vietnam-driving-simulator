'use strict';
(() => {
  const atlas = window.VietnamTourism;
  if (atlas.files) return;
  // Vietnamese visitor names published by Hội An's heritage centre, the
  // Tràng An management board and the national parks (references in heritage-visits.js).
  const names = new Map([
    ['osm-way-242169982','Nội thành Tây Đô (Thành Nhà Hồ)'],
    ['osm-node-3560283504','Hang Luồn'],
    ['osm-node-6474418794','Động Trung Trang'],
    ['osm-way-631074714','Bảo tàng Văn hóa Dân gian Hội An'],
    ['osm-node-2076856032','Bảo tàng Gốm sứ Mậu dịch'],
    ['osm-node-3189923484','Bảo tàng Văn hóa Sa Huỳnh'],
    ['osm-node-1540779110','Chùa Bích Động'],
    ['osm-way-772057039','Đền Thái Vi'],
    ['osm-node-4738232630','Đền Trần (Đền Nội Lâm)'],
    ['osm-node-13388919549','Phủ Khống'],
    ['osm-way-1424042953','Hành cung Vũ Lâm'],
    ['osm-node-4387487189','Suối Nước Moọc'],
    ['osm-node-3887715188','Hang Trinh Nữ'],
    ['osm-node-2669659389','Đền Trình Ngũ Nhạc'],
  ]);
  for (const site of atlas.entries) {
    if (names.has(site.id)) site.name = names.get(site.id);
  }
  // Several stops describe an entire precinct. Frame its actual mapped sights
  // instead of looking at the empty centre of the boundary polygon.
  // The whole-property pin is at the centre of the UNESCO boundary. Its
  // cameras look southeast at the temples. Cars stay on the road by the gate.
  const mySonGate=[108.10911,15.77344];
  // Phố Cái Bèo (w62343792) meets the visitor car park at this point.
  const benBeo=[107.057865,20.731873];
  // Road w974572929 beside Hương Sơn coach station w768420575 (chợ Đục Khê).
  // Hanoi's festival traffic plan keeps visitor cars outside the boat landing.
  const huongSonParking=[105.7877197,20.614076];
  const tuanChau=[106.9894,20.91974];
  // The tower footprint and the park boundary lead to the same visitor tour.
  atlas.aliases['osm-way-1228794103']='osm-relation-15805643';
  atlas.aliases['osm-node-1805807506']='osm-way-1244769154';
  const dambriEntrance=[107.7445308,11.6412412],vungRoEntrance=[109.4191949,12.8776377];
  const dambriSource='https://www.dambri.com.vn/vi/tin-tuc/tin-tuc-damb-ri/mot-ngay-o-khu-du-lich-thac-damb-ri-381.html';
  const baiChuaSource='https://daklakvrtour.com/tau-khong-so.html';
  const vungRoBay={locality:'Vũng Rô',formerProvince:'Phú Yên',start:[109.414242,12.871188],mappedEntrance:true,visitOnArrival:true,
    lookout:{lon:109.414301,lat:12.871245,kind:'Điểm ngắm cảnh'},source:'https://daklakvrtour.com/vung-ro.html',
    arrivalNote:'Xe dừng trên đường ven bờ phía tây vịnh. Bãi Chùa, nơi có đài tưởng niệm và nhà trưng bày, nằm về phía đông bắc.',
    views:[{name:'Nhìn ra vịnh từ bờ tây',offset:[109,24],height:7,viewAngle:-1.79,viewRadius:109,viewElevation:.048,
      description:'Từ bờ tây nhìn qua khoảng nước về sườn núi bên kia vịnh.'},
      {name:'Bờ vịnh nhìn về Bãi Chùa',offset:[370,-570],height:100,viewAngle:-.41,viewRadius:912,viewElevation:.105,viewFov:62,
      description:'Từ phía tây vịnh nhìn về đông bắc, dọc theo bờ có Quốc lộ 29 đến khu di tích Bãi Chùa.'}]};
  const precincts={
    'osm-node-4472600793':{...vungRoBay,name:'Điểm ngắm vịnh Vũng Rô từ bờ tây'},
    'osm-node-11565227115':{...vungRoBay,name:'Vịnh Vũng Rô'},
    'osm-node-4292019089':{name:'Di tích Bến tàu Không số Vũng Rô',locality:'Bãi Chùa',formerProvince:'Phú Yên',kind:'Di tích',
      start:vungRoEntrance,mappedEntrance:true,visitOnArrival:true,source:baiChuaSource,
      arrivalNote:'Xe dừng trên Quốc lộ 29, tại lối vào Bãi Chùa. Từ đó đi bộ qua sân lát tới đài tưởng niệm hình mũi tàu.'},
    'osm-node-12382639867':{name:'Nhà tưởng niệm liệt sĩ Bến Vũng Rô',locality:'Bãi Chùa',formerProvince:'Phú Yên',kind:'Di tích',
      start:vungRoEntrance,mappedEntrance:true,visitOnArrival:true,source:baiChuaSource,
      arrivalNote:'Xe dừng ở lối vào Bãi Chùa trên Quốc lộ 29. Nhà tưởng niệm nằm ở đầu đông lối đi bộ ven nước.'},
    'osm-node-5439114923':{name:'Chùa Bửu Minh',locality:'Biển Hồ',kind:'Chùa',searchNames:'Chùa Biển Hồ Trà, Chùa Phật Học, Chùa Biển Hồ Chè',
      start:[108.0130060,14.0660780],mappedEntrance:true,visitOnArrival:true,
      source:'https://chuabuuminh.vn/hinh-anh/nhiep-anh/7A5419_chua_buu_minh_tam_huyet_mot_doi_tu_.aspx',
      arrivalNote:'Xe dừng bên đường trước tam quan mái ngói đỏ. Cổng gỗ có đôi voi nằm chếch về phía nam, cùng bên đường.'},
    'osm-node-3093994368':{name:'Thác Đambri',locality:'Bảo Lộc',start:dambriEntrance,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
      arrivalNote:'Xe dừng ở đầu đường vào khu du lịch. Từ bãi đỗ bên trong, khách đi bộ xuống chân thác hoặc dùng thang máy.'},
    'osm-way-1418616745':{name:'Khu du lịch thác Đambri',locality:'Bảo Lộc',start:dambriEntrance,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
      lookout:{lon:107.74275,lat:11.642035,kind:'Điểm ngắm cảnh'},viewOf:['thac-dambri',1],
      arrivalNote:'Lối vào khu du lịch nằm ở phía đông. Thác Đambri ở phía bắc khuôn viên, còn hồ du lịch nằm về phía nam.'},
    'osm-way-304773101':{name:'Hồ Đambri',locality:'Bảo Lộc',start:dambriEntrance,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
      lookout:{lon:107.7430902,lat:11.640799,kind:'Điểm ngắm cảnh'},
      arrivalNote:'Xe dừng ở đầu đường vào khu du lịch. Từ đây, đường nội bộ men theo bờ bắc của hồ.',
      views:[{name:'Mặt hồ từ bờ bắc',offset:[-22,81],height:6,viewAngle:2.876,viewRadius:84,viewElevation:.07,
        description:'Nhìn về phía tây nam qua lòng hồ dùng cho các hoạt động chèo thuyền, đạp vịt.'},
        {name:'Từ bờ bắc đến nhánh hồ phía nam',offset:[-8,98],height:5,viewAngle:-1.93,viewRadius:158,viewElevation:.47,
          description:'Góc cao cho thấy lòng hồ ở phía bắc thu hẹp dần về phía nam.'}]},
    // The museum moved the visitor entrance to 27 Phạm Hồng Thái in 2022.
    // The older Atlas pin remains at the west wall, next to Tán Thuật.
    'osm-node-1730268393':{name:'Nhà đày Buôn Ma Thuột',kind:'Di tích',locality:'Buôn Ma Thuột',
      start:[108.0473086,12.6757888],mappedEntrance:true,visitOnArrival:true,
      source:'https://www.daklakmuseum.vn/tin-tuc-su-kien/bai-viet/thong-bao-thay-doi-cong-vao-tham-quan-di-tich-lich-su-quoc-gia-dac-biet-nha-day-buon-ma-thuot',
      arrivalNote:'Xe dừng ở đường Phạm Hồng Thái, đầu lối vào số 27. Từ đây đi khoảng 52 m tới cổng phía nam khu di tích.'},
    'osm-node-10314905409':{name:'Đình Lạc Giao',kind:'Đình',locality:'Buôn Ma Thuột',start:[108.0421400,12.6821865],mappedEntrance:true,visitOnArrival:true,
      source:'https://www.daklakmuseum.vn/tin-tuc-su-kien/bai-viet/di-tich-lich-su-dinh-lac-giao-noi-bao-luu-nhung-gia-tri-truyen-thong?lng=vi',
      arrivalNote:'Địa chỉ đình là 67 Phan Bội Châu. Xe dừng trên đường Điện Biên Phủ, ở phía cổng chính mở vào sân đình.'},
    // The polygon and the second pin both represent Lake T'Nưng. Public cars
    // stop outside the gate. The tip, trail fork and statue are distinct features.
    'osm-way-506959800':{name:'Biển Hồ (hồ Tơ Nưng)',locality:'Biển Hồ',start:[107.9993443,14.0342026],mappedEntrance:true,visitOnArrival:true,
      lookout:{lon:107.99979,lat:14.040096,kind:'Điểm ngắm cảnh'},
      source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
      views:[{name:'Từ đầu mũi nhìn ra lòng hồ',offset:[17,-109],height:14,viewAngle:-.15,viewRadius:103,viewElevation:.037,
        description:'Từ mũi đất nhô ra giữa hồ, nhìn về dải bờ phía bắc.'},
        {name:'Hai phía mặt nước quanh mũi Đầu Rùa',offset:[0,28],height:5,viewAngle:-2.33,viewRadius:144,viewElevation:.39,
          description:'Mặt nước ôm lấy hai bên mũi đất. Sân tượng và đoạn đường dạo nằm ở đầu bán đảo.'}],
      arrivalNote:'Xe dừng cạnh bãi trước cổng. Theo đường thông và bậc đá đến mũi Đầu Rùa để ngắm hai phía mặt hồ.'},
    'osm-node-13105153109':{name:'Biển Hồ Pleiku',locality:'Biển Hồ',start:[107.9993443,14.0342026],mappedEntrance:true,visitOnArrival:true,
      lookout:{lon:107.99979,lat:14.040096,kind:'Điểm ngắm cảnh'},viewOf:['mui-ngam-bien-ho-pleiku',2],
      arrivalNote:'Xe dừng cạnh bãi trước cổng. Mặt hồ nhìn thấy từ lan can của mũi Đầu Rùa.'},
    'osm-node-3600339699':{name:'Lối ra mũi Đầu Rùa ở Biển Hồ',locality:'Biển Hồ',start:[107.9993443,14.0342026],mappedEntrance:true,visitOnArrival:true,
      source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
      arrivalNote:'Xe dừng ở bãi trước cổng. Theo lối đi tới đoạn rẽ ở đầu mũi đất, cách sân tượng khoảng 70 m.',
      views:[{name:'Từ lối rẽ nhìn lên sân tượng',offset:[26,-56],height:12,viewAngle:-.426,viewRadius:61,viewElevation:.10,
        description:'Đường đi dọc sống đất giữa hai phía mặt nước. Sân tượng nằm ở đầu mũi về phía đông bắc.'},
        {name:'Đường đi trên sống đất',offset:[10,-20],height:3.5,viewAngle:1.82,viewRadius:96,viewElevation:.43,
          description:'Từ trên cao có thể lần theo lối đi ra đầu mũi Đầu Rùa.'}]},
    // This old viewpoint is inland. Serve the eastern peninsula from the
    // mapped service-road junction with Âu Cơ (n677443064), at Lắk Resort.
    'osm-node-1765142229':{name:'Bờ đông nam hồ Lắk',locality:'Liên Sơn',kind:'Điểm ngắm cảnh',
      lookout:{lon:108.1820713,lat:12.4125449,kind:'Điểm ngắm cảnh'},
      start:[108.1824406,12.4132505],mappedEntrance:true,visitOnArrival:true,
      source:'https://daklaktourist.com.vn/lak-resort/',
      arrivalNote:'Xe dừng trên đường Âu Cơ, ở đầu lối vào Lắk Resort. Góc tham quan đưa tới bán đảo ở bờ đông nam hồ.',
      views:[{name:'Từ sân ven bờ nhìn về vũng hồ',offset:[-5.4,15],height:2,viewAngle:2.796,viewRadius:16,viewElevation:.08,
        description:'Góc nhìn từ khoảng sân bên nhà dài, hướng tây nam qua vũng nước ở bờ bán đảo.'},
        {name:'Mặt nước phía nam bán đảo',offset:[206.2,149],height:2,viewAngle:-2.7,viewRadius:25,viewElevation:.08,
          description:'Nhìn về phía đông nam từ lối dạo men bờ. Buôn Jun nằm ở phía bên kia vịnh, về hướng tây bắc.'}]},
    // Keep the Atlas lake polygon at its centroid. The public viewpoint is on
    // the western side of Buôn Jun's tip (n13654496501), beside the Y Jút landing.
    'osm-relation-7074662':{locality:'Liên Sơn',lookout:{lon:108.1672437,lat:12.416416,kind:'Điểm ngắm cảnh'},
      start:[108.1675773,12.4164342],mappedEntrance:true,visitOnArrival:true,source:'https://daklaktourist.com.vn/tour-ho-lak/',
      description:'Mũi đất của buôn Jun nhô ra từ bờ nam hồ Lắk. Từ đây có thể nhìn qua mặt nước tới những dải đồi bao quanh lòng hồ.',
      arrivalNote:'Xe dừng trên đường Y Jút gần bến buôn Jun. Điểm ngắm nằm ở mép tây mũi đất, cách chỗ dừng khoảng 36 m.',
      views:[{name:'Từ mũi buôn Jun nhìn về tây bắc',offset:[-89,-140],height:3,viewAngle:.568,viewRadius:166,viewElevation:.026,
        description:'Từ sát bờ, nhìn qua khoảng nước phía tây bắc buôn Jun tới đường chân đồi.'},
        {name:'Mũi đất giữa hai phía mặt hồ',offset:[13,38],height:2.5,viewAngle:-2.62,viewRadius:213,viewElevation:.35,
          description:'Góc cao từ mặt hồ nhìn về buôn Jun. Đường Y Jút đi dọc mũi đất, kết thúc ở bến phía bắc.'}]},
    // w706543013 is the public ĐT.819 beside Kênh 79. World Bank SWLC ESIA
    // fig. 3.5 marks the small canal compound 1.7 km southwest of this road.
    'osm-relation-17189466':{locality:'Tân Hưng',start:[105.7210387,10.7871526],mappedEntrance:true,visitOnArrival:true,
      source:'https://nbca.gov.vn/khu-du-tru-thien-nhien-lang-sen-long-an/',
      arrivalNote:'Xe dừng trên ĐT.819, phía đông nam cầu Kênh Tỉnh, bên Kênh 79. Từ đây góc tham quan đưa tới rừng tràm và con mương cạnh trạm, cách khoảng 1,7 km theo đường thẳng.'},
    // n4735572208 joins Âu Cơ to Nguyễn Huệ, the winding hill access (w52755113).
    'osm-way-52823719':{name:'Biệt điện Bảo Đại bên hồ Lắk',kind:'Biệt điện',locality:'Liên Sơn',start:[108.1783988,12.4129976],mappedEntrance:true,visitOnArrival:true,
      source:'https://daklaktourist.com.vn/tour-ho-lak/',
      arrivalNote:'Xe dừng trên đường Âu Cơ ở chân dốc Nguyễn Huệ. Con đường uốn theo sườn đồi dẫn lên sân biệt điện nhìn xuống hồ Lắk.'},
    // Lê Văn Giáo meets the eastern entrance walk (w769479510) at n6466763187.
    'osm-way-1244769154':{locality:'Cao Lãnh',start:[105.63325,10.4467407],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh cổng phía đường Lê Văn Giáo. Đi bộ qua cổng mộ và hồ sen để tới nơi an nghỉ của cụ Phó bảng Nguyễn Sinh Sắc.'},
    'osm-node-8437362637':{locality:'Long Hưng A',source:'https://csdl.vietnamtourism.gov.vn/dest/?item=1045',
      start:[105.6705179,10.3514116],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên Đường huyện 69, ở lối vào phía tây nam khu du lịch. Từ đây có đường vào khuôn viên.',
      description:'Trong khu du lịch văn hóa Phương Nam có Nam Phương Linh Từ, các dãy hành lang, nhà chuông, nhà trống và bảo tàng. Mở ảnh toàn cảnh để xem các công trình ở cự ly gần.'},
    // Hứa Hòa Hưng (w484331811) ends where the pedestrian approaches begin.
    'osm-relation-17189464':{start:[105.7207283,9.2426326],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trước cổng Vườn chim trên đường Hứa Hòa Hưng. Từ đây lối đi bộ dẫn vào khu trưng bày và các điểm ngắm chim.'},
    'osm-way-907749065':{start:[106.674909,10.360361],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Rạch Gầm, bên cửa hông đình. Mặt võ ca nhìn về phố Phan Chu Trinh và chợ Gò Công.'},
    'osm-way-1272644423':{name:'Nhà Đốc Phủ Hải',kind:'Di tích',start:[106.6749700,10.3621709],mappedEntrance:true,visitOnArrival:true,
      source:'https://dulich.dongthap.gov.vn/vi/nhadocphuhai',arrivalNote:'Xe dừng trên đường Hai Bà Trưng, gần cổng số 49. Từ đây đi qua sân tới tiền sảnh của ngôi nhà.'},
    // w686360197 follows the stream through the waterfall pin. Visitors leave
    // their cars on the approach road and walk the last stretch into Bản Hiêu.
    'osm-node-6215416985':{name:'Thác Hiêu – Pù Luông',locality:'Bản Hiêu',start:[105.21903,20.46099],
      mappedEntrance:true,visitOnArrival:true,photo:'https://dantoctongiao.vn/den-pu-luong-chiem-nguong-thac-hieu-va-cam-nhan-van-hoa-thai-1784326501147.htm',
      arrivalNote:'Xe dừng trên đường vào bản Hiêu. Đường bộ tới thác dài khoảng 800 m.',
      views:[{name:'Bậc đá nhìn từ hạ lưu',height:1.7,viewAngle:-.15,viewRadius:15,viewElevation:.22,
        description:'Suối Hiêu bắt nguồn từ hang đá vôi. Trong chuỗi thác dài khoảng 800 m, cảnh này tái hiện một đoạn ngắn có các vũng nước và gờ đá vôi nối tiếp nhau.'},
        {name:'Dòng nước qua sườn đá',height:1.7,viewAngle:.72,viewRadius:17,viewElevation:.39,
          description:'Từ bờ suối nhìn chếch qua các bậc nước. Tim suối bám theo bản đồ. Bề rộng dòng chảy và hình dáng từng gờ đá được ước dựng.'}]},
    'osm-relation-15805643':{locality:'Vồ Dơi',start:[104.9594476,9.1976786],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trước cổng Vồ Dơi ở đường vào từ ĐT.985C. Tuyến tham quan bên trong vườn dài khoảng 3 km tới đài quan sát.'},
    'osm-node-5227610721':{locality:'Sa Đéc',start:[105.7685973,10.2940567],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Nguyễn Huệ, trước lối qua sân vào nhà cổ Huỳnh Thủy Lê.'},
    'osm-node-8459780109':{locality:'Đốc Binh Kiều',start:[105.828311,10.603885],mappedEntrance:true,visitOnArrival:true,
      source:'https://dsvh.gov.vn/di-tich-khao-co-va-kien-truc-nghe-thuat-go-thap-2966',
      description:'Giữa Đồng Tháp Mười, các nền đền bằng gạch của văn hóa Óc Eo nằm gần chùa Tháp Linh và các đền, miếu tiếp tục đón khách hành hương. Mở cảnh thực 360° để đến từng điểm.',
      arrivalNote:'Xe dừng bên đường xuyên khu di tích. Từ đây đi bộ vào mái che phế tích đền Vishnu.'},
    // At Thạch Động the OSM monument pin is on the adjacent hill. The cave
    // model is at Tiên Sơn Tự, at the independent geological survey tower.
    'osm-node-2327003316':{name:'Thạch Động – Hà Tiên',kind:'Hang động',locality:'Hà Tiên',
      start:[104.47545,10.410973],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường vào dưới chân núi. Lối bậc dẫn lên chùa Tiên Sơn trong Thạch Động.'},
    'osm-node-2326969109':{name:'Đền thờ họ Mạc (Trung Nghĩa Từ)',kind:'Đền',locality:'Hà Tiên',
      start:[104.4835338,10.3854001],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Mạc Cửu, trước lối vào đền. Từ chân núi Bình San, bậc đá dẫn lên khu mộ họ Mạc.'},
    'osm-node-2326969092':{name:'Chùa Phù Dung',kind:'Chùa',locality:'Hà Tiên',
      start:[104.482885,10.388893],mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng trên đường Phù Dung phía bắc khuôn viên chùa.'},
    'osm-node-11353153265':{name:'Núi Đá Dựng',locality:'Hà Tiên',start:[104.4777594,10.4273828],
      mappedEntrance:true,visitOnArrival:true,
      source:'https://apc.angiang.gov.vn/m/164/1373/Nhung-dia-diem-du-lich-nao-duoc-yeu-thich-nhat-o-Kien-Giang.html',
      description:'Khối núi đá vôi đứng riêng giữa đồng bằng Hà Tiên. Từ sườn phía nam nhìn xuống, có thể nhận ra hai mặt hồ cách nhau một quãng đồng.',
      arrivalNote:'Xe dừng trên đường phía nam núi, tại lối rẽ vào chân núi Đá Dựng. Từ đây khách đi bộ.',
      // The southern ponds are OSM water polygons w940338140 and w934560370.
      views:[{name:'Mặt núi phía nam',offset:[-12,41],viewAngle:-.31,viewRadius:295,viewElevation:-.14,height:4},
        {name:'Từ sườn núi nhìn xuống hồ',offset:[-92,243],viewAngle:2.78,viewRadius:232,viewElevation:.34,height:3}]},
    'osm-node-2089305124':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn ở chợ Đục Khê. Từ Bến Yến, đi đò đến bến Trò rồi đi bộ lên chùa Thiên Trù.'},
    'osm-node-2089305122':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn ở chợ Đục Khê. Đi bộ hoặc xe điện đến Bến Yến, đi đò đến bến Trò rồi lên núi.'},
    'osm-node-2669659389':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn ở chợ Đục Khê. Từ Bến Yến, đền nằm ở chặng đầu của tuyến suối Yến.'},
    'osm-node-2835735216':{locality:'Hương Sơn',start:huongSonParking,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng cạnh bến xe Hương Sơn. Chùa Giải Oan nằm trên đường núi từ Thiên Trù lên động Hương Tích.'},
    'osm-node-3887715188':{
      start:tuanChau,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở cảng Tuần Châu. Hang Trinh Nữ nằm trên đảo Bồ Hòn.'},
    'osm-node-4858968321':{
      name:'Vịnh Lan Hạ',start:benBeo,mappedEntrance:true,visitOnArrival:true,
      lookout:{lon:107.078406,lat:20.7299682,kind:'Điểm ngắm cảnh'},
      description:'Từ điểm cao trên đảo Cát Dứa nhìn ra vịnh Lan Hạ. Trong mục cảnh thực 360° có thể đến bãi Vạn Bội và đảo Năm Cát.',
      arrivalNote:'Xe dừng trên phố Cái Bèo, ở lối vào bãi xe của bến tàu.'},
    'osm-relation-20057203':{
      name:'Làng chài Cái Bèo',start:benBeo,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Từ Bến Bèo, thuyền đi giữa các đảo đá đến vùng làng chài.'},
    'osm-node-13388093801':{
      name:'Đảo Cát Dứa (Đảo Khỉ)',start:benBeo,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở lối vào bãi xe Bến Bèo trên đảo Cát Bà.',
      description:'Một bãi cát nằm dưới sườn bắc, bãi thứ hai nép về phía tây nam. Giữa hai bãi là sống đảo đá vôi.',
      // Beach polygons w208896430 and w208896431, and the summit n6293770430.
      views:[{name:'Bãi cát ở mũi bắc',offset:[15,-16],viewAngle:3.04,viewRadius:91,viewElevation:.28,height:6},
        {name:'Bãi phía tây nam đảo Cát Dứa',offset:[-124,226],viewAngle:-.97,viewRadius:112,viewElevation:.3,height:6},
        {name:'Sống đảo giữa hai bãi',offset:[-86,122],viewAngle:1.04,viewRadius:207,viewElevation:.52,height:9}]},
    'osm-way-198804451':{
      name:'Tháp A10 – Mỹ Sơn',start:mySonGate,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở cổng khu di tích Mỹ Sơn.',viewOf:['my-son-nhom-a',1]},
    'osm-node-2088919707':{
      name:'Tháp A11 – Mỹ Sơn',start:mySonGate,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng ở cổng khu di tích Mỹ Sơn.',viewOf:['my-son-nhom-a',2]},
    'osm-way-198804483':{
      name:'Toàn cảnh thung lũng Mỹ Sơn',start:mySonGate,mappedEntrance:true,visitOnArrival:true,
      arrivalNote:'Xe dừng tại cổng khu di tích. Từ đây tuyến tham quan đi sâu vào thung lũng Mỹ Sơn.',
      description:'Các cụm đền tháp Chăm nằm rải trong thung lũng. Từ trên cao có thể thấy nhóm B và C sát nhau, cùng hai nhà dài của nhóm D về phía đông.',
      views:[{name:'Ba nhóm tháp B, C và D',offset:[195,270],viewAngle:.86,viewRadius:102,viewElevation:.57,height:7},
        {name:'Nhìn qua hai nhà dài về nhóm B',offset:[200,278],viewAngle:1.43,viewRadius:68,viewElevation:.24,height:6}]},
    'osm-way-242169982':{
      description:'Từ cổng Nam, con đường chạy chéo qua cánh đồng trong thành đến cổng Bắc. Bốn cổng đá nối với nhau bằng các đoạn tường thành giữa đồng ruộng Vĩnh Lộc.',
      views:[{name:'Trục đường qua nội thành',offset:[105,180],viewAngle:.54,viewRadius:480,viewElevation:.59,height:9},
        {name:'Nhìn từ trong thành ra cổng Nam',offset:[228,382],viewAngle:-2.61,viewRadius:64,viewElevation:.16,height:11}]},
    'osm-way-1362974362':{
      description:'Hai đền vua Đinh và vua Lê nằm dưới chân núi ở vùng lõi Cố đô Hoa Lư. Từ trên cao có thể nhận ra hai quần thể sân và nhà thờ nằm cách nhau một quãng ngắn.',
      views:[{name:'Hai đền vua giữa Hoa Lư',offset:[380,-277],viewAngle:1.36,viewRadius:234,viewElevation:.65,height:14},
        {name:'Trước sân đền vua Đinh',offset:[353,-196],viewAngle:.98,viewRadius:76,viewElevation:.33,height:11},
        {name:'Nhìn sang đền vua Lê',offset:[414,-368],viewAngle:1.18,viewRadius:79,viewElevation:.33,height:11}]},
    'osm-relation-21401560':{
      description:'Những ô cỏ trên Quảng trường Ba Đình trải dài trước mặt Lăng Chủ tịch Hồ Chí Minh. Cột cờ nằm trên trục nhìn từ quảng trường về chính giữa hàng cột đá của Lăng.',
      views:[{name:'Các ô cỏ trước Lăng',viewAngle:1.49,viewRadius:139,viewElevation:.42,height:8},
        {name:'Dọc theo quảng trường',viewAngle:2.85,viewRadius:151,viewElevation:.24,height:13}]}
  };
  for(const site of atlas.entries){
    const precinct=precincts[site.id];
    if(!precinct)continue;
    Object.assign(site,precinct);
    if(precinct.start)site.approachMeters=Math.round(Math.hypot(
      (site.lon-site.start[0])*111320*Math.cos(site.lat*Math.PI/180),(site.lat-site.start[1])*110900));
  }
  // Mapped components omitted from the national import, including three member
  // ways of OSM relation 21218176. © OpenStreetMap contributors, ODbL.
  const source = 'https://dulichbacninh.gov.vn/kham-pha/vung-dat-con-nguoi-bac-ninh/quan-the-di-tich-yen-tu-vinh-nghiem-con-son-kiep-bac-di-san-van-hoa-the-gioi-1096.html';
  const components = [
    [1567975867,'Chùa Lân – Thiền viện Trúc Lâm Yên Tử','Quảng Ninh','Yên Tử',106.7293311,21.1097242,106.729035,21.110194,61],
    [1567975864,'Am – chùa Ngọa Vân','Quảng Ninh','Bình Khê',106.5795496,21.1765214,106.562360,21.167990,2017],
    [1567975862,'Chùa Bổ Đà','Bắc Ninh','Vân Hà',106.0524118,21.2423431,106.052006,21.242033,54],
    [1504768248,'Đền Trung – Hùng Vương Tổ miếu','Phú Thọ','Hùng Sơn',105.3240986,21.3690193,105.322450,21.369750,189,'https://denhung.vn/tin-tuc/den-trung'],
  ];
  const existing = new Set(atlas.entries.map(site => site.id));
  if(!existing.has('phu-yen-nha-trung-bay-vung-ro'))atlas.entries.push({
    id:'phu-yen-nha-trung-bay-vung-ro',name:'Nhà trưng bày Bến Vũng Rô',region:'Trung Bộ',province:'Đắk Lắk',formerProvince:'Phú Yên',city:'Đông Hòa',locality:'Bãi Chùa',kind:'Nhà trưng bày',
    lon:109.419861,lat:12.877000,start:vungRoEntrance,approachMeters:101,mappedEntrance:true,visitOnArrival:true,source:baiChuaSource,
    map:'https://www.openstreetmap.org/?mlat=12.877000&mlon=109.419861#map=19/12.877000/109.419861',
    arrivalNote:'Xe dừng trên Quốc lộ 29 ở lối vào Bãi Chùa. Nhà trưng bày nằm phía nam sân tượng đài.'});
  if(!existing.has('osm-node-3094058858'))atlas.entries.push({
    id:'osm-node-3094058858',name:'Điểm ngắm phía trên thác Đambri',region:'Trung Bộ',province:'Lâm Đồng',locality:'Bảo Lộc',kind:'Điểm ngắm cảnh',
    lon:107.7428354,lat:11.642191,start:dambriEntrance,approachMeters:213,mappedEntrance:true,visitOnArrival:true,source:dambriSource,
    viewOf:['thac-dambri',1],map:'https://www.openstreetmap.org/node/3094058858',
    arrivalNote:'Từ lối vào khu du lịch đi về khu thang máy để nhìn qua mép thác.'});
  // w741701880 is the named tea parcel. Its centroid marks the crop on the
  // map; the visit starts at the pull-off on the pine avenue w741701067.
  if(!existing.has('osm-way-741701880'))atlas.entries.push({
    id:'osm-way-741701880',name:'Biển Hồ Chè – hàng thông trăm tuổi',region:'Trung Bộ',province:'Gia Lai',locality:'Biển Hồ',
    kind:'Điểm ngắm cảnh',lon:108.0129715,lat:14.0660232,start:[108.0121527,14.0635859],approachMeters:285,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/way/741701880',
    source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
    arrivalNote:'Xe dừng cạnh lề đường thông. Từ đây nhìn qua hàng cây có thể thấy các luống chè ở phía đông nam đường.'
  });
  if(!existing.has('osm-node-13105118510'))atlas.entries.push({
    id:'osm-node-13105118510',name:'Tượng Quán Thế Âm ở mũi Đầu Rùa',region:'Trung Bộ',province:'Gia Lai',city:'Pleiku',locality:'Biển Hồ',
    kind:'Tượng đài',lon:107.9998797,lat:14.0401163,start:[107.9993443,14.0342026],approachMeters:658,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/13105118510',
    source:'https://bienho.gialai.gov.vn/thong-bao-van-ban-moi/gioi-thieu-diem-van-hoa-du-lich-tren-dia-ban-xa-bien-ho.html',
    arrivalNote:'Xe dừng cạnh bãi ở cổng Biển Hồ. Từ đó đi bộ theo đường thông và bậc đá khoảng 680 m tới sân tượng.'
  });
  // The residence and provincial museum stand in the same grounds. w242705749
  // is the residence itself, south of the museum building w239932350.
  if(!existing.has('osm-way-242705749'))atlas.entries.push({
    id:'osm-way-242705749',name:'Biệt điện Bảo Đại (Buôn Ma Thuột)',region:'Trung Bộ',province:'Đắk Lắk',city:'Buôn Ma Thuột',locality:'Buôn Ma Thuột',
    kind:'Biệt điện',lon:108.042116,lat:12.674553,start:[108.042115,12.67345],approachMeters:122,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/way/242705749',
    source:'https://daklak.gov.vn/dia-danh-di-tich-thang-canh/-/asset_publisher/bDngMUmMrWIw/content/biet-ien-bao-ai',
    arrivalNote:'Xe dừng trên đường Y Ngông, trước lối vào khuôn viên bảo tàng. Đi bộ theo lối giữa vườn cây đến biệt điện.'
  });
  // The provincial transport plan connects Y Jút to the Buôn Jun landing.
  // Its last road segment (w779496939) meets the shore at the tip of the village.
  if(!existing.has('dak-lak-ben-thuyen-buon-jun'))atlas.entries.push({
    id:'dak-lak-ben-thuyen-buon-jun',name:'Bến thuyền độc mộc buôn Jun',region:'Trung Bộ',province:'Đắk Lắk',city:'Lắk',locality:'Buôn Jun',
    kind:'Bến tàu',lon:108.1675231,lat:12.4165578,start:[108.1675773,12.4164342],approachMeters:15,mappedEntrance:true,visitOnArrival:true,
    source:'https://ttthlak.gov.vn/tin-tuc/van-hoa-xa-hoi/doc-dao-le-cung-ben-thuyen-doc-moc-ho-lak-tai-buon-jun-thi-tran-lien-son',
    map:'https://www.openstreetmap.org/way/779496939',
    description:'Ở đầu bắc buôn Jun, đường Y Jút dẫn ra bến trên hồ Lắk. Người M’nông R’lâm từng dùng thuyền độc mộc để đánh cá, đi rẫy và qua lại giữa các buôn ven hồ.',
    arrivalNote:'Xe dừng gần cuối đường Y Jút. Đi bộ khoảng 15 m ra mép nước ở đầu bến.'
  });
  // The inscription faces the short southwestern court. The other main hall
  // across the roof ridge is the shrine of the Đặng family. The OSM pin
  // called Chùa Nam Phương lies outside the northern enclosure.
  if(!existing.has('dong-thap-nam-phuong-linh-tu'))atlas.entries.push({
    id:'dong-thap-nam-phuong-linh-tu',name:'Nam Phương Linh Từ',region:'Nam Bộ',province:'Đồng Tháp',city:'Lấp Vò',locality:'Long Hưng A',
    kind:'Di tích',lon:105.672435,lat:10.352504,start:[105.6705179,10.3514116],approachMeters:242,mappedEntrance:true,visitOnArrival:true,
    source:'https://dulichphuongnam.vn/den-tho-nam-phuong-linh-tu.html',map:'https://www.openstreetmap.org/?mlat=10.352504&mlon=105.672435#map=19/10.352504/105.672435',
    description:'Chính điện mở về sân phía tây nam, nơi có bia khắc tên Nam Phương Linh Từ. Ngôi điện có bảy gian, hai chái và sáu mươi cột.',
    arrivalNote:'Xe dừng ở lối vào khu văn hóa Phương Nam trên Đường huyện 69. Từ đó đi bộ qua sân tới chính điện.'
  });
  // The grave and temple are on the same plot at 1 Phan Đình Phùng. The
  // monument on the traffic island (n10608268024) has its own Atlas record.
  if(!existing.has('dong-thap-lang-mo-truong-dinh'))atlas.entries.push({
    id:'dong-thap-lang-mo-truong-dinh',name:'Mộ và đền thờ Trương Định',region:'Nam Bộ',province:'Đồng Tháp',city:'Gò Công',locality:'Gò Công',
    kind:'Lăng mộ',lon:106.674073,lat:10.3596791,start:[106.6741120,10.3598779],approachMeters:22,mappedEntrance:true,visitOnArrival:true,
    source:'https://dongthap.gov.vn/web/cong-thong-tin-dtp/tin-tuc/chi-tiet?id=10570971',map:'https://www.openstreetmap.org/?mlat=10.3596791&mlon=106.674073#map=19/10.3596791/106.674073',
    description:'Giữa phố Gò Công, phần mộ của Trương Định nằm trong khu tường bao, trước ngôi đền. Hai tấm bia có mái che ở đầu khu mộ.',
    arrivalNote:'Xe dừng trên đường Phan Đình Phùng gần cổng số 1. Đi qua cổng vào khu mộ và đền.'
  });
  // A nursery on Đường Hoa Sa Đéc. The OSM garden pin is on its service lane.
  // Park at the lane's intersection with the public road (n3423656227).
  if(!existing.has('osm-node-13518302230'))atlas.entries.push({
    id:'osm-node-13518302230',name:'Làng hoa Sa Đéc – vườn hoa Tân Quy Đông',region:'Nam Bộ',province:'Đồng Tháp',city:'Sa Đéc',locality:'Tân Quy Đông',
    kind:'Điểm tham quan',lon:105.7456238,lat:10.3184773,start:[105.7451432,10.3176824],approachMeters:103,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/13518302230',source:'https://dulich.dongthap.gov.vn/vi/camera360',photo:'https://vr3d.com.vn/dongthap/langhoasadec/',
    description:'Từ đường hoa Sa Nhiên – Cai Dao, các lối nhỏ dẫn vào những nhà vườn của Tân Quy Đông. Ảnh cầu cho thấy các luống cây và hoa ở nhiều vị trí trong làng.',
    arrivalNote:'Xe dừng trên Đường Hoa Sa Đéc, ở đầu lối vào vườn. Từ đây đi bộ vào các luống hoa.'
  });
  // The water wheels beside the rice fields have a separate pin from the reserve
  // boundary and the bamboo raft landing. The approach ends on village road w888275965.
  if(!existing.has('osm-node-13508679485'))atlas.entries.push({
    id:'osm-node-13508679485',name:'Guồng nước suối Chàm – Pù Luông',region:'Trung Bộ',province:'Thanh Hóa',city:'Thanh Hóa',locality:'Chiềng Lau',
    kind:'Điểm tham quan',lon:105.2108098,lat:20.3813461,start:[105.2107981,20.3802488],approachMeters:130,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/13508679485',source:'https://nhandan.vn/tre-chieng-lau-post789295.html',
    arrivalNote:'Xe dừng trên đường làng phía nam cánh đồng. Từ đây đi bộ theo bờ ruộng tới cụm guồng nước.'
  });
  if(!existing.has('osm-node-7173617332'))atlas.entries.push({
    id:'osm-node-7173617332',name:'Bến Yến (Chùa Hương)',region:'Bắc Bộ',province:'Hà Nội',city:'Hà Nội',locality:'Hương Sơn',
    kind:'Bến tàu',lon:105.7792825,lat:20.6090699,start:huongSonParking,approachMeters:1040,mappedEntrance:true,visitOnArrival:true,
    source:'https://hanoigo.hanoi.gov.vn/place/quan-the-huong-son-chua-huong-ctv-sa2nx5',
    map:'https://www.openstreetmap.org/node/7173617332',
    description:'Bến Yến nằm bên đường làng Yến Vỹ. Đò từ đây đi về phía tây nam theo suối Yến rồi vòng qua các dãy núi để đến bến Trò.',
    arrivalNote:'Xe dừng trên đường cạnh bến xe Hương Sơn, phía chợ Đục Khê. Từ đó đi bộ hoặc xe điện tới bến đò.',
    views:[{name:'Dọc bến đò làng Yến Vỹ',offset:[-11,6],viewAngle:1.01,viewRadius:58,viewElevation:.34,height:3},
      {name:'Suối Yến về phía núi',offset:[-85,83],viewAngle:2.39,viewRadius:115,viewElevation:.31,height:5}]
  });
  if(!existing.has('osm-node-778791182'))atlas.entries.push({
    id:'osm-node-778791182',name:'Bến Bèo',region:'Bắc Bộ',province:'Hải Phòng',city:'Hải Phòng',locality:'Cát Bà',
    kind:'Bến tàu',lon:107.0589122,lat:20.732131,start:benBeo,approachMeters:113,mappedEntrance:true,visitOnArrival:true,
    map:'https://www.openstreetmap.org/node/778791182',
    source:'https://haiphong.gov.vn/diem-bao-ve-hai-phong/diem-bao-hang-ngay-ve-hai-phong-ngay-7-4-2026-881575',
    description:'Phố Cái Bèo kết thúc bên cầu tàu. Các bến nhỏ nối theo bờ về phía nam. Từ đây tàu ra làng chài và vịnh Lan Hạ.',
    views:[{name:'Cầu tàu ở cuối phố Cái Bèo',offset:[-1,-4],viewAngle:2.06,viewRadius:67,viewElevation:.34,height:5},
      {name:'Dọc bờ Bến Bèo',offset:[-13,44],viewAngle:-2.91,viewRadius:144,viewElevation:.41,height:8}]
  });
  if(!existing.has('osm-node-5246605623'))atlas.entries.push({
    id:'osm-node-5246605623',name:'Hang Trống',region:'Bắc Bộ',province:'Quảng Ninh',city:'Vịnh Hạ Long',
    locality:'Đảo Bồ Hòn',kind:'Hang động',lon:107.1074494,lat:20.8404008,start:tuanChau,
    approachMeters:15100,mappedEntrance:true,visitOnArrival:true,map:'https://www.openstreetmap.org/node/5246605623',
    source:'https://whc.unesco.org/document/192087'
  });
  // Pò Giả Mải is the local name of Đảo Bà Góa. The way is tagged as an
  // island and has no tourism tag in the national catalogue import.
  if(!existing.has('osm-way-591309599'))atlas.entries.push({
    id:'osm-way-591309599',name:'Đảo Bà Góa – Pò Giả Mải',province:'Thái Nguyên',city:'Thái Nguyên',
    locality:'Ba Bể',region:'Bắc Bộ',kind:'Đảo',lon:105.623214,lat:22.405097,
    start:[105.6241973,22.4086666],approachMeters:409,source:'https://csdl.vietnamtourism.gov.vn/dest/?item=752',
    map:'https://www.openstreetmap.org/way/591309599'
  });
  for (const [way, name, province, locality, lon, lat, startLon, startLat, approachMeters, componentSource=source] of components) {
    const id = 'osm-way-' + way;
    if (existing.has(id) || atlas.aliases[id]) continue;
    atlas.entries.push({id, name, province, city:province, locality, region:'Bắc Bộ', kind:'Di tích',
      lon, lat, start:[startLon, startLat], approachMeters, source:componentSource, map:'https://www.openstreetmap.org/way/' + way});
  }
  // UNESCO's location for 678-014 and its list of the fourteen Huế components:
  // https://whc.unesco.org/en/list/678/maps/
  // Hòn Chén and Voi Ré use interior points of the named OSM ways. Their
  // road endpoints meet the mapped stairs and footpath at nodes 9859668009 and 9859723546.
  const hue = [
    {id:'osm-way-1075014568', name:'Điện Hòn Chén (điện Huệ Nam)', locality:'Hải Cát',
      lon:107.5629208, lat:16.4219646, start:[107.563060,16.423090], approachMeters:126,
      map:'https://www.openstreetmap.org/way/1075014568',
      arrivalNote:'Xe dừng trên đường làng Hải Cát, cách điện 126 m theo đường thẳng. Từ đây có bậc thang nối với lối đi bộ tới điện.'},
    {id:'osm-way-1075016121', name:'Điện Voi Ré (miếu Long Châu)', locality:'Trường Đá',
      lon:107.5527367, lat:16.4481203, start:[107.552950,16.447922], approachMeters:32,
      map:'https://www.openstreetmap.org/way/1075016121',
      arrivalNote:'Xe dừng ở đầu lối đi bộ vào điện Voi Ré, cách điểm tham quan 32 m theo đường thẳng.'},
    {id:'unesco-678-014', name:'Trấn Hải Thành', locality:'Thuận An',
      lon:107.6549333, lat:16.5546833, start:[107.654199,16.555779], approachMeters:145,
      map:'https://www.openstreetmap.org/?mlat=16.5546833&mlon=107.6549333#map=18/16.5546833/107.6549333',
      arrivalNote:'Xe dừng tại giao lộ Lê Sỹ và Trấn Hải Thành ở Thuận An, cách điểm di sản 145 m theo đường thẳng.'},
  ];
  for (const site of hue) {
    if (existing.has(site.id) || atlas.aliases[site.id]) continue;
    atlas.entries.push({...site, province:'Huế', city:'Huế', region:'Trung Bộ', kind:'Di tích',
      visitOnArrival:true, source:'https://whc.unesco.org/en/list/678/maps/'});
  }
})();
