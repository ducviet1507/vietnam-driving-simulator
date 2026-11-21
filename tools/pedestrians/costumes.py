"""Sculpted costume pieces in the bind pose of each shared street rig."""

import math

import numpy as np

from mesh import Figure, linear_byte


def sweep(f, bone, rings, colour, *, closed=False, cloth=False):
    """Join cross sections into a ribbon, lock of hair, or folded textile."""
    points = np.asarray(rings)
    tangent = np.roll(points,-1,axis=1)-np.roll(points,1,axis=1)
    up = np.gradient(points,axis=0)
    normals = np.cross(tangent,up)
    normals /= np.maximum(np.linalg.norm(normals,axis=2,keepdims=True),1.e-10)
    first = len(f.positions)
    count = points.shape[1]
    rgb = tuple(linear_byte(int(colour[i:i+2],16)) for i in (1,3,5))
    for j,ring in enumerate(points):
        for i,point in enumerate(ring):
            f.positions.append(point)
            f.normals.append(normals[j,i])
            if cloth:
                t=i*math.tau/count
                dye=.95+.055*math.sin(5*t+point[1]*4)+.038*math.cos(3*t-point[1]*8)
                f.colours.append(tuple(min(255,round(c*dye)) for c in rgb)+(255,))
            else:
                f.colours.append(rgb+(255,))
            f.bones.append((f.joints[bone],0,0,0))
            if j and (closed or i<count-1):
                a=first+(j-1)*count+i
                b=first+(j-1)*count+(i+1)%count
                f.indices.extend([a,b,a+count,b,b+count,a+count])


def lock(f, start, middle, tip, width, depth, colour):
    # Curved, flattened clumps with a spine down the front, swept from root to tip.
    a,b,c = map(np.array,(start,middle,tip))
    rings = []
    for t,r in ((0,.74),(.26,1),(.53,.81),(.78,.43),(1,.007)):
        center=(1-t)**2*a+2*t*(1-t)*b+t*t*c
        direction=(1-t)*(b-a)+t*(c-b)
        direction/=np.linalg.norm(direction)
        across=np.cross(direction,[0,0,1])
        across/=np.linalg.norm(across)
        face=np.cross(across,direction)
        rings.append([center+across*(width*r*math.sin(i*math.tau/10))+
                      face*(depth*r*math.cos(i*math.tau/10)) for i in range(10)])
    sweep(f,"head",rings,colour,closed=True)


def drape(f, bone, sections, colour, folds=12):
    rings=[]
    for y,rx,rz,flute in sections:
        ring=[]
        for i in range(72):
            t=i*math.tau/72
            fold=flute*(.72*math.cos(folds*t)+.28*math.sin((folds-3)*t+.5))
            ring.append(((rx+fold)*math.sin(t),y+flute*.34*math.cos(5*t),-.018+(rz+fold)*math.cos(t)))
        rings.append(ring)
    sweep(f,bone,rings,colour,closed=True,cloth=True)


def inseam(side, angle, y, x, z):
    # Each thigh becomes half of one elliptical waistband above the crotch.
    blend=np.clip((y-.725)/.145,0,1)
    blend=blend*blend*(3-2*blend)
    waist_x=side*.162*max(0,side*math.sin(angle))
    waist_z=-.015+.096*math.cos(angle)
    return (x+(waist_x-x)*blend,y,z+(waist_z-z)*blend)


def shorts(f, style):
    football = style=="manchester-united"
    fabric = "#ddd8c7" if football else "#38485b"
    skin = "#99684b" if football else "#deb18e"
    for s,side in ((1,"L"),(-1,"R")):
        thigh,calf = "thigh_"+side,"calf_"+side
        cx=s*.106
        # One continuous, blended knee surface between the hem and the shoe.
        sections=[(.072,.041,.043,-.015),(.15,.038,.043,-.018),(.235,.046,.049,-.017),
                  (.32,.059,.064,-.020),(.39,.062,.069,-.014),(.45,.056,.057,.001),
                  (.49,.057,.062,.008),(.54,.061,.065,.002),(.64,.075,.083,-.004),
                  (.705,.076,.088,-.006)]
        for lo,hi,colour in ((.072,.405 if football else .225,"#36323c" if football else "#e4e0d3"),
                             (.405 if football else .225,.705,skin)):
            ys=[a[0] for a in sections]
            rings=[]
            for y in [lo]+[h for h in ys if lo<h<hi]+[hi]:
                rx,rz,z=[np.interp(y,ys,[row[i] for row in sections]) for i in (1,2,3)]
                rings.append([(cx+rx*math.sin(t), y, z+rz*math.cos(t)) for t in np.arange(28)*math.tau/28])
            sweep(f,calf,rings,colour,closed=True)
        hem=.637 if football else .646
        def cloth_ring(y,rx,rz,pleat):
            ring=[]
            for t in np.arange(36)*math.tau/36:
                ripple=pleat*math.sin(7*t+.6)+pleat*.45*math.cos(4*t)
                waist=np.clip((y-.79)/.12,0,1)
                x=cx*(1-.28*waist)+(rx+ripple)*math.sin(t)
                x*=1-.13*waist
                ring.append(inseam(s,t,y+.006*math.cos(2*t),x,-.011+(rz+ripple)*math.cos(t)))
            return ring
        rings=[cloth_ring(h,rx,rz,q) for h,rx,rz,q in
               [(hem,.087,.099,.003),(hem+.014,.088,.100,.003),(.74,.094,.11,.005),
                (.823,.096,.108,.004),(.907,.088,.089,.001),(.98,.079,.075,0)]]
        sweep(f,thigh,rings,fabric,closed=True,cloth=True)
        if football:
            sweep(f,thigh,[cloth_ring(hem+.009,.089,.101,.003),cloth_ring(hem+.014,.09,.102,.003)],"#aa4141",closed=True)


def trousers(f, style):
    colour = {"goku":"#d67835","vegeta":"#344e86","fox-cosplayer":"#4b343f",
              "witch-cosplayer":"#3c3148","hust-jacket":"#3b444b"}.get(style,"#354654")
    # The leg narrows at the ankle, breaks over the shoe and folds behind the knee.
    sections=[(.071,.056,.058,.004),(.085,.064,.071,.005),(.106,.061,.068,.004),
              (.140,.069,.074,.006),(.180,.062,.067,.004),(.218,.066,.070,.003),
              (.33,.074,.077,.003),(.40,.072,.077,.003),(.434,.068,.074,.003),
              (.451,.071,.080,.004),(.476,.067,.074,.004),(.515,.073,.077,.003),
              (.62,.084,.091,.004),(.70,.094,.102,.003),(.77,.099,.110,.002),
              (.821,.098,.112,.002),(.88,.093,.104,.001),(.96,.081,.085,0)]
    for s,side in ((1,"L"),(-1,"R")):
        rings=[]
        for y,rx,rz,fold in sections:
            waist=np.clip((y-.78)/.14,0,1)
            fullness=1.13 if style=="goku" and .18<y<.79 else .92 if style=="vegeta" else 1.
            ring=[]
            for t in np.arange(32)*math.tau/32:
                crease=fold*(.7*math.sin(5*t+3*y)+.3*math.cos(7*t))
                center=s*(.104-.03*waist)
                ring.append(inseam(s,t,y+fold*1.5*math.sin(2*t+.8),
                                   center+(rx*fullness+crease)*math.sin(t),
                                   -.01+(rz*fullness+crease)*math.cos(t)))
            rings.append(ring)
        sweep(f,"calf_"+side,rings,colour,closed=True,cloth=True)
        if style=="goku":
            for y in (.116,.19):
                f.tube("calf_"+side,(s*.104,y,-.01),(.073,.081),(.074,.081),.018,"#3e4f67",sides=24)


def costume(style):
    f=Figure()
    for name in ("head","chest","hips","upperarm_L","upperarm_R","thigh_L","thigh_R","calf_L","calf_R"):
        f.joint(name,(0,0,0))
    if style in ("nobita","manchester-united"):
        shorts(f,style)
    else:
        trousers(f,style)
    if style=="nobita":
        # Taper the jaw, round the cheeks and carry the frame around to the ears.
        f.rings("head",(0,1.71,-.015),[(-.139,.006,.016),(-.129,.046,.064),(-.105,.080,.090),
                (-.060,.105,.108),(.002,.111,.116),(.066,.106,.112),(.117,.075,.089),
                (.142,.034,.052),(.147,.002,.003)],"#dfac87",sides=40)
        eye_y=1.716
        for s in (-1,1):
            f.oval("head",(s*.106,1.69,-.009),(.022,.031,.021),"#d29a79")
            f.oval("head",(s*.045,eye_y,.091),(.030,.034,.009),"#f6eee0",steps=14)
            f.oval("head",(s*.041,eye_y-.004,.101),(.008,.018,.004),"#322b30",steps=12)
            f.oval("head",(s*.042-.002,eye_y+.002,.105),(.0025,.004,.0015),"#fff8e8")
            f.oval("head",(s*.044,eye_y+.044,.085),(.024,.003,.004),"#514039",lean=s*.09)
            rings=[]
            for t in np.linspace(0,math.tau,33):
                center=np.array([s*.045+.043*np.cos(t),eye_y+.044*np.sin(t),.107-s*.009*np.cos(t)])
                radial=np.array([np.cos(t),np.sin(t),0])
                rings.append([center+.0029*(np.cos(p)*radial+[0,0,np.sin(p)]) for p in np.arange(8)*math.tau/8])
            sweep(f,"head",rings,"#3c3532",closed=True)
            f.oval("head",(s*.091,eye_y+.005,.043),(.003,.003,.059),"#3c3532",pitch=.07)
        f.oval("head",(0,eye_y+.005,.106),(.010,.003,.003),"#3c3532")
        f.oval("head",(0,1.683,.096),(.018,.014,.021),"#dfaa83")
        f.oval("head",(.002,1.647,.084),(.023,.0028,.003),"#9f6756",lean=.06)
        f.rings("head",(0,1.71,-.024),[(.041,.109,.120),(.069,.112,.122),(.114,.092,.105),
                (.145,.059,.077),(.157,.002,.001)],"#2c2a30",sides=36)
        f.oval("head",(0,1.725,-.087),(.107,.107,.065),"#2c2a30")
        for i in range(7):
            x=(i-3)*.019
            lock(f,(x,1.843,.008),(x+.015,1.797,.098),(x-.008,1.758+.008*abs(i-3),.098-abs(x)*.30),
                 .024,.012,"#29272b")
    if style in ("goku","vegeta"):
        y=1.72 if style=="goku" else 1.67
        styles = [
            (-.052,.045,-.033,-.171,.171,-.049,.053),
            (-.030,.080,-.057,-.090,.258,-.109,.053),
            (.012,.085,-.062,.017,.267,-.109,.055),
            (.056,.054,-.028,.156,.203,-.029,.052),
            (.073,.020,-.008,.202,.125,-.029,.045),
            (-.072,.009,-.006,-.177,.091,-.009,.044),
            (.056,-.001,-.071,.153,.044,-.139,.042),
            (-.056,-.001,-.071,-.137,.052,-.133,.043),
        ]
        for i,(x,h,z,tx,th,tz,w) in enumerate(styles):
            if style=="vegeta":
                tx*=.63
                th=th*.81+.07
            lock(f,(x,y+h,z),((x+tx)*.48,y+(h+th)*.57,(z+tz)*.46+.02),(tx,y+th,tz),
                 w,.042,["#292932","#24252e","#30303a"][i%3])
        fringe=[(-.033,-.003,-.070),(.028,.008,-.043),(.067,.006,-.015)] if style=="goku" else [(0,-.004,-.047)]
        for i,(x,dx,h) in enumerate(fringe):
            lock(f,(x+.016,y+.103,.012),(x+dx+.021,y+.061,.088),(x+dx,y+h+.045,.083),
                 .034 if style=="goku" else .042,.022,"#292931")
        if style=="vegeta":
            for s in (-1,1):
                bone = "upperarm_L" if s==1 else "upperarm_R"
                f.rings(bone,(s*.185,1.445,-.015),[(-.014,.085,.104),(0,.095,.110),
                        (.025,.095,.109),(.052,.080,.098),(.068,.052,.074),(.076,.002,.004)],
                        "#ddba72",lean=-s*.24,sides=24)
    if style in ("fox-cosplayer","witch-cosplayer"):
        fox=style=="fox-cosplayer"
        colour="#7f343f" if fox else "#473c54"
        for s in (-1,1):
            for i in range(3):
                z=.018-i*.033
                lock(f,(s*.047,1.669,z),(s*(.098+.006*i),1.603,z+.005),
                     (s*(.093+.006*i),1.491-i*.018,z+.027),.027,.022,
                     (["#784d3e","#8c6050","#704936"] if fox else ["#5e4759","#765965","#503e4c"])[i])
        hem=.61 if fox else .50
        drape(f,"hips",[(hem,.257,.202,.016),(hem+.018,.255,.198,.016),(.75,.233,.173,.011),
                         (.90,.201,.154,.006),(.99,.178,.131,0)],colour)
        drape(f,"hips",[(hem+.017,.259,.202,.016),(hem+.03,.257,.20,.016)],"#c89070" if fox else "#ab926b")
        drape(f,"hips",[(.911,.209,.159,.003),(.944,.207,.157,.002),(.988,.197,.151,.002)],
              "#b87742" if fox else "#614a43")
        if fox:
            # Wear the fox mask off-centre so the actor's face remains visible.
            x,y,z=.049,1.652,.058
            f.oval("head",(x,y,z),(.070,.073,.024),"#e7d7b9",lean=-.34,steps=14,sides=24)
            for s in (-1,1):
                xx=x+s*.048
                f.rings("head",(xx,y+.045,z),[(0,.024,.014),(.055,.001,.001)],"#e7d7b9",lean=-s*.30)
                f.rings("head",(xx,y+.049,z+.008),[(0,.014,.008),(.036,.001,.001)],"#a74442",lean=-s*.30)
                f.oval("head",(x+s*.031,y+.001,z+.023),(.016,.004,.003),"#38323a",lean=s*.38)
                f.oval("head",(x+s*.038,y-.013,z+.020),(.011,.003,.003),"#ac4d46",lean=s*.41)
                f.oval("hips",(s*.081,.954,-.172),(.09,.062,.032),"#b07255",lean=s*.35)
            f.oval("head",(x,y-.033,z+.025),(.008,.006,.007),"#513743")
        else:
            drape(f,"chest",[(1.325,.233,.182,.009),(1.343,.235,.183,.008),
                             (1.434,.198,.153,.004),(1.494,.110,.099,.001)],"#5e5069")
            f.oval("chest",(0,1.399,.148),(.014,.020,.009),"#c9a164")
            # Leather-bound brim lifted on one side and a bent felt crown.
            f.oval("head",(0,1.665,-.025),(.207,.014,.165),"#4c4058",lean=-.12,steps=8,sides=36)
            f.rings("head",(0,1.663,-.024),[(0,.091,.090),(.050,.082,.076),(.112,.060,.055),
                    (.165,.041,.038),(.212,.015,.016),(.235,.001,.001)],"#5c4c62",lean=-.43,sides=26)
            f.tube("head",(.013,1.707,-.024),(.090,.085),(.080,.078),.025,"#77604f",lean=-.28,sides=26)
            f.oval("head",(.025,1.707,.061),(.012,.010,.003),"#bc9767")
    if style in ("skt-t1","hust-tee"):
        for i in range(7):
            x=(i-3)*.017
            lock(f,(x,1.812,-.018),(x+.027,1.805,.066),
                 (x+(.020 if style=="hust-tee" else -.012),1.738+abs(i-2)*.008,.082-abs(x)*.40),
                 .024,.016,["#332d30","#423635","#372d2e"][i%3])
    return f
