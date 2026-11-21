"""Run with Python, NumPy and Pillow to regenerate the themed GLBs in dist/traffic."""

from pathlib import Path

from costumes import costume
from fabric import paint
from tailor import Tailor
from mesh import Figure
from textures import atlas, BLUE, GOLD, INK, NAVY, ORANGE, RED, WHITE


DEST = Path(__file__).resolve().parents[2] / "dist" / "traffic"
PURPLE = "#47335f"
SHIRTS = {"hust-tee": RED, "hust-jacket": WHITE, "manchester-united": "#cb2337",
          "skt-t1": "#262433", "fox-cosplayer": WHITE, "witch-cosplayer": PURPLE,
          "doraemon": BLUE, "nobita": "#f5cd36", "goku": ORANGE, "vegeta": WHITE}
PAINTED = "#ffffff"  # Preserve the atlas colours on textured surfaces.


def mascot_rig():
    f = Figure()
    f.joint("hips",(0,.29,0))
    f.joint("chest",(0,.32,0),"hips")
    f.joint("head",(0,.985,0),"chest")
    for side,sign in (("L",1),("R",-1)):
        f.joint("thigh"+side,(sign*.13,.29,0),"hips")
        f.joint("shin"+side,(sign*.13,.15,0),"thigh"+side)
        f.joint("arm"+side,(sign*.225,.67,0),"chest")
        f.joint("elbow"+side,(sign*.260,.50,0),"arm"+side)
    return f


def doraemon(f):
    f.oval("chest",(0,.17,0),(.287,.298,.229),PAINTED,panel=260,sides=28,steps=14)
    f.tube("chest",(0,.411,0),(.242,.193),(.245,.196),.051,RED)
    f.oval("chest",(0,.364,.196),(.043,.044,.037),GOLD)
    f.tube("chest",(0,.37,.198),(.045,.038),(.045,.038),.011,"#ad7629")
    f.oval("chest",(0,.354,.231),(.010,.014,.005),INK)
    f.oval("chest",(0,.049,-.224),(.053,.053,.053),"#d33a3a")
    f.oval("head",(0,0,.009),(.359,.332,.312),PAINTED,panel=0,steps=22,sides=48)
    # The nose and paired eyes keep their silhouettes in three-quarter and side views.
    for side in (-1,1):
        f.oval("head",(side*.053,.114,.288),(.055,.084,.029),WHITE,steps=16,sides=28,lean=-side*.065)
        f.oval("head",(side*.044,.091,.316),(.015,.026,.006),INK,steps=12)
        f.oval("head",(side*.044-.004,.102,.322),(.005,.006,.002),"#f7f5e8")
    f.oval("head",(0,.041,.327),(.047,.043,.036),"#bc3d40",steps=13,sides=24)
    f.oval("head",(-.013,.056,.356),(.009,.006,.002),"#e69686")
    for side,sign in (("L",1),("R",-1)):
        f.oval("thigh"+side,(0,-.066,0),(.112,.135,.134),BLUE)
        f.oval("shin"+side,(0,-.066,.043),(.134,.084,.175),WHITE)
        f.oval("arm"+side,(sign*.024,-.073,0),(.083,.133,.09),BLUE,lean=sign*.28)
        f.oval("elbow"+side,(sign*.03,-.049,.02),(.094,.095,.094),WHITE)


if __name__ == "__main__":
    for style,colour in SHIRTS.items():
        path = DEST/(style+".glb")
        if style=="doraemon":
            figure = mascot_rig()
            doraemon(figure)
            figure.save(path,atlas(style,colour))
            continue
        if style in ("hust-jacket","fox-cosplayer","witch-cosplayer"):
            source = "hiker"
        elif style=="vegeta":
            source = "casual-walker"
        else:
            source = "road-worker"
        model = Tailor(DEST/(source+".glb"))
        model.omit("vest","helmet","hood","underlay","trousers",*(("pack","straps") if style.endswith("cosplayer") else ()))
        if style=="nobita":
            high = model.xyz[model.faces,1].min(axis=1)>1.545
            face = (model.parts[model.faces[:,0]]=="skin") & high
            model.faces = model.faces[~face]
            model.omit("eyes","hair")
        model.shape(style)
        model.props(costume(style))
        stature = {"nobita":.73,"vegeta":.93,"hust-tee":.955,"skt-t1":.98}.get(style,1)
        model.save(path,paint(model,style,colour),stature)
