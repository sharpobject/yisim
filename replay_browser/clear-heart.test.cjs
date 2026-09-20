const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('./clear-heart.js'),data=require('./clear-heart/data.json');
const owner=(ids,counter)=>({talents:ids.map(id=>({id,runtime:id===92&&counter!=null?{kind:'fate counter',value:counter}:null}))});
const show=(id,ids,counter,lang='en')=>api.describe(id,owner(ids,counter),data,lang);
assert.equal(show(213,[],0),null);assert.equal(api.describe(19,null,data),null);
assert.equal(show(19,[92],18).config.attack,25);
assert.equal(show(19,[92,30096],18).config.attack,26);
assert.equal(show(19,[92,30096],null).config.attack,7,'Missing Swordsmith counter does not earn Ultimate bonus');
assert.equal(show(19,[20093,30094,20096],0).config.attack,1,'ATK is clamped');
for(const [id,def] of [[126,2],[10126,7],[20126,12]]){
 const m=show(id,[92,20093,20094,30095,30096],18);
 assert.equal(m.config.def,def);assert(m.lines.join('\n').includes('Cost 1 Qi:'));assert(!m.lines.join('\n').includes('Cost 2 Qi:'));
 assert(m.lines.join('\n').includes('Gain 1 stack'));assert.equal(m.config.attack,0);
}
const ultimate=show(19,[92,20093,20094,30095,30096],18);
assert.equal(ultimate.config.def,10);assert.equal(ultimate.config.attack,24);
assert(ultimate.lines.join('\n').includes('Cost 2 Qi:'));assert(ultimate.lines.join('\n').includes('Gain 2 stack'));
assert.equal(ultimate.title,'Clear Heart - Ultimate');
assert.equal(show(19,[10096]).title,'Unrestrained Sword - Clear Heart');
assert.equal(show(19,[20096]).title,'Cloud Sword - Clear Heart');
for(const lang of ['en','zh'])for(const id of Object.keys(data.cards))for(const ids of [[],[10093],[20093,10094],[20093,20094,20095],[10093,30094,30095,10096],[20093,20094,10095,20096],[20093,10094,30095,30096]]){
 const m=show(id,ids,0,lang);assert(fs.existsSync(path.join(__dirname,'clear-heart',`${m.background}_${lang}.webp`)));assert(!m.lines.join('').includes('{'));
}
const prior=show(19,[92,10093],3),current=show(19,[92,10093,10094],7);
assert.equal(prior.config.attack,13);assert.equal(current.config.attack,17);assert.equal(prior.background,'embryo-2-2');assert.equal(current.background,'embryo-3-3');
console.log('PASS: Clear Heart talents, counter presence, Ultimate, Formation levels/inheritance, owner isolation, bilingual backgrounds');
