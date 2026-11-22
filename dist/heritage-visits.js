'use strict';
// Anchor a regional visit on an existing road arrival. Each stop keeps its own
// coordinates and the camera can move out to an island while the car stays parked.
const heritageVisits=[
  // https://thanglong.baochinhphu.vn/ung-dung-cong-nghe-de-le-hoi-chua-huong-ngay-cang-an-toan-van-minh-va-hien-dai-10324120923332171.htm
  ['chua-huong-huong-son','Chùa Hương – từ suối Yến đến động Hương Tích',[
    'osm-node-7173617332','osm-node-2089305124','osm-node-2835735216','osm-node-2089305122',
  ]],
  ['binh-san-thach-dong-ha-tien','Hà Tiên – núi Bình San, Thạch Động và Đá Dựng',[
    'osm-node-2326969109','osm-node-2326969092','osm-node-2327003316','osm-node-11353153265',
  ]],
  // https://dsvh.gov.vn/di-tich-kien-truc-nghe-thuat-khu-den-thap-my-son-2943
  ['my-son','Thánh địa Mỹ Sơn',[
    'bao-tang-my-son','my-son-thap-cong-k','osm-way-198804483','my-son-nhom-h',
    'my-son-nhom-b','my-son-nhom-c','my-son-nhom-d','my-son-nhom-a','osm-way-198804451','osm-node-2088919707',
    'my-son-nhom-g','my-son-nhom-e','my-son-nhom-f',
  ]],
  ['chua-thay-tay-phuong','Chùa Thầy và chùa Tây Phương',[
    'chua-thay-sai-son','thuy-dinh-ho-long-tri','osm-way-550537566','chua-cao-sai-son','chua-mot-mai-boi-am','chua-tay-phuong-thach-xa',
  ]],
  ['dinh-va-thac-bach-ma','Vườn quốc gia Bạch Mã – Hải Vọng Đài, Ngũ Hồ và Đỗ Quyên',[
    'hai-vong-dai-bach-ma','ngu-ho-bach-ma','thac-do-quyen-bach-ma',
  ]],
  ['dat-ngap-nuoc-tram-chim','Vườn quốc gia Tràm Chim – bến khách và trạm C4',[
    'osm-node-12647638907','osm-node-12647714579','osm-node-12647715610','osm-node-4416131389','osm-node-12647689080',
  ]],
  ['rung-va-bau-cat-tien','Vườn quốc gia Cát Tiên – từ Bến Cự đến Bàu Sấu',[
    'ghenh-ben-cu-cat-tien','cay-go-bac-dong','cay-tung-duong-bau-sau','dai-quan-sat-bau-sau','osm-way-141722682',
  ]],
  ['cao-nguyen-da-dong-van','Cao nguyên đá Đồng Văn',[
    'dai-ngam-nui-doi-quan-ba','nui-doi-quan-ba','dong-lung-khuy','dinh-thu-ho-vuong',
    'rung-da-lung-tao','lung-cu','pho-co-dong-van','cho-co-dong-van',
  ]],
  ['vuon-quoc-gia-cuc-phuong','Vườn quốc gia Cúc Phương',[
    'osm-way-481782794','osm-way-201095352','osm-node-1725481657','osm-node-10768945036',
    'osm-node-1995508763','osm-node-1995508761','osm-node-5294733035',
  ]],
  ['ho-ba-be-song-nang','Hồ Ba Bể và sông Năng',[
    'osm-relation-7109450','dao-ba-goa-ba-be','den-an-ma-ba-be','osm-node-1888768316','osm-node-4755846850','osm-node-4879886024',
  ]],
  ['tuong-niem-dien-bien-phu','Điện Biên Phủ – bảo tàng và các điểm tưởng niệm',[
    'bao-tang-chien-thang-dien-bien-phu','nghia-trang-liet-si-a1','san-hanh-le-doi-d1','tuong-dai-chien-thang-dien-bien-phu',
  ]],
  ['di-tich-co-loa','Khu di tích Cổ Loa',[
    'osm-way-776438252','osm-way-497328755','osm-way-776437158','osm-way-1556531233','osm-way-776437157',
  ]],
  ['khu-di-tich-den-hung','Khu di tích Đền Hùng',[
    'osm-node-11395354269','osm-node-7189828683','osm-node-11395352269','osm-node-11395352270',
    'osm-way-1504768248','osm-node-11395352271','osm-node-11395352369','osm-node-11395352469',
  ]],
  ['kien-truc-bao-tang-ha-noi','Kiến trúc ba bảo tàng ở Hà Nội',[
    'bao-tang-my-thuat-viet-nam','bao-tang-phu-nu-viet-nam','bao-tang-ha-noi',
  ]],
  // https://condao.com.vn/vi/news/tai-nguyen-du-lich/nha-tu-con-dao-2750.html
  ['di-tich-con-dao','Côn Đảo – từ Dinh Chúa Đảo đến Cầu tàu 914',[
    'so-co-con-dao','dinh-chua-dao','bia-cau-tau-914','cau-tau-914',
  ]],
  ['cum-thap-hoa-lai','Cụm tháp Hòa Lai',[
    'thap-bac-hoa-lai','thap-hoa-lai','thap-nam-hoa-lai',
  ]],
  // https://bvhttdl.gov.vn/binh-dinh-tu-bo-ton-tao-phat-huy-gia-tri-thap-champa-gan-voi-phat-trien-du-lich-20211015112439839.htm
  ['thap-cham-binh-dinh','Bảy cụm tháp Chăm Bình Định',[
    'thap-doi','thap-binh-lam','thap-banh-it','thap-canh-tien','thap-phu-loc','thap-thu-thien','thap-duong-long',
  ]],
  ['di-tich-pac-bo','Khu di tích Pác Bó',[
    'osm-node-5418467363','osm-node-1490413978','osm-way-1376476251','osm-node-13005765528','hang-coc-bo',
  ]],
  ['ban-gioc-nguom-ngao','Bản Giốc – Khuổi Ky – Ngườm Ngao',[
    'ban-gioc','osm-way-1372358286','osm-way-1415191977','osm-node-13378657667','osm-node-4527762070',
  ]],
  ['di-tich-nui-sam','Các di tích quanh Núi Sam',[
    'osm-way-1159104301','osm-node-1814474832','osm-way-1159104315','osm-way-1189409894','osm-node-4293357289',
  ]],
  ['chua-soc-trang','Các ngôi chùa Sóc Trăng',[
    'osm-way-225364168','osm-way-668640550','osm-way-668640522','osm-way-668649240','bat',
  ]],
  ['oc-eo-ba-the','Óc Eo – Ba Thê',[
    'osm-way-1182462616','osm-way-1182462620','osm-way-1182462619',
  ]],
  // https://halongbay.com.vn/vi/tours/25-hanh-trinh-vhl7-tham-quan-vinh-ha-long-theo-cac-hanh-trinh-vhl1-2-3-4
  // https://daison.haiphong.gov.vn/van-hoa-xa-hoi/hai-phong-ban-hanh-muc-phi-tham-quan-moi-doi-voi-di-tich-danh-thang-837039
  ['vinh-ha-long-cat-ba','Vịnh Hạ Long – quần đảo Cát Bà',[
    'hon-trong-mai','osm-node-4730928605','osm-node-4730928606','osm-node-13570978422','osm-node-4508895511',
    'osm-node-10821152105','osm-node-994065796','osm-node-3494811567','osm-node-3560283504','osm-node-3887715188',
    'hang-trong-bo-hon','osm-node-5147203123','osm-node-6474418794',
  ]],
  ['ben-beo-vinh-lan-ha','Từ Bến Bèo ra vịnh Lan Hạ',[
    'osm-node-778791182','osm-relation-20057203','osm-node-13388093801','osm-node-4858968321',
  ]],
  // https://whc.unesco.org/en/list/678/documents/ and https://vdt.hueworldheritage.org.vn/vedientu
  ['di-tich-co-do-hue','Quần thể di tích Cố đô Huế',[
    'ngo-mon','flag','phu-van-lau','phuoc-duyen','lang-khai-dinh',
    'dien-thai-hoa','hien-lam-cac','cua-hien-nhon','lang-minh-mang','lang-tu-duc','ho-quyen-hue',
    'lang-gia-long','lang-dong-khanh','dan-nam-giao-hue','osm-way-695810710','osm-way-285990348',
    'osm-relation-17957939','osm-way-172763420','osm-way-264285103','osm-way-1075014562','osm-way-172657567','osm-way-172657565',
    'osm-way-1075014568','osm-way-1075016121','unesco-678-014',
  ]],
  // https://hoianheritage.net/vi/bao-chi/bao-chi-ve-di-san/ho-tro-di-tich-tu-nhan-o-hoi-an-mo-cua-don-khach-tham-quan-225.html
  // https://hoianheritage.net/uploads/download/files/ban-tin-1-2010.pdf
  ['pho-co-hoi-an','Phố cổ Hội An',[
    'chua-cau','hoi-quan-phuc-kien','osm-node-4279640089','nha-co-tan-ky','hoi-quan-quang-dong','hoi-quan-trieu-chau','cho-hoi-an',
    'osm-node-2076855954','osm-node-2076855866','osm-way-631064893','osm-node-4582592213','osm-way-565186618',
    'osm-way-210966819','osm-node-2092582318','osm-way-631074714','osm-node-2076856032','osm-node-3189923484',
  ]],
  // https://dsvh.gov.vn/danh-lam-thang-canh-trang-an-tam-coc-bich-dong-2946
  // https://sodulich.ninhbinh.gov.vn/vi/tai-nguyen-du-lich-van-hoa/co-do-hoa-lu-kinh-do-cua-nha-nuoc-phong-kien-tap-quyen-dau-tien-23.html
  ['quan-the-trang-an','Quần thể danh thắng Tràng An',[
    'ben-thuyen-trang-an','ben-thuyen-tam-coc','osm-way-1362974362','osm-way-772041809',
    'osm-way-772041801','osm-node-4424766405','osm-node-1540779110','osm-way-772057039','osm-node-4738232630',
    'osm-node-13388919549','osm-way-1424042953',
  ]],
  // The inner citadel, outer earthen rampart and altar are the three inscribed
  // components. https://whc.unesco.org/en/list/1358/maps/
  ['thanh-nha-ho','Thành Nhà Hồ',[
    'cong-nam-thanh-ho','cong-bac-thanh-ho','cong-dong-thanh-ho','cong-tay-thanh-ho',
    'osm-way-242169982','la-thanh-tay-do','dan-te-nam-giao-tay-do'
  ]],
  // https://phongnhakebang.vn/du-lich/du-lich-vuon-quoc-gia-phong-nha-ke-bang
  ['phong-nha-ke-bang','Phong Nha – Kẻ Bàng',[
    'phong-nha','osm-node-3499295493','osm-node-6358064546','osm-node-3157796075','osm-node-3499399985',
    'osm-node-5063396623','osm-node-5353612634','osm-node-4387487189',
  ]],
  // https://dulichbacninh.gov.vn/kham-pha/vung-dat-con-nguoi-bac-ninh/quan-the-di-tich-yen-tu-vinh-nghiem-con-son-kiep-bac-di-san-van-hoa-the-gioi-1096.html
  ['yen-tu-con-son','Yên Tử – Vĩnh Nghiêm – Côn Sơn, Kiếp Bạc',[
    'osm-way-1579506026','osm-node-4886986961','osm-way-1567975861','osm-way-1567975857','osm-way-1549018362',
    'osm-way-1549018367','osm-way-1567975868','osm-way-1567975866','osm-way-1567975863','osm-way-1567975865',
    'osm-way-1020461321','osm-way-1020716548','osm-way-1567975867','osm-way-1567975864','osm-way-1567975862',
  ]],
  // https://hoangthanhthanglong.vn/khu-di-tich-trung-tam-hoang-thanh-thang-long/
  ['hoang-thanh-thang-long','Hoàng thành Thăng Long',[
    'osm-way-696389268','osm-way-1497572243','osm-way-185535416','osm-relation-21404421','osm-way-185531692',
    'bac-mon-thang-long','cot-co-ha-noi',
  ]],
  // https://btllang.mod.gov.vn/cum-di-tich-lich-su-van-hoa-ba-dinh/lang-chu-tich-ho-chi-minh.html
  ['quang-truong-ba-dinh','Quảng trường Ba Đình và các di tích lân cận',[
    'osm-way-37625751','osm-relation-21401560','osm-way-207178342','osm-way-697326496','osm-way-37629143',
    'osm-way-37629570','osm-relation-17877970',
  ]],
  // https://tgpsaigon.net/bai-viet/cau-nguyen-voi-nu-vuong-hoa-binh-tai-sai-gon-75309
  ['cong-truong-cong-xa-paris','Công trường Công xã Paris',[
    'buu-dien-sai-gon','osm-way-801950766','osm-node-2410639584',
  ]],
];
if(window.VanMieuSurvey)heritageVisits.push(['van-mieu-quoc-tu-giam','Văn Miếu – Quốc Tử Giám',VanMieuSurvey.stopIds]);
