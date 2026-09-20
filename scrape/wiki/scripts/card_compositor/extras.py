#!/usr/bin/env python3
"""Export sigil faces and dynamic Clear Heart backgrounds through the same tracer."""
import argparse,json,multiprocessing,sys
from pathlib import Path
from PIL import Image
from export import Trace,configure

def one(task):
 key,cardid,lang=task
 im=R.render_keyin_card(cardid,lang)
 (OUT/'cards'/f'{key}.json').write_text(json.dumps(T.scene(im),separators=(',',':')))
 with T.paused():im.save(OUT/'references'/f'{key}.png')
 return key

def main():
 global R,T,OUT
 ap=argparse.ArgumentParser();ap.add_argument('--repo',type=Path,required=True);ap.add_argument('--site',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--asset-root',type=Path);ap.add_argument('--jobs',type=int,default=16);a=ap.parse_args();OUT=a.output
 sys.path.insert(0,str(a.repo/'scrape'));import render_rule_sky_sword_formation as R
 R.LATEST_EXTRACTED_ASSET_ROOT=a.asset_root or a.repo/'scrape/extracted_assets/steam_20260712_build_24124964_depot_3201810419288361719'
 (OUT/'references').mkdir(parents=True,exist_ok=True)
 T=Trace(OUT);T.install(R)
 todo=[]
 for p in sorted({p.stem:p for ext in ['*.png','*.webp'] for p in (a.site/'assets/sigils').rglob(ext)}.values()):
  _,id,lang=p.stem.split('_');todo.append((p.stem,int(id),lang))
 with multiprocessing.get_context('fork').Pool(a.jobs) as pool:
  for key in pool.imap_unordered(one,todo,chunksize=4):print(key,flush=True)
 folder=a.site/'assets/recordings/clear-heart'
 if not (folder/'manifest.json').exists():return
 manifest=json.loads((folder/'manifest.json').read_text());data=json.loads((folder/'data.json').read_text())
 configure(R,a.repo/'scrape/extracted_assets'/manifest['sourceBuild'])
 for name,info in manifest['images'].items():
  key='heart-'+Path(name).stem;lang=Path(name).stem.rsplit('_',1)[1];phase=info['phase'];sprite=info['sprite']
  if name.startswith('formation-'):cardid=126+10000*int(name.split('-')[1].split('_')[0])
  else:cardid=19
  title_zh=manifest['images'][name.rsplit('_',1)[0]+'_zh.webp']['title']
  c={**data['cards'][str(cardid)],'level':phase,'_new_card_name_cn':title_zh,'_new_card_name_en':info['title']}
  art=R.mixed_card_art(*map(int,sprite.split(':')[1].split('+'))) if sprite.startswith('fusion:') else Image.open(R.TEXTURE_DIR/(sprite+'.png')).convert('RGBA')
  im=R.render_config_card(str(cardid),c,lang,skip_description=True,art_override=art)
  (OUT/'cards'/f'{key}.json').write_text(json.dumps(T.scene(im),separators=(',',':')))
  with T.paused():im.save(OUT/'references'/f'{key}.png')
  print(key,flush=True)
if __name__=='__main__':main()
