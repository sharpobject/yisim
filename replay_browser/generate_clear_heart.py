#!/usr/bin/env python3
"""Render native Clear Heart backgrounds with titles, but no rules text."""
import argparse, hashlib, json, math, subprocess, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scrape'))
import render_rule_sky_sword_formation as renderer
from clear_heart_typography import export_typography

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--asset-root',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);args=ap.parse_args()
 asset=args.asset_root.resolve();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
 cards={str(c['id']):c for c in json.loads((asset/'protobuf/CardConfig.json').read_text()) if c['id']>0 and c['id']-(c['id']//10000%100)*10000 in [19,126]}
 loc=json.loads((asset/'localization.json').read_text())['terms']
 terms={k:{lang:v.get(code,'') for lang,code in [('en','en'),('zh','zh-CN')]} for k,v in loc.items() if k.startswith(('TalentCardDesc_','TalentCardName_')) or k in ['CardName_19','CardName_126','CardExtraDesc_126']}
 ids=[92,10093,20093,10094,20094,30094,10095,20095,30095,10096,20096,30096]
 code='import {talentInfo} from "./scripts/decode_live_observation.mjs";console.log(JSON.stringify(Object.fromEntries('+json.dumps(ids)+'.map(id=>[id,talentInfo(id).otherParams]))))'
 talents=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
 # Base phase-ID variants can exist without forged talents. Native art starts at
 # Card_19_1; selected forging talents override phase and art in UpdateCardInfo.
 variants=[]
 for phase in sorted({c['level'] for c in cards.values() if c['id']%10000==19}):variants.append((f'embryo-{phase}-1',19,phase,'Card_19_1','CardName_19'))
 for phase in [2,3,4]:variants.append((f'embryo-{phase}-{phase}',19,phase,f'Card_19_{phase}','CardName_19'))
 for n,t in enumerate([10096,20096,30096],1):variants.append((f'embryo-5-5_{n}',19,5,f'Card_19_5_{n}',f'TalentCardName_{t}'))
 formation_ids=[126,10126,20126]
 for i in formation_ids:variants.append((f'formation-{cards[str(i)]["rarity"]}',i,5,'Card_19_1','CardName_126'))
 images={}
 for key,cardid,phase,sprite,title in variants:
  for lang in ['en','zh']:
   card={**cards[str(cardid)],'level':phase,'_new_card_name_cn':terms[title]['zh'],'_new_card_name_en':terms[title]['en']}
   if cardid % 10000 == 126:
    # CardItem.LoadIcon uses the fusion recipe before any sprite override.
    rows=json.loads((asset/'protobuf_raw_json/CardCombineConfig.raw.json').read_text())
    recipe=next({v['field']:v['value'] for v in row['value']} for row in rows if row['field']==2 and any(v['field']==3 and v['value']==126 for v in row['value']))
    art=renderer.mixed_card_art(recipe[1],recipe[2])
    sprite=f'fusion:{recipe[1]}+{recipe[2]}'
   else:
    art=Image.open(asset/'textures'/f'{sprite}.png').convert('RGBA')
   image=renderer.render_config_card(str(cardid),card,lang,skip_description=True,art_override=art)
   name=f'{key}_{lang}.webp';image.save(out/name,format='WEBP',lossless=True,method=6)
   images[name]={'phase':phase,'title':terms[title][lang],'sprite':sprite,'size':list(image.size),'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest()}
   print(name,flush=True)
 bleed=math.ceil(renderer.CARD_OUTPUT_BLEED_X_UI)
 font=renderer.default_tmp_font();layout={}
 for lang in ['en','zh']:
  rect=renderer.DESC_TEXT_DRAW_RECT_EN if lang=='en' else renderer.DESC_TEXT_DRAW_RECT_CJK
  layout[lang]={'x':rect.left+bleed,'y':rect.top,'width':rect.right-rect.left,'height':rect.bottom-rect.top,'maxFontSize':renderer.scaled_ui_font_size_float(renderer.DESC_FONT_SIZE_MAX_EN_UI if lang=='en' else renderer.DESC_FONT_SIZE_MAX_UI,1),'minFontSize':renderer.scaled_ui_font_size_float(renderer.DESC_FONT_SIZE_MIN_UI,1),'letterSpacing':renderer.DESC_CHARACTER_SPACING_EN if lang=='en' else renderer.DESC_CHARACTER_SPACING_CJK,'lineHeight':font.line_height/font.point_size,'paragraphSpacing':renderer.DESC_PARAGRAPH_SPACING}
 data={'cards':cards,'talents':talents,'terms':terms,'layout':layout,'size':[int(renderer.CARD_SIZE[0])+2*bleed,int(renderer.CARD_SIZE[1])],'formationLevels':True}
 export_typography(renderer,data,out)
 (out/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 (out/'data.js').write_text('window.CLEAR_HEART_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
 manifest={'sourceBuild':asset.name,'rendererSha256':hashlib.sha256(Path(renderer.__file__).read_bytes()).hexdigest(),'nativeSources':{name:hashlib.sha256((asset/'code/decompiled/DarkSun.HotUpdate'/name).read_bytes()).hexdigest() for name in ['Card_19.cs','Card_126.cs','ConfigExtension.cs']},'images':images,'glyphAtlases':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((out/'glyphs').glob('*.webp'))}}
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('Rendered',len(images),'blank-rule backgrounds with native SDF glyph atlases')
if __name__=='__main__':main()
