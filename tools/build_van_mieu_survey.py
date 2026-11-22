"""Build Văn Miếu scenery from native OSM geometry and the monument's visitor guide.

Run python tools/build_van_mieu_survey.py [map.osm]. No third-party modules.
The map argument accepts the XML returned by the bbox endpoint below.
"""
from collections import Counter
import argparse
import json
import math
from pathlib import Path
import re
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
MAP = "https://api.openstreetmap.org/api/0.6/map?bbox=105.8339,21.0258,105.8374,21.0313"
GUIDE = "https://vanmieu.gov.vn/vi/introduction/visitor-information"
ARCH = "https://vanmieu.gov.vn/vi/visit/architecture/"
DOSSIER = "https://dsvh.gov.vn/di-tich-lich-su-va-kien-truc-nghe-thuat-van-mieu-quoc-tu-giam-2953"
STELE_RESEARCH = ("https://www.slideshare.net/slideshow/"
                  "luan-an-nghe-thuat-tao-hinh-bia-tien-si-o-van-mieu-quoc-tu-giam/216479471")
STELE_GARDEN = "https://vanmieu.gov.vn/vi/doctoral-stelae-garden"
STELE_ORIENTATION = "https://baodongnai.com.vn/vanhoa/201004/chung-tay-gin-giu-bau-vat-bia-tien-si-van-mieu-2064159/"
PHUONG_DINH = "https://daidoanket.vn/ho-van-khoac-ao-moi-10243421.html"

# Map the guide's numbered stops onto independently mapped OSM features.
# Tags describe positions/footprints, while bays, roof tiers and instruments
# come from the monument operator's architectural descriptions or its dossier.
STOPS = {
    "n12690252301": ("pavilion", "Phương Đình", 1, dict(tiers=2, roofFaces=8, columns=16,
                        platformHeight=.45, dimensionSource=PHUONG_DINH)),
    "n6594592049": ("pillar", "Nghi Môn", 3, dict(columns=4)),
    "w702185143": ("gate", "Văn Miếu Môn", 4, dict(levels=2, roofFaces=8, doors=3,
                      instrumentHeight=2.10, instrumentDiameter=.99, dimensionSource=ARCH+"van-mieu-gate")),
    "w702185144": ("gate", "Đại Trung Môn", 5, dict(bays=3, entranceSteps=3)),
    "w702185155": ("existing", "Khuê Văn Các", 6, dict(tiers=2, roofFaces=8)),
    "w37934144": ("well", "Giếng Thiên Quang", 8, dict(planSide=30, dimensionSource=STELE_GARDEN)),
    "w702185176": ("gate", "Đại Thành Môn", 9, dict(bays=3, columnRows=3, doors=3)),
    "w702185190": ("hall", "Điện Đại Thành", 10, dict(bays=9)),
    "w702241331": ("gate", "Cổng Thái Học", 11, {}),
    "w702241326": ("hall", "Nhà Thái Học", 12, {}),
    "w702241324": ("drum", "Lầu Trống", 13, dict(instrumentHeight=2.65, instrumentDiameter=2.01)),
    "w702241325": ("bell", "Lầu Chuông", 14, dict(instrumentHeight=2.34)),
    "n1000087332": ("gatePoint", "Cổng ra phố Văn Miếu", 15, {}),
    "w702185145": ("pavilion", "Nhà Bát Giác", 16, dict(sides=8, roofColour="red")),
}
for number in (157, 158, 159, 160, 163, 164, 165, 166):
    STOPS[f"w702185{number}"] = ("steleHouse", "Nhà bia tiến sĩ", 7, dict(stelae=10))
for number in (156, 162):
    STOPS[f"w702185{number}"] = ("stelePavilion", "Bi đình", 7, dict(stelae=1))

# Đào Thị Thúy Anh (2017), appendix 1, pp. 165–184, and the author's
# site diagram on p. 185. Entries are (examination year, height, width)
# in metres, ordered south to north along each shelter. Both side and
# sequence are known. The diagram has no scale for individual spacing.
STELE_ROWS = {
    "w702185156": [(1442, 1.65, 1.17)],
    "w702185157": [
        (1691, 1.90, 1.18), (1616, 1.60, 1.10), (1685, 1.79, 1.23), (1487, 1.50, 1.10), (1680, 1.65, 1.05),
        (1598, 1.60, 1.15), (1673, 1.65, 0.94), (1592, 1.60, 1.08), (1667, 1.45, 1.10), (1661, 1.70, 1.10),
    ],
    "w702185158": [
        (1604, 1.66, 1.10), (1610, 1.56, 1.10), (1757, 1.95, 1.18), (1583, 1.48, 0.98), (1577, 1.60, 1.08),
        (1554, 1.65, 1.00), (1752, 1.70, 1.10), (1746, 1.93, 1.07), (1739, 1.88, 1.11), (1733, 2.07, 1.35),
    ],
    "w702185159": [
        (1727, 1.85, 1.25), (1721, 2.00, 1.36), (1656, 1.58, 1.08), (1646, 1.40, 1.06), (1715, 1.75, 1.10),
        (1640, 1.51, 1.17), (1710, 1.85, 1.20), (1631, 1.60, 1.10), (1703, 1.72, 1.12), (1697, 1.85, 1.22),
    ],
    "w702185160": [
        (1511, 1.50, 1.15), (1481, 1.50, 1.10), (1463, 1.60, 1.10), (1475, 1.60, 1.17), (1514, 1.65, 1.10),
        (1502, 1.65, 1.17), (1775, 2.16, 1.37), (1623, 1.60, 1.10), (1769, 2.02, 1.22), (1763, 2.08, 1.38),
    ],
    "w702185162": [(1448, 1.65, 1.17)],
    "w702185163": [
        (1731, 1.97, 1.18), (1529, 1.63, 1.08), (1724, 2.04, 1.32), (1643, 1.65, 1.17), (1718, 1.90, 1.30),
        (1628, 1.60, 1.10), (1712, 1.70, 1.15), (1619, 1.60, 1.10), (1706, 1.95, 1.25), (1700, 2.00, 1.34),
    ],
    "w702185164": [
        (1694, 1.88, 1.15), (1607, 1.56, 1.10), (1688, 1.77, 1.19), (1565, 1.60, 1.08), (1683, 1.64, 1.50),
        (1580, 1.67, 1.15), (1676, 1.60, 1.10), (1670, 1.45, 1.10), (1664, 1.60, 1.10), (1659, 1.64, 1.10),
    ],
    "w702185165": [
        (1650, 1.67, 1.12), (1518, 1.65, 1.10), (1496, 1.70, 1.10), (1652, 1.66, 1.17), (1466, 1.60, 1.17),
        (1478, 1.60, 1.17), (1613, 1.60, 1.10), (1637, 1.35, 0.76), (1779, 1.90, 1.15), (1778, 1.90, 1.15),
    ],
    "w702185166": [
        (1772, 1.94, 1.20), (1595, 1.60, 1.08), (1766, 2.15, 1.35), (1589, 1.51, 0.97), (1760, 1.98, 1.21),
        (1602, 1.66, 1.10), (1754, 2.00, 1.21), (1748, 2.05, 1.35), (1743, 1.87, 1.10), (1736, 1.98, 1.20),
    ],
}

TYPES = {
    "w1582902103": "grounds", "w1582901993": "garden", "w178995315": "grounds",
    "w9964421": "island", "w702185189": "hall", "w702185186": "hall",
    "w702185142": "roofPart", "w702241323": "roofPart",
    **{f"w{i}": "wing" for i in (702185187, 702185188, 37934138, 37934139)},
    **{f"w{i}": "gate" for i in (702185149, 702185150, 702241280, 702241281, 702241362, 702241363)},
    "n1000087430": "gatePoint",
}
SUPPLEMENTS = {
    "w702185189": dict(bays=9, columns=40, platformHeight=.30, dimensionSource=DOSSIER),
    "w702185186": dict(name="Nhà nối Đại Bái và Điện Đại Thành"),
    "w702241323": dict(name="Tầng trên nhà Hậu Đường"),
    "w702185142": dict(name="Tầng trên Văn Miếu Môn"),
    **{f"w{i}": dict(bays=9) for i in (702185187, 702185188, 37934138, 37934139)},
}


def tags(element):
    return {tag.get("k"): tag.get("v") for tag in element.findall("tag")}


def inside(point, ring):
    x, y = point
    return sum((b > y) != (d > y) and x < (c-a)*(y-b)/(d-b)+a
               for (a, b), (c, d) in zip(ring, ring[1:])) % 2 == 1


def near_edge(point, ring, distance):
    # Geographic screening only. Coordinates delivered to the game are unchanged.
    x, y = point
    for (a, b), (c, d) in zip(ring, ring[1:]):
        dx, dy = (c-a)*103950, (d-b)*110700
        px, py = (x-a)*103950, (y-b)*110700
        t = max(0, min(1, (px*dx+py*dy)/(dx*dx+dy*dy))) if dx or dy else 0
        if math.hypot(px-t*dx, py-t*dy) <= distance:
            return True
    return False


def ground_kind(t):
    if t.get("natural") == "water":
        return "water"
    if t.get("barrier") == "wall":
        return "wall"
    if t.get("landuse") == "grass":
        return "grass"
    if t.get("leisure") == "garden":
        return "garden"
    if t.get("area:highway") in ("steps", "footway", "pedestrian") or t.get("area") == "yes" and t.get("highway") == "pedestrian":
        return "courtyard"
    if t.get("highway") in ("footway", "steps", "path", "pedestrian"):
        return "path"
    return None


def mapped_feature(ref, kind, element, rings):
    t = tags(element)
    result = dict(ref=ref, version=int(element.get("version")), kind=kind, rings=rings)
    if "name" in t:
        result["name"] = t.get("name:vi", t["name"])
    for tag, key in (("surface", "surface"), ("roof:shape", "roof"), ("roof:colour", "roofColour"),
                     ("building:colour", "colour"), ("roof:material", "roofMaterial"),
                     ("species:wikipedia", "species"), ("species:wikidata", "speciesId"),
                     ("bridge", "bridge"), ("incline", "incline")):
        if tag in t:
            result[key] = t[tag]
    for tag, key in (("height", "height"), ("building:levels", "levels"), ("width", "width"),
                     ("roof:height", "roofHeight"), ("step_count", "steps")):
        m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*m?", t.get(tag, ""))
        if m:
            result[key] = float(m[1])
    if ref in STOPS:
        _, result["name"], result["guide"], detail = STOPS[ref]
        result.update(detail)
    result.update(SUPPLEMENTS.get(ref, {}))
    if ref in STELE_ROWS:
        result["steleRows"] = [dict(year=y, height=h, width=w) for y, h, w in STELE_ROWS[ref]]
    return result


def extract(root):
    nodes = {n.get("id"): (float(n.get("lon")), float(n.get("lat"))) for n in root.findall("node")}
    ways = {w.get("id"): w for w in root.findall("way")}
    relations = {r.get("id"): r for r in root.findall("relation")}

    def geometry(way):
        return [nodes[n.get("ref")] for n in way.findall("nd")]

    precincts = [geometry(ways[str(i)]) for i in (1582902103, 1582901993, 178995315)]
    features = []
    for e in root.findall("way"):
        ref = "w"+e.get("id")
        t = tags(e)
        kind = STOPS[ref][0] if ref in STOPS else TYPES.get(ref)
        if not kind:
            kind = ground_kind(t)
            if not kind or t.get("footway") in ("sidewalk", "crossing"):
                continue
            xy = geometry(e)
            # A represented path must stay on the grounds, including the ring
            # itself. This excludes neighbouring city streets and unrelated yards.
            if not all(any(inside(q, ring) or near_edge(q, ring, .8) for ring in precincts) for q in xy):
                continue
        features.append(mapped_feature(ref, kind, e, [geometry(e)]))
    for e in root.findall("node"):
        ref = "n"+e.get("id")
        q = nodes[e.get("id")]
        kind = STOPS[ref][0] if ref in STOPS else TYPES.get(ref)
        if not kind and tags(e).get("natural") == "tree" and any(
                inside(q, ring) or near_edge(q, ring, 17) for ring in precincts):
            kind = "tree"
        if kind:
            features.append(mapped_feature(ref, kind, e, [[q]]))
    # These four mapped relations are single closed outer ways with closed
    # inner ways. Retain holes around the islet, gardens and building footprints.
    for ident, kind in ((2388849, "water"), (9760430, "courtyard"), (9761149, "courtyard"), (9761151, "courtyard")):
        e = relations[str(ident)]
        rings = [geometry(ways[m.get("ref")]) for role in ("outer", "inner")
                 for m in e.findall("member") if m.get("role") == role]
        if not all(ring[0] == ring[-1] for ring in rings) or sum(m.get("role") == "outer" for m in e.findall("member")) != 1:
            raise ValueError(f"Recheck OSM multipolygon r{ident}")
        features.append(mapped_feature("r"+str(ident), kind, e, rings))

    if not set(STOPS).issubset(f["ref"] for f in features):
        raise ValueError("An OSM feature referenced by the official visitor map is missing")
    if sum(f.get("stelae", 0) for f in features) != 82:
        raise ValueError("Recheck the ten stele shelters")
    years = [s["year"] for f in features for s in f.get("steleRows", [])]
    if len(years) != 82 or len(set(years)) != 82 or any(
            f["stelae"] != len(f["steleRows"]) for f in features if "stelae" in f):
        raise ValueError("The stele catalogue must contain 82 distinct examinations across ten shelters")
    return {
        "origin": [105.8358909, 21.0285866], "source": GUIDE, "map": MAP,
        "sources": [DOSSIER, ARCH+"van-mieu-gate", ARCH+"dai-trung-gate", ARCH+"dien-dai-thanh",
                    ARCH+"thai-hoc-house", ARCH+"bell-drum-tower", ARCH+"octagonal-house", ARCH+"phuong-dinh",
                    ARCH+"dai-thanh-gate", ARCH+"khue-van-pavilion", STELE_GARDEN, PHUONG_DINH, STELE_RESEARCH],
        "dimensionNotes": {
            "units": "m",
            "platformHeight": "Độ cao mặt nền công trình so với mặt sân liền kề.",
            "planSide": "Chiều dài một cạnh của giếng vuông, theo Trung tâm Văn Miếu.",
            "instrumentHeight": "Chiều cao của chuông hoặc trống.",
            "instrumentDiameter": "Đường kính của chuông hoặc mặt trống.",
            "reconstruction": "Mặt bằng nhà che, cổng và điện dùng đường bao bản đồ. Độ cao mái, cột, "
                              "độ dày bia và hình khối rùa được dựng theo ảnh của di tích. Khoảng cách "
                              "từng bia được nội suy theo chiều dài nhà che.",
            "steleRows": {"source": STELE_RESEARCH, "author": "Đào Thị Thúy Anh (2017)",
                          "pages": "165–185", "order": "Từ phía Khuê Văn Các đến phía Đại Thành Môn.",
                          "orientation": "Mặt bia ở cả hai phía đều quay về giếng Thiên Quang.",
                          "orientationSource": STELE_ORIENTATION,
                          "height": "Chiều cao bia theo Phụ lục 1. Bảng không ghi mốc đo ở chân bia.",
                          "width": "Chiều rộng bia theo Phụ lục 1.",
                          "position": "Phụ lục 2 ghi nhà che và thứ tự từng bia, không ghi khoảng cách giữa các bia."},
        },
        "unlocated": [{"guide": 2, "name": "Hai bia Hạ Mã", "source":
            "https://sovhtt.hanoi.gov.vn/tra-lai-nguyen-trang-cho-bia-ha-ma-dung-voi-y-nghia-ban-dau/"}],
        "features": features,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("map", type=Path, nargs="?")
    args = parser.parse_args()
    if args.map:
        source = args.map.read_bytes()
    else:
        request = Request(MAP, headers={"User-Agent": "ViVu3D/1.0 (https://vivu3d.com)"})
        with urlopen(request, timeout=60) as response:
            source = response.read()
    survey = extract(ET.fromstring(source))
    features = survey.pop("features")
    compact = lambda data: json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    body = compact(survey)[:-1] + ',"features":[\n' + ",\n".join(map(compact, features)) + "\n]};\n"
    out = ROOT / "dist" / "van-mieu-survey.js"
    out.write_text("// OSM geometry © OpenStreetMap contributors, ODbL 1.0. See https://www.openstreetmap.org/copyright\n"
                   "// Generated by tools/build_van_mieu_survey.py. Coordinates are [longitude, latitude].\n"
                   "window.VanMieuSurvey=" + body, encoding="utf-8", newline="\n")
    print(len(features), "features:", dict(Counter(f["kind"] for f in features)))


if __name__ == "__main__":
    main()
