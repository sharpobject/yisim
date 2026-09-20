#!/usr/bin/env python3
"""Install a validated component bundle into an existing generated wiki tree."""
import argparse,gzip,hashlib,json,re,shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parent
RUNTIME=['cards.js','worker.js','render.js','resample.js']

def key_for(url):
 for pattern,prefix in [(r'/assets/cards/(-?\d+_(?:en|zh))\.(?:png|webp)',''),(r'/assets/sigils/(?:en|zh)/(KeYinCard_\d+_(?:en|zh))\.(?:png|webp)',''),(r'/clear-heart/((?:embryo|formation)-[^/]+_(?:en|zh))\.webp','heart-')]:
  match=re.search(pattern,url)
  if match:return prefix+match[1]
 return None

def placeholder(key):
 w,h=(352,620) if key.startswith('KeYinCard_') else (308,508)
 return f'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22{w}%22 height=%22{h}%22/%3E'

def stage(bundle,site,legacy='webp'):
 manifest=json.loads((bundle/'manifest.json').read_text());keys=set(manifest['keys'])
 h=hashlib.sha256()
 for p in sorted(bundle.rglob('*')):
  if p.is_file():h.update(str(p.relative_to(bundle)).encode());h.update(p.read_bytes())
 for name in RUNTIME:h.update((ROOT/name).read_bytes())
 version=h.hexdigest()[:16];destination=site/'assets/card-components'/version
 if not destination.exists():shutil.copytree(bundle,destination)
 for name in RUNTIME:shutil.copyfile(ROOT/name,destination/name)
 loader=f'/yxp_wiki/assets/card-components/{version}/cards.js'
 changed=references=0
 for path in site.rglob('*.html'):
  old=path.read_text();body=old
  def image(match):
   nonlocal references
   tag=match[0];src=re.search(r'\bsrc="([^"]*)"',tag)
   if not src:return tag
   existing=re.search(r'\bdata-card-key="([^"]*)"',tag)
   key=existing[1] if existing else key_for(src[1])
   if key is None:return tag
   if key not in keys:
    if key in ['-1_en','-1_zh']:return tag
    raise ValueError(f'Missing component recipe {key}: {path}')
   references+=1
   tag=tag[:src.start(1)]+placeholder(key)+tag[src.end(1):]
   if not existing:tag=tag.replace('<img','<img data-card-key="'+key+'"',1)
   return tag
  body=re.sub(r'<img\b[^>]*>',image,body,flags=re.S)
  body=re.sub(r'(assets/tier-list/tier-list\.mjs)(?:\?[^\"]*)?',r'\1?v='+version,body)
  body=re.sub(r'\s*<script data-card-components[^>]*></script>','',body)
  body=body.replace('</head>',f'  <script data-card-components src="{loader}"></script>\n</head>')
  if body!=old:path.write_text(body);changed+=1
 # Hotlinkers now use WebP. Preserve those exact URLs and remove obsolete
 # PNG aliases; wiki readers load component recipes instead of either copy.
 removed=0
 if legacy!='all':
  for folder in [site/'assets/cards',site/'assets/sigils',site/'assets/recordings/clear-heart']:
   if not folder.exists():continue
   extensions=['*.png'] if legacy=='webp' else ['*.png','*.webp']
   for extension in extensions:
    for path in list(folder.rglob(extension)):
     if key_for('/'+str(path.relative_to(site))) in keys:path.unlink();removed+=1
 (site/'assets/card-components/active.json').write_text(json.dumps({'version':version,'script':loader,'legacy':legacy}))
 result={'version':version,'pagesChanged':changed,'staticCardReferences':references,'legacy':legacy,'removedFiles':removed,'bundle':str(destination)}
 print(json.dumps(result,indent=2));return result

def main():
 ap=argparse.ArgumentParser();ap.add_argument('bundle',type=Path);ap.add_argument('site',type=Path);ap.add_argument('--legacy',choices=['all','webp','none'],default='webp');a=ap.parse_args();stage(a.bundle,a.site,a.legacy)
if __name__=='__main__':main()
