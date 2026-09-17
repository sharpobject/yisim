const {test}=require("node:test");const assert=require("node:assert/strict");
const codec=require("./recording-codec.cjs");
const shared={cards:{},talents:{},fateStrategies:{173:{id:173,nameEnglish:"Cat Claw",iconFile:"old.webp"}},characters:{}};
const make=entry=>({id:"test",targetUid:"test",targetUsername:"test",catalog:{...shared,fateStrategies:{173:entry}},steps:[{patch:{round:1}}]});
test("legacy three-part recordings still decode",()=>{const r=make(shared.fateStrategies[173]);const p=codec.packRecording(r);assert.equal(p.length,3);assert.deepEqual(codec.unpackRecording(p,shared),r)});
test("recording overrides preserve removed fields and rule changes without altering the shared catalog",()=>{const before=structuredClone(shared);for(const entry of [{id:173,nameEnglish:"Cat Claw"},{id:173,nameEnglish:"Cat Claw",description:"New rule"}]){const r=make(entry);const p=codec.packRecording(r,{sharedCatalog:shared});assert.equal(p.length,4);assert.deepEqual(codec.unpackRecording(p,shared),r);assert.deepEqual(shared,before)}});
test("matching metadata adds no override payload",()=>{const r=make(shared.fateStrategies[173]);const p=codec.packRecording(r,{sharedCatalog:shared});assert.equal(p.length,3);assert.deepEqual(codec.unpackRecording(p,shared),r)});
