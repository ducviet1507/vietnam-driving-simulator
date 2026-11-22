"""Verify the released landscape images in a browser, including all catalogue stops.

Requires Playwright for Python and a Chromium browser ("playwright install chromium"
or pass --browser with the path to an installed Chromium/Edge executable).
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

from pack_sight_surfaces import ROOT, stops


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


AUDIT = """async coordinates=>{
  const root='sight-landscapes/',book=await fetch(root+'index.json').then(r=>r.json());
  const slots=new Map(),pages=new Map(),counts=new Uint8Array(coordinates.length);
  const missing=new Uint8Array(coordinates.length),interpolation=new Float64Array(coordinates.length);
  for(const [tag,cells] of Object.entries(book))cells.forEach(([i,j],n)=>{
    const name=tag+'-'+Math.floor(n/32);
    slots.set((+tag.slice(4)*32+i)+','+(+tag.slice(1,3)*32+j),[name,n%32]);
    if(!pages.has(name))pages.set(name,[]);
  });
  coordinates.forEach(([lon,lat],id)=>{
    const west=Math.floor(lon*32),south=Math.floor(lat*32);
    const u=(lon-west/32)*3072-.5,v=((south+1)/32-lat)*3072-.5;
    const floorU=Math.floor(u),floorV=Math.floor(v),fx=u-floorU,fy=v-floorV;
    for(let j=0;j<2;j++)for(let i=0;i<2;i++){
      const x=floorU+i,y=floorV+j;
      const entry=slots.get((west+Math.floor(x/96))+','+(south-Math.floor(y/96)));
      if(!entry)continue;
      const [name,n]=entry;
      pages.get(name).push([id,(n%8)*96+(x+96)%96,Math.floor(n/8)*96+(y+96)%96,(i?fx:1-fx)*(j?fy:1-fy)]);
    }
  });
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  async function raster(path){
    const img=new Image();img.src=root+path;await img.decode();
    canvas.width=img.width;canvas.height=img.height;ctx.drawImage(img,0,0);
    return ctx.getImageData(0,0,img.width,img.height);
  }
  const band=n=>n<2?n:n<158?2:n<=178?3:n<204?4:5;
  async function checkWaterPage(name){
    const original=await raster(name+'-water.png'),encoded=await raster(name+'-water.webp');
    if(original.width!==encoded.width||original.height!==encoded.height)throw Error('Water dimensions differ '+name);
    const oldPixels=new Uint32Array(original.data.buffer),newPixels=new Uint32Array(encoded.data.buffer);
    for(let i=0;i<oldPixels.length;i++)if(oldPixels[i]!==newPixels[i])throw Error('Water pixel differs at '+name+' '+i);
    return oldPixels.length;
  }
  let samples=0,totalError=0,largest=0,land=0,waterPixels=0;
  for(const [name,anchors] of pages){
    waterPixels+=await checkWaterPage(name);
    const source=await raster(name+'.png'),packed=await raster(name+'.surface.webp');
    const a=source.data,b=packed.data;
    if(source.width!==packed.width||source.height!==packed.height)throw Error('Dimension mismatch '+name);
    for(let p=0;p<a.length;p+=4){
      const e=Math.abs((a[p]-b[p])*256+a[p+1]-b[p+1]);
      if(e>1||band(a[p+2])!==band(b[p+2])||a[p+3]!==b[p+3]||(a[p+2]<=1&&e))
        throw Error('Invalid elevation/coverage at '+name+' pixel '+p/4);
      largest=Math.max(largest,e);totalError+=e;land+=a[p+2]>1;
    }
    samples+=a.length/4;
    for(const [id,x,y,w] of anchors){
      const p=(y*source.width+x)*4,e=(a[p]-b[p])*256+a[p+1]-b[p+1];
      if(e)throw Error('Changed interpolation sample for '+coordinates[id]);
      counts[id]++;missing[id]|=a[p+2]===0;interpolation[id]+=w*e;
    }
  }
  const graph=(lon,lat)=>({mx:111320*Math.cos(lat*Math.PI/180),my:110900,
    geo(x,z){return [lon+x/this.mx,lat-z/this.my];},point(x,y){return {x:(x-lon)*this.mx,z:(lat-y)*this.my};}});
  const layer=createSightLandscapes(THREE);
  for(const [lon,lat] of [[105.840426,21.036771],[106.6999,10.7798],[103.8414,22.3332]]){
    const g=graph(lon,lat);await layer.load(g,0,0);
    const view=layer.prepare(g);layer.activate(view);
    if(!view.visible||view.elevation(0,0)===null)throw Error('Runtime page loading failed at '+[lon,lat]);
  }
  return {pages:pages.size,samples,waterPixels,maxHeightError:largest,meanHeightError:totalError/samples,meanLandError:totalError/land,
    inputAnchors:coordinates.length,coveredAnchors:counts.filter(n=>n===4).length,
    validAnchors:counts.filter((n,id)=>n===4&&!missing[id]).length,maxAnchorError:Math.max(...interpolation)};
}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', type=Path)
    args = parser.parse_args()
    handler = partial(QuietHandler, directory=str(ROOT / 'dist'))
    with ThreadingHTTPServer(('127.0.0.1', 0), handler) as server, sync_playwright() as pw:
        Thread(target=server.serve_forever, daemon=True).start()
        try:
            executable = args.browser or Path(pw.chromium.executable_path)
            browser = pw.chromium.launch(executable_path=str(executable) if executable.is_file() else None)
            page = browser.new_page()
            base = f'http://127.0.0.1:{server.server_port}/'
            page.route('**/surface-codec-qa', lambda route: route.fulfill(
                content_type='text/html', body='<!doctype html><title>Surface codec audit</title>'))
            page.goto(base + 'surface-codec-qa')
            page.add_script_tag(url=base+'three.min.js')
            page.add_script_tag(url=base+'sight-landscapes.js')
            print(json.dumps(page.evaluate(AUDIT, stops()), indent=2))
            browser.close()
        finally:
            server.shutdown()


if __name__ == '__main__':
    main()
