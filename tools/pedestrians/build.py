"""Run with Python and Pillow to regenerate the themed GLBs in dist/traffic."""

from pathlib import Path

from mesh import Figure
from textures import atlas, BLUE, GOLD, HAIR, INK, NAVY, ORANGE, RED, SKIN, WHITE


DEST = Path(__file__).resolve().parents[2] / "dist" / "traffic"
TEAM_BLUE = "#27469a"
PURPLE = "#47335f"
SHIRTS = {"hust-tee": RED, "hust-jacket": WHITE, "manchester-united": "#cb2337",
          "skt-t1": "#262433", "fox-cosplayer": WHITE, "witch-cosplayer": PURPLE,
          "doraemon": BLUE, "nobita": "#f5cd36", "goku": ORANGE, "vegeta": WHITE}
PAINTED = "#ffffff"  # Preserve the atlas colours on textured surfaces.


def skeleton(style):
    f = Figure()
    if style == "doraemon":
        hip, chest, head, shoulder, elbow, knee = .29, .32, .985, .67, .50, .15
        spread, stance = .225, .13
    else:
        hip, chest, head, shoulder, elbow, knee = .84, .85, 1.61, 1.36, 1.10, .43
        spread, stance = .192, .097
    f.joint("hips",(0,hip,0))
    f.joint("chest",(0,chest,0),"hips")
    f.joint("head",(0,head,0),"chest")
    for side,sign in (("L",1),("R",-1)):
        f.joint("thigh"+side,(sign*stance,hip,0),"hips")
        f.joint("shin"+side,(sign*stance,knee,0),"thigh"+side)
        f.joint("arm"+side,(sign*spread,shoulder,0),"chest")
        f.joint("elbow"+side,(sign*(spread+.035),elbow,0),"arm"+side)
    return f


def doraemon(f):
    f.oval("chest",(0,.17,0),(.277,.304,.215),PAINTED,panel=260,sides=28,steps=14)
    f.tube("chest",(0,.411,0),(.242,.193),(.245,.196),.051,RED)
    f.oval("chest",(0,.364,.196),(.043,.044,.037),GOLD)
    f.tube("chest",(0,.37,.198),(.045,.038),(.045,.038),.011,"#ad7629")
    f.oval("chest",(0,.354,.231),(.010,.014,.005),INK)
    f.oval("chest",(0,.049,-.224),(.053,.053,.053),"#d33a3a")
    f.oval("head",(0,0,.009),(.345,.322,.301),PAINTED,panel=0,steps=18,sides=36)
    for side,sign in (("L",1),("R",-1)):
        f.oval("thigh"+side,(0,-.066,0),(.112,.135,.134),BLUE)
        f.oval("shin"+side,(0,-.066,.043),(.134,.084,.175),WHITE)
        f.oval("arm"+side,(sign*.024,-.073,0),(.083,.133,.09),BLUE,lean=sign*.28)
        f.oval("elbow"+side,(sign*.03,-.049,.02),(.094,.095,.094),WHITE)


def hairstyle(f, style):
    hair = {"fox-cosplayer":"#d9906f", "witch-cosplayer":"#a69bbd"}.get(style,HAIR)
    f.rings("head",(0,0,-.011),[(.055,.158,.14),(.1,.16,.148),(.157,.135,.125),
                                 (.191,.087,.08),(.203,.002,.002)],hair,sides=24)
    f.oval("head",(0,.012,-.072),(.148,.161,.091),hair)
    if style in ("vegeta","goku"):
        # Vegeta's upswept widow's peak and Goku's broad, swept side locks.
        locks = ([(-.113,.10,-.026,.245,.42),(-.05,.14,-.045,.315,.19),
                  (.031,.16,-.058,.33,-.12),(.108,.10,-.028,.243,-.36),(0,.14,.035,.245,.1)]
                 if style=="vegeta" else
                 [(-.115,.103,-.015,.24,1.07),(-.09,.15,-.035,.245,.57),
                  (-.025,.17,-.04,.23,.41),(.073,.13,-.02,.265,-.68),
                  (.12,.089,-.017,.22,-1.15),(.12,.035,-.04,.166,-1.48)])
        for x,y,z,height,lean in locks:
            f.rings("head",(x,y,z),[(0,.079,.085),(height*.45,.056,.057),(height,.002,.002)],
                    hair,sides=8,lean=lean,pitch=-.14)
        for x,y,lean in ([(0,.056,0)] if style=="vegeta" else [(-.072,.035,-.43),(.013,.058,-.52),(.106,.073,.23)]):
            f.rings("head",(x,y,.104),[(-.065,.001,.001),(.009,.045,.04),(.067,.056,.04)],hair,sides=8,lean=lean)
    else:
        for x,y,lean in [(-.105,.066,-.55),(-.052,.074,-.65),(.006,.083,-.68),(.066,.087,-.75),(.113,.075,.35)]:
            f.oval("head",(x,y,.103-abs(x)*.36),(.043,.066,.040),hair,lean=lean)
        if style.endswith("cosplayer"):
            for s in (-1,1):
                f.oval("head",(s*.132,-.022,-.056),(.049,.147,.066),hair,lean=s*.12)
        if style == "hust-jacket":
            f.oval("head",(0,.086,-.15),(.058,.058,.052),RED)
            f.oval("head",(0,.004,-.175),(.068,.123,.050),hair,pitch=.24)


def accessories(f, style):
    if style == "witch-cosplayer":
        f.oval("head",(0,.130,0),(.31,.025,.256),PURPLE,lean=-.065)
        f.rings("head",(0,.131,0),[(0,.166,.149),(.087,.129,.118),(.18,.084,.077),
                                   (.28,.036,.034),(.34,.002,.002)],PURPLE,sides=18,lean=-.22)
        f.tube("head",(.014,.188,0),(.151,.138),(.139,.126),.039,"#b27654",lean=-.18)
        f.oval("head",(.025,.187,.139),(.029,.024,.006),GOLD)
        f.rings("chest",(0,0,-.055),[(-.12,.262,.116),(.02,.246,.112),(.49,.197,.07)],
                "#63517e",pitch=.19)
    if style == "fox-cosplayer":
        # Lacquered kitsune mask with vermilion ear inserts, eyes and cheek marks.
        f.oval("head",(0,.013,.109),(.147,.137,.059),WHITE)
        for s in (-1,1):
            f.rings("head",(s*.104,.084,.10),[(0,.052,.036),(.128,.002,.002)],WHITE,lean=-s*.21,sides=6)
            f.rings("head",(s*.11,.10,.124),[(0,.028,.009),(.087,.001,.001)],RED,lean=-s*.21,sides=6)
            f.oval("head",(s*.054,.025,.163),(.032,.010,.006),INK,lean=s*.22)
            f.oval("head",(s*.079,-.001,.158),(.024,.006,.006),RED,lean=s*.37)
        f.oval("head",(0,-.050,.162),(.019,.013,.009),INK)
        for s in (-1,1):
            f.oval("chest",(s*.075,.10,-.141),(.086,.068,.041),RED,lean=s*.25)


def human(f, style):
    top = SHIRTS[style]
    cosplay = style.endswith("cosplayer")
    shorts = style in ("manchester-united","nobita")
    warrior = style in ("goku","vegeta")
    pants = {"manchester-united":WHITE,"nobita":"#344974","goku":ORANGE,
             "vegeta":TEAM_BLUE,"witch-cosplayer":PURPLE,"fox-cosplayer":RED}.get(style,NAVY)
    f.oval("hips",(0,.006,0),(.164,.113,.110),pants)
    chest = .233 if warrior else .196
    f.rings("chest",(0,0,0),[(-.023,.18,.137),(.017,.18,.137),(.17,.163,.121),
                             (.365,chest,.145),(.466,chest,.129),(.505,.172,.115),
                             (.525,.138,.101),(.544,.070,.061)],PAINTED,panel=260,sides=28)
    if cosplay:
        f.rings("hips",(0,0,0),[(-.258,.251,.166),(-.243,.253,.165),(.08,.16,.12)],pants)
    if style=="goku" or cosplay:
        belt = TEAM_BLUE if style=="goku" else GOLD
        f.tube("chest",(0,.076,0),(.19,.148),(.18,.140),.077,belt,sides=28)
    f.tube("chest",(0,.552,0),(.064,.062),(.068,.063),.13,SKIN)
    f.tube("chest",(0,.527,0),(.097,.08),(.077,.064),.029,TEAM_BLUE if warrior else top)
    for s in (-1,1):
        f.oval("head",(s*.144,-.007,0),(.035,.049,.035),SKIN)
    f.oval("head",(0,0,.005),(.154,.182,.141),PAINTED,panel=0,steps=16,sides=32)
    hairstyle(f,style)
    accessories(f,style)
    for side,s in (("L",1),("R",-1)):
        thigh, shin, arm, elbow = (name+side for name in ("thigh","shin","arm","elbow"))
        upper = [(-.242,.079,.083)] if shorts else [(-.16,.093,.098),(.023,.077,.082)]
        f.rings(thigh,(0,0,0),[(-.412,.069,.073),(-.31,.078,.081)]+upper,SKIN if shorts else pants)
        f.oval(thigh,(0,-.399,0),(.074,.066,.075),SKIN if shorts else pants)
        if shorts:
            f.rings(thigh,(0,0,0),[(-.256,.082,.085),(-.253,.095,.101),
                                   (-.14,.098,.105),(.023,.077,.082)],pants)
        lower = SKIN if shorts else pants
        f.rings(shin,(0,0,-.004),[(-.389,.054,.059),(-.255,.060,.066),(-.139,.077,.081),
                                 (-.067,.080,.084),(.006,.069,.074)],lower)
        sock = WHITE if style in ("vegeta","nobita") else INK if style=="manchester-united" else TEAM_BLUE if style=="goku" else None
        if sock:
            f.tube(shin,(0,-.262,0),(.063,.068),(.076,.08),.244,sock)
        shoe = WHITE if style in ("skt-t1","vegeta","hust-jacket") else TEAM_BLUE if style=="goku" else "#513f41" if cosplay else "#333844"
        f.oval(shin,(0,-.361,.037),(.083,.068,.142),shoe)
        f.tube(shin,(0,-.408,.038),(.082,.137),(.085,.14),.025,GOLD if warrior else "#bbb8ae",sides=16)
        long = style in ("hust-jacket","vegeta") or cosplay
        sleeve = TEAM_BLUE if style=="vegeta" else RED if style=="hust-jacket" else top
        if style=="goku":
            sleeve=TEAM_BLUE
        radius = .076 if warrior else .065
        f.oval(arm,(s*.016,-.156,0),(radius,.14,radius),sleeve if long else SKIN,lean=s*.11)
        f.rings(arm,(s*.009,0,0),[(-.18,.081,.084),(-.14,.086,.090),(-.029,.087,.094),
                                  (.016,.078,.085),(.039,.057,.063),(.049,.001,.001)],sleeve,lean=s*.11)
        cuff = WHITE if style in ("manchester-united","hust-tee") else RED if style=="skt-t1" else sleeve
        f.tube(arm,(s*.028,-.177,0),(.082,.085),(.084,.087),.014,cuff,lean=s*.11)
        if style in ("vegeta","goku"):
            f.oval(arm,(0,.006,0),(.102,.057,.102),WHITE if style=="vegeta" else ORANGE)
        forearm = (WHITE if style=="vegeta" else sleeve) if long else SKIN
        f.rings(elbow,(0,0,.009),[(-.236,.083 if cosplay else .043,.053),
                                  (-.167,.076 if cosplay else .049,.056),(-.087,.066,.068),
                                  (-.029,.066,.07),(.019,.057,.061),(.036,.002,.002)],forearm)
        if style=="goku":
            f.tube(elbow,(0,-.183,.009),(.054,.063),(.060,.068),.075,TEAM_BLUE)
        glove = WHITE if style=="vegeta" else SKIN
        f.oval(elbow,(0,-.253,.015),(.047,.074,.058),glove)
        f.oval(elbow,(-s*.033,-.241,.048),(.018,.038,.025),glove)


if __name__ == "__main__":
    for style,colour in SHIRTS.items():
        figure = skeleton(style)
        if style == "doraemon":
            doraemon(figure)
        else:
            human(figure,style)
        if style == "nobita":
            scale = .78
            figure.positions = [tuple(x*scale for x in p) for p in figure.positions]
            figure.origins = {k:tuple(x*scale for x in p) for k,p in figure.origins.items()}
            for node in figure.nodes:
                node["translation"] = [x*scale for x in node["translation"]]
        figure.save(DEST/(style+".glb"),atlas(style,colour))
