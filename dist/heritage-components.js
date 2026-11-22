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
  ]);
  for (const site of atlas.entries) {
    if (names.has(site.id)) site.name = names.get(site.id);
  }
  // Several stops describe an entire precinct. Frame its actual mapped sights
  // instead of looking at the empty centre of the boundary polygon.
  // The whole-property pin is at the centre of the UNESCO boundary. Its
  // cameras look southeast at the temples. Cars stay on the road by the gate.
  const mySonGate=[108.10911,15.77344];
  const precincts={
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
