import{test}from'node:test';import assert from'node:assert/strict';import{relicStorage,applyRelicTransfer,relicCultivation}from'./relic-operations.mjs';
const action=(op,hex)=>({fields:[{field:1,integer:op},{field:2,hex}]});
test('native private field nine retains relic shelves and empty slots',()=>assert.deepEqual(relicStorage({unknownLengthDelimitedFields:[{field:9,hex:'2a02082a4a020000'}]}),{2:[],3:[42],4:[],5:[0,0]}));
test('artifact deposit and withdrawal preserve hand order, displaced cards, cultivation',()=>{
 const p={hand:[11,22,33],deck:[],relicStorage:{5:[0,44]}};
 assert.equal(relicCultivation(p,action(2,'00010500')),1);
 assert(applyRelicTransfer(p,action(2,'00010500')));assert.deepEqual(p.hand,[11,33]);assert.deepEqual(p.relicStorage[5],[22,44]);
 assert.equal(relicCultivation(p,action(2,'00000501')),0);
 assert(applyRelicTransfer(p,action(2,'00000501')));assert.deepEqual(p.hand,[33,44]);assert.deepEqual(p.relicStorage[5],[22,11]);
 assert.equal(relicCultivation(p,action(2,'05000000')),-1);
 assert(applyRelicTransfer(p,action(2,'05000000')));assert.deepEqual(p.hand,[33,44,22]);assert.deepEqual(p.relicStorage[5],[0,11]);
});
test('relic card swap replaces the source with the observed shelf card',()=>{
 const p={hand:[1000042,1010039,9000014,9000006,1000010],deck:[],relicStorage:{3:[11,22,1000060]}};
 assert(applyRelicTransfer(p,action(5,'00040302')));
 assert.deepEqual(p.hand,[1000042,1010039,9000014,9000006,1000060]);assert.equal(p.relicStorage[3][2],1000010);
});
test('token simulation preserves card provenance across the swap',()=>{
 const card={id:10,origin:1},shelf={id:20,origin:null};const p={hand:[card],deck:[],relicStorage:{3:[shelf]}};
 assert(applyRelicTransfer(p,action(5,'00000300'),id=>({id,origin:null})));assert.equal(p.hand[0],shelf);assert.equal(p.relicStorage[3][0],card);
});
