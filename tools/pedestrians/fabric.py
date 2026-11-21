"""Project wardrobe art onto garment surfaces, preserving their baked shading."""

import numpy as np
from PIL import Image, ImageColor, ImageFilter

from textures import shirt_panel


def rgb(colour):
    return np.array(ImageColor.getrgb(colour),dtype=float)


def paint(model, style, base):
    xyz, pieces = model.surface()
    x,y,z = xyz.transpose(2,0,1)
    a = np.abs(x)
    cloth = pieces["shirt"]
    original = model.albedo.resize((1024,1024), Image.Resampling.LANCZOS)
    baked = np.asarray(original,dtype=float)
    detail = (baked-np.asarray(original.filter(ImageFilter.GaussianBlur(5)))).mean(axis=2)
    result = baked.copy()
    u = (.25+np.arctan2(x/.19,(z+.007)/.137)/(2*np.pi))%1
    top,bottom = (1.51,.82) if "pack" in pieces else (1.55,.84) if "hood" in pieces else (1.576,.87)
    v = ((top-y)/(top-bottom)).clip(0,1)
    art = np.asarray(shirt_panel(style,base))
    shirt = art[(v*255).astype(int),(u*767).astype(int)].astype(float)
    front = z>0
    arms = a>.211
    if style in ("hust-tee","manchester-united","skt-t1"):
        shirt[arms] = rgb(base)
        edge = np.abs(a-.325)<.012
        shirt[arms&edge] = rgb("#ece5d4" if style!="skt-t1" else "#bb3645")
        if style=="manchester-united":
            for start in (.174,.188,.202):
                stripe=(np.abs(y-(1.549-(a-start)*.71))<.004)&(a>.14)&(a<.32)&(z<.025)&(z>-.071)
                shirt[stripe]=rgb("#f0e8d4")
    if style=="hust-jacket":
        shirt[arms] = rgb("#ac2637")
        shirt[arms & (y<1.025)] = rgb("#4b4148")
    if style in ("goku","nobita","vegeta"):
        shirt[arms] = rgb({"goku":"#25477c","vegeta":"#324f91","nobita":base}[style])
    if style=="goku":
        seam = np.abs(x-(y-1.37)*.60)<.006
        shirt[seam & front & (y<1.46) & (y>1.09)] = rgb("#b34d29")
        shirt[arms & (y>1.395)] = rgb("#c96525")
        sash = (~arms)&(y>.947)&(y<1.033)
        shirt[sash]=rgb("#293f67")*(1+.09*np.cos(228*y[sash]))[:,None]
    if style=="fox-cosplayer":
        # Repeating woven wave crests, confined to the indigo sleeve panels.
        motif = np.abs(np.hypot((x*36)%1-.5, (y*28)%1)-.46)<.042
        shirt[arms] = rgb("#354d65")
        shirt[arms&motif] = rgb("#8796a0")
        shirt[arms&(y<1.015)] = rgb("#962f35")
    if style=="witch-cosplayer":
        shirt[arms] = rgb("#544961")
        shirt[arms & (np.abs(y-1.021)<.009)] = rgb("#c3a570")
    # Broad cloth tension at the ribcage and diagonal compression above the hem.
    folds = np.cos(47*x+13*v+.8*np.sin(24*y)) * (.017+.028*v)
    folds += .053*np.sin(62*y-15*a)*np.exp(-((v-.83)/.135)**2)
    folds -= .065*np.exp(-((a-.15)/.037)**2)*np.exp(-((v-.36)/.19)**2)
    hem = (np.abs(v-.955)<.004) | (np.abs(v-.968)<.003)
    folds -= hem*.1
    rows,cols = np.indices(y.shape)
    weave = ((cols+rows)%3==0)*1.4-((cols-rows)%4==0)*1.8
    result[cloth] = (shirt*(1+folds[:,:,None])+(detail*.65+weave)[:,:,None])[cloth]
    if "pack" in pieces:
        pack = pieces["pack"]
        result[pack] = (rgb("#564154")+(baked.mean(2)-73)[:,:,None]*.5)[pack]
    shoes = pieces["boots"]
    shoe_colour = {"goku":"#2a4774","vegeta":"#d8d5c9","manchester-united":"#553738",
                   "fox-cosplayer":"#513d41","witch-cosplayer":"#483742"}.get(style,"#667078")
    result[shoes] = (rgb(shoe_colour)+(detail*.95)[:,:,None])[shoes]
    result[shoes&(y<.023)] = rgb("#b4a38c")
    if style in ("nobita","goku","hust-tee","skt-t1"):
        skin = pieces["skin"]
        result[skin] = np.clip(baked[skin]*.87 + np.array([57,40,31]),0,255)
    if style=="goku":
        wrist=pieces["skin"]&(a>.51)&(a<.58)&(y<1.22)
        result[wrist]=rgb("#2a4579")
    if style=="vegeta":
        glove=pieces["skin"]&(a>.3)
        result[glove] = (rgb("#dbd9ce")+(detail*.65)[:,:,None])[glove]
        result[cloth&arms&(y<1.13)] = rgb("#d7d5cc")
    hair = pieces["hair"]
    tint = {"witch-cosplayer":"#735765","fox-cosplayer":"#825443"}.get(style,"#312c30")
    result[hair] = rgb(tint)+(baked[hair].mean(1)-48)[:,None]*.39
    return Image.fromarray(np.uint8(result.clip(0,255)))
