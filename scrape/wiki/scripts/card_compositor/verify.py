#!/usr/bin/env python3
"""Reconstruct every traced scene and compare it to the original renderer."""
import argparse,functools,json,multiprocessing,sys
from pathlib import Path
from PIL import Image,ImageChops,ImageStat

def reconstruct(n):
 op=n[0]
 if op=='i':return sprite(n[1]).copy()
 if op=='x':return reconstruct(n[3]).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 if op=='g':
  out=Image.new('RGBA',(n[1],n[2]))
  for x,y,c in n[3]:out.alpha_composite(reconstruct(c),(x,y))
  return out
 if op=='m':
  out=reconstruct(n[3]);out.putalpha(reconstruct(n[4]).getchannel('A'));return out
 if op=='t':
  im=reconstruct(n[7]);method=n[8] if len(n)>8 else 'magic_kernel_sharp_resample_translate'
  if method=='magic_kernel_shift_rgba':return R.magic_kernel_shift_rgba(im,n[5],n[6])
  if method=='magic_kernel_sharp_resize':return R.magic_kernel_sharp_resize(im,(n[1],n[2]))
  return R.magic_kernel_sharp_resample_translate(im,(n[1],n[2]),*n[3:7])
 raise ValueError(op)
@functools.lru_cache(maxsize=256)
def sprite(key):return Image.open(SOURCE/'sprites'/f'{key}.webp').convert('RGBA')
def check(p):
 scene=json.loads(p.read_text());actual=reconstruct(scene);ref=Image.open(SOURCE/'references'/f'{p.stem}.png').convert('RGBA')
 if actual.size!=ref.size:return p.stem,'wrong dimensions'
 # Compare composited colors, excluding irrelevant RGB under zero alpha.
 a=Image.new('RGBA',actual.size,'white');a.alpha_composite(actual)
 b=Image.new('RGBA',ref.size,'white');b.alpha_composite(ref)
 diff=ImageChops.difference(a,b);mean=max(ImageStat.Stat(diff).mean)
 return p.stem,mean

def main():
 global SOURCE,R
 ap=argparse.ArgumentParser();ap.add_argument('--repo',type=Path,required=True);ap.add_argument('--source',type=Path,required=True);ap.add_argument('--jobs',type=int,default=32);a=ap.parse_args();SOURCE=a.source
 sys.path.insert(0,str(a.repo/'scrape'));import render_rule_sky_sword_formation as R
 paths=sorted((SOURCE/'cards').glob('*.json'));results=[]
 with multiprocessing.get_context('fork').Pool(a.jobs) as pool:
  for result in pool.imap_unordered(check,paths,chunksize=4):
   results.append(result)
   if isinstance(result[1],str) or result[1]>.01:print(result,flush=True)
   elif len(results)%500==0:print('verified',len(results),flush=True)
 (SOURCE/'verification.json').write_text(json.dumps(results))
 print('total',len(results),'nonzero',sum(v!=0 for _,v in results),'max',max(v for _,v in results))
 if any(isinstance(v,str) or v>.02 for _,v in results):raise SystemExit('Component reconstruction differs from reference')
if __name__=='__main__':main()
