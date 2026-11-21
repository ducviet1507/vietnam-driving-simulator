'use strict';
// The catalogue keeps stable OSM IDs for saved trips. Bucket its positions so
// moving the render origin examines only nearby destinations.
(()=>{
  const atlas=window.VietnamTourism,grid=32,cells=new Map();
  atlas.byId=new Map();
  function index(site){
    atlas.byId.set(site.id,site);
    const key=Math.floor(site.lon*grid)+','+Math.floor(site.lat*grid);
    if(!cells.has(key))cells.set(key,[]);
    cells.get(key).push(site);
  }
  for(const site of atlas.entries)index(site);
  atlas.nearby=(lon,lat,dx,dy)=>{
    const found=[];
    for(let i=Math.floor((lon-dx)*grid);i<=Math.floor((lon+dx)*grid);i++)
      for(let j=Math.floor((lat-dy)*grid);j<=Math.floor((lat+dy)*grid);j++)
        for(const s of cells.get(i+','+j)||[])
          if(Math.abs(s.lon-lon)<=dx&&Math.abs(s.lat-lat)<=dy)found.push(s);
    return found;
  };
  // Local source already includes the full Atlas. Release assets are split by
  // position for driving and can be fetched in one request for national search.
  const requests=new Map();
  function once(file,load){
    if(!requests.has(file))requests.set(file,load().catch(error=>{requests.delete(file);throw error;}));
    return requests.get(file);
  }
  function loadTile(file){
    return once(file,async()=>{
      const response=await fetch(file);
      if(!response.ok)throw Error('Chưa tải được dữ liệu địa danh. Hãy thử lại.');
      const added=[];
      for(const [site,detail] of await response.json()){
        if(atlas.byId.has(site.id))continue;
        if(detail)window.VietnamSightDetails[site.id]=detail;
        index(site);atlas.entries.push(site);added.push(site);
      }
      atlas.onEntries?.(added);
    });
  }
  atlas.loadAll=async()=>{
    if(atlas.all&&!atlas.complete){await loadTile(atlas.all);atlas.complete=true;}
  };
  atlas.loadRegion=async(lon,lat)=>{
    const jobs=[];
    if(atlas.files&&!atlas.complete){
      for(let x=Math.floor(lon-.05);x<=Math.floor(lon+.05);x++)
        for(let y=Math.floor(lat-.05);y<=Math.floor(lat+.05);y++){
          const file=atlas.files[x+'_'+y];if(file)jobs.push(loadTile(file));
        }
    }
    for(const group of atlas.modelGroups||[]){
      if(!group.sites.some(s=>Math.abs(s.lon-lon)<.06&&Math.abs(s.lat-lat)<.06))continue;
      jobs.push(once(group.file,async()=>{
        const {default:sites}=await import('./'+group.file);
        for(let i=0;i<sites.length;i++)Object.assign(group.sites[i],sites[i]);
      }));
    }
    await Promise.all(jobs);
  };
})();
