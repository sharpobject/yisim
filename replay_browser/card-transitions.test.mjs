import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./replay-browser.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  function cardTransition('),source.indexOf('  function transitionCard(')),context);
const state=(deck,hand,round=1,uid='p')=>({round,privatePlayer:{uid,deck,hand}});
const run=(before,after,kind,extra={})=>JSON.parse(JSON.stringify(context.cardTransition(before,after,{humanActions:[{kind}],...extra})));
const count=(result,zone,change)=>result[zone].filter(x=>x.change===change).map(x=>x.id);
let r=run(state([],[1,1,2]),state([],[1,2,3]),'exchange');
assert.deepEqual(count(r,'hand','appear'),[3]);assert.deepEqual(count(r,'hand','leaving'),[1]);
r=run(state([0],[1,2]),state([1],[2]),'move');
assert.deepEqual(count(r,'deck','appear'),[1]);assert.deepEqual(count(r,'hand','leaving'),[1]);
r=run(state([1,2],[]),state([2,1],[]),'rearrange');
assert.deepEqual(count(r,'deck','appear'),[2,1]);assert.deepEqual(r.hand,[]);assert.equal(r.deckPrevious,null);assert.equal(r.deck.length,2);
r=run(state([1],[2]),state([0],[2,1]),'move');
assert.deepEqual(r.deck[0],{id:1,change:'leaving'});assert.equal(r.deckPrevious,null);assert.deepEqual(count(r,'hand','appear'),[1]);
r=run(state([],[1,1,2]),state([],[2,10001]),'upgrade');
assert.deepEqual(count(r,'hand','leaving'),[1]);assert.deepEqual(count(r,'hand','appear'),[10001]);
r=run(state([1],[1,2]),state([10001],[2]),'upgrade');
assert.deepEqual(count(r,'hand','leaving'),[1]);assert.deepEqual(count(r,'deck','appear'),[10001]);assert.equal(r.deckPrevious,null);
r=run(state([],[1]),state([],[1,1]),'gain');assert.deepEqual(count(r,'hand','appear'),[1]);
for(const [before,after,kind,extra] of [
 [null,state([1],[2]),'move'],
 [state([1],[2]),state([2],[3],1,'q'),'move'],[state([1],[2]),state([2],[3]),'emote'],
 [state([1],[2]),state([2],[3]),'move',{battle:{}}],
 [state([1],[2]),state([1],[2]),'move']]){
 r=run(before,after,kind,extra);assert.ok([...r.deck,...r.hand].every(x=>!x.change));
}
console.log('PASS: duplicate-aware exchanges, moves, swaps, both combine locations, gains, and transition boundaries');

// Rearrangements never append history, even when both occupied slots change.
r=run(state([1,2],[]),state([2,1],[]),'rearrange',{humanActions:[{kind:'rearrange',textEnglish:'Player rearranged Card 2 from deck slot 2 to 1'}]});
assert.equal(r.deckPrevious,null);
assert.equal(r.deck.length,2);assert.equal(r.hand.length,0);
r=run(state([1,2],[]),state([1,2],[]),'rearrange');assert.equal(r.deckPrevious,null);
console.log('PASS: exactly one deck-history card when needed, zero otherwise');

// Vacated positions retain their own history without a label or appended slot.
for(const kind of ['move','absorb']) {
 r=run(state([2,1],[3]),state([2,0],kind==='move'?[3,1]:[3]),kind);
 assert.deepEqual(r.deck,[{id:2,change:''},{id:1,change:'leaving'}]);
 assert.equal(r.deckPrevious,null);
}
r=run(state([1,0],[]),state([0,1],[]),'rearrange');
assert.deepEqual(r.deck,[{id:1,change:'leaving'},{id:1,change:'appear'}]);
assert.equal(r.deckPrevious,null);
console.log('PASS: emptied deck positions show red cards in place without an extra slot or origin label');

// Only the dragged card is red; the upgraded target has no old-level ghost.
r=run(state([1],[1,2]),state([0],[10001,2]),'upgrade');
assert.deepEqual(count(r,'deck','leaving'),[1]);
assert.deepEqual(count(r,'hand','leaving'),[]);assert.equal(r.deckPrevious,null);
r=run(state([1,1],[]),state([10001,0],[]),'upgrade');
assert.deepEqual(r.deck,[{id:10001,change:'appear'},{id:1,change:'leaving'}]);
assert.equal(r.deckPrevious,null);
for(const inDeck of [false,true]) {
 r=run(state(inDeck?[6000012]:[],inDeck?[34]:[34,6000012]),
       state(inDeck?[6010012]:[],inDeck?[]:[6010012]),'absorb');
 assert.deepEqual(count(r,'hand','leaving'),[34]);
 assert.deepEqual(count(r,'deck','leaving'),[]);assert.equal(r.deckPrevious,null);
 assert.deepEqual(count(r,inDeck?'deck':'hand','appear'),[6010012]);
}
console.log('PASS: combines and absorption show only the consumed card in red, never the upgraded target');

// Round-start draws highlight newly added copies without action metadata.
r=run(state([2],[1,1,3],1),state([2,0],[1,1,3,1,4],2),'destiny');
assert.deepEqual(count(r,'hand','appear'),[1,4]);
assert.deepEqual(count(r,'hand','leaving'),[]);
assert.ok(r.deck.every(e=>!e.change));assert.equal(r.deckPrevious,null);
r=run(state([2],[1,3],1),state([4],[1,5],2),'');
assert.deepEqual(count(r,'hand','appear'),[5]);assert.deepEqual(count(r,'hand','leaving'),[]);
for(const extra of [{battle:{}},{}]) {
 r=run(state([2],[1],2),state([4],[5],1),'',extra);
 assert.ok([...r.hand,...r.deck].every(e=>!e.change));
}
r=run(state([2],[1],1),state([2],[1,3],2),'',{battle:{}});
assert.ok([...r.hand,...r.deck].every(e=>!e.change));
console.log('PASS: round-start additions highlight green with duplicate counts; no red history, deck highlights, or battle leakage');
