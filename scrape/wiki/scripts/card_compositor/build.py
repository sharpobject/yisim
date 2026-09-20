#!/usr/bin/env python3
"""Regenerate and install shared cards after the ordinary wiki publication copy.

Keep ordinary rendering/signatures as the private incremental source cache.
The public tree is transformed only after complete export and packing succeed.
"""
import argparse,os,subprocess,sys,tempfile
from pathlib import Path

def main():
 ap=argparse.ArgumentParser();ap.add_argument('site',type=Path);ap.add_argument('--repo',type=Path,default=Path(__file__).resolve().parents[4]);ap.add_argument('--asset-root',type=Path);ap.add_argument('--legacy',choices=['all','webp','none'],default='webp');ap.add_argument('--jobs',type=int,default=min(32,os.cpu_count() or 1));a=ap.parse_args()
 here=Path(__file__).resolve().parent;cache=a.repo/'scrape/wiki/.card-components';cache.mkdir(parents=True,exist_ok=True)
 for name in ['export.py','extras.py']:
  extra=['--references'] if name=='export.py' else (['--asset-root',str(a.asset_root)] if a.asset_root else [])
  subprocess.run([sys.executable,str(here/name),'--repo',str(a.repo),'--site',str(a.site),'--output',str(cache),'--jobs',str(a.jobs),*extra],check=True)
 subprocess.run([sys.executable,str(here/'verify.py'),'--repo',str(a.repo),'--source',str(cache),'--jobs',str(a.jobs)],check=True)
 with tempfile.TemporaryDirectory(prefix='card-components-',dir=cache) as out:
  subprocess.run([sys.executable,str(here/'pack.py'),str(cache),out],check=True)
  subprocess.run([sys.executable,str(here/'stage.py'),out,str(a.site),'--legacy',a.legacy],check=True)
if __name__=='__main__':main()
