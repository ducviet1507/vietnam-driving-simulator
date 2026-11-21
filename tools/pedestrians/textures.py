"""Paint the wraparound face and clothing panels for the street characters."""

from functools import lru_cache
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont


INK = "#242134"
WHITE = "#fffaf0"
SKIN = "#edb792"
BLUE = "#178fc9"
RED = "#bc1933"
NAVY = "#203047"
GOLD = "#ffd15a"
ORANGE = "#f47922"
HAIR = "#292735"


@lru_cache
def font(size):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def label(draw, x, y, value, size, colour):
    draw.text((x, y), value, font=font(size), anchor="mm", fill=colour, stroke_width=0)


def mascot_face():
    image = Image.new("RGB", (768,256), BLUE)
    d = ImageDraw.Draw(image)
    d.ellipse((34,39,350,279),fill="#eee9d8")
    d.ellipse((38,41,346,263),fill="#fff7e7")
    for side in (-1,1):
        for y,tip in [(115,94),(130,128),(145,163)]:
            d.line((192+side*33,y,192+side*100,tip),fill="#393545",width=3)
    d.line((192,106,192,161),fill="#42333a",width=3)
    d.chord((116,111,268,211),13,167,fill="#75353b",outline="#433438",width=3)
    d.pieslice((147,166,237,208),0,180,fill="#df8071")
    return image


def shirt_panel(style, colour):
    image = Image.new("RGB", (768, 256), colour)
    d = ImageDraw.Draw(image)
    if style in ("hust-tee", "hust-jacket"):
        jacket = style == "hust-jacket"
        d.rectangle((0, 0, 768, 63 if jacket else 19), fill=RED)
        if jacket:
            d.polygon([(70, 35), (315, 35), (290, 88), (94, 120)], fill=RED)
            d.line((192, 0, 192, 255), fill=NAVY, width=4)
            for x, sign in [(130, -1), (254, 1)]:
                d.line((x, 182, x+sign*20, 217), fill=NAVY, width=5)
        else:
            label(d, 192, 138, "HUST", 35, WHITE)
        x = 237
        d.polygon([(x-15, 56), (x+15, 56), (x+13, 82), (x, 93), (x-13, 82)],
                  fill=RED if jacket else WHITE, outline=WHITE, width=2)
        label(d, x, 71, "BK", 14, WHITE if jacket else RED)
        label(d, 576, 102, "HUST", 41, RED if jacket else WHITE)
        label(d, 576, 140, "BÁCH KHOA HÀ NỘI", 14, NAVY if jacket else WHITE)
    elif style == "manchester-united":
        for x in (0, 366, 750):
            d.polygon([(x, 0), (x+20, 0), (x+36, 256), (x, 256)], fill="#862032")
        d.polygon([(152, 0), (232, 0), (192, 48)], fill=WHITE)
        d.polygon([(162, 0), (222, 0), (192, 35)], fill=INK)
        d.polygon([(218, 60), (253, 60), (251, 86), (236, 100), (221, 87)], fill=GOLD)
        label(d, 236, 75, "MU", 18, RED)
        label(d, 192, 131, "UNITED", 31, WHITE)
        label(d, 576, 72, "MAN UTD", 24, WHITE)
        label(d, 576, 163, "7", 106, WHITE)
    elif style == "skt-t1":
        for x in (0, 366, 740):
            d.polygon([(x-26, 0), (x+70, 0), (x+25, 155), (x, 214)], fill=RED)
        d.polygon([(117, 86), (170, 97), (168, 105), (127, 99)], fill=WHITE)
        d.polygon([(131, 105), (167, 111), (164, 120), (141, 116)], fill=WHITE)
        label(d, 199, 114, "T1", 60, WHITE)
        label(d, 192, 171, "SK telecom", 20, WHITE)
        label(d, 576, 104, "SKT T1", 36, WHITE)
        d.line((527, 136, 625, 136), fill=RED, width=7)
    elif style == "goku":
        d.polygon([(130, 0), (251, 0), (183, 109)], fill="#213f85")
        for x, y, r in [(239, 87, 23), (576, 120, 62)]:
            d.ellipse((x-r, y-r, x+r, y+r), fill=WHITE, outline=INK, width=3)
            # Brush strokes for the 悟 emblem, scaled to each patch.
            for stroke in [[(-.69,-.25),(-.76,.09)],[(-.51,-.67),(-.51,.68)],[(-.38,-.3),(-.31,-.07)],
                           [(-.17,-.58),(.59,-.58)],[(.12,-.57),(-.04,-.03)],[(-.2,-.31),(.44,-.31),(.39,-.02)],
                           [(-.29,-.01),(.68,-.01)],[(-.14,.66),(-.14,.2),(.51,.2),(.51,.66),(-.14,.66)]]:
                d.line([(x+dx*r,y+dy*r) for dx,dy in stroke],fill=INK,width=max(2,round(r*.1)))
    elif style == "vegeta":
        for x in (192, 576):
            d.rounded_rectangle((x-82, 140, x+82, 252), radius=18, fill=GOLD)
            for y in (163, 187, 211, 235):
                d.line((x-71, y, x+71, y), fill="#b77f35", width=4)
            for sign in (-1, 1):
                d.line((x+sign*52, 0, x+sign*66, 79), fill=GOLD, width=18)
            d.line((x-82, 99, x-35, 121, x, 112, x+35, 121, x+82, 99), fill="#b3c1d1", width=4)
    elif style == "fox-cosplayer":
        d.polygon([(128, 0), (162, 0), (256, 176), (235, 176)], fill=RED)
        d.polygon([(225, 0), (255, 0), (145, 192), (117, 192)], fill=RED)
    elif style == "nobita":
        d.polygon([(117, 0), (192, 19), (158, 62)], fill=WHITE)
        d.polygon([(267, 0), (192, 19), (225, 62)], fill=WHITE)
    elif style == "witch-cosplayer":
        d.polygon([(112, 0), (272, 0), (192, 83)], fill="#67519b")
        d.polygon([(192, 58), (198, 74), (212, 77), (201, 87), (204, 102),
                   (192, 94), (179, 102), (182, 87), (171, 77), (186, 74)], fill=GOLD)
    elif style == "doraemon":
        d.ellipse((91, 8, 293, 252), fill=WHITE)
        d.chord((132, 89, 252, 216), 0, 180, fill=WHITE, outline=INK, width=4)
    return image


def atlas(style, colour):
    image = Image.new("RGB", (768, 528), "white")
    image.paste(mascot_face(), (0, 0))
    image.paste(shirt_panel(style, colour), (0, 260))
    # Painted tonal falloff on the blue dome and warm muzzle, including the side view.
    import numpy as np
    pixels = np.asarray(image,dtype=float).copy()
    for offset in (0,260):
        yy,xx = np.mgrid[0:256,0:768]
        side = np.cos((xx/768-.25)*2*np.pi)
        tone = .93+.055*side+.035*np.cos(yy/255*np.pi)
        pixels[offset:offset+256] *= tone[:,:,None]
    image = Image.fromarray(np.uint8(pixels.clip(0,255)))
    output = BytesIO()
    image.save(output, "PNG", optimize=True)
    return output.getvalue()
