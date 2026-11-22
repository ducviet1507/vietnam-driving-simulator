'use strict';
// Anchor a regional visit on an existing road arrival. Each stop keeps its own
// coordinates and the camera can move out to an island while the car stays parked.
const heritageVisits=[
  // https://halongbay.com.vn/vi/tours/25-hanh-trinh-vhl7-tham-quan-vinh-ha-long-theo-cac-hanh-trinh-vhl1-2-3-4
  // https://daison.haiphong.gov.vn/van-hoa-xa-hoi/hai-phong-ban-hanh-muc-phi-tham-quan-moi-doi-voi-di-tich-danh-thang-837039
  ['vinh-ha-long-cat-ba','Vịnh Hạ Long – quần đảo Cát Bà',[
    'hon-trong-mai','osm-node-4730928605','osm-node-4730928606','osm-node-13570978422','osm-node-4508895511',
    'osm-node-10821152105','osm-node-994065796','osm-node-3494811567','osm-node-3560283504','osm-node-5147203123','osm-node-6474418794',
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
