/* Native Card_19/Card_126 display rules. Owner must be the snapshot being shown. */
(function(root) {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function describe(id, owner, data, lang = 'en') {
    if (!owner || !data.cards[id]) return null;
    const c = {...data.cards[id]}, embryo = Number(id) % 10000 === 19;
    const talents = new Map((owner.talents || []).map(t => [Number(t.id ?? t), t]));
    const has = n => talents.has(n), p = (n, i=0) => data.talents[n][i];
    const term = key => data.terms[key][lang];
    const bonus = embryo && has(30096) ? 1 : 0;
    let sprite = '1', name = embryo ? 'CardName_19' : 'CardName_126';
    let lines = [term(embryo ? 'TalentCardDesc_93' : 'TalentCardDesc_20093')];
    const add = (n, value, red=false, suffix='') => lines.push(term(`TalentCardDesc_${n}${suffix}`).replaceAll('{otherParams[0]}', red ? `<color=#9D1022>${value}</color>` : String(value)));
    if (embryo) {
      const counter = talents.get(92)?.runtime?.value;
      if (counter != null) c.attack += Number(counter) + bonus;
      if (has(10093)) { c.attack += p(10093); c.level=2; sprite='2'; }
      if (has(20093)) { c.attack -= p(20093); c.def=p(20093,1)+bonus; c.level=2; sprite='2'; add(20093); }
    }
    for (const n of [10094,20094,30094,10095,20095,30095]) {
      if (!has(n)) continue;
      if (embryo) { c.level=n%100===94?3:4; sprite=String(c.level); }
      if (n===30094) { c.attack-=p(n,1); c.jianYi=p(n)+bonus; add(n); }
      else if (n===10095) { c.anima=p(n)+bonus; add(n); }
      else add(n,p(n)+bonus,n===10094||n===30095,n===30095&&bonus?'_wuji':'');
    }
    if (embryo) {
      for (const [n,s] of [[10096,'5_1'],[20096,'5_2'],[30096,'5_3']]) {
        if (!has(n)) continue;
        c.level=5; sprite=s; name=`TalentCardName_${n}`;
        if(n!==30096) { c.attack+=(n===10096?1:-1)*p(n,1); add(n,p(n)); }
      }
      c.attack=Math.max(1,c.attack);
    } else lines.push(term('CardExtraDesc_126'));
    const colors={attack:'#9D1022',def:'#9A6212',anima:'#2C81BF',jianYi:'#CF3521'};
    lines=lines.map(s=>s.replace(/\{(attack|def|anima|jianYi)\}/g,(_,k)=>`<color=${colors[k]}>${c[k]}</color>`).replaceAll('{otherParams[0]}',String(c.otherParams[0])));
    return {config:c,title:term(name),background:embryo?`embryo-${c.level}-${sprite}`:`formation-${c.rarity}`,lines};
  }
  function tokens(line) {
    const result=[]; let color='#3D3935',bold=false;
    for(const piece of line.split(/(<color=#[0-9a-fA-F]+>|<\/color>|\[[^\]]+\])/g)) {
      if(piece.startsWith('<color=')) color=piece.slice(7,-1);
      else if(piece==='</color>') color='#3D3935';
      else if(piece.startsWith('[')) {const text=piece.slice(1,-1);result.push({text,bold:true,color:/^(Chase|再次行动)$/.test(text)?'#378E89':color});}
      else if(piece)result.push({text:piece,bold,color});
    }
    return result;
  }
  // Port of the wiki renderer's TMP character-state wrapping and 0.05-point fitting.
  function layout(model,data,lang='en') {
    const t=data.typography,p=t.languages[lang],space=c=>/^\s$/u.test(c.text);
    const chars=line=>tokens(line).flatMap(token=>Array.from(token.text,text=>({...token,text})));
    const advance=(c,size)=>{const a=t.advances[c.text];if(a==null)throw Error(`Missing native glyph metric: ${c.text}`);return (a+(c.bold&&c.text===' '?t.boldSpaceExtra:0))*size};
    const width=(row,size)=>row.reduce((n,c)=>n+advance(c,size),0)+Math.max(0,row.length-1)*size*p.characterSpacing/100;
    const trim=row=>{while(row.length&&space(row[0]))row.shift();while(row.length&&space(row.at(-1)))row.pop();return row};
    const cjk=c=>{const n=c?.codePointAt(0)||0;return n>0x1100&&n<0x1200||n>0xa960&&n<0xa980||n>0xac00&&n<0xd7a0||n>0x2e80&&n<0xa000||n>0xf900&&n<0xfb00||n>0xfe30&&n<0xfe50||n>0xff00&&n<0xfff0};
    const mayBreak=(c,next)=>{if(!c||space(c))return false;if(c.text==='-'&&next&&/[\p{L}\p{N}]/u.test(next.text))return true;if(t.leading.includes(c.text)||next&&t.following.includes(next.text))return false;return cjk(c.text)};
    function wrap(size) {
      const rows=[];
      for(let paragraph=0;paragraph<model.lines.length;paragraph++){
        const input=chars(model.lines[paragraph]);let row=[],rowWidth=0,emit=-1,carry=-1;
        const save=(a,b)=>{emit=a;carry=b};
        const rebuild=()=>{emit=carry=-1;row.forEach((c,i)=>{if(space(c))save(i,i+1);else if(mayBreak(c,row[i+1]))save(i+1,i+1)})};
        const overflow=w=>{const hyphen=emit>0&&emit<=row.length&&row[emit-1].text==='-';return hyphen&&w>p.width-8||w>p.width+(lang==='en'&&!hyphen?.5:.0001)};
        input.forEach((c,i)=>{
          const a=advance(c,size),spacing=size*p.characterSpacing/100;
          while(row.length&&!space(c)&&overflow(rowWidth+spacing+a)){
            const line=trim(emit>=0?row.slice(0,emit):row.slice());if(line.length)rows.push({tokens:line,gap:false});
            row=emit>=0?row.slice(carry):[];rowWidth=width(row,size);rebuild();
          }
          if(!row.length&&space(c))return;
          rowWidth+=(row.length?spacing:0)+a;row.push(c);
          if(space(c))save(row.length-1,row.length);else if(mayBreak(c,input[i+1]))save(row.length,row.length);
        });
        row=trim(row);if(row.length)rows.push({tokens:row,gap:false});
        if(rows.length)rows.at(-1).gap=paragraph<model.lines.length-1;
      }
      return rows;
    }
    function fit(ui){const size=ui*t.uiScale,rows=wrap(size),lineHeight=Math.max(1,size*(t.lineHeight+p.lineSpacing/100)),gap=size*data.layout[lang].paragraphSpacing/100;const height=size*t.lineHeight+(rows.length-1)*lineHeight+rows.slice(0,-1).filter(r=>r.gap).length*gap;return {fontSize:size,rows,lineHeight,paragraphGap:gap,height,overflows:height>p.height+.0001||rows.some(r=>width(r.tokens,size)>p.width+(lang==='en'?.5:.0001))}}
    let min=p.minSize,max=p.maxSize,ui=max,result=fit(ui);const roundPoint=n=>Math.floor(n*20+.5)/20;
    for(let i=0;i<20;i++){
      if(result.overflows){if(ui<=p.minSize)break;max=ui;ui=Math.max(roundPoint(ui-Math.max((ui-min)/2,.05)),p.minSize)}
      else if(max-min>.051&&ui<p.maxSize){min=ui;ui=Math.min(roundPoint(ui+Math.max((max-ui)/2,.05)),p.maxSize)}
      else break;
      result=fit(ui);
    }
    return result;
  }
  const roundEven=n=>n%1===.5?2*Math.round(n/2):Math.round(n);
  function svg(model,data,lang='en',base='clear-heart') {
    const fit=layout(model,data,lang),t=data.typography,p=t.languages[lang],box=data.layout[lang];
    const size=roundEven(fit.fontSize),atlas=t.glyphs[lang][size],cx=box.x+box.width/2,cy=box.y+box.height/2;
    const offset=(box.height-fit.height)/2;
    let y=box.y+(offset<0?offset:Math.floor(offset));
    const baselineOffset=roundEven((fit.lineHeight-atlas.probeHeight)/2-atlas.probeTop)+atlas.baseline;
    const spacing=size*p.characterSpacing/100;
    const lines=fit.rows.map(row=>{
      const width=roundEven(row.tokens.reduce((n,c)=>n+t.advances[c.text]*size,0)+Math.max(0,row.tokens.length-1)*spacing);
      let x=cx-width/2;
      const glyphs=row.tokens.map(c=>{
        let markup='';
        if(c.text.trim()){
          const key=`${c.text}|${c.bold?1:0}|${c.color.slice(1).toUpperCase()}`,g=atlas.glyphs[key];
          if(!g)throw Error(`Missing native rendered glyph: ${key}`);
          markup=`<svg x="${x+g[4]}" y="${y+baselineOffset+g[5]}" width="${g[2]}" height="${g[3]}" viewBox="${g.slice(0,4).join(' ')}"><image href="${base}/${atlas.file}" width="${atlas.size[0]}" height="${atlas.size[1]}"/></svg>`;
        }
        x+=t.advances[c.text]*size+spacing;return markup;
      }).join('');
      y+=fit.lineHeight+(row.gap?fit.paragraphGap:0);return glyphs;
    }).join('');
    return `<svg class="clear-heart-rules" viewBox="0 0 ${data.size.join(' ')}" aria-label="${escape(model.lines.map(l=>tokens(l).map(t=>t.text).join('')).join('\n'))}" xmlns="http://www.w3.org/2000/svg"><g transform="translate(${cx} ${cy}) scale(${p.blockScale}) translate(${-cx} ${-cy})">${lines}</g></svg>`;
  }
  const api={describe,tokens,layout,svg};
  if(typeof module!=='undefined')module.exports=api;
  root.CLEAR_HEART=api;
})(typeof window==='undefined'?globalThis:window);
