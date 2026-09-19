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
assert.deepEqual(count(r,'deck','appear'),[2,1]);assert.deepEqual(r.hand,[]);assert.deepEqual(r.deckPrevious,{id:1,change:'leaving',slot:1});assert.equal(r.deck.length,2);
r=run(state([1],[2]),state([0],[2,1]),'move');
assert.equal(r.deck[0].id,0);assert.equal(r.deckPrevious.id,1);assert.deepEqual(count(r,'hand','appear'),[1]);
r=run(state([],[1,1,2]),state([],[2,11]),'upgrade');
assert.deepEqual(count(r,'hand','leaving'),[1,1]);assert.deepEqual(count(r,'hand','appear'),[11]);
r=run(state([1],[1,2]),state([11],[2]),'upgrade');
assert.deepEqual(count(r,'hand','leaving'),[1]);assert.deepEqual(count(r,'deck','appear'),[11]);assert.equal(r.deckPrevious.id,1);
r=run(state([],[1]),state([],[1,1]),'gain');assert.deepEqual(count(r,'hand','appear'),[1]);
for(const [before,after,kind,extra] of [
 [null,state([1],[2]),'move'],[state([1],[2]),state([2],[3],2),'exchange'],
 [state([1],[2]),state([2],[3],1,'q'),'move'],[state([1],[2]),state([2],[3]),'emote'],
 [state([1],[2]),state([2],[3]),'move',{battle:{}}],
 [state([1],[2]),state([1],[2]),'move']]){
 r=run(before,after,kind,extra);assert.ok([...r.deck,...r.hand].every(x=>!x.change));
}
console.log('PASS: duplicate-aware exchanges, moves, swaps, both combine locations, gains, and transition boundaries');

// A swap can change two real slots, but displays just one history card: the
// moving card identified by the recorded action's source slot.
r=run(state([1,2],[]),state([2,1],[]),'rearrange',{humanActions:[{kind:'rearrange',textEnglish:'Player rearranged Card 2 from deck slot 2 to 1'}]});
assert.equal(r.deckPrevious.id,2);assert.equal(r.deckPrevious.slot,2);
assert.equal(r.deck.length,2);assert.equal(r.hand.length,0);
r=run(state([1,2],[]),state([1,2],[]),'rearrange');assert.equal(r.deckPrevious,null);
console.log('PASS: exactly one deck-history card when needed, zero otherwise');
