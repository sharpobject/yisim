#!/usr/bin/env python3
"""Trace the existing card renderer into shared sprites and draw operations.

Rendering/layout remain owned by the wiki renderer. This exporter records its
compositing operations, including individual TMP glyphs, instead of replacing
its typography with browser fonts. Original pixels remain available as QA refs.
"""
import argparse, functools, hashlib, json, os, sys, multiprocessing
from pathlib import Path
from contextlib import contextmanager
from PIL import Image

KEY = '_card_scene'
class Trace:
    def __init__(self, output):
        self.output=Path(output);self.output.mkdir(parents=True,exist_ok=True)
        (self.output/'sprites').mkdir(exist_ok=True)
        self.enabled=True;self.assets={};self.original={}
    @contextmanager
    def paused(self):
        old=self.enabled;self.enabled=False
        try:yield
        finally:self.enabled=old
    def leaf(self, im):
        with self.paused():
            rgba=im.convert('RGBA');box=rgba.getbbox()
            if not box:return ['g',im.width,im.height,[]]
            crop=rgba.crop(box)
            key=hashlib.sha256(str(crop.size).encode()+crop.tobytes()).hexdigest()[:24]
            if key not in self.assets:
                path=self.output/'sprites'/f'{key}.webp'
                if not path.exists():
                    temp=path.with_suffix(f'.{os.getpid()}.tmp')
                    crop.save(temp,format='WEBP',lossless=True,method=4,exact=True);temp.replace(path)
                self.assets[key]=[crop.width,crop.height]
            leaf=['i',key,crop.width,crop.height]
            if box==(0,0,im.width,im.height):return leaf
            return ['g',im.width,im.height,[[box[0],box[1],leaf]]]
    def scene(self,im):return im.info.get(KEY) or self.leaf(im)
    def install(self,r):
        original_alpha=Image.Image.alpha_composite
        original_crop=Image.Image.crop
        original_transpose=Image.Image.transpose
        original_putalpha=Image.Image.putalpha
        original_open=Image.open
        tracer=self
        def alpha(im,other,dest=(0,0),source=(0,0)):
            if tracer.enabled:
                before=tracer.scene(im);child=tracer.scene(other)
                if source != (0,0):raise ValueError('Unexpected alpha source rectangle')
                entries=list(before[3]) if before[0]=='g' and before[1:3]==list(im.size) else [[0,0,before]]
                entries.append([int(dest[0]),int(dest[1]),child])
                with tracer.paused():result=original_alpha(im,other,dest,source)
                im.info[KEY]=['g',im.width,im.height,entries]
                return result
            return original_alpha(im,other,dest,source)
        def crop(im,box=None):
            result=original_crop(im,box)
            result.info.pop(KEY,None)
            if tracer.enabled and KEY in im.info:
                box=box or (0,0,im.width,im.height)
                result.info[KEY]=['g',result.width,result.height,[[-int(box[0]),-int(box[1]),im.info[KEY]]]]
            return result
        def transpose(im,method):
            result=original_transpose(im,method);result.info.pop(KEY,None)
            if tracer.enabled and KEY in im.info:
                if method!=Image.Transpose.FLIP_LEFT_RIGHT:raise ValueError(f'Unsupported artwork transform {method}')
                result.info[KEY]=['x',im.width,im.height,im.info[KEY]]
            return result
        def putalpha(im,alpha):
            scene=im.info.get(KEY) if tracer.enabled else None
            result=original_putalpha(im,alpha)
            if scene is not None:
                # Fusion uses opaque native masks. Preserve the masks separately.
                if not isinstance(alpha,Image.Image):raise ValueError('Unexpected scalar traced alpha')
                with tracer.paused():
                    mask=Image.new('RGBA',im.size,(255,255,255,255));original_putalpha(mask,alpha)
                im.info[KEY]=['m',im.width,im.height,scene,tracer.leaf(mask)]
            return result
        def open_image(fp,*args,**kwargs):
            im=original_open(fp,*args,**kwargs)
            if tracer.enabled and isinstance(fp,(str,Path)) and Path(fp).name.startswith(('Card_','KeYinCard_')):
                im.info[KEY]=tracer.leaf(im)
            return im
        Image.Image.alpha_composite=alpha;Image.Image.crop=crop
        Image.Image.transpose=transpose;Image.Image.putalpha=putalpha;Image.open=open_image
        for name in ['magic_kernel_sharp_resample_translate','magic_kernel_sharp_resize','magic_kernel_shift_rgba']:
            original=getattr(r,name)
            def wrapped(im,*args,_name=name,_original=original,**kwargs):
                scene=im.info.get(KEY) if tracer.enabled else None
                with tracer.paused():result=_original(im,*args,**kwargs)
                result.info.pop(KEY,None)
                if scene is not None:
                    if _name=='magic_kernel_sharp_resample_translate':
                        _,sx,sy,dx,dy=args
                    elif _name=='magic_kernel_sharp_resize':
                        sx,sy=result.width/im.width,result.height/im.height;dx=dy=0
                    else:sx=sy=1;dx,dy=args
                    result.info[KEY]=['t',result.width,result.height,sx,sy,dx,dy,scene,_name]
                return result
            setattr(r,name,wrapped)


def configure(r,root):
    r.TEXTURE_DIR=root/'textures';r.ASSET_ROOT=root
    if (root/'fonts').exists():r.FONT_DIR=root/'fonts';r.FONT_PATH=r.FONT_DIR/'DefaultFont.otf'
    r.HUIWEN_ATLAS_PATH=r.TEXTURE_DIR/'Huiwen SDF Atlas.png'
    r.DEFAULT_ATLAS_PATH=r.TEXTURE_DIR/'DefaultFont SDF Atlas.png'
    r.FUSION_LINE_TEXTURE=r.TEXTURE_DIR/'Img_卡牌融合.png'
    r._DEFAULT_TMP_FONT=None;r._HUIWEN_TMP_FONT=None



def export_one(path):
    global last_root
    r,trace,args=WORKER
    if (args.output/'cards'/path.name).exists() and (args.output/'stamps'/path.name).exists() and (args.output/'stamps'/path.name).read_text()==hashlib.sha256(args.generation+path.read_bytes()).hexdigest():return path.stem,'cached',0
    s=json.loads(path.read_text());root=args.repo/'scrape/extracted_assets'/s['texture_asset_root']
    if root!=last_root:configure(r,root);last_root=root
    c={**s['card_config'],'_new_card_name_cn':s.get('localized_name_zh') or json.loads(path.with_name(str(s['card_id'])+'_zh.json').read_text())['localized_name'],'_new_card_name_en':s['localized_name']}
    if s.get('dream_name_render'):c['subcategory']=14
    if s.get('fusion_ingredients'):c['_new_card_fusion_ingredients']=s['fusion_ingredients']
    art=Image.open(r.TEXTURE_DIR/'Card_0.png').convert('RGBA') if s.get('art_override') else None
    im=r.render_config_card(str(s['card_id']),c,s['lang'],description_override=s['localized_description'],art_override=art)
    scene=trace.scene(im)
    (args.output/'cards'/f'{path.stem}.json').write_text(json.dumps(scene,ensure_ascii=False,separators=(',',':')))
    if args.references:
        with trace.paused():im.save(args.output/'references'/f'{path.stem}.png')
    (args.output/'stamps'/path.name).write_text(hashlib.sha256(args.generation+path.read_bytes()).hexdigest())
    return path.stem,len(json.dumps(scene)),len(trace.assets)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--repo',type=Path,required=True);ap.add_argument('--site',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);ap.add_argument('--keys',nargs='*');ap.add_argument('--references',action='store_true');ap.add_argument('--jobs',type=int,default=1);args=ap.parse_args()
    sys.path.insert(0,str(args.repo/'scrape'))
    import render_rule_sky_sword_formation as r
    args.generation=Path(__file__).read_bytes()+Path(r.__file__).read_bytes()
    (args.output/'stamps').mkdir(parents=True,exist_ok=True)
    trace=Trace(args.output);trace.install(r)
    # Native priority: sect, career, artifact, pet, no mark. Dream omits it.
    original_emblem=r.bottom_emblem_for
    def emblem(c):
        found=original_emblem(c)
        if found is not None or int(c['sect']) or int(c['career']):return found
        mark={2:'Icon_机缘底纹_01.png',3:'Icon_机缘底纹_02.png'}.get(int(c['subcategory']))
        return Image.open(r.TEXTURE_DIR/mark).convert('RGBA') if mark else None
    r.bottom_emblem_for=emblem
    paths=[args.site/'assets/cards'/f'{key}.json' for key in args.keys] if args.keys else sorted((args.site/'assets/cards').glob('*.json'))
    (args.output/'cards').mkdir(exist_ok=True)
    if args.references:(args.output/'references').mkdir(exist_ok=True)
    global WORKER,last_root
    WORKER=(r,trace,args);last_root=None
    if args.jobs>1:
        with multiprocessing.get_context('fork').Pool(args.jobs) as pool:
            for result in pool.imap_unordered(export_one,paths,chunksize=4):print(*result,flush=True)
    else:
        for path in paths:print(*export_one(path),flush=True)
    (args.output/'assets.json').write_text(json.dumps(trace.assets,separators=(',',':')))
if __name__=='__main__':main()
