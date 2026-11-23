"""Rebuild the two unbadged Xuyên Việt saloons, in metres with +Z forward."""

from array import array
from collections import defaultdict
from itertools import pairwise
import json
import math
from pathlib import Path
import struct


OUT = Path(__file__).resolve().parents[1] / "dist" / "streetscape"
TAU = 2 * math.pi


def lerp(a, b, t):
    return a + (b - a) * t


def profile(points, x):
    for (x0, y0), (x1, y1) in pairwise(points):
        if x <= x1:
            return lerp(y0, y1, max(0, (x - x0) / (x1 - x0)))
    return points[-1][1]


def steps(a, b, n):
    return [lerp(a, b, i / n) for i in range(n + 1)]


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def sub(a, b):
    return [x-y for x, y in zip(a, b)]


def unit(v):
    size = math.hypot(*v)
    return [x / size for x in v] if size > 1e-9 else [0, 1, 0]


class Mesh:
    def __init__(self):
        self.parts = defaultdict(lambda: ([], []))

    def grid(self, material, rows, direction):
        pos, faces = self.parts[material]
        start, width = len(pos), len(rows[0])
        for row in rows:
            pos.extend(row)
        for r in range(len(rows)-1):
            for c in range(width-1):
                a = start+r*width+c
                quad = [a, a+1, a+width+1, a+width]
                normal = cross(sub(pos[quad[1]], pos[a]), sub(pos[quad[3]], pos[a]))
                if sum(i*j for i, j in zip(normal, direction)) < 0:
                    quad.reverse()
                a, b, c1, d = quad
                faces.extend(((a, b, c1), (a, c1, d)))

    def spheroid(self, material, center, size, count=16):
        # Separate longitudinal strips retain the curvature at the seam.
        for a, b in pairwise(steps(0, TAU, count)):
            arc = steps(-math.pi/2+.003, math.pi/2-.003, 8)
            def sample(t, u):
                d = (math.cos(t)*math.cos(u), math.sin(u), math.sin(t)*math.cos(u))
                return tuple(c+s*v for c, s, v in zip(center, size, d))
            rows = [[sample(t, u) for u in arc] for t in (a, b)]
            self.grid(material, rows, (math.cos((a+b)/2), 0, math.sin((a+b)/2)))

    def tube(self, material, points, radius, sides=6):
        rings = []
        for i, p in enumerate(points):
            tangent = unit(sub(points[min(i+1, len(points)-1)], points[max(i-1, 0)]))
            ref = (0, 1, 0) if abs(tangent[1]) < .9 else (1, 0, 0)
            axis = unit(cross(tangent, ref))
            other = cross(tangent, axis)
            rings.append([tuple(p[k] + radius*(axis[k]*math.cos(a)+other[k]*math.sin(a))
                                for k in range(3)) for a in steps(0, TAU, sides)])
        for row, next_row in pairwise(rings):
            for i in range(sides):
                direction = sub(row[i], tuple(sum(v[k] for v in row[:-1])/sides for k in range(3)))
                self.grid(material, [row[i:i+2], next_row[i:i+2]], direction)


def alloy_wheel(classic):
    wheel = Mesh()
    radius = .294 if classic else .298
    # Cross section of the sidewall, bead and tread, around the wheel's X axis.
    def ring(material, section):
        for a, b in pairwise(steps(0, TAU, 48)):
            rows = [[(x, r*math.cos(t), r*math.sin(t)) for x, r in section] for t in (a,b)]
            for i, ((x0,r0),(x1,r1)) in enumerate(pairwise(section)):
                mid = (a+b)/2
                wheel.grid(material, [row[i:i+2] for row in rows],
                           (r1-r0,(x0-x1)*math.cos(mid),(x0-x1)*math.sin(mid)))
    ring("rubber", [(.092,.174),(.097,.211),(.094,.259),(.08,radius-.008),(.065,radius),
                    (-.065,radius),(-.08,radius-.008),(-.094,.255),(-.094,.174)])
    ring("rim", [(.088,.17),(.099,.179),(.099,.19),(.088,.196),(.063,.19),(.01,.185)])
    ring("brake", [(.047,.002),(.047,.147),(.04,.150)])
    ring("rim", [(.104,.001),(.104,.046),(.097,.052),(.076,.056)])
    count = 7 if classic else 5
    for a in steps(0, TAU, count)[:-1]:
        for branch in ([0] if classic else [-1,1]):
            rows = []
            for r, x, angle, half in ((.038,.093,0,.27),(.09,.087,.06,.13),
                                      (.145,.079,.085+.09*branch,.091),(.183,.092,.095+.14*branch,.085)):
                rows.append([(x,r*math.cos(a+angle+d),r*math.sin(a+angle+d)) for d in (-half,half)])
            wheel.grid("rim", rows, (1,0,0))
    for a in steps(0, TAU,5)[:-1]:
        wheel.spheroid("chrome",(.105,.033*math.sin(a),.033*math.cos(a)),(.006,.006,.006),8)
    return wheel, radius


def saloon(classic, length, wheelbase, height):
    body = Mesh()
    # Plate frames and mounting screws project beyond the pressed panels.
    half = length/2-.03413
    axles = (-wheelbase/2-.015,wheelbase/2-.015)
    radius = .294 if classic else .298
    # Metered cross sections through the rear deck, beltline, scuttle and bonnet.
    heights = [(-half,.775),(-half+.14,.835),(-1.48,.894),(-.60,.875),(.78,.858),
               (1.24,.815),(half-.20,.707),(half,.665)] if classic else [
               (-half,.846),(-half+.22,.915),(-1.25,.932),(-.50,.911),(.55,.866),
               (1.05,.851),(1.60,.806),(half-.16,.696),(half,.647)]
    front_cabin = .95 if classic else 1.12
    rear_cabin = -1.48 if classic else -1.56
    # Roof stations distinguish the upright classic greenhouse and modern swept cabin.
    crowns = [(rear_cabin,.005),(-1.34,.145),(-1.0,.44),(-.85,.53),(-.62,.558),
              (.16,.566),(.34,.54),(.46,.48),(.80,.18),(front_cabin,.005)] if classic else [
              (rear_cabin,.005),(-1.30,.18),(-1.05,.369),(-.84,.49),(-.62,.54),(-.30,.572),
              (-.03,.574),(.16,.557),(.30,.52),(.61,.37),(.91,.165),(front_cabin,.005)]
    def belt(z):
        return profile(heights, z)
    def width(z):
        return profile([(-half,.777),(-half+.16,.84),(-1.36,.866),(0,.861),
                        (1.36,.865),(half-.23,.844),(half,.755)],z)
    def arch(z):
        dist = min(abs(z-axle) for axle in axles)
        if dist > .354:
            return .185
        return radius+math.sqrt(max(0,.354**2-dist**2))
    def end_z(z,x):
        # Roll the ends around both corners in plan.
        end = max(0,(abs(z)-half+.37)/.37)
        return z - math.copysign((.18 if classic else .24)*end*end*(abs(x)/.85)**2.5,z)
    def row(z,side):
        w, base, top = width(z), arch(z), belt(z)
        levels = [(.91,base+.014),(.974,base),(.988,lerp(base,top,.15)),
                  (1.,lerp(base,top,.53)),(.998,lerp(base,top,.80)),(.978,top-.024),
                  (.925,top)]
        return [(side*w*f,y,end_z(z,side*w*f)) for f,y in levels]
    def x_for(z,y):
        points = row(z,1)[1:]
        return profile([(p[1],p[0]) for p in points], y)
    def top_point(z,t):
        x = t*.925*width(z)
        return (x,belt(z)+.026*(1-t*t),end_z(z,x))
    zlist = sorted(set(steps(-half,half,110)+[z for z,_ in heights]+
                       [x+d for x in axles for d in (-.366,-.354,-.352,.352,.354,.366)]))
    for side in (-1,1):
        rows = [row(z,side) for z in zlist]
        body.grid("paint",rows,(side,0,0))
        for axle in axles:
            arch_z = steps(axle-.354,axle+.354,48)
            body.grid("wheelhouse", [[(side*(width(z)-d),arch(z)+.006,z) for d in (.015,.205)]
                                     for z in arch_z],(0,-1,0))
            body.grid("wheelhouse", [[(side*.633,h,z) for h in (.19,arch(z)+.008)]
                                     for z in arch_z],(side,0,0))
        # Door shut lines follow the pressed side panels below each window post.
        def skin_path(points):
            return [(side*(x_for(z,y)+.004),y,end_z(z,x_for(z,y))) for z,y in points]
        for line in [[(.78,.846),(.84,.73),(.90,.49),(.86,.31),(.77,.273),(-.08,.27)],
                     [(-.13,.873),(-.135,.69),(-.155,.45),(-.17,.295),(-.22,.274)],
                     [(-1.03,.874),(-1.08,.79),(-1.00,.68),(-.91,.57),(-.82,.34),
                      (-.76,.281),(-.26,.271)]]:
            body.tube("seams",skin_path(line),.004)
        for z in (.01,-.87):
            y = belt(z)-.117
            body.spheroid("chrome" if classic else "paint",(side*(x_for(z,y)+.007),y,z),
                          (.018,.019,.085))
        rubbing_z = steps(-.88,.87,19)
        rub_height = .48 if classic else .29
        body.tube("rub_strip" if classic else "paint",skin_path([(z,rub_height+.018*z) for z in rubbing_z]),
                  .015 if classic else .012)
    for z0,z1 in [(-half,rear_cabin),(front_cabin,half)]:
        body.grid("paint",[[top_point(z,t) for t in steps(-1,1,18)] for z in steps(z0,z1,22)],(0,1,0))
    # Cabin tiles meet exactly at the glass, pillar and roof boundaries.
    crown_scale=(height-max(belt(z)+c for z,c in crowns))/max(c for _,c in crowns)+1
    def cabin(z,t,side):
        crown = profile(crowns,z)*crown_scale
        w = width(z)*.925
        return (side*(w-t*(.087+.11*crown)),belt(z)+t*crown*.944,z)
    def roof(z,t):
        x, y, _ = cabin(z,1,1)
        return (t*x,y+.056*profile(crowns,z)*crown_scale*(1-t*t),z)
    bpost = -.14 if classic else -.21
    # Wide C pillar on the classic, small glazed quarter and black B pillar on the city model.
    side_z = [rear_cabin, -1.07 if classic else -1.32, -.99 if classic else -1.28,
              bpost-.065,bpost+.036,front_cabin-.145,front_cabin-.078,front_cabin]
    rear_glass = (rear_cabin+.07,-.91 if classic else -.77)
    front_glass = (.39 if classic else .34,front_cabin-.083)
    for start,end in pairwise(sorted(set(side_z+[z for z,_ in crowns]+list(rear_glass)+list(front_glass)))):
        mid=(start+end)/2
        zz=steps(start,end,max(1,math.ceil((end-start)/.06)))
        for side in (-1,1):
            for t0,t1,base in ((0,.045,"paint"),(.045,.084,"rubber"),(.084,.944,"glass"),
                               (.944,.971,"rubber"),(.971,1,"paint")):
                name=base
                if mid<side_z[1] or mid>side_z[-2]:
                    name="paint"
                elif side_z[3]<=mid<=side_z[4] or side_z[1]<mid<side_z[2]:
                    name="window_frame"
                body.grid(name,[[cabin(z,t,side) for t in (t0,t1)] for z in zz],(side,.2,0))
        name = "glass" if any(lo<mid<hi for lo,hi in (rear_glass,front_glass)) else "paint"
        for t0,t1,mat in ((-1,-.92,"paint"),(-.92,-.91,"window_frame"),(-.91,.91,name),
                          (.91,.92,"window_frame"),(.92,1,"paint")):
            if name=="paint":
                mat="paint"
            body.grid(mat,[[roof(z,t) for t in steps(t0,t1,8)] for z in zz],(0,1,0))
    # Dashboard, parcel shelf and two rows of seats are visible through the smoked windows.
    body.spheroid("dashboard",(0,.84,.62),(.73,.16,.285),24)
    body.spheroid("shelf",(0,.87,-1.06),(.66,.065,.23))
    for z in (.11,-.57):
        for x in (-.37,.37):
            body.spheroid("fabric",(x,.80,z-.10),(.252,.285,.096))
            body.spheroid("fabric",(x,1.081,z-.112),(.11,.094,.073))
    # Left hand drive (+X is left when the car is viewed from behind).
    body.tube("dashboard",[(.365+.128*math.cos(a),.94+.105*math.sin(a),.37+.038*math.sin(a))
                           for a in steps(0,TAU,32)],.014)
    for side in (-1,1):
        z=.69 if classic else .79
        body.tube("window_frame",[(side*.743,.934,z),(side*.83,.964,z-.029)],.025)
        body.spheroid("paint",(side*.858,.969,z-.036),(.101,.053,.083))
        body.spheroid("mirror",(side*.865,.97,z-.094),(.077,.040,.017))
    for sign in (-1,1):
        z=sign*half
        def face(x,y,off=0):
            top=belt(z)+.024*(1-(x/width(z))**2)
            # Tuck the lower valance under the bumper.
            inset=max(0,.41-y)*.16+max(0,y-top+.035)*.12
            return (x,y,end_z(z,x)+sign*(off-inset))
        xs=steps(-1,1,40)
        # End cap follows the exact edge of the pressed outer skin at both corners.
        edge = row(z,1)
        cap_levels = edge[1:]
        body.grid("paint",[[face(t*w,y+.026*(1-t*t)*max(0,(y-belt(z)+.08)/.08))
                            for t in xs] for w,y,_ in cap_levels],(0,0,sign))
        body.grid("undertray",[[face(t*width(z)*.974,.185) for t in xs],
                               [(t*width(z)*.91,.157,z-sign*.19) for t in xs]],(0,-1,0))
        def panel(mat,bottom,top,off):
            # Polylines enclose lamps and grille on the curved face.
            def surface(x,y):
                projected=off
                if mat in {"grille","rub_strip","chrome","window_frame","headlamp"} and y<.49:
                    projected+=.020
                return face(x,y,projected)
            body.grid(mat,[[surface(x,y) for x,y in bottom],[surface(x,y) for x,y in top]],(0,0,sign))
        def trapezoid(mat,wb,wt,yb,yt,off):
            panel(mat,[(w*wb,yb) for w in xs],[(w*wt,yt) for w in xs],off)
        # Wrap a full-width body-coloured bumper. The rolling cross section
        # catches light under the lamps and turns in underneath the valance.
        bumper_levels=[(.23,0,.748),(.255,.012,.763),(.36,.017,.777),
                       (.405,.018,.778),(.454,.009,.774),(.466,.001,.765)]
        if sign<0:
            bumper_levels=[(.225,.001,.744),(.275,.010,.761),(.37,.019,.775),
                           (.415,.021,.773),(.471,.013,.765),(.487,.001,.751)]
        bumper_rows=[]
        for y,bulge,w in bumper_levels:
            bumper_rows.append([face(t*w,y+.03*t*t,bulge*(1-.7*abs(t)**5)) for t in xs])
        body.grid("paint",bumper_rows,(0,0,sign))
        if sign>0:
            wb,wt=(.22,.28) if classic else (.52,.30)
            low,high=(.506,.641) if classic else (.26,.566)
            trapezoid("chrome" if classic else "window_frame",wb+.015,wt+.015,low-.012,high+.009,.008)
            trapezoid("grille",wb,wt,low,high,.013)
            for t in (.18,.41,.64,.84):
                w=lerp(wb,wt,t)
                trapezoid("chrome" if classic else "rub_strip",w,w,lerp(low,high,t),
                          lerp(low,high,t)+.006,.019)
            if classic:
                trapezoid("grille",.49,.52,.25,.347,.012)
            for side in (-1,1):
                if classic:
                    lo=[(.285,.51),(.44,.49),(.63,.495),(.716,.53)]
                    hi=[(.285,.622),(.44,.638),(.63,.644),(.716,.61)]
                else:
                    lo=[(.285,.592),(.43,.563),(.64,.54),(.735,.572)]
                    hi=[(.285,.624),(.43,.642),(.64,.652),(.735,.629)]
                def side_panel(material,bottom,top,off):
                    panel(material,[(x*side,y) for x,y in bottom],[(x*side,y) for x,y in top],off)
                side_panel("reflector",lo,hi,.018)
                for x in (.47,.59):
                    y=.563 if classic else .595
                    body.spheroid("headlamp",face(side*x,y,.022),(.041,.032,.012),14)
                side_panel("headlamp",[(x,lerp(y,h[1],.83)) for (x,y),h in zip(lo,hi)],
                          [(x,lerp(y,h[1],.95)) for (x,y),h in zip(lo,hi)],.024)
                side_panel("indicator",lo[-2:],[(x,y+.016) for x,y in lo[-2:]],.025)
                side_panel("grille",[(.57,.267),(.665,.275)],[(.55,.345),(.69,.397)],.014)
                side_panel("headlamp",[(.59,.288),(.65,.299)],[(.59,.31),(.65,.321)],.020)
            plate_y=.42 if classic else .415
        else:
            for side in (-1,1):
                xs_l=[.37,.51,.68,.747] if classic else [.20,.45,.62,.752]
                low=[.637,.604,.607,.632] if classic else [.780,.731,.695,.725]
                high=[.746,.758,.752,.725] if classic else [.831,.839,.828,.809]
                panel("light_rear",[(side*x,y) for x,y in zip(xs_l,low)],
                      [(side*x,y) for x,y in zip(xs_l,high)],.016)
                panel("reverse",[(side*x,lerp(y,h,.26)) for x,y,h in zip(xs_l[1:3],low[1:3],high[1:3])],
                      [(side*x,lerp(y,h,.49)) for x,y,h in zip(xs_l[1:3],low[1:3],high[1:3])],.020)
                panel("light_rear",[(side*.59,.306),(side*.70,.313)],
                      [(side*.59,.328),(side*.70,.335)],.014)
            plate_y=.602 if classic else .557
            trapezoid("rub_strip",.63,.665,.227,.259,.013)
            # Outline of the separate luggage lid and its release garnish.
            for s in (-1,1):
                body.tube("seams", [face(s*x,y,.005) for x,y in (
                    (.57,belt(z)-.012),(.55,.73),(.48,.68),(.47,.519),(.39,.493),(.008,.490))],.0035)
            trapezoid("chrome" if classic else "paint",.21,.235,plate_y+.084,plate_y+.103,.014)
        trapezoid("plate_edge",.187,.187,plate_y-.069,plate_y+.069,.025)
        trapezoid("plate",.177,.177,plate_y-.058,plate_y+.057,.029)
        for x in (-.151,.151):
            body.spheroid("rub_strip",face(x,plate_y+.035,.032),(.006,.005,.003),8)
    body.grid("undertray",[[(x,.186,z) for x in (-.66,.66)] for z in (-half+.08,half-.08)],(0,-1,0))
    for side in (-1,1):
        for start,end,material in [(-half+.015,-half+.36,"light_rear"),(half-.40,half-.019,"headlamp")]:
            # Wrap the lamp lens around the quarter, following the shoulder stamping.
            rows=[]
            for z in steps(start,end,12):
                t=(z-start)/(end-start)
                thickness=lerp(.105,.012,t) if start<0 else lerp(.008,.055,t)
                y=belt(z)-(.048 if classic else .028)
                rows.append([(side*(x_for(z,h)+.005),h,end_z(z,x_for(z,h))) for h in (y-thickness,y)])
            body.grid(material,rows,(side,0,0))
        for z0,z1 in ((-half+.05,rear_cabin), (front_cabin,half-.06)):
            line=[]
            for z in steps(z0,z1,24):
                p=top_point(z,side*.795)
                line.append((p[0],p[1]+.002,p[2]))
            body.tube("seams",line,.0035)
    for z in steps(rear_glass[0]+.065,rear_glass[1]-.035,8):
        wire=[]
        for t in steps(-.83,.83,12):
            x,y,z0=roof(z,t)
            wire.append((x,y+.0017,z0))
        body.tube("demister",wire,.0015,4)
    return body,axles


# Linear RGB factors in glTF's metallic-roughness model.
FINISHES={
    "paint":([.56,.085,.049],.33,.31), "chrome":([.62,.66,.68],.80,.22),
    "window_frame":([.014,.019,.021],.16,.34), "rubber":([.018,.018,.019],.03,.74),
    "rim":([.48,.49,.48],.72,.26), "brake":([.16,.15,.145],.62,.46),
    "glass":([.082,.146,.166],.18,.15), "mirror":([.52,.64,.67],.74,.13),
    "fabric":([.132,.113,.094],0,.92), "dashboard":([.052,.055,.055],.02,.78),
    "shelf":([.077,.077,.078],0,.87), "wheelhouse":([.024,.022,.021],0,.90),
    "seams":([.029,.03,.032],.06,.52), "rub_strip":([.053,.058,.06],.12,.42),
    "undertray":([.042,.04,.041],0,.85),"grille":([.016,.018,.019],.1,.46),
    "headlamp":([.72,.83,.87],.37,.19),"reflector":([.19,.24,.25],.68,.20),
    "indicator":([.92,.32,.035],.23,.29),"light_rear":([.55,.015,.02],.20,.23),
    "reverse":([.68,.70,.61],.29,.24),"plate_edge":([.13,.15,.15],.6,.30),
    "plate":([.74,.75,.69],.16,.38),"demister":([.12,.076,.05],.22,.62)
}


def write_glb(name, classic, length, wheelbase, height):
    body,axles=saloon(classic,length,wheelbase,height)
    wheel,radius=alloy_wheel(classic)
    data=bytearray()
    doc={"asset":{"version":"2.0","generator":"ViVu3D sedan builder"},"scene":0,
         "scenes":[{"nodes":[0]}],"nodes":[{"name":name,"mesh":0,"children":[]}],"meshes":[],
         "accessors":[],"bufferViews":[],"materials":[]}
    def accessor(values,components,code,bounds=False):
        dtype,component_type=("f",5126) if code=="float" else ("H",5123)
        while len(data)%4: data.append(0)
        offset=len(data)
        flat=array(dtype,(x for v in values for x in v))
        data.extend(flat.tobytes())
        view={"buffer":0,"byteOffset":offset,"byteLength":len(data)-offset,
              "target":34962 if dtype=="f" else 34963}
        a={"bufferView":len(doc["bufferViews"]),"componentType":component_type,
           "count":len(flat)//components,"type":"VEC3" if components==3 else "SCALAR"}
        if bounds:
            a["min"]=[min(flat[i::components]) for i in range(components)]
            a["max"]=[max(flat[i::components]) for i in range(components)]
        doc["bufferViews"].append(view)
        doc["accessors"].append(a)
        return len(doc["accessors"])-1
    materials={}
    for material,(rgb,metal,rough) in FINISHES.items():
        m={"name":material,"pbrMetallicRoughness":{
            "baseColorFactor":[*( [.17,.29,.23] if classic and material=="paint" else rgb),.70 if material=="glass" else 1],
            "metallicFactor":metal,"roughnessFactor":rough}}
        if material=="glass":
            m.update(alphaMode="BLEND",doubleSided=True)
        if material=="headlamp": m["emissiveFactor"]=[.20,.24,.24]
        if material=="light_rear": m["emissiveFactor"]=[.10,.002,.001]
        materials[material]=len(doc["materials"])
        doc["materials"].append(m)
    for mesh in (body,wheel):
        prims=[]
        for material,(vertices,faces) in mesh.parts.items():
            assert len(vertices)<65535
            normals=[[0.,0.,0.] for _ in vertices]
            for a,b,c in faces:
                normal=cross(sub(vertices[b],vertices[a]),sub(vertices[c],vertices[a]))
                for index in (a,b,c):
                    for k in range(3):
                        normals[index][k]+=normal[k]
            attrs={"POSITION":accessor(vertices,3,"float",True),
                   "NORMAL":accessor([unit(n) for n in normals],3,"float")}
            prims.append({"attributes":attrs,"indices":accessor(faces,1,"index"),"material":materials[material]})
        doc["meshes"].append({"primitives":prims})
    for end,z in zip(("R","F"),axles):
        for hand,sign in (("L",1),("R",-1)):
            corner=end+hand
            mount={"name":"steer_"+corner if end=="F" else "axle_"+corner,
                   "translation":[sign*.736,radius,z]}
            nodes=doc["nodes"]
            nodes[0]["children"].append(len(nodes))
            mount["children"]=[len(nodes)+1]
            spin={"name":"wheel_"+corner,"mesh":1}
            if sign<0: spin["rotation"]=[0,1,0,0]
            nodes.extend((mount,spin))
    while len(data)%4: data.append(0)
    doc["buffers"]=[{"byteLength":len(data)}]
    meta=json.dumps(doc,separators=(",",":")).encode()
    meta+=b" "*(-len(meta)%4)
    header=struct.pack("<4sII",b"glTF",2,28+len(meta)+len(data))
    out=OUT/(name+".glb")
    out.write_bytes(header+struct.pack("<I4s",len(meta),b"JSON")+meta+
                    struct.pack("<I4s",len(data),b"BIN\0")+data)
    print(out.name, out.stat().st_size, "bytes")


if __name__=="__main__":
    write_glb("city-sedan",False,4.43,2.55,1.48)
    write_glb("classic-sedan",True,4.50,2.60,1.45)
