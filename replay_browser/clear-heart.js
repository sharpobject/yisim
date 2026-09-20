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
    const result=[]; let color='#000000',bold=false;
    for(const piece of line.split(/(<color=#[0-9a-fA-F]+>|<\/color>|\[[^\]]+\])/g)) {
      if(piece.startsWith('<color=')) color=piece.slice(7,-1);
      else if(piece==='</color>') color='#000000';
      else if(piece.startsWith('[')) {const text=piece.slice(1,-1);result.push({text,bold:true,color:/^(Chase|再次行动)$/.test(text)?'#378E89':color});}
      else if(piece)result.push({text:piece,bold,color});
    }
    return result;
  }
  let context;
  function svg(model,data,lang='en') {
    context ||= document.createElement('canvas').getContext('2d');
    // Allow for glyph side bearings while keeping ink inside the native box.
    const nativeBox=data.layout[lang];
    const box={...nativeBox,x:nativeBox.x+2,width:nativeBox.width-4};
    function layout(size) {
      const rows=[];let y=0;
      context.font=`${size}px YxpCardRules`;
      const metrics=context.measureText(lang==='zh'?'获得防剑阵灵气':'ATK DEF Gain Qyp');
      const ascent=metrics.fontBoundingBoxAscent, descent=metrics.fontBoundingBoxDescent;
      const lineHeight=Math.max(size*box.lineHeight,ascent+descent);
      model.lines.forEach((line, paragraph)=>{
        let row=[],width=0;
        const finish=()=>{rows.push({tokens:row,width,y});y+=lineHeight;row=[];width=0;};
        for(const token of tokens(line)) {
          const chunks=lang==='zh'?Array.from(token.text):token.text.match(/\s+|[^\s]+/g)||[];
          for (const chunk of chunks) {
            context.font=`${token.bold?'bold ':''}${size}px YxpCardRules`;
            const w=context.measureText(chunk).width+Array.from(chunk).length*size*box.letterSpacing/100;
            if(width+w>box.width&&row.length)finish();
            if(!row.length&&!chunk.trim())continue;
            row.push({...token,text:chunk,width:w});width+=w;
          }
        }
        if(row.length)finish();
        if(paragraph<model.lines.length-1)y+=size*box.paragraphSpacing/100;
      });
      return {rows,height:y,ascent};
    }
    let size=box.maxFontSize,result=layout(size);
    while(size>box.minFontSize && (result.height>box.height||result.rows.some(r=>r.width>box.width))) {size=Math.max(box.minFontSize,size-.25);result=layout(size);}
    const top=box.y+(box.height-result.height)/2;
    const rows=result.rows.map(row=>{
      let x=box.x;
      return row.tokens.map(t=>{const text=`<text x="${x}" y="${top+row.y+result.ascent}" font-weight="${t.bold?'bold':'normal'}" fill="${t.color}">${escape(t.text)}</text>`;x+=t.width;return text;}).join('');
    }).join('');
    return `<svg class="clear-heart-rules" viewBox="0 0 ${data.size.join(' ')}" aria-label="${escape(model.lines.map(l=>tokens(l).map(t=>t.text).join('')).join('\n'))}" style="font-family:YxpCardRules;font-size:${size}px;letter-spacing:${size*box.letterSpacing/100}px" xmlns="http://www.w3.org/2000/svg">${rows}</svg>`;
  }
  const api={describe,tokens,svg};
  if(typeof module!=='undefined')module.exports=api;
  root.CLEAR_HEART=api;
})(typeof window==='undefined'?globalThis:window);
