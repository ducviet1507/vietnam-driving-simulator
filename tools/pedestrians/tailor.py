"""Dress the game's CC0 tevy rigs in bind space. Requires NumPy and Pillow."""

import hashlib
import io
import json
import struct

import numpy as np
from PIL import Image


# One picked vertex per UV-seamed but physically connected garment in each source GLB.
PIECES = {
    "road-worker": {"shirt":[4293], "trousers":[2986], "boots":[1962,2486],
                    "skin":[95,647,1225], "underlay":[0,1844,1893], "hair":[6935], "eyes":[7944,8004],
                    "vest":[5476], "helmet":[6264]},
    "hiker": {"shirt":[3824], "trousers":[2552], "boots":[1588,2068],
              "skin":[98,450,851], "underlay":[0,1256,1308], "hair":[6816], "eyes":[7721,7779],
              "pack":[5683], "straps":[6208,6518]},
    "casual-walker": {"shirt":[3876], "trousers":[2507], "boots":[1691,2094],
                      "skin":[93,633,1070], "underlay":[0,1512,1559], "hair":[6365], "eyes":[7655,7716],
                      "hood":[5916,6187,6241]},
}


def connected_pieces(points, faces, selections):
    unique, ids = np.unique(points, axis=0, return_inverse=True)
    parents = list(range(len(unique)))

    def root(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    for a,b,c in ids[faces]:
        a = root(a)
        parents[root(b)] = a
        parents[root(c)] = a
    labels = {root(ids[i]): name for name, picks in selections.items() for i in picks}
    return np.array([labels[root(i)] for i in ids])


def node_transform(node):
    x,y,z,w = node.get("rotation",(0,0,0,1))
    matrix = np.eye(4)
    matrix[:3,:3] = [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
                     [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
                     [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
    matrix[:3,3] = node.get("translation",(0,0,0))
    return matrix


class Tailor:
    def __init__(self, path):
        data = path.read_bytes()
        size = struct.unpack_from("<I",data,12)[0]
        self.doc = json.loads(data[20:20+size])
        self.source_uri = path.name
        self.source_length = len(data)
        self.source_digest = hashlib.sha256(data).hexdigest()
        self.bin_start = 28+size
        self.original = [memoryview(data)[self.bin_start+v.get("byteOffset",0):][:v["byteLength"]]
                         for v in self.doc["bufferViews"]]
        self.blocks = [bytearray(block) for block in self.original]
        self.primitive = self.doc["meshes"][0]["primitives"][0]
        self.attrs = self.primitive["attributes"]
        self.faces = self.array(self.primitive["indices"]).reshape(-1,3).copy()
        rig = self.doc["skins"][0]
        self.joints = [self.doc["nodes"][i]["name"] for i in rig["joints"]]
        hips = node_transform(self.doc["nodes"][rig["joints"][0]])
        decode = hips @ self.array(rig["inverseBindMatrices"])[0].reshape(4,4).T
        self.scale = decode[0,0]
        self.offset = decode[:3,3]
        raw = self.array(self.attrs["POSITION"])
        self.xyz = raw.astype(float)/32767*self.scale+self.offset
        self.parts = connected_pieces(np.round(self.xyz,4),self.faces,PIECES[path.stem])
        self.uv = self.array(self.attrs["TEXCOORD_0"])/65535.
        self.mat = self.doc["materials"][0]
        self.pbr = self.mat["pbrMetallicRoughness"]
        self.image = self.doc["images"][self.doc["textures"][self.pbr["baseColorTexture"]["index"]]["source"]]
        self.albedo = Image.open(io.BytesIO(self.blocks[self.image["bufferView"]])).convert("RGB")

    def array(self, index):
        a = self.doc["accessors"][index]
        v = self.doc["bufferViews"][a["bufferView"]]
        dtype = np.dtype({5120:"i1",5121:"u1",5122:"<i2",5123:"<u2",5125:"<u4",5126:"<f4"}[a["componentType"]])
        width = {"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT4":16}[a["type"]]
        return np.ndarray((a["count"],width),dtype,buffer=self.blocks[a["bufferView"]],
                          offset=a.get("byteOffset",0),strides=(v.get("byteStride",width*dtype.itemsize),dtype.itemsize))

    def attribute(self, rows, kind, component, **meta):
        data = np.ascontiguousarray(rows,dtype={5121:"u1",5123:"<u2",5126:"<f4"}[component])
        view = len(self.blocks)
        self.blocks.append(data.tobytes())
        self.doc["bufferViews"].append({"buffer":0})
        accessors = self.doc["accessors"]
        accessors.append(dict(bufferView=view,type=kind,componentType=component,count=len(data),**meta))
        return len(accessors)-1

    def omit(self, *pieces):
        self.faces = self.faces[~np.isin(self.parts[self.faces[:,0]],pieces)]

    def shape(self, style):
        xyz = self.xyz.copy()
        x,y,z = xyz.T
        if style not in ("nobita","vegeta"):
            return
        if style=="nobita":
            # Narrow the child's shoulders and shorten the shirt in proportion to his head.
            x *= 1-.16*np.clip((y-.9)/.45,0,1)
        if style=="vegeta":
            cloth = (self.parts=="shirt") & (np.abs(x)<.205)
            z[cloth] *= .86
        raw = self.array(self.attrs["POSITION"])
        # Edited positions can exceed the original signed-normalized quantization box.
        pos = (xyz-self.offset)/self.scale
        if np.abs(pos).max()>1.0001:
            self.attrs["POSITION"] = self.attribute(pos,"VEC3",5126,min=pos.min(0).tolist(),max=pos.max(0).tolist())
        else:
            raw[:] = np.round(pos*32767).clip(-32767,32767)
            a = self.doc["accessors"][self.attrs["POSITION"]]
            a.update(min=raw.min(0).tolist(),max=raw.max(0).tolist())

    def surface(self):
        """Rasterize bind-space coordinates onto the original UVs for print placement."""
        size = 1024
        xyz = np.zeros((size,size,3),np.float32)
        labels = np.zeros((size,size),np.uint8)
        names = sorted(set(self.parts))
        uvs = self.uv*size-.5
        for tri in self.faces:
            a,b,c = uvs[tri]
            lo = np.maximum(0,np.ceil(np.minimum(np.minimum(a,b),c))).astype(int)
            hi = np.minimum(size-1,np.floor(np.maximum(np.maximum(a,b),c))).astype(int)
            if np.any(hi<lo):
                continue
            dx,dy = b-a
            ex,ey = c-a
            det = dx*ey-dy*ex
            if abs(det)<1.e-7:
                continue
            ys,xs = np.mgrid[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
            s = ((xs-a[0])*ey-(ys-a[1])*ex)/det
            t = ((ys-a[1])*dx-(xs-a[0])*dy)/det
            hit = (s>=0)&(t>=0)&(s+t<=1)
            sy,sx = ys[hit],xs[hit]
            pa,pb,pc = self.xyz[tri]
            xyz[sy,sx] = pa+s[hit,None]*(pb-pa)+t[hit,None]*(pc-pa)
            labels[sy,sx] = names.index(self.parts[tri[0]])+1
        # Bleed several texels across UV seams to keep mipmapped prints continuous.
        for _ in range(5):
            for shift,axis in ((1,0),(-1,0),(1,1),(-1,1)):
                near = np.roll(labels,shift,axis)
                edge = (labels==0)&(near>0)
                xyz[edge] = np.roll(xyz,shift,axis)[edge]
                labels[edge] = near[edge]
        return xyz,{name:labels==i+1 for i,name in enumerate(names)}

    def props(self, figure):
        if not figure.positions:
            return
        pos = (np.array(figure.positions)-self.offset)/self.scale
        joints = np.array(figure.bones)
        joints[:,0] = [self.joints.index(list(figure.joints)[i]) for i in joints[:,0]]
        weights = np.zeros_like(joints)
        weights[:,0] = 255
        # The sides of a skirt follow the advancing thigh; the waist stays at the pelvis.
        for i,(x,y,z) in enumerate(figure.positions):
            bone = self.joints[joints[i,0]]
            if bone.startswith("calf_"):
                foot = np.clip((.15-y)/.075,0,1)
                hip = np.clip((y-.79)/.13,0,1)
                thigh = np.clip((y-.39)/.17,0,1)*(1-hip)
                joints[i,1:] = [self.joints.index("thigh_"+bone[-1]),self.joints.index("foot_"+bone[-1]),self.joints.index("hips")]
                weights[i,1:] = np.rint(255*np.array([thigh,foot,hip])).astype(int)
                weights[i,0] = 255-weights[i,1:].sum()
            if bone.startswith("thigh_"):
                w = round(255*np.clip((y-.81)/.16,0,1))
                joints[i,1] = self.joints.index("hips")
                weights[i,:2] = [255-w,w]
            if joints[i,0]==self.joints.index("hips") and y<.91:
                w = round(248*np.clip((.92-y)/.28,0,1))
                left = round(w*np.clip(.5+x/.12,0,1))
                joints[i,1:3] = [self.joints.index("thigh_L"),self.joints.index("thigh_R")]
                weights[i,:3] = [255-w,left,w-left]
        attrs = {"POSITION":self.attribute(pos,"VEC3",5126,min=pos.min(0).tolist(),max=pos.max(0).tolist()),
                 "NORMAL":self.attribute(figure.normals,"VEC3",5126),
                 "COLOR_0":self.attribute(figure.colours,"VEC4",5121,normalized=True),
                 "JOINTS_0":self.attribute(joints,"VEC4",5121),
                 "WEIGHTS_0":self.attribute(weights,"VEC4",5121,normalized=True)}
        self.doc["materials"].append({"name":"Dyed cloth and accessories","pbrMetallicRoughness":{"roughnessFactor":.96,"metallicFactor":0}})
        self.doc["meshes"][0]["primitives"].append(dict(attributes=attrs,indices=self.attribute(figure.indices,"SCALAR",5123),material=1))

    def save(self, path, colour, scale=1.0):
        self.primitive["indices"] = self.attribute(self.faces.reshape(-1),"SCALAR",5123)
        image = io.BytesIO()
        colour.resize((768,768),Image.Resampling.LANCZOS).save(image,"WEBP",method=6,quality=83)
        self.blocks[self.image["bufferView"]] = image.getvalue()
        self.image["mimeType"] = "image/webp"
        texture = self.doc["textures"][self.pbr["baseColorTexture"]["index"]]
        texture.setdefault("extensions",{})["EXT_texture_webp"] = {"source":texture.pop("source")}
        self.doc.setdefault("extensionsUsed",[]).append("EXT_texture_webp")
        self.doc.setdefault("extensionsRequired",[]).append("EXT_texture_webp")
        self.mat["normalTexture"]["scale"] = .72
        spec = "KHR_materials_specular"
        self.doc.setdefault("extensionsUsed",[]).append(spec)
        self.mat.setdefault("extensions",{})[spec] = {"specularFactor":.24}
        node = next(n for n in self.doc["nodes"] if "mesh" in n)
        node["name"] = path.stem
        scene = self.doc["scenes"][self.doc["scene"]]
        if scale!=1:
            self.doc["nodes"].append(dict(name="stature",scale=[scale]*3,children=scene["nodes"]))
            scene["nodes"] = [len(self.doc["nodes"])-1]
        data = bytearray()
        for i,(view,block) in enumerate(zip(self.doc["bufferViews"],self.blocks)):
            # A GLB can reference additional binary buffers. Share the immutable rig,
            # animation and texture slices already shipped for the ordinary pedestrians.
            if i<len(self.original) and block==self.original[i]:
                view.update(buffer=1,byteOffset=self.bin_start+view.get("byteOffset",0))
                continue
            data.extend(bytes(-len(data)%4))
            view.update(byteOffset=len(data),byteLength=len(block))
            data.extend(block)
        self.doc["buffers"] = [dict(byteLength=len(data)),dict(uri=self.source_uri,byteLength=self.source_length)]
        self.doc["asset"]["extras"] = {"sharedRigSha256":self.source_digest}
        meta = json.dumps(self.doc,separators=(",",":")).encode()
        meta += b" "*(-len(meta)%4)
        data.extend(bytes(-len(data)%4))
        path.write_bytes(struct.pack("<4sII",b"glTF",2,28+len(meta)+len(data))+
                         struct.pack("<I4s",len(meta),b"JSON")+meta+struct.pack("<I4s",len(data),b"BIN\0")+data)
