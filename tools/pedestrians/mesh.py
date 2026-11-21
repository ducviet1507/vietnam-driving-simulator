"""Bake coloured costume pieces into one animated, one-draw-call glTF skin."""

import json
import math
import struct


def rotated(x, y, z, lean, pitch):
    c, s = math.cos(lean), math.sin(lean)
    x, y = x*c-y*s, x*s+y*c
    c, s = math.cos(pitch), math.sin(pitch)
    return (x, y*c-z*s, y*s+z*c)


def linear_byte(srgb):
    value = srgb/255
    return round(255*(value/12.92 if value <= .04045 else ((value+.055)/1.055)**2.4))


class Figure:
    def __init__(self):
        self.nodes = []
        self.joints = {}
        self.origins = {}
        self.positions, self.normals, self.colours, self.uvs, self.bones, self.indices = [], [], [], [], [], []

    def joint(self, name, origin, parent=None):
        index = len(self.nodes)
        base = self.origins[parent] if parent else (0, 0, 0)
        self.joints[name], self.origins[name] = index, origin
        self.nodes.append(dict(name=name, translation=[a-b for a,b in zip(origin,base)]))
        if parent:
            self.nodes[self.joints[parent]].setdefault("children", []).append(index)

    def rings(self, bone, center, profile, colour, *, panel=None, sides=16, lean=0, pitch=0):
        """A profile lists ascending (height, x-radius, z-radius) sections in metres."""
        first = len(self.positions)
        origin = [a+b for a,b in zip(self.origins[bone], center)]
        rgb = tuple(linear_byte(int(colour[i:i+2],16)) for i in (1,3,5))
        for j,(y,rx,rz) in enumerate(profile):
            below, above = profile[max(0,j-1)], profile[min(len(profile)-1,j+1)]
            dy = above[0]-below[0]
            for i in range(sides+1):
                u = i/sides
                angle = math.tau*u-math.pi/2
                sx, cz = math.sin(angle), math.cos(angle)
                offset = rotated(rx*sx, y, rz*cz, lean, pitch)
                self.positions.append(tuple(a+b for a,b in zip(origin,offset)))
                nx, nz = sx*rz*dy, cz*rx*dy
                ny = -rz*(above[1]-below[1])*sx*sx-rx*(above[2]-below[2])*cz*cz
                length = math.sqrt(nx*nx+ny*ny+nz*nz) or 1
                self.normals.append(rotated(nx/length, ny/length, nz/length, lean, pitch))
                v = (profile[-1][0]-y)/(profile[-1][0]-profile[0][0])
                self.uvs.append((u,(panel+1+253*v)/528) if panel is not None else (.5, 522/528))
                self.colours.append(rgb+(255,))
                self.bones.append((self.joints[bone],0,0,0))
            if j:
                for i in range(sides):
                    a = first+(j-1)*(sides+1)+i
                    b = a+sides+1
                    self.indices.extend([a,a+1,b, a+1,b+1,b])

    def oval(self, bone, center, radii, colour, *, steps=8, **opts):
        rx,ry,rz = radii
        profile = []
        for j in range(steps+1):
            t = math.pi*j/steps
            r = max(.001, math.sin(t))
            profile.append((-ry*math.cos(t), rx*r, rz*r))
        self.rings(bone,center,profile,colour,**opts)

    def tube(self, bone, center, bottom, top, height, colour, **opts):
        rx,rz = bottom
        tx,tz = top
        self.rings(bone,center,[(-height/2,.001,.001),(-height/2+.002,rx,rz),
                                (height/2-.002,tx,tz),(height/2,.001,.001)],colour,**opts)

    def save(self, path, texture):
        data = bytearray()
        views, accessors, animations = [], [], []

        def view(raw):
            data.extend(bytes(-len(data)%4))
            views.append(dict(buffer=0, byteOffset=len(data), byteLength=len(raw)))
            data.extend(raw)
            return len(views)-1

        def accessor(rows, kind, component=5126, **meta):
            size = {"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT4":16}[kind]
            code = {5121:"B",5123:"H",5126:"f"}[component]
            pack = struct.Struct("<"+code*size).pack
            raw = b"".join(pack(*row) for row in rows)
            accessors.append(dict(bufferView=view(raw), componentType=component, type=kind, count=len(rows), **meta))
            return len(accessors)-1

        pos = self.positions
        attrs = dict(POSITION=accessor(pos,"VEC3",min=list(map(min,zip(*pos))),max=list(map(max,zip(*pos)))),
                     NORMAL=accessor(self.normals,"VEC3"), TEXCOORD_0=accessor(self.uvs,"VEC2"),
                     COLOR_0=accessor(self.colours,"VEC4",5121,normalized=True),
                     JOINTS_0=accessor(self.bones,"VEC4",5121),
                     WEIGHTS_0=accessor([(255,0,0,0)]*len(pos),"VEC4",5121,normalized=True))
        prim = dict(attributes=attrs, indices=accessor([(i,) for i in self.indices],"SCALAR",5123), material=0)
        inv = [(1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1) for x,y,z in self.origins.values()]
        skin = dict(joints=list(self.joints.values()), skeleton=0, inverseBindMatrices=accessor(inv,"MAT4"))

        def clip(name, duration, tracks):
            channels, samplers = [], []
            for bone, axis, keys in tracks:
                times = [(duration*i/(len(keys)-1),) for i in range(len(keys))]
                rots = []
                for degrees in keys:
                    angle = math.radians(degrees)*.5
                    q = [0,0,0,math.cos(angle)]
                    q[axis] = math.sin(angle)
                    rots.append(q)
                channels.append(dict(sampler=len(samplers),target=dict(node=self.joints[bone],path="rotation")))
                samplers.append(dict(input=accessor(times,"SCALAR",min=[0],max=[duration]),output=accessor(rots,"VEC4")))
            animations.append(dict(name=name,channels=channels,samplers=samplers))

        walk = [("chest",1,[-4,0,4,0,-4]), ("head",1,[3,0,-3,0,3])]
        for side, shift in (("L",0),("R",2)):
            for limb, values in [("thigh",[-24,0,24,0]),("shin",[4,7,15,43]),("arm",[20,0,-20,0])]:
                keys = values[shift:]+values[:shift]
                walk.append((limb+side,0,keys+keys[:1]))
        clip("walk",1.12,walk)
        clip("idle",2.6,[("chest",0,[0,1.8,0]),("head",1,[-2,2,-2])])
        clip("look_around",3.8,[("head",1,[-22,-16,22,16,-22]),("chest",1,[-4,4,-4])])
        clip("wave",1.45,[("armL",2,[132,145,132]),("elbowL",2,[36,4,36,4,36]),("head",2,[3,6,3])])
        image = view(texture)
        mesh_node = len(self.nodes)
        nodes = self.nodes+[dict(name=path.stem,mesh=0,skin=0)]
        doc = dict(asset=dict(version="2.0",generator="ViVu3D pedestrian workshop"),
                   scene=0,scenes=[dict(nodes=[0,mesh_node])],nodes=nodes, skins=[skin],
                   meshes=[dict(primitives=[prim])],animations=animations,
                   materials=[dict(pbrMetallicRoughness=dict(baseColorTexture=dict(index=0),metallicFactor=0,roughnessFactor=.88))],
                   textures=[dict(source=0)],images=[dict(bufferView=image,mimeType="image/png")],
                   bufferViews=views,accessors=accessors,buffers=[dict(byteLength=len(data))])
        metadata = json.dumps(doc,separators=(",",":")).encode()
        metadata += b" "*(-len(metadata)%4)
        data.extend(bytes(-len(data)%4))
        path.write_bytes(struct.pack("<4sII",b"glTF",2,28+len(metadata)+len(data))+
                         struct.pack("<I4s",len(metadata),b"JSON")+metadata+
                         struct.pack("<I4s",len(data),b"BIN\0")+data)
