#!/usr/bin/env python3
"""Precompute immutable resampling operations; retain shared component layers."""
import argparse,hashlib,json,multiprocessing,sys,os
from pathlib import Path
import verify

def identity(n):return hashlib.sha256(json.dumps(n,separators=(',',':')).encode()).hexdigest()
def transforms(n):
 if n[0]=='t':yield n;return
 if n[0]=='g':
  for _,_,c in n[3]:yield from transforms(c)
 elif n[0]=='x':yield from transforms(n[3])
 elif n[0]=='m':yield from transforms(n[3]);yield from transforms(n[4])
def has_texture(n):
 if n[0]=='i':return max(n[2:4])>100
 if n[0]=='g':return any(has_texture(c) for _,_,c in n[3])
 if n[0]=='t':return has_texture(n[7])
 if n[0]=='x':return has_texture(n[3])
 if n[0]=='m':return has_texture(n[3])
 return False

def bake(n):
 token=identity(n);record=OUT/'baked'/f'{token}.json'
 if record.exists():return token,json.loads(record.read_text())
 image=verify.reconstruct(n);box=image.getchannel('A').getbbox()
 if box:
  image=image.crop(box);key=hashlib.sha256(str(image.size).encode()+image.tobytes()).hexdigest()[:24]
  target=OUT/'sprites'/f'{key}.webp'
  temp=target.with_suffix(f'.{os.getpid()}.tmp')
  image.save(temp,format='WEBP',lossless=True,method=6,exact=True);temp.replace(target)
  node=['g',n[1],n[2],[[box[0],box[1],['i',key,*image.size]]]]
  result={'node':node,'lossless':[] if has_texture(n) else [key]}
 else:result={'node':['g',n[1],n[2],[]],'lossless':[]}
 record.write_text(json.dumps(result));return token,result

def replace(n,results):
 op=n[0]
 if op=='t':return results[identity(n)]['node']
 if op=='g':return n[:3]+[[[x,y,replace(c,results)] for x,y,c in n[3]]]
 if op=='x':return n[:3]+[replace(n[3],results)]
 if op=='m':return n[:3]+[replace(n[3],results),replace(n[4],results)]
 return n

def main():
 global OUT
 ap=argparse.ArgumentParser();ap.add_argument('--repo',type=Path,required=True);ap.add_argument('--source',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--jobs',type=int,default=32);a=ap.parse_args();OUT=a.output.resolve()
 for part in ['sprites','cards','baked']:(OUT/part).mkdir(parents=True,exist_ok=True)
 for p in (a.source/'sprites').glob('*.webp'):
  target=OUT/'sprites'/p.name
  if not target.exists():target.symlink_to(p.resolve())
 if not (OUT/'references').exists():(OUT/'references').symlink_to((a.source/'references').resolve(),target_is_directory=True)
 verify.SOURCE=a.source;sys.path.insert(0,str(a.repo/'scrape'));import render_rule_sky_sword_formation
 verify.R=render_rule_sky_sword_formation
 scenes={p.name:json.loads(p.read_text()) for p in (a.source/'cards').glob('*.json')}
 unique={identity(n):n for scene in scenes.values() for n in transforms(scene)}
 results={}
 with multiprocessing.get_context('fork').Pool(a.jobs) as pool:
  for token,result in pool.imap_unordered(bake,unique.values(),chunksize=4):results[token]=result
 for name,scene in scenes.items():(OUT/'cards'/name).write_text(json.dumps(replace(scene,results),separators=(',',':')))
 (OUT/'lossless.json').write_text(json.dumps(sorted({k for r in results.values() for k in r['lossless']})))
 print(f'Precomputed {len(unique)} unique transforms across {len(scenes)} cards',flush=True)
if __name__=='__main__':main()
