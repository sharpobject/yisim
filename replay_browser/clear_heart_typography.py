"""Export the wiki renderer's TMP metrics and SDF glyphs for browser composition."""
import json,math,re,hashlib
from pathlib import Path
from PIL import Image

def export_typography(renderer,data,out):
 r=renderer;f=r.default_tmp_font();metrics={'advances':{},'lineHeight':f.line_height/f.point_size,'boldSpaceExtra':r.DEFAULT_FONT_BOLD_SPACE_EXTRA_ADVANCE/r.DEFAULT_FONT_POINT_SIZE,'leading':''.join(sorted(r.TMP_LINE_BREAK_LEADING_CHARACTERS)),'following':''.join(sorted(r.TMP_LINE_BREAK_FOLLOWING_CHARACTERS)),'uiScale':r._scale()[1],'languages':{},'glyphs':{}}
 glyph_dir=out/'glyphs';glyph_dir.mkdir(exist_ok=True)
 for lang in ['en','zh']:
  styles={}
  for term in data['terms'].values():
   text=re.sub(r'\{[^}]+\}','0123456789',term[lang])
   for token in r.rich_text_display_chars(text):
    char=r.display_token(token)
    if char.isspace():continue
    color,b,s=r.token_style(token);bold=r.token_is_keyword(token);key=f'{char}|{int(bold)}|'+''.join(f'{c:02X}' for c in color);styles[key]=token
  for color in ['9D1022','9A6212','2C81BF','CF3521']:
   for char in '0123456789':styles[f'{char}|0|{color}']=f'[color:#{color}|{char}]'
  chars=set(k.split('|')[0] for k in styles)|{' '}
  metrics['advances'].update({c:f.text_width_float(c,1) for c in chars})
  rect=r.DESC_LAYOUT_RECT_EN if lang=='en' else r.DESC_LAYOUT_RECT_CJK
  metrics['languages'][lang]={'width':rect.right-rect.left,'height':rect.bottom-rect.top,'lineSpacing':r.desc_line_spacing(lang),'characterSpacing':r.desc_layout_character_spacing(lang),'maxSize':r.DESC_FONT_SIZE_MAX_EN_UI if lang=='en' else r.DESC_FONT_SIZE_MAX_UI,'minSize':r.DESC_FONT_SIZE_MIN_UI,'blockScale':r.DESC_BLOCK_SCALE_EN if lang=='en' else r.DESC_BLOCK_SCALE_CJK,'glyphScale':r.DESC_GLYPH_SCALE_EN if lang=='en' else r.DESC_GLYPH_SCALE_CJK}
  normal,bold=r.desc_face_dilates(lang);dn,db=r.desc_sdf_distance_scales(lang)
  kwargs=dict(normal_face_dilate=normal,bold_face_dilate=bold,sdf_distance_scale_normal=dn,sdf_distance_scale_bold=db)
  metrics['glyphs'][lang]={}
  for size in range(21,37):
   pad=max(4,round(size*.25));baseline=pad+round(27*size/f.point_size)
   probe=f.render_rich_line(['ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789御空剑阵禦空劍陣防灵气靈氣造成伤害傷害卡组組再次行动動'],size,metrics['languages'][lang]['characterSpacing'],shader_font_size=size,trim=False,**kwargs)
   pb=probe.getbbox();atlas=Image.new('RGBA',(512,2048));x=y=rowh=0;glyphs={}
   for key,token in sorted(styles.items()):
    im=r.rich_line_image([token],f,size,metrics['languages'][lang]['characterSpacing'],shader_font_size=size,trim=False,glyph_scale=metrics['languages'][lang]['glyphScale'],**kwargs)
    box=im.getbbox()
    if not box:continue
    crop=im.crop(box)
    if x+crop.width+2>512:x=0;y+=rowh+2;rowh=0
    assert y+crop.height<2048
    atlas.alpha_composite(crop,(x,y));glyphs[key]=[x,y,crop.width,crop.height,box[0]-pad,box[1]-baseline]
    x+=crop.width+2;rowh=max(rowh,crop.height)
   atlas=atlas.crop((0,0,512,y+rowh));name=f'{lang}-{size}.webp';atlas.save(glyph_dir/name,format='WEBP',lossless=True,method=6)
   metrics['glyphs'][lang][str(size)]={'file':f'glyphs/{name}','size':list(atlas.size),'glyphs':glyphs,'probeTop':pb[1],'probeHeight':pb[3]-pb[1],'baseline':baseline}
  print('Exported native SDF glyphs',lang,flush=True)
 data['typography']=metrics
 return metrics
