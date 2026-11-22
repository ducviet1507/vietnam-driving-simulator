"""Bundle documentary photographs identified by the offline visitor atlas.

Requires Node, Python, Pillow and osmium. Run from any directory:
  python tools/build_sight_photos.py vietnam.osm.pbf

Only explicit OSM file links, existing catalog file references and a destination's
own Wikidata P18 / linked Wikipedia page image are eligible. Additional
Wikidata items require an exact place name and a corroborating position. The build keeps
attribution for each image and uses Commons as the authority on reuse terms.
"""
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from io import BytesIO
import json
import math
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlencode, urlsplit
from urllib.request import Request, urlopen

import osmium
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
COMMONS = "https://commons.wikimedia.org"
UA = "ViVu3D/1.0 (https://github.com/tang-vu/vietnam-driving-simulator; offline visitor atlas)"
PHOTO = re.compile(r"\.(?:jpg|jpeg|webp|tiff?|png)$", re.I)
GRAPHIC = re.compile(r"(?:^|[ _-])(logo|locator|brochure|floor plan|plan of|coat of arms|map of|flag of)(?=[ _.-])", re.I)

# Audited Commons file pages for sites without a specific upstream photograph.
REVIEWED = {
    "osm-node-10756203755": "File:Bảo tàng Tổng hợp Quảng Bình.jpeg",
    "dong-hoi-cua-dong": "File:Bảo tàng Tổng hợp Quảng Bình.jpeg",
    "osm-node-5323866724": "File:Cau Nhat Le.JPG",
    "dong-hoi-toan-canh-cau-nhat-le": "File:Nhật Lệ river.jpg",
    "osm-node-8716478190": "File:Tượng Mẹ Suốt bên sông Nhật Lệ, Đồng Hới, Quảng Bình.jpeg",
    "dong-hoi-phu-dieu-me-suot": "File:Tượng Mẹ Suốt bên sông Nhật Lệ 3, Đồng Hới, Quảng Bình.jpeg",
    "dong-hoi-hang-cau-me-suot": "File:Tượng Mẹ Suốt bên sông Nhật Lệ 2, Đồng Hới, Quảng Bình.jpeg",
    "osm-node-8706712863": "File:Quảng Bình quan, Đồng Hới, Quảng Bình.jpeg",
    "quang-binh-quan-mat-quang-trung": "File:QuangBinhGate.jpg",
    "quang-binh-quan-vuon-le-loi": "File:Quảng Bình quan.jpg",
    "osm-way-305408028": "File:Tháp chuông La Vang.JPG",
    "osm-node-3100293997": "File:Tượng đài đức Mẹ La Vang (toàn cảnh).png",
    "osm-node-14309236352": "File:Sông Thạch Hãn (kiến trúc bên bờ, nhà tưởng niệm thả hoa), Tết năm 2018 (2).jpg",
    "quang-tri-hanh-lang-ben-nam": "File:Sông Thạch Hãn (tam cấp), Tết năm 2018 (1).jpg",
    "quang-tri-tu-ben-nam-nhin-an-don": "File:Sông Thạch Hãn, Tết năm 2018 (1).jpg",
    "quang-tri-den-ben-bac": "File:Sông Thạch Hãn, Tết năm 2018 (6).jpg",
    "quang-binh-mat-tay-tam-toa": "File:Di tích Nhà thờ Tam Tòa 2, Đồng Hới, Quảng Bình.jpeg",
    "quang-binh-nen-nha-tho-tam-toa": "File:Tam Toa Church, Dong Hoi.jpg",
    "osm-node-11663933869": "File:Cầu Hiền Lương, Quảng Trị.jpeg",
    "quang-tri-vach-son-cau-hien-luong": "File:Cầu Hiền Lương (nhìn từ bờ Nam).JPG",
    "osm-node-1016631030": "File:Cột cờ cầu Hiền Lương, Vĩnh Linh, Quảng Trị.jpeg",
    "osm-node-1016631101": "File:Nhà bảo tàng Hiền Lương - panoramio.jpg",
    "osm-node-4411036589": "File:Đài tưởng niệm Hiền Lương bờ nam - panoramio.jpg",
    "osm-node-1016630618": "File:Địa đạo Vịnh Mốc.jpg",
    "quang-tri-phong-ho-sinh-vinh-moc": "File:Maternity Room in Vinh Moc tunnel.JPG",
    "osm-way-232410041": "File:Bảo tàng Phú Yên.jpg",
    "phu-yen-canh-nha-bao-tang": "File:Phu Yen Museum.JPG",
    "phu-yen-gian-tho-thap-nhan": "File:Nhan Tower 3.jpg",
    "osm-way-1229067977": "File:Basalt rocks at Gành Đá Đĩa.jpg",
    "osm-way-160203374": "File:Bãi Môn (30090810327).jpg",
    "osm-way-909041150": "File:Mũi Điện (42093374024).jpg",
    "phu-yen-bia-mom-rang-dong": "File:Dien Cape 3.jpg",
    "osm-node-4510077892": "File:Núi Đá Bia.jpg",
    "osm-node-11779827836": "File:Đầm Ô Loan, An Hiệp, Tuy An, Phú Yên.jpeg",
    "osm-node-5439114923": "File:Pagoda in Vietnam (39983735052).jpg",
    "osm-node-4472600793": "File:Vung Ro Bay 1.jpg",
    "osm-node-11565227115": "File:Vịnh Vũng Rô.jpg",
    "osm-way-506959800": "File:Ho T'Nung (2).jpg",
    "osm-node-1730268393": "File:Buôn Ma Thuột - buildings at Exile House former prison Apr 2024 05.jpg",
    "osm-node-10314905409": "File:The Lac giao tabernacle.jpg",
    "osm-way-242705749": "File:Biệt Điện Bảo Đại.jpg",
    "osm-way-52823719": "File:Biet thu Bao Dai 1.JPG",
    "osm-relation-17189466": "File:Rungtram 1.jpg",
    "dong-thap-lang-mo-truong-dinh": "File:Đền và mộ Trương Định.JPG",
    "osm-node-10608268024": "File:Tượng Trương Định.jpg",
    "osm-node-13518302230": "File:Làng hoa Tân Quy Đông.jpg",
    "osm-way-1272644423": "File:Dinh Đốc phủ Hải - Tp.Gò Công.jpg",
    "osm-way-1244769154": "File:Mộ Nguyễn Sinh Sắc (1862–1929).jpg",
    "osm-relation-17189464": "File:Khu du lịch sinh thái Vườn chim Bạc Liêu.jpg",
    "osm-node-2669659389": "File:Chua Huong 069.jpg",
    "osm-node-8459780109": "File:Ruins of Go Thap Muoi, Go Thap archaeological site.jpg",
    "osm-node-5227610721": "File:La maison de Huynh Thuy Le (Sa Dec, Vietnam) (6662996139).jpg",
    "osm-node-2326969109": "File:Lăng Tổng Trấn Hà Tiên - Mạc Cửu (52352815996).jpg",
    "osm-node-2326969092": "File:Phù Dung Cổ Tự - Hà Tiên (52352816716).jpg",
    "osm-node-2327003316": "File:Thach Dong pagoda.jpg",
    "osm-node-11353153265": "File:Trên núi Đá Dựng.jpg",
    "osm-node-3294335517": "File:The Museum of Dien Bien Phu Victory (front, 2022).jpg",
    "osm-node-5602133184": "File:Interior of Tam Thanh Cave - Lang Son - Vietnam - 03 (48141751071).jpg",
    "osm-node-9485080592": "File:Nhà tù Sơn La - panoramio.jpg",
    "osm-way-39619627": "File:Nhà thờ Thánh nữ Jeanne d'Arc Ngã Sáu.jpg",
    "osm-relation-21657722": "File:Citadel of Huế 06.jpg",
}
# Some upstream images show a namesake building, person, symbol or previous
# location of a ride. These are not documentary photographs of the mapped site.
REJECTED = {
    ("osm-way-690204938", "File:La Vang Church (Built 1928, Destroyed 1972) September, 1967.jpg"),
    ("osm-way-503561771", "File:Da Lat - Linh Phuoc Temple 03.jpg"),
    ("osm-way-503561771", "File:Linh Phuoc Pagoda 01.jpg"),
    ("osm-node-13119009964", "File:Ngô Minh Chiêu.jpg"),
    ("osm-node-14331302701", "File:Cờ Ngũ sắc (Vietnam's five-color flag).png"),
    ("osm-relation-15835921", "File:Phu quoc plage sao.jpg"),
    ("osm-way-1252774078", "File:LZTR (Majority) (3).JPG"),
    ("osm-way-292907018", "File:Headed south to Hanoi.jpg"),
    ("osm-way-39619627", "File:Nhà thờ Cha Tam.jpg"),
}


def read(url):
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers={"User-Agent": UA}), timeout=35) as res:
                return res.read()
        except HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 3:
                raise
            pause = exc.headers.get("Retry-After", "")
            time.sleep(int(pause) if pause.isdigit() else 2 ** (attempt + 1))
        except (TimeoutError, URLError):
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def api(host, **fields):
    url = host + "/w/api.php?" + urlencode(dict(format="json", **fields))
    data = json.loads(read(url))
    if "error" in data:
        raise RuntimeError(data["error"])
    return data


def batches(items, size):
    items = sorted(items)
    for i in range(0, len(items), size):
        yield items[i:i + size]


def file_title(value):
    if value.startswith("File:"):
        name = value[5:]
    else:
        url = urlsplit(value)
        if url.hostname == "commons.wikimedia.org" and "/wiki/File:" in url.path:
            name = unquote(url.path.partition("/wiki/File:")[2])
        elif url.hostname == "upload.wikimedia.org" and url.path.startswith("/wikipedia/commons/"):
            parts = url.path.strip("/").split("/")
            if len(parts) < 5:
                return None
            name = unquote(parts[-2] if parts[2] == "thumb" else parts[-1])
        else:
            return None
    if PHOTO.search(name) and not GRAPHIC.search(name):
        return "File:" + name.replace("_", " ")
    return None


def distance(x, y, lon, lat):
    return math.hypot((x-lon)*111320*math.cos(math.radians(lat)), (y-lat)*110900)


def normalize(name):
    return " ".join(unicodedata.normalize("NFC", name).casefold().split())


def matched_entities(rows, names):
    # Query only the finite Vietnam dataset. Never assign a nearby attraction's
    # photo to a place whose name or coordinates have not been corroborated.
    query = """SELECT ?item ?coord ?name WHERE {
      ?item wdt:P17 wd:Q881; wdt:P18 ?photo; wdt:P625 ?coord; rdfs:label ?name .
      FILTER(LANG(?name) IN ('vi','en'))
    }"""
    url = "https://query.wikidata.org/sparql?" + urlencode({"query": query, "format": "json"})
    by_name = defaultdict(set)
    for row in json.loads(read(url))["results"]["bindings"]:
        coordinate = re.fullmatch(r"Point\(([-\d.]+) ([-\d.]+)\)", row["coord"]["value"])
        if coordinate:
            x, y = map(float, coordinate.groups())
            qid = row["item"]["value"].rsplit("/", 1)[1]
            by_name[normalize(row["name"]["value"])].add((qid, x, y))
    for key, lon, lat, _kind, _photo, _name in rows:
        valid = {qid for name in names[key] for qid, x, y in by_name[normalize(name)]
                 if distance(x, y, lon, lat) <= 450}
        if len(valid) == 1:
            yield key, valid.pop()


def references(pbf):
    extract = ("global.window=global;require('./dist/tourism-catalog.js');require('./dist/sight-details.js');"
               "require('./dist/heritage-components.js');"
               "console.log(JSON.stringify(VietnamTourism.entries.map(s=>[s.id,s.lon,s.lat,s.kind,VietnamSightDetails[s.id]?.photo,s.name])))")
    rows = json.loads(subprocess.check_output(["node", "-e", extract], cwd=ROOT))
    places = {key: (lon, lat, kind) for key, lon, lat, kind, _photo, _name in rows}
    names = {key: {name} for key, _lon, _lat, _kind, _photo, name in rows}
    files = defaultdict(list)
    entities, articles = defaultdict(set), defaultdict(lambda: defaultdict(set))

    def add(key, title):
        if title and (key, title) not in REJECTED and title not in files[key]:
            files[key].append(title)

    for key, title in REVIEWED.items():
        if key in places:
            add(key, title)
    types = {"n": "node", "w": "way", "r": "relation"}
    stream = osmium.FileProcessor(pbf).with_filter(
        osmium.filter.KeyFilter("wikidata", "wikimedia_commons", "wikipedia", "image", "name:en"))
    for obj in stream:
        key = f"osm-{types[obj.type_str()]}-{obj.id}"
        if key not in places:
            continue
        tags = obj.tags
        if tags.get("name:en"):
            names[key].add(tags["name:en"])
        for tag in ["wikimedia_commons", "image"]:
            add(key, file_title(tags.get(tag, "")))
        wd = tags.get("wikidata", "")
        if re.fullmatch(r"Q\d+", wd):
            entities[wd].add(key)
        lang, _, title = tags.get("wikipedia", "").partition(":")
        if re.fullmatch(r"[a-z]{2,3}(?:-[a-z]+)?", lang) and title and "#" not in title:
            articles[lang][title.replace("_", " ")].add(key)
    for key, _lon, _lat, _kind, photo, _name in rows:
        add(key, file_title(photo or ""))
    for key, qid in matched_entities(rows, names):
        entities[qid].add(key)
    # A linked article can have a Wikidata identifier even when OSM has none.
    wiki_images = []
    for lang, titles in articles.items():
        for part in batches(titles, 35):
            query = api(f"https://{lang}.wikipedia.org", action="query", titles="|".join(part),
                        prop="pageprops|pageimages", ppprop="wikibase_item", piprop="name", pilicense="free",
                        redirects=1)["query"]
            aliases = resolved_titles(query)
            pages = {p["title"]: p for p in query["pages"].values() if p.get("ns") == 0}
            for title in part:
                page = pages.get(resolve(aliases, title), {})
                wd = page.get("pageprops", {}).get("wikibase_item", "")
                if re.fullmatch(r"Q\d+", wd):
                    entities[wd].update(titles[title])
                image = file_title("File:" + page.get("pageimage", ""))
                if image:
                    wiki_images.extend((key, wd, image) for key in titles[title])
    distant = set()
    for part in batches(entities, 32):
        result = api("https://www.wikidata.org", action="wbgetentities", ids="|".join(part), props="claims")
        for wd, entity in result["entities"].items():
            claims = entity.get("claims", {})
            coordinates = [c["mainsnak"].get("datavalue", {}).get("value") for c in claims.get("P625", [])
                           if c.get("rank") != "deprecated"]
            for key in entities[wd]:
                lon, lat, kind = places[key]
                observed = [distance(c["longitude"], c["latitude"], lon, lat) for c in coordinates
                            if isinstance(c, dict) and c.get("globe", "").endswith("/Q2")]
                if observed and min(observed) > reach(kind):
                    distant.add((key, wd))
            for claim in sorted(claims.get("P18", []), key=lambda s: s.get("rank") != "preferred"):
                name = claim["mainsnak"].get("datavalue", {}).get("value")
                if claim.get("rank") == "deprecated" or not isinstance(name, str):
                    continue
                for key in entities[wd]:
                    title = file_title("File:" + name)
                    if (key, wd) not in distant:
                        add(key, title)
                    elif title in files[key]:
                        files[key].remove(title)
    for key, wd, image in wiki_images:
        if (key, wd) not in distant:
            add(key, image)
    return {key: options for key, options in files.items() if options}, places


def resolved_titles(query):
    return {entry["from"]: entry["to"] for group in ("normalized", "redirects")
            for entry in query.get(group, [])}


def resolve(aliases, title):
    seen = set()
    while title in aliases and title not in seen:
        seen.add(title)
        title = aliases[title]
    return title


def reach(kind):
    return 28000 if kind in {"Vịnh", "Khu bảo tồn", "Vườn quốc gia"} else 6000


class PlainCredit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.words = []

    def handle_data(self, data):
        self.words.append(data)

    def handle_starttag(self, tag, attrs):
        if tag in {"br", "p", "li", "div"}:
            self.words.append(" ")


def plain(value):
    parser = PlainCredit()
    parser.feed(value)
    return " ".join("".join(parser.words).split())


def credit(page):
    if page.get("imagerepository") != "local" or not page.get("imageinfo"):
        return None
    info = page["imageinfo"][0]
    if info.get("mime") not in {"image/jpeg", "image/webp", "image/tiff", "image/png"}:
        return None
    if max(info["width"], info["height"]) < 320 or min(info["width"], info["height"]) < 160:
        return None
    metadata = {k: plain(v["value"]) for k, v in info.get("extmetadata", {}).items()}
    license_name = metadata.get("LicenseShortName", "")
    link = metadata.get("LicenseUrl", "").replace("http://", "https://")
    license_path = urlsplit(link)
    public = license_name.lower() == "public domain" and metadata.get("Copyrighted") == "False"
    if public:
        link = "https://creativecommons.org/publicdomain/mark/1.0/"
    elif (license_path.hostname not in {"creativecommons.org", "www.creativecommons.org"} or
          not re.fullmatch(r"/(?:licenses/by(?:-sa)?/|publicdomain/zero/)\d+\.\d+(?:/[a-z-]+)?/?",
                           license_path.path, re.I)):
        return None
    artist = metadata.get("Attribution") or metadata.get("Artist")
    if not artist and not public:
        return None
    url = info.get("thumburl") or info.get("url", "")
    if urlsplit(url).hostname not in {"upload.wikimedia.org", "thumb.wikimedia.org"}:
        return None
    title = page["title"]
    record = dict(file=f"{page['pageid']}.webp", title=title[5:], artist=artist or "Unknown author",
                  license=license_name, licenseUrl=link,
                  page=COMMONS + "/wiki/" + quote(title.replace(" ", "_"), safe=":()"))
    try:
        coords = float(metadata["GPSLongitude"]), float(metadata["GPSLatitude"])
    except (KeyError, TypeError, ValueError):
        coords = None
    return url, record, coords


def image_metadata(titles):
    found = {}
    for part in batches(titles, 18):
        query = api(COMMONS, action="query", titles="|".join(part), prop="imageinfo",
                    iiprop="url|mime|size|extmetadata", iiurlwidth=800, iiextmetadatalanguage="en",
                    iiextmetadatafilter="Artist|Attribution|License|LicenseShortName|LicenseUrl|Copyrighted|GPSLatitude|GPSLongitude",
                    redirects=1)["query"]
        aliases = resolved_titles(query)
        pages = {p["title"]: p for p in query["pages"].values()}
        for title in part:
            record = credit(pages.get(resolve(aliases, title), {}))
            if record:
                found[title] = record
    return found


def download(item, staging):
    url, record = item
    try:
        with Image.open(BytesIO(read(url))) as src:
            image = ImageOps.exif_transpose(src).convert("RGB")
            image.thumbnail((800, 800), Image.Resampling.LANCZOS)
            image.save(staging / record["file"], "WEBP", quality=79, method=5)
            return {**record, "width": image.width, "height": image.height}
    except HTTPError as exc:
        if exc.code not in {404, 410}:
            raise
        print("File unavailable:", record["title"], flush=True)
        return None


def build(pbf, out):
    refs, places = references(pbf)
    print(f"{len(refs)} linked places", flush=True)
    verified = image_metadata({title for titles in refs.values() for title in titles})
    for key, options in refs.items():
        lon, lat, kind = places[key]
        refs[key] = [title for title in options if title in verified and
                     (not verified[title][2] or distance(*verified[title][2], lon, lat) <= reach(kind))]
    out.mkdir(parents=True, exist_ok=True)
    previous = json.loads((out / "index.json").read_text("utf8")) if (out / "index.json").exists() else {}
    with TemporaryDirectory(dir=out.parent, prefix=".sight-photos-") as tmp:
        staging = Path(tmp)
        selected, completed = {}, {}
        for index in range(max(map(len, refs.values()), default=0)):
            jobs = {}
            for key, options in refs.items():
                if key in selected or index >= len(options) or options[index] not in verified:
                    continue
                url, record, _coords = verified[options[index]]
                if record["file"] not in completed:
                    jobs[record["file"]] = (url, record)
            with ThreadPoolExecutor(max_workers=3) as pool:
                results = pool.map(lambda item: download(item, staging), jobs.values())
                for filename, result in zip(jobs, results):
                    completed[filename] = result
            for key, options in refs.items():
                if key not in selected and index < len(options) and options[index] in verified:
                    record = completed.get(verified[options[index]][1]["file"])
                    if record:
                        selected[key] = record
        if not selected:
            raise RuntimeError("No reusable photos resolved")
        for image in staging.glob("*.webp"):
            image.replace(out / image.name)
        manifest = staging / "index.json"
        manifest.write_text(json.dumps(selected, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n",
                            encoding="utf8")
        manifest.replace(out / "index.json")
        used = {row["file"] for row in selected.values()}
        for stale in {row["file"] for row in previous.values()} - used:
            if re.fullmatch(r"\d+\.webp", stale):
                (out / stale).unlink(missing_ok=True)
        print(f"Bundled {len(used)} photographs for {len(selected)} places", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pbf", type=Path)
    parser.add_argument("--output", type=Path, default=ROOT / "dist/sight-photos")
    args = parser.parse_args()
    build(args.pbf, args.output)
