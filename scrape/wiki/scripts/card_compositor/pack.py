#!/usr/bin/env python3
"""Pack referenced glyphs into shared lossless atlases and compact card recipes."""
import argparse,collections,gzip,hashlib,json,shutil,io,re
from pathlib import Path
from PIL import Image

def walk(n):
 if n[0]=='i':yield n[1]
 elif n[0]=='g':
  for _,_,child in n[3]:yield from walk(child)
 elif n[0]=='t':yield from walk(n[7])
 elif n[0]=='x':yield from walk(n[3])
 elif n[0]=='m':yield from walk(n[3]);yield from walk(n[4])
 else:raise ValueError(n[0])

def compact(n,ids):
 op=n[0]
 if op=='i':return ['i',ids[n[1]],n[2],n[3]]
 if op=='g':
  children=[[x,y,compact(c,ids)] for x,y,c in n[3] if not (c[0]=='g' and not c[3])]
  if len(children)==1 and children[0][:2]==[0,0]:
   c=children[0][2];size=c[2:4] if c[0]=='i' else c[1:3]
   if size==n[1:3]:return c
  return ['g',n[1],n[2],children]
 if op=='t':return n[:7]+[compact(n[7],ids)]+n[8:]
 if op=='x':return n[:3]+[compact(n[3],ids)]
 return n[:3]+[compact(n[3],ids),compact(n[4],ids)]

def main():
 ap=argparse.ArgumentParser();ap.add_argument('source',type=Path);ap.add_argument('output',type=Path);args=ap.parse_args();out=args.output
 out.mkdir(parents=True,exist_ok=True);(out/'s').mkdir(exist_ok=True);(out/'c').mkdir(exist_ok=True)
 scenes={p.stem:json.loads(p.read_text()) for p in sorted((args.source/'cards').glob('*.json'))}
 counts=collections.Counter();first={}
 for scene in scenes.values():
  for key in walk(scene):counts[key]+=1;first.setdefault(key,len(first))
 encoded_cache=args.source/'encoded';encoded_cache.mkdir(exist_ok=True)
 lossless=set(json.loads((args.source/'lossless.json').read_text())) if (args.source/'lossless.json').exists() else set()
 sprites={};small=set()
 for key in counts:
  p=args.source/'sprites'/f'{key}.webp'
  with Image.open(p) as im:
   w,h=im.size
   if w>100 or h>100:
    # Match the existing full-card WebP quality for texture layers; glyphs
    # remain lossless. Keep lossless whenever that is already smaller.
    cached=encoded_cache/(key+'-q92-m6.webp')
    if key in lossless:data=p.read_bytes()
    elif cached.exists():data=cached.read_bytes()
    else:
     encoded=io.BytesIO();im.save(encoded,format='WEBP',quality=92,method=6,exact=True)
     raw=p.read_bytes();data=min([raw,encoded.getvalue()],key=len);cached.write_bytes(data)
    digest=hashlib.sha256(data).hexdigest()[:24];name=f's/{digest}.webp'
    (out/name).write_bytes(data);sprites[key]=[name,0,0,w,h]
   else:small.add(key)
 groups=collections.defaultdict(list)
 for key in scenes:
  parts=key.rsplit('_',1);stem,lang=parts
  if stem.isdigit():
   id=int(stem);family=str(id-(id//10000%100)*10000)
  elif stem.startswith('KeYinCard_'):family='sigil-'+str(int(stem.split('_')[1])%10000)
  elif stem.startswith('heart-'):family='heart-'+stem.split('-')[1]
  else:family=stem
  groups[family+'_'+lang].append(key)
 maps={};atlas_count=0
 for family,keys in sorted(groups.items()):
  used=dict.fromkeys(sprite for key in keys for sprite in walk(scenes[key]) if sprite in small)
  mapping={};atlas=Image.new('RGBA',(256,512));x=y=rowh=0;pending=[]
  def finish():
   nonlocal atlas,x,y,rowh,pending,atlas_count
   if not pending:return
   im=atlas.crop((0,0,256,y+rowh+1));digest=hashlib.sha256(im.tobytes()).hexdigest()[:24];name=f's/{digest}.webp'
   cached=encoded_cache/(digest+'-atlas.webp')
   if (out/name).exists():pass
   elif cached.exists():shutil.copyfile(cached,out/name)
   else:im.save(out/name,format='WEBP',lossless=True,method=6,exact=True)
   if not cached.exists():shutil.copyfile(out/name,cached)
   for key,gx,gy,w,h in pending:mapping[key]=[name,gx,gy,w,h]
   atlas=Image.new('RGBA',(256,512));x=y=rowh=0;pending=[];atlas_count+=1
  for key in used:
   im=Image.open(args.source/'sprites'/f'{key}.webp').convert('RGBA');w,h=im.size
   if x+w+1>256:x=0;y+=rowh+2;rowh=0
   if y+h+1>512:finish()
   atlas.alpha_composite(im,(x,y));pending.append((key,x,y,w,h));x+=w+2;rowh=max(rowh,h)
  finish()
  for key in keys:maps[key]=mapping
 for key,scene in scenes.items():
  ids={asset:i for i,asset in enumerate(dict.fromkeys(walk(scene)))}
  recipe={'s':[maps[key].get(a) or sprites[a] for a in ids],'n':compact(scene,ids)}
  data=json.dumps(recipe,separators=(',',':')).encode()
  (out/'c'/f'{key}.json.gz').write_bytes(gzip.compress(data,mtime=0))
 summary={'cards':len(scenes),'sprites':len(counts),'glyphAtlases':atlas_count,'assetBytes':sum(p.stat().st_size for p in (out/'s').iterdir()),'recipeBytes':sum(p.stat().st_size for p in (out/'c').iterdir()),'keys':sorted(scenes)}
 (out/'manifest.json').write_text(json.dumps(summary,separators=(',',':')))
 print(json.dumps({k:v for k,v in summary.items() if k!='keys'},indent=2))
if __name__=='__main__':main()
